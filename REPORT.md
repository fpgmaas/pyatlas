# PyMap Point Visualization System - Technical Analysis Report

## Executive Summary

This is a Three.js/React-based point cloud visualization system for PyPI package relationships. The system renders thousands of packages as interactive 2D points, with hover detection, spatial indexing, camera controls, and shader-based rendering. It uses an orthographic camera with orbit controls and **custom collision detection rather than raycasting** for performance.

---

## 1. Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| 3D Engine | Three.js | 0.181.2 |
| React Integration | @react-three/fiber | 9.4.0 |
| Utilities | @react-three/drei | 10.7.7 |
| State Management | Zustand | 5.0.8 |
| Framework | React + TypeScript | 19.2.0 |
| Build Tool | Vite | 7.2.4 |

**Key Point**: Uses **THREE.Points** geometry with custom shader materials - not deck.gl or regl.

---

## 2. Point Cloud Rendering

### File: `frontend/src/components/PackagePoints.tsx`

Points are rendered using Three.js `BufferGeometry` with multiple attributes:

```typescript
export function PackagePoints() {
  const packages = useGalaxyStore((s) => s.packages);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const hoveredIndex = useGalaxyStore((s) => s.hoveredIndex);
  const selectedPackageId = useGalaxyStore((s) => s.selectedPackageId);

  const { geometry, material, baseSizes } = useMemo(() => {
    const positions = new Float32Array(packages.length * 3);
    const colors = new Float32Array(packages.length * 3);
    const sizes = new Float32Array(packages.length);
    const hovered = new Float32Array(packages.length);
    const selected = new Float32Array(packages.length);
    const sizeMap = precomputeSizes(packages);

    packages.forEach((pkg, i) => {
      positions[i * 3] = pkg.x;
      positions[i * 3 + 1] = pkg.y;
      positions[i * 3 + 2] = 0;

      const color = new THREE.Color(getClusterColor(pkg.clusterId));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = sizeMap.get(pkg.id) || 16;
      hovered[i] = 0;
      selected[i] = 0;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('hovered', new THREE.BufferAttribute(hovered, 1));
    geometry.setAttribute('selected', new THREE.BufferAttribute(selected, 1));

    const material = createPointShaderMaterial();

    const baseSizes = new Map<number, number>();
    packages.forEach((pkg) => {
      baseSizes.set(pkg.id, sizeMap.get(pkg.id) || 16);
    });

    return { geometry, material, baseSizes };
  }, [packages]);

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
    />
  );
}
```

### Buffer Attributes

| Attribute | Type | Purpose |
|-----------|------|---------|
| `position` | vec3 | X, Y coordinates (Z always 0 for 2D) |
| `color` | vec3 | RGB color per point |
| `size` | float | Point size in screen pixels |
| `hovered` | float | Binary flag (0 or 1) for hover state |
| `selected` | float | Binary flag (0 or 1) for selection state |

**Key Design Decisions**:
- All data precomputed as `Float32Array` for GPU upload
- Incremental updates: Only 2 attributes updated when hover/selection changes
- Visibility controlled by setting size to 0 for hidden points

---

## 3. Custom Shader System

### File: `frontend/src/shaders/pointShader.ts`

### Vertex Shader

```glsl
attribute float size;
attribute vec3 color;
attribute float hovered;
attribute float selected;
uniform float time;
varying vec3 vColor;
varying float vHovered;
varying float vSelected;
varying float vTime;

void main() {
  vColor = color;
  vHovered = hovered;
  vSelected = selected;
  vTime = time;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Increase point size for selected or hovered points to accommodate glow
  float pointSize = size;
  if (selected > 0.5) {
    pointSize = size * 2.0; // Double the size for selection glow
  } else if (hovered > 0.5) {
    pointSize = size * 1.3; // Slightly larger for hover glow
  }

  gl_PointSize = pointSize;
  gl_Position = projectionMatrix * mvPosition;
}
```

### Fragment Shader

