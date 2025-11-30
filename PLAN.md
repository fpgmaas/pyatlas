# 2D Scatter Plot Implementation Plan

## Overview

Convert the PyAtlas frontend from 3D visualization to a 2D scatter plot using Three.js in orthographic mode, matching the Python Plotly implementation while maintaining the existing React/Three.js infrastructure.

## Key Requirements

- **Rendering**: Three.js with orthographic camera (2D mode)
- **Data**: ~10,000 packages with x/y coordinates, 192 cluster labels
- **Styling**: Log-scaled point sizes (16-128px), cluster-based colors, 0.5 opacity
- **Labels**: Text annotations at cluster centroids
- **Interactions**: Pan/zoom, hover tooltips, click selection, search with camera animation

## Data Analysis

- **Packages**: 10,000 items at `/home/fpgmaas/git/pyatlas/data/packages.json`
- **Clusters**: 192 clusters at `/home/fpgmaas/git/pyatlas/data/clusters.json`
- **Coordinate bounds**: X [-3.07, 1.29], Y [1.44, 5.95]
- **Downloads range**: [24,951 to 338,140,687]
- **Size formula**: `log10(downloads+1)` scaled to 16-128px (from `plot_with_labels.py`)

## Implementation Steps

### 1. Create Utility Functions

**File: `/home/fpgmaas/git/pyatlas/frontend/src/utils/colorPalette.ts` (NEW)**

```typescript
const GOLDEN_ANGLE = 137.508;

export function getClusterColor(clusterId: number): string {
  if (clusterId === -1) return '#808080'; // Gray for noise
  const hue = (clusterId * GOLDEN_ANGLE) % 360;
  return hslToHex(hue, 70, 50);
}

function hslToHex(h: number, s: number, l: number): string {
  // Convert HSL to hex implementation
}
```

**Rationale**: Generate 192+ distinguishable colors using golden angle spacing for optimal visual separation.

---

**File: `/home/fpgmaas/git/pyatlas/frontend/src/utils/sizeScaling.ts` (NEW)**

```typescript
export function calculatePointSize(
  downloads: number,
  minDownloads: number,
  maxDownloads: number,
  minSize = 16,
  maxSize = 128,
  gamma = 1
): number {
  const logDl = Math.log10(downloads + 1);
  const logMin = Math.log10(minDownloads + 1);
  const logMax = Math.log10(maxDownloads + 1);
  const norm = Math.pow((logDl - logMin) / (logMax - logMin || 1), gamma);
  return minSize + (maxSize - minSize) * Math.max(0, Math.min(1, norm));
}

export function precomputeSizes(packages: Package[]): Map<number, number> {
  const downloads = packages.map(p => p.downloads);
  const minDownloads = Math.min(...downloads);
  const maxDownloads = Math.max(...downloads);
  const sizeMap = new Map();
  packages.forEach(pkg => {
    sizeMap.set(pkg.id, calculatePointSize(pkg.downloads, minDownloads, maxDownloads));
  });
  return sizeMap;
}
```

**Rationale**: Matches Python implementation exactly (from `plot_with_labels.py` lines 33-49).

### 2. Create Data Bounds Utilities

**File: `/home/fpgmaas/git/pyatlas/frontend/src/utils/dataBounds.ts` (NEW)**

```typescript
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

export interface Package {
  x: number;
  y: number;
}

export function computeBounds(packages: Package[]): Bounds | null {
  if (!packages.length) return null;

  let minX = packages[0].x;
  let maxX = packages[0].x;
  let minY = packages[0].y;
  let maxY = packages[0].y;

  for (const p of packages) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}
```

**Rationale**: Dynamic bounds computation makes the visualization robust to data changes (UMAP regeneration, filtering, subset views). No hardcoded coordinates that break when data changes.

---

**File: `/home/fpgmaas/git/pyatlas/frontend/src/hooks/useDataBounds.ts` (NEW)**

```typescript
import { useMemo } from 'react';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { computeBounds } from '../utils/dataBounds';

export function useDataBounds() {
  const { packages } = useGalaxyStore();
  return useMemo(() => computeBounds(packages), [packages]);
}
```

**Rationale**: React hook provides memoized bounds that automatically update when package data changes.

---

### 3. Update Camera Setup

**File: `/home/fpgmaas/git/pyatlas/frontend/src/components/GalaxyCanvas.tsx` (MODIFY)**

Replace perspective camera with orthographic, using dynamic bounds:

