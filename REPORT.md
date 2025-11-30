You’ve already done a *lot* right here: single draw call, orthographic camera, spatial index, throttled viewport culling, capped label count… For 10k points that’s a very solid baseline.

Based on your report, the main risk isn’t the 4070 at all – it’s CPU-side work (and GC) on hover + event handling that will hurt laptops/iGPUs.

I’ll focus on **“biggest FPS wins first”**, then some **medium/low-priority tweaks**.

---

## 1. Biggest win: hover detection + hover buffer updates

### 1.1 Current situation

On every `onPointerMove`:

* You iterate *all* packages (~10k):

  * Do a `new THREE.Vector3(pkg.x, pkg.y, 0)` (allocation)
  * Project to screen
  * Compute distance to mouse
* Then you set `hoveredIndex`, which triggers:

  * An O(n) loop updating *all* values of the `hovered` attribute.

So per mouse move you’re doing roughly:

* 10k iterations
* 20k+ tiny allocations
* 10k `hoveredAttr.setX` + full buffer upload

On a 4070 this feels fine; on an integrated GPU + mid CPU this is exactly where frames start dropping.

---

### 1.2 Change 1: Only update two buffer entries instead of all

You don’t need to rewrite the whole `hovered` array every time – you only need to switch “old hovered” off and “new hovered” on.

**Before** (simplified):

```ts
useEffect(() => {
  if (!pointsRef.current) return;
  const geom = pointsRef.current.geometry;
  const hoveredAttr = geom.attributes.hovered as THREE.BufferAttribute;

  for (let i = 0; i < packages.length; i++) {
    hoveredAttr.setX(i, i === hoveredIndex ? 1 : 0);
  }
  hoveredAttr.needsUpdate = true;
}, [hoveredIndex, packages.length]);
```

**After** (incremental update):

```ts
const prevHoveredIndex = useRef<number | null>(null);

useEffect(() => {
  if (!pointsRef.current) return;
  const hoveredAttr = pointsRef.current.geometry
    .attributes.hovered as THREE.BufferAttribute;

  // Turn off previous
  if (prevHoveredIndex.current !== null) {
    hoveredAttr.setX(prevHoveredIndex.current, 0);
  }

  // Turn on new
  if (hoveredIndex !== null) {
    hoveredAttr.setX(hoveredIndex, 1);
  }

  hoveredAttr.needsUpdate = true;
  prevHoveredIndex.current = hoveredIndex ?? null;
}, [hoveredIndex]);
```

Do the *same trick* for `selected`:

* Keep `prevSelectedIndex` in a ref.
* Only update previous & new index, not the entire array.

👉 This alone eliminates 20k attribute writes per mouse move.

---

### 1.3 Change 2: Use the spatial index for hover (no full 10k scan)

You already have a spatial grid; use it for hover picking as well.

Instead of:

```ts
packages.forEach((pkg, i) => {
  if (!selectedClusterIds.has(pkg.clusterId)) return;
  const distance = getCanvasPointDistance(... pkg ...)
  if (distance < pointRadius && distance < closestDistance) {
    closestIndex = i;
  }
});
```

Do this:

1. Convert mouse position → world coordinates once.
2. Use the **grid** to find candidate cells near that world point.
3. Test only points in those few cells (maybe 20–100 points total, not 10k).
4. Among those, calculate screen distance as you already do.

Sketch (conceptual):