```glsl
varying vec3 vColor;
varying float vHovered;
varying float vSelected;
varying float vTime;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(center);

  if (vSelected > 0.5) {
    if (dist > 0.5) {
      discard;
    }

    // Animation parameters
    float pulseSpeed = 2.0;
    float pulseAmount = 0.1;
    float pulse = 1.0 + pulseAmount * sin(vTime * pulseSpeed);

    vec4 finalColor = vec4(0.0, 0.0, 0.0, 0.0);

    // Selection glow between radius 0.25 and 0.35
    if (dist > 0.25 && dist <= 0.35) {
      float glowDist = dist - 0.25;
      float maxGlowRadius = 0.1 * pulse;
      float glowAlpha = 1.0 - smoothstep(0.0, maxGlowRadius, glowDist);
      glowAlpha *= 0.8 + 0.2 * sin(vTime * pulseSpeed);
      glowAlpha = glowAlpha * 0.9;
      finalColor = vec4(1.0, 1.0, 1.0, glowAlpha);
    }

    // Hover glow on top of selection glow
    if (vHovered > 0.5 && dist > 0.25 && dist <= 0.32) {
      float glowDist = dist - 0.25;
      float maxGlowRadius = 0.07;
      float hoverAlpha = 1.0 - smoothstep(0.0, maxGlowRadius, glowDist);
      hoverAlpha = hoverAlpha * 0.7;
      finalColor.rgb = mix(finalColor.rgb, vec3(1.0, 1.0, 1.0), hoverAlpha);
      finalColor.a = max(finalColor.a, hoverAlpha);
    }

    // Main point at radius 0.25
    if (dist <= 0.25) {
      finalColor = vec4(vColor, 0.5);
    }

    gl_FragColor = finalColor;
  } else {
    // Normal (non-selected) points
    float pointRadius = vHovered > 0.5 ? 0.385 : 0.5;

    if (dist > 0.5) {
      discard;
    }

    vec4 finalColor = vec4(vColor, 0.5);

    // Hover glow for normal points
    if (vHovered > 0.5 && dist > pointRadius && dist <= 0.5) {
      float glowDist = dist - pointRadius;
      float maxGlowRadius = 0.115;
      float hoverAlpha = 1.0 - smoothstep(0.0, maxGlowRadius, glowDist);
      hoverAlpha = hoverAlpha * 0.7;
      finalColor = vec4(1.0, 1.0, 1.0, hoverAlpha);
    }

    if (dist <= pointRadius) {
      finalColor = vec4(vColor, 0.5);
    }

    gl_FragColor = finalColor;
  }
}
```

### Shader Radius Management

| State | Main Point Radius | Glow Radius | Total Size Multiplier |
|-------|-------------------|-------------|----------------------|
| Normal | 0.5 | N/A | 1.0x |
| Hovered | 0.385 | 0.385-0.5 | 1.3x |
| Selected | 0.25 | 0.25-0.35 | 2.0x |
| Selected + Hovered | 0.25 | 0.25-0.32 | 2.0x |

---

## 4. Hover Logic - The Core Issue Area

### File: `frontend/src/hooks/usePointHover.ts`

**Critical Design Decision**: This system does **NOT use Three.js raycasting**. Instead it uses:
1. Native canvas pointer events
2. Custom spatial index lookup
3. Manual orthographic camera unproject math

### Full Hook Implementation

```typescript
export function usePointHover({
  packages,
  spatialIndex,
  selectedClusterIds,
  baseSizes,
  setHoveredIndex,
  onClickIndex,
}: UsePointHoverOptions): void {
  const { camera, size, gl, controls } = useThree();
  const canvasRectRef = useRef<DOMRect | null>(null);
  const lastHoverCheckRef = useRef<number>(0);
  const hoveredIndexRef = useRef<number | null>(null);

  // Click detection state
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Configuration constants
  const HOVER_THROTTLE_MS = 32;      // ~31 checks/sec
  const CLICK_MAX_DURATION_MS = 300;
  const CLICK_MAX_DISTANCE_PX = 5;
```

