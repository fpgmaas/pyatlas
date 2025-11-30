import { useThree, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGalaxyStore } from '../store/useGalaxyStore';
import type { Package, Cluster } from '../types';
import { queryVisiblePackagesFromGrid } from '../utils/spatialIndex';

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Performance configuration
const PERF_CONFIG = {
  CLUSTER_UPDATE_INTERVAL: 100, // ms
  LABEL_UPDATE_INTERVAL: 150,   // ms
  SPATIAL_THRESHOLD: 0.1,       // Minimum viewport change to trigger update
  PADDING_FACTOR: 0.1,          // 10% of viewport for padding
};

// Helper: Compute viewport bounds from orthographic camera
function computeBounds(
  cam: THREE.OrthographicCamera,
  controls: any  // OrbitControls type
): ViewportBounds {
  // Use controls.target if available (when using OrbitControls)
  // Fall back to camera.position for backward compatibility
  const centerX = controls?.target?.x ?? cam.position.x;
  const centerY = controls?.target?.y ?? cam.position.y;

  return {
    minX: centerX + cam.left / cam.zoom,
    maxX: centerX + cam.right / cam.zoom,
    minY: centerY + cam.bottom / cam.zoom,
    maxY: centerY + cam.top / cam.zoom,
  };
}

// Helper: Check if bounds changed significantly
function didBoundsChange(
  prev: ViewportBounds | null,
  current: ViewportBounds,
  threshold: number
): boolean {
  if (!prev) return true;
  return (
    Math.abs(prev.minX - current.minX) > threshold ||
    Math.abs(prev.maxX - current.maxX) > threshold ||
    Math.abs(prev.minY - current.minY) > threshold ||
    Math.abs(prev.maxY - current.maxY) > threshold
  );
}

// Helper: Check if viewport intersects with bounds
function boundsIntersect(
  viewport: ViewportBounds,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  padding: number = 0
): boolean {
  return !(
    viewport.maxX < bounds.minX - padding ||
    viewport.minX > bounds.maxX + padding ||
    viewport.maxY < bounds.minY - padding ||
    viewport.minY > bounds.maxY + padding
  );
}

// Helper: Compute which clusters are visible in viewport
function computeVisibleClusters(
  clusters: Cluster[],
  viewport: ViewportBounds,
  padding: number
): Set<number> {
  const result = new Set<number>();
  for (const cluster of clusters) {
    if (boundsIntersect(viewport, cluster, padding)) {
      result.add(cluster.clusterId);
    }
  }
  return result;
}


// Helper: Check if two sets have equal contents
function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export function useViewportBounds() {
  const { camera, controls } = useThree();
  const {
    packages,
    clusters,
    shouldShowLabels,
    spatialIndex,
    setViewportBounds,
    setVisiblePackageIds,
    setVisibleClusterIds,
  } = useGalaxyStore();

  const lastBounds = useRef<ViewportBounds | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const lastLabelUpdateTime = useRef<number>(0);
  const lastVisibleClusterIds = useRef<Set<number>>(new Set());
  const lastVisiblePackageIds = useRef<Set<number>>(new Set());
  const prevShouldShowLabels = useRef<boolean>(false);

  useFrame(() => {
    if (camera.type !== 'OrthographicCamera') return;
    const cam = camera as THREE.OrthographicCamera;

    const now = performance.now();
    const currentBounds = computeBounds(cam, controls);
    const boundsChanged = didBoundsChange(lastBounds.current, currentBounds, PERF_CONFIG.SPATIAL_THRESHOLD);

    // Detect if label visibility just changed (especially false → true)
    const labelsJustEnabled = !prevShouldShowLabels.current && shouldShowLabels;
    prevShouldShowLabels.current = shouldShowLabels;

    // Bypass throttles if labels just turned on
    const bypassThrottle = labelsJustEnabled;

    // Step 1: Always update clusters (cheap operation) with 100ms throttle
    const shouldUpdateClusters = bypassThrottle ||
      (now - lastUpdateTime.current >= PERF_CONFIG.CLUSTER_UPDATE_INTERVAL && boundsChanged);

    if (shouldUpdateClusters) {
      // Update tracking state
      lastUpdateTime.current = now;
      lastBounds.current = currentBounds;
      setViewportBounds(currentBounds);

      // Calculate dynamic padding (10% of viewport size)
      const viewportWidth = currentBounds.maxX - currentBounds.minX;
      const viewportHeight = currentBounds.maxY - currentBounds.minY;
      const padding = Math.max(0.1, Math.min(viewportWidth, viewportHeight) * PERF_CONFIG.PADDING_FACTOR);

      // Compute visible clusters
      const visibleClusterIdsSet = computeVisibleClusters(
        clusters,
        currentBounds,
        padding
      );

      // Only update store if contents changed
      if (!setsEqual(visibleClusterIdsSet, lastVisibleClusterIds.current)) {
        console.log('Viewport culling:', {
          bounds: {
            minX: currentBounds.minX.toFixed(2),
            maxX: currentBounds.maxX.toFixed(2),
            minY: currentBounds.minY.toFixed(2),
            maxY: currentBounds.maxY.toFixed(2),
          },
          zoom: cam.zoom.toFixed(2),
          padding: padding.toFixed(2),
          totalClusters: clusters.length,
          viewportClusters: visibleClusterIdsSet.size,
        });

        lastVisibleClusterIds.current = visibleClusterIdsSet;
        setVisibleClusterIds(visibleClusterIdsSet);
      }
    }

    // Step 2: Update labels less frequently (expensive operation) with 150ms throttle
    if (shouldShowLabels && spatialIndex) {
      const shouldUpdateLabels = bypassThrottle ||
        (now - lastLabelUpdateTime.current >= PERF_CONFIG.LABEL_UPDATE_INTERVAL && boundsChanged);

      if (shouldUpdateLabels) {
        lastLabelUpdateTime.current = now;

        // Calculate padding
        const viewportWidth = currentBounds.maxX - currentBounds.minX;
        const viewportHeight = currentBounds.maxY - currentBounds.minY;
        const padding = Math.max(0.1, Math.min(viewportWidth, viewportHeight) * PERF_CONFIG.PADDING_FACTOR);

        // Use spatial index for fast lookup
        const visiblePackageIdsSet = queryVisiblePackagesFromGrid(
          spatialIndex,
          packages,
          lastVisibleClusterIds.current,
          currentBounds,
          padding
        );

        // Only update store if contents changed
        if (!setsEqual(visiblePackageIdsSet, lastVisiblePackageIds.current)) {
          console.log('Package culling (grid-based):', {
            totalPackages: packages.length,
            visiblePackages: visiblePackageIdsSet.size,
            gridCells: spatialIndex.cells.size,
          });

          lastVisiblePackageIds.current = visiblePackageIdsSet;
          setVisiblePackageIds(visiblePackageIdsSet);
        }
      }
    } else if (!shouldShowLabels) {
      // Clear visible packages when labels are off
      if (lastVisiblePackageIds.current.size !== 0) {
        lastVisiblePackageIds.current = new Set();
        setVisiblePackageIds(lastVisiblePackageIds.current);
      }
    }
  });
}
