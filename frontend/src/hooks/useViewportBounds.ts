import { useThree, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGalaxyStore } from "../store/useGalaxyStore";
import type { Package, Cluster } from "../types";

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Performance configuration
const PERF_CONFIG = {
  CLUSTER_UPDATE_INTERVAL: 500, // ms
  LABEL_UPDATE_INTERVAL: 50, // ms
  SPATIAL_THRESHOLD: 0.05, // 5% of viewport size as minimum change to trigger update
  PADDING_FACTOR: 0.1, // 10% of viewport for padding
};

// Reusable vector for computing camera intersection (avoids allocation in render loop)
const _direction = new THREE.Vector3();

// Helper: Compute viewport bounds from orthographic camera
// Uses camera's actual view matrix to find where it intersects z=0 plane
// This is more reliable than controls.target which may have timing issues
function computeBounds(cam: THREE.OrthographicCamera): ViewportBounds {
  // Get the direction the camera is looking
  cam.getWorldDirection(_direction);

  // For orthographic camera looking at z=0 plane, compute intersection point
  // This gives us the actual center of what the camera is viewing
  const t = -cam.position.z / _direction.z;
  const centerX = cam.position.x + _direction.x * t;
  const centerY = cam.position.y + _direction.y * t;

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
  threshold: number,
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
  padding: number = 0,
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
  padding: number,
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

// Helper: Compute visible packages within viewport bounds
function computeVisiblePackages(
  packages: Package[],
  selectedClusterIds: Set<number>,
  viewport: ViewportBounds,
  padding: number,
): Set<number> {
  const result = new Set<number>();
  const viewMinX = viewport.minX - padding;
  const viewMaxX = viewport.maxX + padding;
  const viewMinY = viewport.minY - padding;
  const viewMaxY = viewport.maxY + padding;

  for (const pkg of packages) {
    // Skip packages from hidden clusters
    if (!selectedClusterIds.has(pkg.clusterId)) continue;

    // Check if within viewport bounds
    if (
      pkg.x >= viewMinX &&
      pkg.x <= viewMaxX &&
      pkg.y >= viewMinY &&
      pkg.y <= viewMaxY
    ) {
      result.add(pkg.id);
    }
  }

  return result;
}

export function useViewportBounds() {
  const { camera } = useThree();
  const {
    packages,
    clusters,
    selectedClusterIds,
    shouldShowLabels,
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
  const prevSelectedClusterIds = useRef<Set<number>>(selectedClusterIds);

  useFrame(() => {
    if (camera.type !== "OrthographicCamera") return;
    const cam = camera as THREE.OrthographicCamera;

    const now = performance.now();
    const currentBounds = computeBounds(cam);

    // Calculate dynamic threshold based on viewport size (5% of smallest dimension)
    // This ensures updates trigger appropriately at all zoom levels
    const viewportWidth = currentBounds.maxX - currentBounds.minX;
    const viewportHeight = currentBounds.maxY - currentBounds.minY;
    const dynamicThreshold =
      Math.min(viewportWidth, viewportHeight) * PERF_CONFIG.SPATIAL_THRESHOLD;

    const boundsChanged = didBoundsChange(
      lastBounds.current,
      currentBounds,
      dynamicThreshold,
    );

    // Detect if label visibility just changed (especially false → true)
    const labelsJustEnabled = !prevShouldShowLabels.current && shouldShowLabels;
    prevShouldShowLabels.current = shouldShowLabels;

    // Detect if cluster selection changed
    const clusterSelectionChanged = !setsEqual(
      prevSelectedClusterIds.current,
      selectedClusterIds,
    );
    if (clusterSelectionChanged) {
      prevSelectedClusterIds.current = selectedClusterIds;
    }

    // Bypass throttles if labels just turned on or cluster selection changed
    const bypassThrottle = labelsJustEnabled || clusterSelectionChanged;

    // Step 1: Always update clusters (cheap operation) with 100ms throttle
    const shouldUpdateClusters =
      bypassThrottle ||
      (now - lastUpdateTime.current >= PERF_CONFIG.CLUSTER_UPDATE_INTERVAL &&
        boundsChanged);

    if (shouldUpdateClusters) {
      // Update tracking state
      lastUpdateTime.current = now;
      lastBounds.current = currentBounds;
      setViewportBounds(currentBounds);

      // Calculate dynamic padding (10% of viewport size)
      const viewportWidth = currentBounds.maxX - currentBounds.minX;
      const viewportHeight = currentBounds.maxY - currentBounds.minY;
      const padding = Math.max(
        0.1,
        Math.min(viewportWidth, viewportHeight) * PERF_CONFIG.PADDING_FACTOR,
      );

      // Compute visible clusters
      const visibleClusterIdsSet = computeVisibleClusters(
        clusters,
        currentBounds,
        padding,
      );

      // Only update store if contents changed
      if (!setsEqual(visibleClusterIdsSet, lastVisibleClusterIds.current)) {
        lastVisibleClusterIds.current = visibleClusterIdsSet;
        setVisibleClusterIds(visibleClusterIdsSet);
      }
    }

    // Step 2: Update labels less frequently (expensive operation) with throttle
    if (shouldShowLabels) {
      const shouldUpdateLabels =
        bypassThrottle ||
        (now - lastLabelUpdateTime.current >=
          PERF_CONFIG.LABEL_UPDATE_INTERVAL &&
          boundsChanged);

      if (shouldUpdateLabels) {
        lastLabelUpdateTime.current = now;
        lastBounds.current = currentBounds;

        // Calculate padding - use relative padding only, no minimum floor
        // (minimum floor of 0.1 was causing huge padding at high zoom levels)
        const viewportWidth = currentBounds.maxX - currentBounds.minX;
        const viewportHeight = currentBounds.maxY - currentBounds.minY;
        const padding =
          Math.min(viewportWidth, viewportHeight) * PERF_CONFIG.PADDING_FACTOR;

        // Compute visible packages with simple bounds check
        const visiblePackageIdsSet = computeVisiblePackages(
          packages,
          selectedClusterIds,
          currentBounds,
          padding,
        );

        // Only update store if contents changed
        if (!setsEqual(visiblePackageIdsSet, lastVisiblePackageIds.current)) {
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
