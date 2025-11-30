# Layout Overflow Problem Analysis

## Problem Summary

The application has a layout bug where the sidebar + main canvas area exceed the viewport width on larger screens. Observed measurements:

- Window width: **1157px**
- Sidebar: **384px** (`w-96` = 24rem = 384px)
- Canvas container: **972px**
- **Total: 1356px** (199px wider than viewport!)

### Symptoms

1. **PackageDetail clipping**: The detail panel positioned at the bottom-right of the canvas gets cut off; only the left portion is visible
2. **Canvas offset**: When user searches for a package and the camera zooms to it, the target appears offset to the left because the canvas extends beyond the visible viewport
3. **On window resize**: The problem persists or worsens

---

## Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS v4** (using `@import "tailwindcss"` syntax)
- **@react-three/fiber** (Three.js canvas)
- **Vite** as build tool

---

## Complete HTML Structure

### index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>frontend</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### main.tsx

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### index.css

```css
@import "tailwindcss";

:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
```

### tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

## App.tsx - Complete Current Code

```tsx
import { useEffect } from 'react';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { SearchBar } from './components/SearchBar';
import { ClusterLegend } from './components/ClusterLegend';
import { PackageDetail } from './components/PackageDetail';
import { useGalaxyStore } from './store/useGalaxyStore';
import { loadPackages, loadClusters } from './utils/dataLoader';
import { MousePointer2, Mouse, ZoomIn, Menu, X } from 'lucide-react';

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-700/50 relative">
        {/* Close button - mobile only */}
        {onClose && (
          <button
            className="absolute top-4 right-4 lg:hidden
                       text-gray-400 hover:text-white transition-colors
                       p-2 rounded-lg hover:bg-gray-800/50"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        )}
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">PyAtlas</h1>
        <p className="text-gray-400">Explore the top 10,000 packages on PyPI</p>
      </div>

      {/* Controls Section */}
      <div className="px-8 py-4 border-b border-gray-700/30 bg-gray-800/30">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Controls
        </label>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 text-gray-300">
            <ZoomIn className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="lg:hidden">Pinch to zoom</span>
            <span className="hidden lg:inline">Scroll to zoom</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <Mouse className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="lg:hidden">Drag to pan</span>
            <span className="hidden lg:inline">Right click + drag to pan</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <MousePointer2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="lg:hidden">Tap package for details</span>
            <span className="hidden lg:inline">Click package for details</span>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="px-8 py-6 border-b border-gray-700/30">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Search Packages
        </label>
        <SearchBar />
      </div>

      {/* Clusters Section */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Package Clusters
        </label>
        <ClusterLegend />
      </div>
    </div>
  );
}

function App() {
  const { setPackages, setClusters, isSidebarOpen, setSidebarOpen, toggleSidebar } = useGalaxyStore();

  useEffect(() => {
    // Load data on mount
    async function loadData() {
      try {
        const [packages, clusters] = await Promise.all([
          loadPackages(),
          loadClusters(),
        ]);
        setPackages(packages);
        setClusters(clusters);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }

    loadData();
  }, [setPackages, setClusters]);

  return (
    <div className="h-screen w-full bg-black overflow-hidden flex">
      {/* Backdrop overlay - mobile only */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Hamburger menu button - mobile only */}
      {!isSidebarOpen && (
        <button
          className="fixed top-4 left-4 z-50 lg:hidden
                     bg-gray-900/95 backdrop-blur-md
                     p-3 rounded-lg border border-gray-700/50
                     hover:bg-gray-800 transition-colors
                     shadow-xl"
          onClick={() => toggleSidebar()}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Mobile sidebar - fixed overlay */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          w-80
          bg-gray-900/98 backdrop-blur-md
          border-r border-gray-700/50 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:hidden
        `}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Desktop sidebar - normal flex child */}
      <aside
        className="
          hidden lg:flex lg:flex-col
          h-full w-96 flex-shrink-0
          bg-gray-900/98 backdrop-blur-md
          border-r border-gray-700/50 shadow-2xl
        "
      >
        <SidebarContent />
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 h-full relative" style={{ touchAction: 'none' }}>
        <GalaxyCanvas />

        {/* Package Detail - Responsive positioning */}
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 pointer-events-auto z-50">
          <PackageDetail />
        </div>
      </main>
    </div>
  );
}

