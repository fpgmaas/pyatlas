# Viewport-Based Visibility and Culling Logic

## Overview

This document describes the logic for tracking which clusters and packages are visible in a React Three.js application, including optimizations to reduce excessive re-renders and calculations.

## Core Concepts

### Two Types of Cluster Visibility

The system tracks two distinct concepts for cluster visibility:

1. **Selected Clusters** (`selectedClusterIds: Set<number>`)
   - **Purpose**: User-controlled visibility - which clusters the user wants to see
   - **Control**: Toggled via UI legend/controls
   - **Update frequency**: Only on user interaction
   - **Used by**: `PackagePoints` component (to hide/show points), `ClusterLabels` component (to hide/show labels)

2. **Visible Clusters** (`visibleClusterIds: Set<number>`)
   - **Purpose**: Viewport-based visibility - which clusters are currently in the camera viewport
   - **Control**: Automatically calculated based on camera position/zoom
   - **Update frequency**: Throttled updates during pan/zoom (max 10/second)
   - **Used by**: Viewport bounds calculation to optimize package visibility checks

### Package Visibility

**Visible Packages** (`visiblePackageIds: Set<number>`)
- **Purpose**: Which individual packages should have labels rendered
- **Depends on**:
  - Camera zoom level (only calculated when `zoom >= 12`)
  - Viewport bounds (package must be within visible viewport)
  - Cluster visibility (package's cluster must be in viewport)
- **Update frequency**: Same as cluster visibility (throttled)
- **Used by**: `PackageLabels` component

## State Management (Zustand Store)

```typescript
interface GalaxyStore {
  // Data
  packages: Package[];
  clusters: Cluster[];

  // Visibility tracking
  selectedClusterIds: Set<number>;    // User-selected
  visibleClusterIds: Set<number>;     // Viewport-based
  visiblePackageIds: Set<number>;     // Viewport + zoom based

  // Viewport state
  viewportBounds: ViewportBounds | null;
  currentZoom: number;
  shouldShowLabels: boolean;          // True when zoom >= 12

  // Setters
  setVisibleClusterIds: (ids: Set<number>) => void;
  setVisiblePackageIds: (ids: Set<number>) => void;
  toggleCluster: (clusterId: number) => void;
  // ... other setters
}
```

### Initialization

```typescript
export const useGalaxyStore = create<GalaxyStore>((set) => ({
  selectedClusterIds: new Set(),
  visibleClusterIds: new Set(),
  visiblePackageIds: new Set(),

  setClusters: (clusters) => {
    const clusterIds = new Set(clusters.map(c => c.clusterId));
    // Initially, all clusters are both selected AND visible
    set({
      clusters,
      selectedClusterIds: clusterIds,
      visibleClusterIds: clusterIds
    });
  },

  toggleCluster: (clusterId) => set((state) => {
    const newSet = new Set(state.selectedClusterIds);
    if (newSet.has(clusterId)) {
      newSet.delete(clusterId);
    } else {
      newSet.add(clusterId);
    }
    return { selectedClusterIds: newSet };
  }),
}));
```

## Viewport Bounds Calculation and Throttling

The `useViewportBounds` hook runs on every frame (`useFrame`) but implements **three layers of throttling** to prevent excessive updates:

### Layer 1: Time-Based Throttling (100ms)

```typescript
const lastUpdateTime = useRef<number>(0);

useFrame(() => {
  const now = performance.now();
  const timeSinceLastUpdate = now - lastUpdateTime.current;

  // Exit early if less than 100ms since last update
  if (timeSinceLastUpdate < 100) return;

  // ... continue with calculation
  lastUpdateTime.current = now;
});
```

**Why 100ms?**
- Limits updates to maximum 10 per second (down from 60fps)
- Fast enough to feel immediate (human perception ~100-200ms)
- Balances smoothness with performance

### Layer 2: Spatial Throttling (0.1 unit change)

```typescript
const lastBounds = useRef<ViewportBounds | null>(null);

// Calculate current bounds
const bounds: ViewportBounds = {
  minX: cam.position.x + cam.left / cam.zoom,
  maxX: cam.position.x + cam.right / cam.zoom,
  minY: cam.position.y + cam.bottom / cam.zoom,
  maxY: cam.position.y + cam.top / cam.zoom,
};

// Only proceed if bounds changed by more than 0.1 units in any direction
const boundsChanged = !lastBounds.current ||
    Math.abs(bounds.minX - lastBounds.current.minX) > 0.1 ||
    Math.abs(bounds.maxX - lastBounds.current.maxX) > 0.1 ||
    Math.abs(bounds.minY - lastBounds.current.minY) > 0.1 ||
    Math.abs(bounds.maxY - lastBounds.current.maxY) > 0.1;

if (!boundsChanged) return;

lastBounds.current = bounds;
```

**Why 0.1 units?**
- Prevents updates during tiny camera movements
- Threshold chosen based on visual significance in the scene
- Combined with time throttling, reduces unnecessary calculations

### Layer 3: Set Equality Check

Even if time and spatial thresholds are met, only update the store if the **content** of the visibility sets actually changed.

```typescript
function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

const lastVisibleClusterIds = useRef<Set<number>>(new Set());
const lastVisiblePackageIds = useRef<Set<number>>(new Set());

// Calculate new visibility sets
const visibleClusterIdsSet = new Set<number>();
// ... populate set ...

// Only update store if contents changed
if (!setsEqual(visibleClusterIdsSet, lastVisibleClusterIds.current)) {
  lastVisibleClusterIds.current = visibleClusterIdsSet;
  setVisibleClusterIds(visibleClusterIdsSet);
}
```

**Why Set equality?**
- Creating a new Set instance triggers React/Zustand re-renders even if contents are identical
- Common during slow panning where same clusters remain visible
- Prevents component re-renders when nothing visually changed

## Helper Functions (Modular, Testable)

The viewport logic is split into small, pure helper functions:

```typescript
// Compute viewport bounds from orthographic camera
function computeBounds(cam: THREE.OrthographicCamera): ViewportBounds {
  return {
    minX: cam.position.x + cam.left / cam.zoom,
    maxX: cam.position.x + cam.right / cam.zoom,
    minY: cam.position.y + cam.bottom / cam.zoom,
    maxY: cam.position.y + cam.top / cam.zoom,
  };
}

// Check if bounds changed significantly (threshold = 0.1 units)
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

// Compute which clusters are visible in viewport
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

// Compute which packages are visible in viewport
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

// Check if two sets have equal contents
function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
```

## Complete Viewport Calculation Flow

```typescript
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

    // Detect if label visibility just changed
    const labelsJustEnabled = !prevShouldShowLabels.current && shouldShowLabels;
    prevShouldShowLabels.current = shouldShowLabels;

    // BYPASS: Skip throttles if labels just turned on
    const bypassThrottle = labelsJustEnabled;

    if (!bypassThrottle) {
      // THROTTLE LAYER 1: Time-based (100ms minimum)
      if (now - lastUpdateTime.current < 100) return;

      // THROTTLE LAYER 2: Spatial (0.1 unit change minimum)
      if (!boundsChanged) return;
    }

    lastUpdateTime.current = now;
    lastBounds.current = currentBounds;
    setViewportBounds(currentBounds);

    // Calculate dynamic padding (10% of viewport size)
    const viewportWidth = currentBounds.maxX - currentBounds.minX;
    const viewportHeight = currentBounds.maxY - currentBounds.minY;
    const padding = Math.max(0.1, Math.min(viewportWidth, viewportHeight) * 0.1);

    // STEP 1: Compute visible clusters
    const visibleClusterIdsSet = computeVisibleClusters(
      clusters,
      currentBounds,
      padding
    );

    // THROTTLE LAYER 3: Only update store if set contents changed
    if (!setsEqual(visibleClusterIdsSet, lastVisibleClusterIds.current)) {
      lastVisibleClusterIds.current = visibleClusterIdsSet;
      setVisibleClusterIds(visibleClusterIdsSet);
    }

    // STEP 2: Compute visible packages (only if labels should be shown)
    if (shouldShowLabels) {
      const visiblePackageIdsSet = computeVisiblePackages(
        packages,
        visibleClusterIdsSet,
        currentBounds,
        padding
      );

      // THROTTLE LAYER 3: Only update store if contents changed
      if (!setsEqual(visiblePackageIdsSet, lastVisiblePackageIds.current)) {
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
```

## Bounds Intersection Helper

```typescript
function boundsIntersect(
  viewport: ViewportBounds,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  padding: number = 0
): boolean {
  // Check if viewport intersects with bounds (expanded by padding)
  return !(
    viewport.maxX < bounds.minX - padding ||
    viewport.minX > bounds.maxX + padding ||
    viewport.maxY < bounds.minY - padding ||
    viewport.minY > bounds.maxY + padding
  );
}
```

This uses the "separating axis theorem" - if any of the conditions are true, the rectangles don't overlap.

## Component Usage

### PackagePoints Component

Uses **selected** clusters to determine which points to render:

```typescript
export function PackagePoints() {
  const { packages, selectedClusterIds, hoveredIndex } = useGalaxyStore();

  // Update point sizes based on user-selected visibility
  useEffect(() => {
    const geom = pointsRef.current.geometry;
    const sizeAttr = geom.attributes.size;

    packages.forEach((pkg, i) => {
      const baseSize = sizes[i];
      const visible = selectedClusterIds.has(pkg.clusterId);
      // Set size to 0 to effectively hide invisible points
      sizeAttr.setX(i, visible ? baseSize : 0);
    });
    sizeAttr.needsUpdate = true;
  }, [selectedClusterIds, packages, sizes]);

  // Also skip invisible points during hover detection
  const handlePointerMove = (event) => {
    packages.forEach((pkg, i) => {
      if (!selectedClusterIds.has(pkg.clusterId)) return; // Skip
      // ... hover distance calculation ...
    });
  };
}
```

**Why use selectedClusterIds here?**
- User explicitly controls which clusters to see via UI
- Independent of camera viewport
- Persists across pan/zoom

### ClusterLabels Component

Also uses **selected** clusters:

```typescript
export function ClusterLabels() {
  const { clusters, selectedClusterIds } = useGalaxyStore();

  return (
    <>
      {clusters
        .filter(c => selectedClusterIds.has(c.clusterId))
        .map(cluster => (
          <Html position={[cluster.centroidX, cluster.centroidY, 0]}>
            {cluster.label}
          </Html>
        ))}
    </>
  );
}
```

### PackageLabels Component

Uses **visible** packages (viewport + zoom based):

```typescript
export function PackageLabels() {
  const packages = useGalaxyStore((s) => s.packages);
  const visiblePackageIds = useGalaxyStore((s) => s.visiblePackageIds);
  const shouldShowLabels = useGalaxyStore((s) => s.shouldShowLabels);

  const visiblePackages = useMemo(() => {
    return packages.filter(pkg => visiblePackageIds.has(pkg.id));
  }, [packages, visiblePackageIds]);

  // Only show labels when zoomed in enough
  if (!shouldShowLabels) return null;

  return (
    <>
      {visiblePackages.map((pkg) => (
        <Html key={pkg.id} position={[pkg.x, pkg.y, 0]}>
          {pkg.name}
        </Html>
      ))}
    </>
  );
}
```

**Why use visiblePackageIds here?**
- Rendering thousands of HTML labels is expensive
- Only render labels for packages actually in view
- Automatically updates as user pans/zooms

**Note on Zustand selectors**: All components use selector syntax `useGalaxyStore((s) => s.field)` instead of destructuring. This ensures components only re-render when their specific dependencies change, not on every store update.

## Zoom Control and Label Threshold

```typescript
setCurrentZoom: (zoom) => set({
  currentZoom: zoom,
  shouldShowLabels: zoom >= 12
})
```

When `zoom < 12`:
- `shouldShowLabels = false`
- `visiblePackageIds` is cleared to empty Set
- `PackageLabels` component returns `null`
- No label calculations or rendering occur

When `zoom >= 12`:
- `shouldShowLabels = true`
- Viewport bounds hook calculates `visiblePackageIds`
- `PackageLabels` component renders labels for visible packages

## Performance Characteristics

### Without Optimizations
- **Update frequency**: 60 updates/second (every frame)
- **Set updates**: New Set created every frame, even if identical
- **Re-renders**: Components re-render 60 times/second
- **Result**: Excessive console logs, laggy UI, wasted CPU

### With Optimizations
- **Update frequency**: Max 10 updates/second (100ms throttle)
- **Actual updates**: Often less due to spatial throttle + Set equality
- **Re-renders**: Only when visibility actually changes
- **Result**: Smooth UI, minimal console logs, efficient

### Typical Update Scenarios

1. **Static camera (no movement)**
   - Time throttle: Blocks all updates
   - Updates/second: 0

2. **Slow panning (same clusters visible)**
   - Time throttle: Allows check every 100ms
   - Spatial throttle: May block if movement < 0.1 units
   - Set equality: Blocks store update if same clusters visible
   - Updates/second: 0-2

3. **Fast panning (crossing cluster boundaries)**
   - Time throttle: Allows check every 100ms
   - Spatial throttle: Passes (movement > 0.1)
   - Set equality: Allows update (different clusters)
   - Updates/second: Up to 10

4. **Zooming in past zoom level 12**
   - Triggers `shouldShowLabels = true`
   - Calculates `visiblePackageIds` for first time
   - Labels appear for visible packages
   - Updates/second: Up to 10 during zoom

## Solution: Fast Path for Zoom State Changes

**Problem**: User pans camera, then quickly zooms in while camera is still moving. Labels should appear immediately when zoom crosses threshold of 12, but were being blocked by throttles.

**Solution Implemented**: Track `shouldShowLabels` state changes and bypass throttles when labels are enabled.

```typescript
const prevShouldShowLabels = useRef<boolean>(false);

useFrame(() => {
  const labelsJustEnabled = !prevShouldShowLabels.current && shouldShowLabels;
  prevShouldShowLabels.current = shouldShowLabels;

  // Bypass throttles if labels just turned on
  const bypassThrottle = labelsJustEnabled;

  if (!bypassThrottle) {
    if (now - lastUpdateTime.current < 100) return;  // Time throttle
    if (!boundsChanged) return;                       // Spatial throttle
  }

  // Proceed with calculation...
});
```

**Why this works**:

1. Normal pan/zoom: Still throttled to max 10 updates/second
2. Zoom threshold crossed: Immediate update (bypasses both throttles once)
3. After bypass: Throttling resumes normally
4. Simple, pragmatic, no over-engineering

**Result**: Labels appear instantly when zooming past threshold, even during camera movement.

## Data Flow Summary

```
User Actions
│
├─> Toggle Cluster (UI)
│   └─> Updates selectedClusterIds
│       └─> PackagePoints re-renders (hide/show points)
│       └─> ClusterLabels re-renders (hide/show labels)
│
└─> Pan/Zoom Camera
    └─> useFrame() called (60fps)
        │
        ├─> Time throttle (100ms) ────> BLOCK if < 100ms
        │
        ├─> Spatial throttle (0.1 units) ─> BLOCK if no significant movement
        │
        └─> Calculate viewport clusters
            │
            ├─> Set equality check ────> BLOCK if same clusters
            │
            └─> Update visibleClusterIds
                │
                └─> If shouldShowLabels (zoom >= 12):
                    │
                    └─> Calculate viewport packages
                        │
                        ├─> Set equality check ─> BLOCK if same packages
                        │
                        └─> Update visiblePackageIds
                            │
                            └─> PackageLabels re-renders
```

## Performance Metrics

### Before Optimizations
- Console logs: 60+ "Rendering labels" per second
- Store updates: 60 per second
- Component re-renders: 60 per second

### After Optimizations
- Console logs: 0-10 per second (only when visibility changes)
- Store updates: 0-10 per second (throttled + deduplicated)
- Component re-renders: Only on actual visibility changes

### Trade-offs
- **Pro**: Massive reduction in CPU usage and re-renders
- **Pro**: Smoother UI performance
- **Con**: Small delay (up to 100ms) for labels to appear/disappear
- **Con**: Edge case where zoom + pan combination delays labels