### Manual Orthographic Unproject (Potential Problem Area)

```typescript
const handlePointerMove = useCallback(
  (event: PointerEvent) => {
    const now = performance.now();

    // Throttle: skip if we checked recently
    if (now - lastHoverCheckRef.current < HOVER_THROTTLE_MS) {
      return;
    }
    lastHoverCheckRef.current = now;

    if (!spatialIndex) {
      return;
    }

    const rect = canvasRectRef.current || gl.domElement.getBoundingClientRect();

    // Manual orthographic unproject (more reliable than Three.js unproject with native events)
    // Three.js unproject() relies on camera matrices which may be stale outside R3F's render loop
    const ortho = camera as THREE.OrthographicCamera;
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // For orthographic camera: visible width/height = frustum size / zoom
    const visibleWidth = (ortho.right - ortho.left) / ortho.zoom;
    const visibleHeight = (ortho.top - ortho.bottom) / ortho.zoom;

    // Get the view center from OrbitControls target (not camera position)
    // OrbitControls moves the target when panning, which determines the view center
    const target = (controls as any)?.target;
    const centerX = target?.x ?? ortho.position.x;
    const centerY = target?.y ?? ortho.position.y;

    // World position = view center + NDC * half visible size
    const worldX = centerX + ndcX * (visibleWidth / 2);
    const worldY = centerY + ndcY * (visibleHeight / 2);
```

**Potential Issues with this approach**:
1. Relies on `controls.target` which may not always be in sync
2. Manual math must account for all camera state changes
3. Bypasses Three.js's built-in coordinate transformation pipeline

### Spatial Index Collision Detection

```typescript
    // Determine which grid cell the mouse is in
    const { cellSizeX, cellSizeY, minX, minY, cells } = spatialIndex;
    const cellX = Math.floor((worldX - minX) / cellSizeX);
    const cellY = Math.floor((worldY - minY) / cellSizeY);

    // Collect candidate indices from this cell and neighbors
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

    // Only test candidates from nearby cells (typically 20-100 points, not 10k)
    for (const idx of candidateIndices) {
      const pkg = packages[idx];

      // Skip invisible points
      if (!selectedClusterIds.has(pkg.clusterId)) continue;

      // Calculate world-space distance
      const dx = pkg.x - worldX;
      const dy = pkg.y - worldY;
      const worldDistance = Math.sqrt(dx * dx + dy * dy);

      // Convert point radius from screen pixels to world units
      // For orthographic: screen pixels * (world units per pixel)
      const screenRadius = (baseSizes.get(pkg.id) || 16) / 2;
      const worldRadius = screenRadius * visibleWidth / size.width;

      if (worldDistance < worldRadius && worldDistance < closestDistance) {
        closestDistance = worldDistance;
        closestIndex = idx;
      }
    }

    if (closestIndex !== -1) {
      document.body.style.cursor = 'pointer';
      setHoveredIndexAndRef(closestIndex);
    } else {
      document.body.style.cursor = 'default';
      setHoveredIndexAndRef(null);
    }
  },
  [spatialIndex, packages, selectedClusterIds, baseSizes, setHoveredIndexAndRef, camera, size, gl, controls]
);
```

### Click Detection Logic

```typescript
const handlePointerDown = useCallback((event: PointerEvent) => {
  pointerDownRef.current = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
  };
}, []);

const handlePointerUp = useCallback(
  (event: PointerEvent) => {
    const down = pointerDownRef.current;
    if (!down) return;

    const duration = performance.now() - down.time;
    const dx = Math.abs(event.clientX - down.x);
    const dy = Math.abs(event.clientY - down.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if this qualifies as a click (short duration, minimal movement)
    if (duration < CLICK_MAX_DURATION_MS && distance < CLICK_MAX_DISTANCE_PX) {
      const currentHovered = hoveredIndexRef.current;
      if (currentHovered !== null && onClickIndex) {
        onClickIndex(currentHovered);
      }
    }

    pointerDownRef.current = null;
  },
  [onClickIndex]
);
```