export default App;
```

---

## GalaxyCanvas.tsx - Complete Code

```tsx
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useDataBounds } from '../hooks/useDataBounds';
import type { Bounds } from '../utils/dataBounds';
import { PackagePoints } from './PackagePoints';
import { HoverLabel } from './HoverLabel';
import { PackageLabels } from './PackageLabels';
import { ClusterLabels } from './ClusterLabels';
import { useCameraAnimation } from '../hooks/useCameraAnimation';
import { useZoomTracker } from '../hooks/useZoomTracker';
import { useViewportBounds } from '../hooks/useViewportBounds';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { CAMERA_ZOOM_LEVELS } from '../utils/cameraConstants';

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

function CameraAnimationController() {
  const { controls } = useThree();
  const { animateTo } = useCameraAnimation();
  const { cameraAnimationRequest, requestCameraAnimation } = useGalaxyStore();
  useZoomTracker();
  useViewportBounds();

  useEffect(() => {
    console.log('[CameraAnimationController] Animation request changed:', cameraAnimationRequest, 'controls:', !!controls);

    // Only process if we have both a request AND controls are ready
    if (cameraAnimationRequest && controls) {
      console.log('[CameraAnimationController] Controls available, executing animation to:',
        { x: cameraAnimationRequest.x, y: cameraAnimationRequest.y, zoom: cameraAnimationRequest.zoom });

      animateTo(
        cameraAnimationRequest.x,
        cameraAnimationRequest.y,
        { zoom: cameraAnimationRequest.zoom }
      );

      console.log('[CameraAnimationController] Clearing animation request');
      requestCameraAnimation(null); // Clear the request
    } else if (cameraAnimationRequest && !controls) {
      console.warn('[CameraAnimationController] Animation requested but controls not ready yet - will retry when controls become available');
      // Don't clear the request - it will be retried when controls becomes truthy
    }
  }, [cameraAnimationRequest, animateTo, requestCameraAnimation, controls]);

  return null;
}