```tsx
import { useDataBounds } from '../hooks/useDataBounds';

export function GalaxyCanvas() {
  const bounds = useDataBounds();

  if (!bounds) return null; // or loading skeleton

  return (
    <div className="fixed inset-0 w-full h-full">
      <Canvas gl={{ alpha: false, antialias: true }}>
        <color attach="background" args={['#0a0a0a']} />

        <OrthographicCamera
          makeDefault
          position={[bounds.centerX, bounds.centerY, 10]}
          zoom={1}
        />

        <CameraSetup bounds={bounds} />

        <OrbitControls
          target={[bounds.centerX, bounds.centerY, 0]}
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          minZoom={0.5}
          maxZoom={20}
          zoomSpeed={0.5}
          panSpeed={0.8}
        />

        <ambientLight intensity={0.8} />

        <PackagePoints />
        <ClusterLabels />
      </Canvas>
    </div>
  );
}
```

Add responsive camera bounds handler to maintain proper aspect ratio:

```tsx
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

**Note**: Using `size.width / size.height` from `useThree()` is more robust than `gl.domElement.width/height`.

### 4. Create Point Cloud Component

**File: `/home/fpgmaas/git/pyatlas/frontend/src/components/PackagePoints.tsx` (NEW)**

```tsx
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { getClusterColor } from '../utils/colorPalette';
import { precomputeSizes } from '../utils/sizeScaling';

export function PackagePoints() {
  const { packages, visibleClusterIds, selectedPackageId, setSelectedPackageId } = useGalaxyStore();
  const pointsRef = useRef<THREE.Points>(null);

  // Precompute positions, colors, sizes
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(packages.length * 3);
    const colors = new Float32Array(packages.length * 3);
    const sizes = new Float32Array(packages.length);
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
    });

    return { positions, colors, sizes };
  }, [packages]);

  // Handle visibility filtering
  useEffect(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const sizeAttr = geom.attributes.size as THREE.BufferAttribute;

    packages.forEach((pkg, i) => {
      const baseSize = sizes[i];
      const visible = visibleClusterIds.has(pkg.clusterId);
      sizeAttr.setX(i, visible ? baseSize : 0);
    });
    sizeAttr.needsUpdate = true;
  }, [visibleClusterIds, packages, sizes]);

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.index !== undefined) {
      document.body.style.cursor = 'pointer';
      // Could set hovered state here for tooltip
    }
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.index !== undefined) {
      setSelectedPackageId(packages[event.index].id);
    }
  };

  return (
    <points
      ref={pointsRef}
      onPointerMove={handlePointerMove}
      onPointerOut={() => document.body.style.cursor = 'default'}
      onClick={handleClick}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={packages.length} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={packages.length} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={packages.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        opacity={0.5}
        transparent
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  );
}
```

**Key decisions**:
- Use `THREE.Points` for simplicity and performance with 10k points
- `sizeAttenuation={false}` for pixel-based sizing (not world units)
- Update visibility via attribute modification (no geometry rebuild)
- Built-in raycasting for hover/click

**IMPORTANT NOTE**: The default `PointsMaterial` does NOT read the `size` attribute - it only uses the uniform `size` property. To make per-point sizes work, you need either:
1. A custom `ShaderMaterial` that reads `attributes.size` in the vertex shader (see `src/shaders/pointShader.ts`)
2. A library helper that provides per-point size support

The current implementation shows the approach, but will require the custom shader for actual per-point sizing and the "size 0 to hide" visibility trick to work.

### 5. Add Cluster Labels

**File: `/home/fpgmaas/git/pyatlas/frontend/src/components/ClusterLabels.tsx` (NEW)**

```tsx
import { Html } from '@react-three/drei';
import { useGalaxyStore } from '../store/useGalaxyStore';