### Event Listener Setup

```typescript
useEffect(() => {
  const canvas = gl.domElement;

  // Cache bounding rect
  canvasRectRef.current = canvas.getBoundingClientRect();
  const handleResize = () => {
    canvasRectRef.current = canvas.getBoundingClientRect();
  };

  window.addEventListener('resize', handleResize);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointerup', handlePointerUp);

  return () => {
    window.removeEventListener('resize', handleResize);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerleave', handlePointerLeave);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointerup', handlePointerUp);
  };
}, [gl, handlePointerMove, handlePointerLeave, handlePointerDown, handlePointerUp]);
```

---

## 5. Camera Setup

### File: `frontend/src/components/GalaxyCanvas.tsx`

```typescript
export function GalaxyCanvas() {
  const bounds = useDataBounds();

  if (!bounds) return null;

  return (
    <div className="w-full h-full">
      <Canvas gl={{ alpha: false, antialias: false }} dpr={[1, 1.5]} >
        <color attach="background" args={['#0a0a0a']} />

        <OrthographicCamera
          makeDefault
          position={[bounds.centerX, bounds.centerY, 10]}
          zoom={1.6}
        />

        <CameraSetup bounds={bounds} />

        <OrbitControls
          makeDefault
          target={[bounds.centerX, bounds.centerY, 0]}
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          minZoom={0.5}
          maxZoom={40}
          zoomSpeed={2.5}
          panSpeed={1}
          touches={{
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_PAN
          }}
          zoomToCursor={true}
          mouseButtons={{
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }}
        />

        <ambientLight intensity={0.8} />

        <CameraAnimationController />
        <PackagePoints />
        <HoverLabel />
        <PackageLabels />
        <ClusterLabels />
      </Canvas>
    </div>
  );
}
```

### Camera Configuration Summary

| Property | Value | Purpose |
|----------|-------|---------|
| Type | OrthographicCamera | 2D visualization |
| Initial Position | Data center at Z=10 | View all data |
| Initial Zoom | 1.6x | Comfortable initial view |
| Zoom Range | 0.5x to 40x | Wide range for exploration |
| Rotation | Disabled | Keep 2D orientation |
| Pan | All mouse buttons | Easy navigation |
| Zoom to Cursor | Enabled | Natural zoom behavior |

### CameraSetup Component - Frustum Management

```typescript
function CameraSetup({ bounds }: { bounds: Bounds }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const updateCamera = () => {
      if (camera.type !== 'OrthographicCamera') return;
      const cam = camera as THREE.OrthographicCamera;

      const aspect = size.width / size.height;
      const padding = 0.5;
      const viewWidth = bounds.width + padding * 2;
      const viewHeight = bounds.height + padding * 2;

      if (aspect > viewWidth / viewHeight) {
        cam.top = viewHeight / 2;
        cam.bottom = -viewHeight / 2;
        cam.left = -(viewHeight / 2) * aspect;
        cam.right = (viewHeight / 2) * aspect;
      } else {
        cam.left = -viewWidth / 2;
        cam.right = viewWidth / 2;
        cam.top = (viewWidth / 2) / aspect;
        cam.bottom = -(viewWidth / 2) / aspect;
      }

      cam.updateProjectionMatrix();
    };

    updateCamera();
  }, [camera, size, bounds]);

  return null;
}
```

---

## 6. OrbitControls Configuration

From `@react-three/drei`:

```typescript
<OrbitControls
  makeDefault
  target={[bounds.centerX, bounds.centerY, 0]}
  enableRotate={false}
  enablePan={true}
  enableZoom={true}
  minZoom={0.5}
  maxZoom={40}
  zoomSpeed={2.5}
  panSpeed={1}
  touches={{
    ONE: THREE.TOUCH.PAN,
    TWO: THREE.TOUCH.DOLLY_PAN
  }}
  zoomToCursor={true}
  mouseButtons={{
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }}
/>
```