export function GalaxyCanvas() {
  const bounds = useDataBounds();

  if (!bounds) return null; // or loading skeleton

  return (
    <div className="w-full h-full">
      <Canvas gl={{ alpha: false, antialias: true }}>
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

---

## PackageDetail.tsx - Complete Code

```tsx
import { useGalaxyStore } from '../store/useGalaxyStore';
import { X, ExternalLink } from 'lucide-react';
import { formatDownloads } from '../utils/formatDownloads';

export function PackageDetail() {
  const { selectedPackageId, packages, clusters, setSelectedPackageId } = useGalaxyStore();

  const selectedPackage = packages.find(p => p.id === selectedPackageId);
  const cluster = selectedPackage ? clusters.find(c => c.clusterId === selectedPackage.clusterId) : null;

  if (!selectedPackage) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-md rounded-lg px-4 py-4 sm:px-6 sm:py-4 shadow-2xl w-full max-w-md sm:w-96 border border-gray-700/50">
        <p className="text-gray-400 text-sm">Click on a package to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/95 backdrop-blur-md rounded-lg px-4 py-4 sm:px-6 sm:py-4 shadow-2xl w-full max-w-md sm:w-96 border border-gray-700/50 relative">
      {/* Close button - absolute top-right */}
      <button
        onClick={() => setSelectedPackageId(null)}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-800/50"
        aria-label="Close package details"
      >
        <X size={18} />
      </button>

      {/* Package name */}
      <h2 className="text-white text-xl font-bold mb-3 break-words pr-8">
        {selectedPackage.name}
      </h2>

      {/* PyPI link */}
      <a
        href={`https://pypi.org/project/${selectedPackage.name}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 text-sm mb-4"
      >
        View on PyPI <ExternalLink size={14} />
      </a>

      {/* Cluster section */}
      {cluster && (
        <div className="mb-4">
          <label className="text-gray-400 text-xs uppercase tracking-wide mb-1 block">
            Cluster
          </label>
          <p className="text-white text-sm">
            {cluster.label}
          </p>
        </div>
      )}

      {/* Downloads section */}
      <div className="mb-4">
        <label className="text-gray-400 text-xs uppercase tracking-wide mb-1 block">
          Downloads per week
        </label>
        <p className="text-white text-lg font-semibold">
          {formatDownloads(selectedPackage.downloads)}
        </p>
      </div>

      {/* Summary section */}
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide mb-2 block">
          Description
        </label>
        <p className="text-gray-300 text-sm leading-relaxed">
          {selectedPackage.summary || 'No description available'}
        </p>
      </div>
    </div>
  );
}
```

---

## Extracted Layout Classes Summary

### Root Container (App.tsx)

```
className="h-screen w-full bg-black overflow-hidden flex"
```

- `h-screen`: height: 100vh
- `w-full`: width: 100%
- `overflow-hidden`: overflow: hidden
- `flex`: display: flex

### Mobile Sidebar (App.tsx)

```
className={`
  fixed inset-y-0 left-0 z-40
  w-80
  bg-gray-900/98 backdrop-blur-md
  border-r border-gray-700/50 shadow-2xl
  transform transition-transform duration-300 ease-in-out
  ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  lg:hidden
`}
```

- `fixed`: position: fixed
- `inset-y-0`: top: 0; bottom: 0
- `left-0`: left: 0
- `w-80`: width: 20rem (320px)
- `lg:hidden`: display: none at lg breakpoint (1024px+)

### Desktop Sidebar (App.tsx)

```
className="
  hidden lg:flex lg:flex-col
  h-full w-96 flex-shrink-0
  bg-gray-900/98 backdrop-blur-md
  border-r border-gray-700/50 shadow-2xl
"
```

- `hidden`: display: none (below lg)
- `lg:flex lg:flex-col`: display: flex; flex-direction: column (at lg+)
- `h-full`: height: 100%
- `w-96`: width: 24rem (384px)
- `flex-shrink-0`: flex-shrink: 0

### Main Canvas Area (App.tsx)

```
className="flex-1 h-full relative"
style={{ touchAction: 'none' }}
```

- `flex-1`: flex: 1 1 0%
- `h-full`: height: 100%
- `relative`: position: relative

### PackageDetail Wrapper (App.tsx)

```
className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 pointer-events-auto z-50"
```

- `absolute`: position: absolute
- `bottom-4`: bottom: 1rem
- `left-4 right-4`: left: 1rem; right: 1rem (mobile)
- `sm:left-auto sm:right-6`: left: auto; right: 1.5rem (at sm breakpoint 640px+)
- `z-50`: z-index: 50

### GalaxyCanvas Container (GalaxyCanvas.tsx)

```
className="w-full h-full"
```

- `w-full`: width: 100%
- `h-full`: height: 100%

### PackageDetail Component (PackageDetail.tsx)

```
className="bg-gray-900/95 backdrop-blur-md rounded-lg px-4 py-4 sm:px-6 sm:py-4 shadow-2xl w-full max-w-md sm:w-96 border border-gray-700/50 relative"
```

- `w-full`: width: 100%
- `max-w-md`: max-width: 28rem (448px)
- `sm:w-96`: width: 24rem (384px) at sm breakpoint

---

## Visual HTML Tree (Desktop View at lg+ breakpoint)

```
<html>
  <body>                                    <!-- margin: 0; min-width: 320px; min-height: 100vh -->
    <div id="root">
      <div                                  <!-- h-screen w-full overflow-hidden flex -->
        class="h-screen w-full bg-black overflow-hidden flex">

        <!-- Mobile backdrop: hidden at lg+ -->
        <!-- Mobile hamburger: hidden at lg+ -->
        <!-- Mobile sidebar: hidden at lg+ (lg:hidden) -->

        <aside                              <!-- hidden lg:flex lg:flex-col h-full w-96 flex-shrink-0 -->
          class="hidden lg:flex lg:flex-col h-full w-96 flex-shrink-0 ...">
          <div class="flex flex-col h-full">
            <!-- SidebarContent -->
          </div>
        </aside>

        <main                               <!-- flex-1 h-full relative -->
          class="flex-1 h-full relative"
          style="touch-action: none;">

          <div class="w-full h-full">       <!-- GalaxyCanvas wrapper -->
            <canvas>                        <!-- @react-three/fiber Canvas -->
              <!-- Three.js content -->
            </canvas>
          </div>

          <div                              <!-- PackageDetail wrapper -->
            class="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 pointer-events-auto z-50">
            <div                            <!-- PackageDetail component -->
              class="... w-full max-w-md sm:w-96 ...">
              <!-- Package details content -->
            </div>
          </div>

        </main>
      </div>
    </div>
  </body>
