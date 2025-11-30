import { useThree, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGalaxyStore } from '../store/useGalaxyStore';
import type { Package, Cluster } from '../types';

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Helper: Compute viewport bounds from orthographic camera
function computeBounds(cam: THREE.OrthographicCamera): ViewportBounds {
  return {
    minX: cam.position.x + cam.left / cam.zoom,
    maxX: cam.position.x + cam.right / cam.zoom,
    minY: cam.position.y + cam.bottom / cam.zoom,
    maxY: cam.position.y + cam.top / cam.zoom,
  };
}

// Helper: Check if bounds changed significantly
function didBoundsChange(
  prev: ViewportBounds | null,
  current: ViewportBounds,
  threshold = 0.1
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

// Helper: Compute which packages are visible in viewport
function computeVisiblePackages(
  packages: Package[],
  visibleClusterIds: Set<number>,
  viewport: ViewportBounds,
  padding: number
): Set<number> {
  const result = new Set<number>();
  for (const pkg of packages) {
    if (!visibleClusterIds.has(pkg.clusterId)) continue;
    if (
      pkg.x >= viewport.minX - padding &&
      pkg.x <= viewport.maxX + padding &&
      pkg.y >= viewport.minY - padding &&
      pkg.y <= viewport.maxY + padding
    ) {
      result.add(pkg.id);
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
  const { camera } = useThree();
  const {
    packages,
    clusters,
    shouldShowLabels,
    setViewportBounds,
    setVisiblePackageIds,
    setVisibleClusterIds,
  } = useGalaxyStore();

  const lastBounds = useRef<ViewportBounds | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const lastVisibleClusterIds = useRef<Set<number>>(new Set());
  const lastVisiblePackageIds = useRef<Set<number>>(new Set());
  const prevShouldShowLabels = useRef<boolean>(false);

  useFrame(() => {
    if (camera.type !== 'OrthographicCamera') return;
    const cam = camera as THREE.OrthographicCamera;

    const now = performance.now();
    const currentBounds = computeBounds(cam);
    const boundsChanged = didBoundsChange(lastBounds.current, currentBounds);

    // Detect if label visibility just changed (especially false → true)
    const labelStateChanged = shouldShowLabels !== prevShouldShowLabels.current;
    const labelsJustEnabled = !prevShouldShowLabels.current && shouldShowLabels;
    prevShouldShowLabels.current = shouldShowLabels;

    // Bypass throttles if labels just turned on
    const bypassThrottle = labelsJustEnabled;

    if (!bypassThrottle) {
      // Time-based throttle: only update if 100ms elapsed
      if (now - lastUpdateTime.current < 100) return;

      // Spatial throttle: only update if bounds changed significantly
      if (!boundsChanged) return;
    }

    // Update tracking state
    lastUpdateTime.current = now;
    lastBounds.current = currentBounds;
    setViewportBounds(currentBounds);

    // Calculate dynamic padding (10% of viewport size)
    const viewportWidth = currentBounds.maxX - currentBounds.minX;
    const viewportHeight = currentBounds.maxY - currentBounds.minY;
    const padding = Math.max(0.1, Math.min(viewportWidth, viewportHeight) * 0.1);

    // Step 1: Compute visible clusters
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

    // Step 2: Compute visible packages (only if labels should be shown)
    if (shouldShowLabels) {
      const visiblePackageIdsSet = computeVisiblePackages(
        packages,
        visibleClusterIdsSet,
        currentBounds,
        padding
      );

      // Only update store if contents changed
      if (!setsEqual(visiblePackageIdsSet, lastVisiblePackageIds.current)) {
        console.log('Package culling:', {
          totalPackages: packages.length,
          visiblePackages: visiblePackageIdsSet.size,
        });

        lastVisiblePackageIds.current = visiblePackageIdsSet;
        setVisiblePackageIds(visiblePackageIdsSet);
      }
    } else {
      // Clear visible packages when labels are off
      if (lastVisiblePackageIds.current.size !== 0) {
        lastVisiblePackageIds.current = new Set();
        setVisiblePackageIds(lastVisiblePackageIds.current);
      }
    }
  });
}
