# Performance Optimization Plan: Package Label Rendering

## Executive Summary

This plan addresses performance bottlenecks in the package label rendering system. The current implementation processes all 10,000 packages on every viewport update (O(N) complexity), causing unnecessary CPU overhead. We'll implement four pragmatic optimizations that significantly reduce computational cost while maintaining code simplicity.

## Current Performance Characteristics

**Current Bottlenecks:**
- **O(N) package scanning**: Every visibility update iterates through all 10,000 packages
- **Unbounded label rendering**: Can render 2000+ HTML labels when zoomed in, causing DOM overhead
- **Tight update frequency**: Labels update every 100ms, same as clusters (but labels are much more expensive)

**Current Throttling (working well):**
- ✅ 100ms time-based throttle
- ✅ 0.1 spatial change threshold
- ✅ Smart bypass when labels first enabled
- ✅ Set equality checks prevent redundant store updates

## Recommended Optimizations

### 1. Spatial Indexing: Uniform Grid (HIGH IMPACT)

**Goal**: Reduce O(N) package iteration to O(cells in viewport + packages in viewport)

**Implementation**:

Create a new utility file: `frontend/src/utils/spatialIndex.ts`

```typescript
export interface SpatialIndex {
  cellSizeX: number;
  cellSizeY: number;
  minX: number;
  minY: number;
  cells: Map<string, number[]>; // CellKey -> Package IDs
}

export function buildSpatialIndex(
  packages: Package[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  gridResolution = 128  // Finer grid for better high-zoom performance
): SpatialIndex
```

**Where it fits**:
- Build once in `useGalaxyStore` when packages are loaded via `setPackages()`
- Store as `spatialIndex: SpatialIndex | null` in Zustand store
- Use in `computeVisiblePackages()` within `useViewportBounds.ts`

**New function signature**:
```typescript
function computeVisiblePackagesFromGrid(
  spatialIndex: SpatialIndex,
  packages: Package[], // for lookup by ID
  visibleClusterIds: Set<number>,
  viewport: ViewportBounds,
  padding: number
): Set<number>
```

**Expected Impact**:
- At zoom level 12 (typical label viewing): ~300-600 packages checked instead of 10,000
- At higher zoom: potentially 50-150 packages checked (better with 128-cell grid)
- **80-95% reduction** in package visibility computation time

---

### 2. Label Count Cap (HIGH IMPACT)

**Goal**: Prevent unbounded DOM overhead by limiting maximum rendered labels to 200

**Implementation**:

Add to `frontend/src/hooks/useViewportBounds.ts`:

```typescript
function capVisiblePackages(
  visiblePackageIds: Set<number>,
  packages: Package[],
  maxLabels = 200
): Set<number> {
  if (visiblePackageIds.size <= maxLabels) return visiblePackageIds;

  // Priority: Sort by download count (most popular packages first)
  const packagesArray = Array.from(visiblePackageIds)
    .map(id => packages.find(p => p.id === id)!)
    .filter(p => p !== undefined)
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, maxLabels);

  return new Set(packagesArray.map(p => p.id));
}
```

**Where to apply**:
- After `computeVisiblePackages()` in the label branch (line 178-193)
- Before `setVisiblePackageIds()` call

**Configuration**:
- Default cap: 200 labels
- Could make configurable via store if needed

**Expected Impact**:
- **Guaranteed** upper bound on DOM nodes
- Stabilizes worst-case rendering cost
- Users see most important packages (highest download counts)

---

### 3. Differential Update Frequency (MEDIUM IMPACT)

**Goal**: Update clusters every 100ms but labels every 150-200ms to reduce label computation overhead

**Implementation**:

In `useViewportBounds.ts`, add separate tracking for label updates:

```typescript
const lastLabelUpdateTime = useRef<number>(0);
const CLUSTER_UPDATE_INTERVAL = 100; // ms
const LABEL_UPDATE_INTERVAL = 150;   // ms
```

**Logic flow**:
1. Always compute cluster visibility (lines 150-174) with 100ms throttle
2. Only compute package visibility when:
   - `shouldShowLabels === true` AND
   - Time since last label update >= 150ms OR
   - Labels just enabled (bypass)

**Pseudo-code**:
```typescript
// Step 1: Always update clusters (cheap)
if (now - lastUpdateTime.current >= CLUSTER_UPDATE_INTERVAL || bypassThrottle) {
  const visibleClusterIdsSet = computeVisibleClusters(...);
  // update store
}

// Step 2: Update labels less frequently (expensive)
if (shouldShowLabels) {
  if (now - lastLabelUpdateTime.current >= LABEL_UPDATE_INTERVAL || bypassThrottle) {
    lastLabelUpdateTime.current = now;
    const visiblePackageIdsSet = computeVisiblePackagesFromGrid(...);
    const cappedSet = capVisiblePackages(...);
    // update store
  }
}
```

**Expected Impact**:
- **~33% reduction** in label computation frequency (150ms vs 100ms)
- Clusters remain responsive
- Imperceptible lag to users (human reaction time ~250ms)

---

### 4. Zoom Threshold Instant Update (SMALL IMPACT)

**Goal**: When crossing zoom threshold (11.9 → 12.1), show labels instantly without waiting for throttle

**Current behavior**:
- `labelsJustEnabled` only triggers when `shouldShowLabels` changes from false → true
- This happens at the exact zoom level 12 threshold

**Enhancement**:
Already implemented correctly! The `bypassThrottle` logic (line 130) handles this.

**No changes needed** - this is working as intended.

---

## Implementation Strategy

**Approach**: Implement all optimizations together in a single coordinated effort for maximum performance gain.