**Key Settings**:
- `makeDefault`: Makes this the default controls accessible via `useThree().controls`
- `target`: The point the camera orbits around / the view center
- `enableRotate: false`: Locks to 2D view
- `zoomToCursor: true`: Zooms toward mouse position

**Interaction with Hover Logic**:
- The hover logic reads `controls.target` to determine the view center
- When panning, `controls.target` moves but `camera.position` may not update immediately
- This creates a potential sync issue between camera state and hover calculations

---

## 7. Spatial Index System

### File: `frontend/src/utils/spatialIndex.ts`

### Data Structure

```typescript
export interface SpatialIndex {
  cellSizeX: number;
  cellSizeY: number;
  minX: number;
  minY: number;
  gridCols: number;
  gridRows: number;
  cells: Map<string, number[]>; // CellKey -> Package indices (not IDs)
}
```

### Grid Building

```typescript
export function buildSpatialIndex(
  packages: Package[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  gridResolution = 128
): SpatialIndex {
  const { minX, maxX, minY, maxY } = bounds;
  const width = maxX - minX;
  const height = maxY - minY;

  const longerDim = Math.max(width, height);
  const cellSize = longerDim / gridResolution;

  const gridCols = Math.ceil(width / cellSize);
  const gridRows = Math.ceil(height / cellSize);

  const cells = new Map<string, number[]>();

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const cellX = Math.floor((pkg.x - minX) / cellSize);
    const cellY = Math.floor((pkg.y - minY) / cellSize);
    const key = `${cellX},${cellY}`;

    const existing = cells.get(key);
    if (existing) {
      existing.push(i);
    } else {
      cells.set(key, [i]);
    }
  }

  return {
    cellSizeX: cellSize,
    cellSizeY: cellSize,
    minX,
    minY,
    gridCols,
    gridRows,
    cells,
  };
}
```

**Performance Characteristics**:
- Grid resolution: 32 cells along longest dimension
- Storage: Array indices for O(1) lookup
- Query complexity: O(9 cells * avg points per cell) instead of O(n)

---

## 8. State Management

### File: `frontend/src/store/useGalaxyStore.ts`

```typescript
interface GalaxyStore {
  // Data
  packages: Package[];
  clusters: Cluster[];
  spatialIndex: SpatialIndex | null;

  // Visibility and selection
  selectedClusterIds: Set<number>;    // User-controlled: which clusters to show
  visibleClusterIds: Set<number>;     // Viewport-based: which clusters are in view
  visiblePackageIds: Set<number>;     // Viewport-based: which packages are in view
  selectedPackageId: number | null;   // Currently selected package
  hoveredIndex: number | null;        // Currently hovered package (by array index!)

  // Search
  searchQuery: string;
  searchResults: Package[];

  // Camera
  currentZoom: number;
  viewportBounds: ViewportBounds | null;
  cameraAnimationRequest: CameraAnimationRequest | null;

  // UI
  shouldShowLabels: boolean;
  isSidebarOpen: boolean;

  // Actions
  setPackages: (packages: Package[]) => void;
  setClusters: (clusters: Cluster[]) => void;
  setHoveredIndex: (index: number | null) => void;
  // ... etc
}
```

**Important**: `hoveredIndex` stores the **array index** (0-based position in packages array), not the package ID. This enables direct array access for GPU buffer updates.

---

## 9. Camera Animation System

### File: `frontend/src/hooks/useCameraAnimation.ts`