export function ClusterLabels() {
  const { clusters, visibleClusterIds } = useGalaxyStore();

  return (
    <>
      {clusters
        .filter(c => visibleClusterIds.has(c.clusterId))
        .map(cluster => (
          <Html
            key={cluster.clusterId}
            position={[cluster.centroidX, cluster.centroidY, 0]}
            center
            distanceFactor={10}
            style={{
              fontSize: '12px',
              color: 'black',
              fontFamily: 'Arial, sans-serif',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: '4px',
              padding: '4px 8px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {cluster.label}
          </Html>
        ))}
    </>
  );
}
```

**Rationale**: Html from drei provides exact match to Python styling (white background, border, padding). Simple to implement and performant enough for 192 labels.

### 6. Enhance Search Functionality

**File: `/home/fpgmaas/git/pyatlas/frontend/src/components/SearchBar.tsx` (MODIFY)**

Add Fuse.js integration:

```tsx
import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useGalaxyStore } from '../store/useGalaxyStore';

export function SearchBar() {
  const { packages, setSelectedPackageId } = useGalaxyStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Package[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fuse = useMemo(() => new Fuse(packages, {
    keys: ['name', 'summary'],
    threshold: 0.3,
  }), [packages]);

  useEffect(() => {
    if (query.length > 1) {
      const searchResults = fuse.search(query).slice(0, 10).map(r => r.item);
      setResults(searchResults);
      setShowDropdown(true);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query, fuse]);

  const handleSelect = (pkg: Package) => {
    setSelectedPackageId(pkg.id);
    setQuery('');
    setShowDropdown(false);
    // Camera animation will be added in next step
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search packages..."
        className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none w-64"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg shadow-lg max-h-96 overflow-y-auto z-10">
          {results.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => handleSelect(pkg)}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
            >
              <div className="font-semibold">{pkg.name}</div>
              <div className="text-sm text-gray-400 truncate">{pkg.summary}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 7. Add Camera Animation Hook

**File: `/home/fpgmaas/git/pyatlas/frontend/src/hooks/useCameraAnimation.ts` (NEW)**

```typescript
import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export function useCameraAnimation() {
  const { camera, controls } = useThree();
  const targetPosition = useRef<THREE.Vector3 | null>(null);
  const targetZoom = useRef<number | null>(null);
  const startPosition = useRef(new THREE.Vector3());
  const startZoom = useRef(1);
  const progress = useRef(0);
  const duration = 1000;

  useFrame((state, delta) => {
    if (!targetPosition.current || !targetZoom.current) return;

    progress.current += (delta * 1000) / duration;
    const t = Math.min(progress.current, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    if (controls?.current) {
      controls.current.target.lerpVectors(startPosition.current, targetPosition.current, eased);
    }

    if (camera.type === 'OrthographicCamera') {
      (camera as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(
        startZoom.current,
        targetZoom.current,
        eased
      );
      camera.updateProjectionMatrix();
    }

    if (t >= 1) {
      targetPosition.current = null;
      targetZoom.current = null;
      progress.current = 0;
    }
  });

  const animateTo = useCallback((x: number, y: number, zoom = 5) => {
    if (!controls?.current) return;
    startPosition.current.copy(controls.current.target);
    startZoom.current = (camera as THREE.OrthographicCamera).zoom;
    targetPosition.current = new THREE.Vector3(x, y, 0);
    targetZoom.current = zoom;
    progress.current = 0;
  }, [camera, controls]);

  return { animateTo };
}
```

**IMPORTANT NOTE**: For `useCameraAnimation` to access `controls`, you need to properly wire OrbitControls:
```tsx
// In GalaxyCanvas.tsx
<OrbitControls makeDefault ref={controlsRef} ... />
```

The `makeDefault` prop makes controls available via `useThree((state) => state.controls)`. Without it, `controls?.current` will be undefined and the animation won't work.

Integrate in SearchBar:
```tsx
const { animateTo } = useCameraAnimation();

const handleSelect = (pkg: Package) => {
  setSelectedPackageId(pkg.id);
  animateTo(pkg.x, pkg.y, 8);
  // ...
};
```

### 8. Update UI Components

**File: `/home/fpgmaas/git/pyatlas/frontend/src/components/ClusterLegend.tsx` (MODIFY)**

```tsx
import { useGalaxyStore } from '../store/useGalaxyStore';
import { getClusterColor } from '../utils/colorPalette';

export function ClusterLegend() {
  const { clusters, visibleClusterIds, toggleCluster } = useGalaxyStore();

  const sortedClusters = [...clusters].sort((a, b) => b.downloads - a.downloads);

  return (
    <div className="bg-gray-800 rounded-lg px-4 py-3 shadow-lg max-h-96 overflow-y-auto">
      <h3 className="text-white font-semibold mb-2">Clusters</h3>
      <div className="space-y-1">
        {sortedClusters.map(cluster => (
          <label
            key={cluster.clusterId}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
          >
            <input
              type="checkbox"
              checked={visibleClusterIds.has(cluster.clusterId)}
              onChange={() => toggleCluster(cluster.clusterId)}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getClusterColor(cluster.clusterId) }}
            />
            <span className="text-white text-sm flex-1">{cluster.label}</span>
            <span className="text-gray-400 text-xs">
              {(cluster.downloads / 1e6).toFixed(1)}M
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

---

**File: `/home/fpgmaas/git/pyatlas/frontend/src/components/PackageDetail.tsx` (MODIFY)**

```tsx
import { useGalaxyStore } from '../store/useGalaxyStore';
import { getClusterColor } from '../utils/colorPalette';

export function PackageDetail() {
  const { packages, clusters, selectedPackageId, setSelectedPackageId } = useGalaxyStore();

  if (!selectedPackageId) {
    return (
      <div className="bg-gray-800 rounded-lg px-4 py-3 shadow-lg max-w-sm">
        <p className="text-gray-400 text-sm">Click a package to see details</p>
      </div>
    );
  }

  const pkg = packages.find(p => p.id === selectedPackageId);
  if (!pkg) return null;

  const cluster = clusters.find(c => c.clusterId === pkg.clusterId);

  return (
    <div className="bg-gray-800 rounded-lg px-4 py-3 shadow-lg max-w-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-semibold text-lg">{pkg.name}</h3>
        <button onClick={() => setSelectedPackageId(null)} className="text-gray-400 hover:text-white">×</button>
      </div>

      <p className="text-gray-300 text-sm mb-3">{pkg.summary}</p>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Downloads:</span>
          <span className="text-white">{pkg.downloads.toLocaleString()}</span>
        </div>

        {cluster && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Cluster:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getClusterColor(cluster.clusterId) }} />
              <span className="text-white">{cluster.label}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-400">Position:</span>
          <span className="text-white">({pkg.x.toFixed(2)}, {pkg.y.toFixed(2)})</span>
        </div>
      </div>

      <button
        onClick={() => navigator.clipboard.writeText(`pip install ${pkg.name}`)}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Copy pip install
      </button>
    </div>
  );
}
```

### 9. Data Setup

Ensure data files are available in frontend:

**Option 1: Build script (recommended)**

Update `/home/fpgmaas/git/pyatlas/frontend/package.json`:
```json
{
  "scripts": {
    "prebuild": "mkdir -p public/data && cp ../../data/*.json public/data/",
    "predev": "mkdir -p public/data && cp ../../data/*.json public/data/",
    "dev": "vite",
    "build": "tsc -b && vite build"
  }
}
```

**Option 2: Symlink**
```bash
cd /home/fpgmaas/git/pyatlas/frontend/public
ln -s ../../data data
```

## File Summary

### New Files (9)
1. `src/utils/dataBounds.ts` - Dynamic bounds computation from data
2. `src/hooks/useDataBounds.ts` - React hook for memoized bounds
3. `src/utils/colorPalette.ts` - Cluster color mapping
4. `src/utils/sizeScaling.ts` - Download-based size calculation
5. `src/components/PackagePoints.tsx` - Main scatter plot rendering
6. `src/components/ClusterLabels.tsx` - Cluster label annotations
7. `src/components/HoverTooltip.tsx` - (Optional) Hover tooltips
8. `src/hooks/useCameraAnimation.ts` - Camera transition animations
9. `src/shaders/pointShader.ts` - (Optional) Custom shader for borders

### Modified Files (5)
1. `src/components/GalaxyCanvas.tsx` - Orthographic camera with dynamic bounds
2. `src/components/SearchBar.tsx` - Fuse.js search integration
3. `src/components/ClusterLegend.tsx` - Real cluster data display
4. `src/components/PackageDetail.tsx` - Real package data display
5. `package.json` - Add data copy scripts

## Implementation Order

1. **Setup data utilities** (dataBounds, useDataBounds) - Foundation
2. **Setup rendering utilities** (colorPalette, sizeScaling) - Foundation
3. **Update GalaxyCanvas** (orthographic camera with dynamic bounds) - Core infrastructure
4. **Create PackagePoints** (basic rendering) - MVP visualization
5. **Add ClusterLabels** - Complete visual match to Python
6. **Update UI components** (legend, detail, search) - Interactivity
7. **Add camera animation** - Polish
8. **Test and optimize** - Performance tuning

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Rendering** | THREE.Points | Simpler API, built-in raycasting, good performance for 10k points |
| **Camera** | Orthographic | No perspective distortion, matches Python 1:1 aspect ratio |
| **Labels** | Html from drei | Exact Python styling match, sufficient performance for 192 labels |
| **Colors** | HSL golden angle | 192+ distinguishable colors with good visual separation |
| **Sizing** | sizeAttenuation=false | Pixel-based sizing matching Python (16-128px) |
| **Filtering** | Attribute updates | No geometry rebuild, smooth transitions |

## Critical Files Reference

- `/home/fpgmaas/git/pyatlas/pyatlas/clustering/plot_with_labels.py` - Size/color formulas
- `/home/fpgmaas/git/pyatlas/frontend/src/components/GalaxyCanvas.tsx` - Main canvas
- `/home/fpgmaas/git/pyatlas/frontend/src/store/useGalaxyStore.ts` - State management
- `/home/fpgmaas/git/pyatlas/frontend/src/types/index.ts` - Data model
- `/home/fpgmaas/git/pyatlas/data/packages.json` - Package data (10k items)
- `/home/fpgmaas/git/pyatlas/data/clusters.json` - Cluster data (192 items)