**Rationale**: The three optimizations are complementary and work best together:
- Spatial index reduces packages checked
- Label cap bounds DOM overhead
- Differential timing reduces update frequency
- Combined effect is multiplicative, not just additive

## Implementation Order & File Changes

### Phase 1: Spatial Index Foundation
**Files to create/modify**:
1. `frontend/src/utils/spatialIndex.ts` (NEW)
   - `buildSpatialIndex()`
   - `queryVisiblePackagesFromGrid()`
   - Type definitions

2. `frontend/src/store/useGalaxyStore.ts`
   - Add `spatialIndex: SpatialIndex | null` to state
   - Modify `setPackages()` to build index
   - Add `setSpatialIndex()` action

3. `frontend/src/hooks/useViewportBounds.ts`
   - Import spatial index from store
   - Replace `computeVisiblePackages()` with `computeVisiblePackagesFromGrid()`
   - Keep cluster visibility logic unchanged

### Phase 2: Label Cap
**Files to modify**:
1. `frontend/src/hooks/useViewportBounds.ts`
   - Add `capVisiblePackages()` helper
   - Apply cap after spatial index query
   - Add configuration constant `MAX_VISIBLE_LABELS = 200`

### Phase 3: Differential Update Timing
**Files to modify**:
1. `frontend/src/hooks/useViewportBounds.ts`
   - Add `lastLabelUpdateTime` ref
   - Split throttle logic for clusters vs labels
   - Add `LABEL_UPDATE_INTERVAL = 150` constant

### Phase 4: Testing & Tuning
**Activities**:
- Test at various zoom levels (10, 12, 15, 20)
- Verify label cap works (console log actual count)
- Measure performance improvement (Chrome DevTools Performance tab)
- Adjust grid resolution if needed (default 64 may be tuned to 32 or 128)

---

## Configuration Parameters

All tunable parameters in one place for easy adjustment:

```typescript
// In useViewportBounds.ts or new config file
export const PERF_CONFIG = {
  GRID_RESOLUTION: 128,          // Finer spatial index grid (user preference)
  MAX_VISIBLE_LABELS: 200,       // Label cap (hard limit on DOM nodes)
  CLUSTER_UPDATE_INTERVAL: 100,  // ms
  LABEL_UPDATE_INTERVAL: 150,    // ms
  SPATIAL_THRESHOLD: 0.1,        // Existing
  PADDING_FACTOR: 0.1,           // Existing (10% of viewport)
  LABEL_PRIORITY: 'downloads',   // Sort by downloads (user preference)
};
```

---

## Expected Performance Gains

**Before**:
- Package visibility: O(10,000) every 100ms when labels shown
- Label rendering: Unbounded (up to ~2000+ DOM nodes)
- Update frequency: Same for clusters and labels

**After**:
- Package visibility: O(~300-600) at zoom 12, O(~50-150) at higher zoom (128-cell grid)
- Label rendering: **Capped at 200 DOM nodes**
- Update frequency: Clusters 100ms, labels 150ms

**Estimated CPU reduction**:
- **80-95% reduction** in package visibility computation (128-cell grid is more efficient)
- **90%+ reduction** in DOM overhead (200 vs 2000 labels)
- **33% reduction** in label update frequency
- **Overall: 85%+ reduction** in label-related CPU usage

---

## User Preferences Applied

✅ **Label prioritization**: Download count (most popular packages shown first)
✅ **Grid resolution**: 128 cells (finer grid for better high-zoom performance)
✅ **Implementation strategy**: All optimizations together (coordinated approach)

## Alternative Approaches Considered (Not Recommended)

1. **Quadtree instead of grid**: More complex, minimal benefit for uniform distribution
2. **Spatial distribution for labels**: Complex algorithm, download-based priority is simpler and more useful
3. **WebGL text rendering**: Much more complex, loses HTML styling flexibility
4. **Virtual scrolling for labels**: Doesn't apply to 2D spatial rendering
5. **requestIdleCallback for updates**: Unreliable timing, adds complexity
6. **32-cell coarse grid**: Less effective at high zoom levels where labels are shown

---

## Risks & Mitigations

**Risk 1**: Grid resolution too fine (128 cells) → more cells to iterate
- **Mitigation**: At high zoom, viewport spans fewer cells, so net benefit remains positive. Padding ensures no packages missed at boundaries.

**Risk 2**: Label cap frustrates users who want to see all labels
- **Mitigation**: Prioritize by download count (most important packages shown)
- **Future**: Could add user preference for cap value

**Risk 3**: Spatial index build time on initial load
- **Mitigation**: Grid building is O(N) once, ~10ms for 10k packages (negligible)

**Risk 4**: Slower label updates feel laggy
- **Mitigation**: 150ms is below perceptual threshold (~250ms), bypass on zoom threshold

---

## Success Metrics

After implementation, verify:
- [ ] Console logs show <400 packages checked per update at zoom 12 (improved with 128-cell grid)
- [ ] Console logs show <150 packages checked per update at zoom 20+ (high zoom)
- [ ] Chrome DevTools shows exactly ≤200 DOM nodes for package labels
- [ ] Most popular packages (by downloads) are prioritized in label rendering
- [ ] No visual jank or lag when panning/zooming
- [ ] Labels appear instantly when crossing zoom threshold 12
- [ ] Frame rate stable at 60fps during interaction
- [ ] Label updates lag slightly behind cluster updates (150ms vs 100ms) but imperceptibly

---

## Future Enhancements (Out of Scope)

- Dynamic grid resolution based on zoom level
- Cluster-aware label prioritization (show labels from more diverse clusters)
- Distance-based label fading (opacity based on distance from viewport center)
- WebGL-based label rendering for >1000 labels
- Label collision detection and adjustment