```typescript
export function useCameraAnimation() {
  const three = useThree();
  const targetPosition = useRef<THREE.Vector3 | null>(null);
  const targetZoom = useRef<number | null>(null);
  const startPosition = useRef(new THREE.Vector3());
  const startZoom = useRef(1);
  const progress = useRef(0);
  const animationDuration = useRef(1000);
  const easingFunction = useRef<EasingFunction>(cubicInOut);

  useFrame((_state, delta) => {
    if (!targetPosition.current || !targetZoom.current) return;

    progress.current += (delta * 1000) / animationDuration.current;
    const t = Math.min(progress.current, 1);
    const eased = easingFunction.current(t);

    if (three.controls) {
      // @ts-expect-error - controls.target exists on OrbitControls
      three.controls.target.lerpVectors(startPosition.current, targetPosition.current, eased);
    }

    if (three.camera.type === 'OrthographicCamera') {
      (three.camera as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(
        startZoom.current,
        targetZoom.current,
        eased
      );
      three.camera.updateProjectionMatrix();
    }

    if (t >= 1) {
      targetPosition.current = null;
      targetZoom.current = null;
      progress.current = 0;
    }
  });

  const animateTo = useCallback((x: number, y: number, optionsOrZoom?: CameraAnimationOptions | number) => {
    // ... animation setup
  }, [three]);

  return { animateTo };
}
```

**Potential Issue**: Animation modifies `controls.target` directly, which may not trigger camera matrix updates that the hover logic depends on.

---

## 10. Viewport Tracking

### File: `frontend/src/hooks/useViewportBounds.ts`

```typescript
function computeBounds(
  cam: THREE.OrthographicCamera,
  controls: any
): ViewportBounds {
  const centerX = controls?.target?.x ?? cam.position.x;
  const centerY = controls?.target?.y ?? cam.position.y;

  return {
    minX: centerX + cam.left / cam.zoom,
    maxX: centerX + cam.right / cam.zoom,
    minY: centerY + cam.bottom / cam.zoom,
    maxY: centerY + cam.top / cam.zoom,
  };
}
```

This uses the same calculation pattern as the hover logic - both rely on `controls.target`.

---

## 11. Data Types

### File: `frontend/src/types/index.ts`

```typescript
export interface Package {
  id: number;
  name: string;
  summary: string;
  downloads: number;
  x: number;
  y: number;
  clusterId: number;
}

export interface Cluster {
  clusterId: number;
  label: string;
  centroidX: number;
  centroidY: number;
  downloads: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}
```

---

## 12. Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/hooks/usePointHover.ts` | Hover detection, click handling, spatial index queries |
| `frontend/src/components/PackagePoints.tsx` | Three.js Points geometry, shader material, GPU buffer management |
| `frontend/src/shaders/pointShader.ts` | Vertex/fragment shaders for point rendering, glow effects |
| `frontend/src/components/GalaxyCanvas.tsx` | Scene setup, camera, orbit controls configuration |
| `frontend/src/hooks/useCameraAnimation.ts` | Smooth camera panning and zooming with easing |
| `frontend/src/utils/spatialIndex.ts` | Grid-based spatial indexing for fast queries |
| `frontend/src/store/useGalaxyStore.ts` | Zustand state management for all UI and data state |
| `frontend/src/hooks/useZoomTracker.ts` | Zoom level tracking for label visibility |
| `frontend/src/hooks/useViewportBounds.ts` | Viewport culling and cluster/label visibility |
| `frontend/src/utils/sizeScaling.ts` | Point size calculation based on download counts |

---

## 13. Identified Complexity & Potential Issues

### Issue 1: Manual Coordinate Transformation

The hover logic bypasses Three.js's coordinate transformation system:

```typescript
// Manual orthographic unproject
const visibleWidth = (ortho.right - ortho.left) / ortho.zoom;
const visibleHeight = (ortho.top - ortho.bottom) / ortho.zoom;
const centerX = target?.x ?? ortho.position.x;
const centerY = target?.y ?? ortho.position.y;
const worldX = centerX + ndcX * (visibleWidth / 2);
const worldY = centerY + ndcY * (visibleHeight / 2);
```

**Problems**:
- Must be kept in sync with all camera/controls behavior
- Doesn't use `camera.updateMatrixWorld()` or `camera.matrixWorldInverse`
- Fallback to `camera.position` when `controls.target` unavailable may be wrong

### Issue 2: OrbitControls Target Dependency