```ts
const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
  event.stopPropagation();
  if (!spatialIndex) return;

  const rect = canvasRectRef.current || gl.domElement.getBoundingClientRect();

  // 1) Mouse → NDC → world
  const ndc = new THREE.Vector3(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
    0,
  );
  ndc.unproject(camera); // world coords

  // 2) Determine cell from world coords
  const { cellSizeX, cellSizeY, minX, minY, cells } = spatialIndex;
  const cellX = Math.floor((ndc.x - minX) / cellSizeX);
  const cellY = Math.floor((ndc.y - minY) / cellSizeY);

  // Collect indices from this cell + neighbours
  const candidateIndices: number[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${cellX + dx},${cellY + dy}`;
      const indices = cells.get(key);
      if (indices) candidateIndices.push(...indices);
    }
  }

  let closestIndex = -1;
  let closestDistance = Infinity;

  for (const idx of candidateIndices) {
    const pkg = packages[idx];
    if (!selectedClusterIds.has(pkg.clusterId)) continue;

    const distance = getCanvasPointDistance(
      new THREE.Vector3(pkg.x, pkg.y, 0),
      event.clientX,
      event.clientY,
      camera,
      rect,
      size,
    );

    const pointRadius = (baseSizes.get(pkg.id) || 16) / 2;
    if (distance < pointRadius && distance < closestDistance) {
      closestDistance = distance;
      closestIndex = idx;
    }
  }

  if (closestIndex !== -1) {
    document.body.style.cursor = 'pointer';
    setHoveredIndex(closestIndex);
  } else {
    document.body.style.cursor = 'default';
    setHoveredIndex(null);
  }
};
```

Key changes:

* `SpatialIndex.cells` should store **indices in the `packages` array**, not `pkg.id`s. That way no map lookup is needed.
* Complexity: O(points in a few cells) instead of O(10k).

That’s a *huge* CPU + GC win on pointer move.

---

### 1.4 Change 3: Reduce allocations in coordinateConversion

Right now, for each candidate you do:

```ts
const vector = worldPos.clone();
vector.project(camera);
return { canvasX: ..., canvasY: ... };
```

Even with fewer candidates, this can dominate GC over time.

Two improvements:

1. **Reuse a single `THREE.Vector3`**:

```ts
const scratchVec = new THREE.Vector3();

export function worldToCanvasCoords(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  canvasSize: { width: number; height: number },
): ScreenCoordinates {
  scratchVec.copy(worldPos).project(camera);
  const screenX = (scratchVec.x + 1) / 2 * canvasSize.width;
  const screenY = -(scratchVec.y - 1) / 2 * canvasSize.height;
  return { canvasX: screenX, canvasY: screenY };
}
```

2. Optionally also reuse an output object if you feel like going further, but (1) is already a big improvement.

---

## 2. Viewport culling: avoid rebuilding `packageMap` every time

In `queryVisiblePackagesFromGrid` you do:

```ts
const packageMap = new Map(packages.map(p => [p.id, p])); // O(n) every call
```

This happens every 150ms while panning/zooming with labels on.

### 2.1 Store indices instead of ids in the spatial index

When building the grid:

```ts
for (let i = 0; i < packages.length; i++) {
  const pkg = packages[i];
  const cellX = ...
  const key = `${cellX},${cellY}`;

  const existing = cells.get(key);
  if (existing) existing.push(i); // index
  else cells.set(key, [i]);
}
```

Now `cells` contains indices, not ids.

### 2.2 Query becomes trivial

```ts
export function queryVisiblePackagesFromGrid(
  spatialIndex: SpatialIndex,
  packages: Package[],
  visibleClusterIds: Set<number>,
  viewport: ViewportBounds,
  padding: number,
): Set<number> {
  const result = new Set<number>();
  const { cellSizeX, cellSizeY, minX, minY, cells } = spatialIndex;

  // compute startCellX/Y and endCellX/Y as you already do…

  for (let cellX = startCellX; cellX <= endCellX; cellX++) {
    for (let cellY = startCellY; cellY <= endCellY; cellY++) {
      const key = `${cellX},${cellY}`;
      const indices = cells.get(key);
      if (!indices) continue;

      for (const idx of indices) {
        const pkg = packages[idx];
        if (!visibleClusterIds.has(pkg.clusterId)) continue;
        if (
          pkg.x >= viewMinX && pkg.x <= viewMaxX &&
          pkg.y >= viewMinY && pkg.y <= viewMaxY
        ) {
          result.add(pkg.id);
        }
      }
    }
  }

  return result;
}
```

Now:

* No `Map` rebuild per query.
* You only touch the packages that are in cells overlapping the viewport.

Combined with your 150ms throttle, this makes viewport culling very cheap.

---

## 3. DOM label system: mostly OK, but you can scale it down on weaker devices

You cap to `MAX_RENDERED_LABELS = 200` and cluster labels ≈ 50. For a desktop, this is fine. On integrated graphics / lower CPU:

### 3.1 Dynamic label count based on zoom

Instead of a fixed 200, make it depend on zoom:

```ts
const currentZoom = useGalaxyStore(s => s.currentZoom);