</html>
```

---

## Expected vs Actual Layout (Desktop at 1157px viewport)

### Expected

```
|<-- 384px -->|<---------- 773px ---------->|
|             |                              |
|  Sidebar    |       Main Canvas            |
|  (w-96)     |       (flex-1)               |
|             |                              |
|             |   [PackageDetail at          |
|             |    bottom-right]             |
|<---------------- 1157px ------------------>|
```

### Actual (Observed)

```
|<-- 384px -->|<---------- 972px ------------------>|
|             |                                      |
|  Sidebar    |       Main Canvas                   | <-- extends beyond viewport!
|  (w-96)     |       (flex-1)                      |
|             |                                      |
|             |   [PackageDetail                    |
|             |    CLIPPED]                         |
|<---------------- 1157px ------------------>|<-199px->|
                                              ^ hidden/clipped
```

---

## Observed Measurements from DevTools

When inspecting at viewport width 1157px:

| Element | Expected Width | Actual Width |
|---------|----------------|--------------|
| Root flex container | 1157px | 1157px |
| Desktop sidebar | 384px | 384px |
| Main canvas area | 773px | **972px** |
| **Total children** | 1157px | **1356px** |

The flex children exceed the flex container width by **199px**.

---

## The @react-three/fiber Canvas

The `<Canvas>` component from @react-three/fiber creates a `<canvas>` HTML element that fills its parent container. It uses `ResizeObserver` to track container size changes and updates `size.width` and `size.height` accordingly.

The `CameraSetup` component uses these dimensions:

```tsx
const { camera, size } = useThree();
// size.width and size.height come from the container dimensions
const aspect = size.width / size.height;
```

If the container is wider than intended, the camera frustum will be calculated incorrectly, causing the canvas content to appear offset.

---

## Previous Fix Attempts

### Attempt 1: Single sidebar with lg:inset-auto

Changed from:
```
lg:relative lg:translate-x-0 lg:w-96 lg:flex-shrink-0
```

To:
```
lg:relative lg:inset-auto lg:translate-x-0 lg:w-96 lg:flex-shrink-0
```

**Result**: Did not fix the overflow issue.

### Attempt 2: Separate mobile/desktop sidebars + w-full

- Split into two `<aside>` elements (mobile with `lg:hidden`, desktop with `hidden lg:flex`)
- Changed root container from `w-screen` to `w-full`

**Result**: Issue persists. The main canvas area still measures wider than expected.

---

## Questions for Investigation

1. Why does `flex-1` on the main area result in 972px instead of 773px (1157 - 384)?
2. Is there something about the Three.js Canvas that forces a minimum width?
3. Is there a CSS cascade issue where some style is overriding the flex constraints?
4. Could the body's `min-width: 320px` be causing any issues?
5. Is there a Tailwind v4 specific behavior with flex layouts that differs from v3?
6. Could the `hidden lg:flex` toggle be interacting strangely with flex layout calculations?