Multiple systems read `controls.target`:
1. `usePointHover` - for hover detection
2. `useViewportBounds` - for viewport culling
3. `useCameraAnimation` - writes to target during animation

If these fall out of sync or if OrbitControls internal state doesn't match expected behavior, hover detection breaks.

### Issue 3: Screen-to-World Size Conversion

```typescript
const screenRadius = (baseSizes.get(pkg.id) || 16) / 2;
const worldRadius = screenRadius * visibleWidth / size.width;
```

This assumes:
- `visibleWidth` is correctly calculated
- `size.width` is current canvas width
- The relationship between screen pixels and world units is linear (true for orthographic, but implementation must be correct)

### Issue 4: Event Listener Lifecycle

Native event listeners are attached directly to the canvas:

```typescript
canvas.addEventListener('pointermove', handlePointerMove);
```

This bypasses React Three Fiber's event system and may conflict with OrbitControls' own event handling.

### Issue 5: Throttling May Miss State Changes

```typescript
if (now - lastHoverCheckRef.current < HOVER_THROTTLE_MS) {
  return;
}
```

During fast panning, the throttle may cause hover state to lag behind the actual mouse position.

---

## 14. Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Input                                │
│                    (Native Pointer Events)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    usePointHover Hook                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Throttle check (32ms)                                  │   │
│  │ 2. Manual NDC calculation from clientX/clientY            │   │
│  │ 3. Manual orthographic unproject using:                   │   │
│  │    - controls.target (for view center)                    │   │
│  │    - camera.left/right/top/bottom/zoom (for frustum)      │   │
│  │ 4. Spatial index grid cell lookup                         │   │
│  │ 5. Distance-based collision in world space                │   │
│  │ 6. Screen-to-world size conversion for hit radius         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Zustand Store                                 │
│                  setHoveredIndex(index)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PackagePoints Component                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Update hovered attribute in BufferGeometry               │   │
│  │ (2 float values: old index = 0, new index = 1)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Fragment Shader                               │
│             Renders glow effect based on hovered flag            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. Questions for External Review

1. **Is manual coordinate transformation necessary?** Would using Three.js's built-in `Raycaster.setFromCamera()` or `camera.unproject()` be more reliable?

2. **Should we use R3F's event system?** React Three Fiber provides `onPointerMove`, `onPointerOver`, etc. on meshes. Would this be cleaner than native event listeners?

3. **Is the spatial index approach optimal?** For ~10k points, is a grid the right choice vs. a quadtree or BVH?

4. **How should we handle OrbitControls target synchronization?** Is there a better pattern for ensuring camera state is always correct when reading it?

5. **Should hover detection run in useFrame instead?** This would guarantee camera matrices are up-to-date.

6. **Is the screen-to-world radius calculation correct?** The formula `screenRadius * visibleWidth / size.width` - is this the right approach for orthographic cameras?

---

## 16. Summary of Technologies Used

| Concern | Technology | Approach |
|---------|------------|----------|
| Rendering | THREE.Points + Custom Shaders | GPU-accelerated point sprites |
| Hit Detection | Manual world-space distance | No raycasting |
| Spatial Acceleration | Grid-based index (32x32) | O(constant) lookup |
| Camera | OrthographicCamera | 2D visualization |
| Controls | OrbitControls (drei) | Pan/zoom only |
| Events | Native pointer events | Bypass R3F event system |
| State | Zustand | Centralized store |
| Coordinate Transform | Manual calculation | Bypasses Three.js matrices |

---

## 17. Recommendations for Review

The external reviewer should evaluate:

1. **Correctness of the manual unproject math** - is the formula `worldX = centerX + ndcX * (visibleWidth / 2)` correct for all camera states?

2. **Event handling architecture** - should this use R3F events, Three.js Raycaster, or stick with the current native events + spatial index approach?

3. **State synchronization** - how to ensure camera state read in hover logic matches the rendered state?

4. **Performance vs. Simplicity tradeoff** - is the current approach worth the complexity, or would a simpler Raycaster-based solution be adequate for 10k points?