const maxLabels =
  currentZoom < 14 ? 80 :
  currentZoom < 20 ? 140 :
  200;
```

Then in `PackageLabels` use `maxLabels` instead of a constant.

### 3.2 Optional “performance mode” flag

Add `performanceMode: 'high' | 'low'` to the store and expose a small toggle:

* In `low` mode:

  * `MAX_RENDERED_LABELS` lower (e.g. 80)
  * No cluster labels, or cluster labels only when zoomed far out.
  * Maybe disable selection halo animation (see below).

This gives you a manual “if laptop struggles, flip this and it’s smoother” option.

---

## 4. GPU-side: shaders + antialias

For 10k points your GPU load is *not* scary, even on an iGPU, but a few cheap knobs:

### 4.1 Antialiasing

You currently have:

```tsx
<Canvas gl={{ alpha: false, antialias: true }}>
```

On a laptop with a high-DPI display, this MSAA + high DPR adds cost.

Options:

* Disable MSAA by default:

  ```tsx
  <Canvas gl={{ alpha: false, antialias: false }} dpr={[1, 1.5]} />
  ```

* Or tie it to your “performanceMode”.

### 4.2 Shader complexity

Your fragment shader is relatively complex for a *point sprite*, but still fine for 10k points.

Given that **only one point is selected at a time**, the `sin(time)` pulse and extra glow math only affects a handful of fragments. I’d mark shader optimizations as **nice-to-have, not urgent**.

If you ever need a “low GPU” mode:

* Remove the pulsating outer halo for selection (no `sin`).
* Reduce the number of `if` branches (e.g. no separate inner hover glow when selected).
* Or use a simpler circular gradient for everything.

---

## 5. Search: just add a debounce

Right now:

```ts
useEffect(() => {
  if (query.length > 1) {
    const fuseResults = fuse.search(query).map(r => r.item);
    ...
  } else {
    ...
  }
}, [query, fuse, setSearchQuery, setSearchResults]);
```

Fuse on every keystroke is fine for 10k packages, but:

* On weaker CPUs it can add up, especially with React re-renders + layout.

Add a 150–200 ms debounce around `query`:

```ts
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  const handle = setTimeout(() => setDebouncedQuery(query), 180);
  return () => clearTimeout(handle);
}, [query]);

useEffect(() => {
  if (debouncedQuery.length > 1) {
    const fuseResults = fuse.search(debouncedQuery).map(r => r.item);
    ...
  } else {
    ...
  }
}, [debouncedQuery, fuse, setSearchQuery, setSearchResults]);
```

Nice, simple CPU win.

---

## 6. Small but easy micro-optimizations

These are low priority but basically free:

1. **Color palette memoization**
   Precompute cluster → color map once when clusters load (or first time you see a clusterId), instead of recomputing HSL→HEX for every package in `PackagePoints`.

2. **Visibility filtering O(n) is fine**
   Your `selectedClusterIds` → size attribute scan runs only on user cluster toggles. 10k iterations on an occasional click is totally acceptable; I wouldn’t touch it unless you see issues.

3. **useThree usage**
   Using `useThree()` in your hooks is standard. The main perf concern is not these hooks; it’s the work you do inside them. After the changes above, `useViewportBounds` becomes quite cheap.

---

## 7. Rough priority list (if you want to tackle in order)

If I had to order by **impact on a weak laptop**:

1. **Incremental hover/selection buffer updates** (stop O(n) writes on every hover).
2. **Use spatial index for hover picking + reduce allocations in hover path**.
3. **Remove `packageMap` rebuilding in `queryVisiblePackagesFromGrid` (store indices).**
4. **Add debounce to search.**
5. **Optional quality scaling:**

   * Dynamic label cap
   * Perf mode toggle (labels, antialias, glow animation).
6. **Minor: memoize cluster colors, small GC tweaks in coordinateConversion.**

If you implement 1–3, you should be in a very comfortable spot even on integrated GPUs and midrange laptops. The rest is polish/safety margin.
