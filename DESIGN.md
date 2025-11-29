# Design plan

## 1. Goal & Feel

**Goal:**
A full-page, standalone “PyPI Galaxy” that visualizes ~10k Python packages in 2D space:

* Galaxy-like, slightly animated (“breathing”) and modern.
* Smooth pan/zoom, hover & click tooltips.
* Node size/brightness driven by weekly downloads.
* Cluster labels + filtering.
* Search with autocomplete to jump to a package.
* Static build, hostable on GitHub Pages (pure frontend).

**Stack:**

* **Build:** Vite + React + TypeScript
* **3D/2D rendering:** `@react-three/fiber` + `@react-three/drei` (three.js under the hood)
* **Styling/UI:** Tailwind CSS (or similar)
* **Optional utils:** `fuse.js` for fuzzy search; `zustand` or React context for global state

---

## 2. Data Model & Preprocessing

### 2.1 Source CSVs

* `clustered_dataset.csv`

  * `name`, `summary`, `weekly_downloads`, `x`, `y`, `cluster_id`
* `cluster_metadata.csv`

  * `cluster_id`, `centroid_x`, `centroid_y`, `cluster_label`, `cluster_weekly_downloads` (or similar)
* `cluster_labels.csv`

  * `cluster_id`, `label` (if not already merged)

### 2.2 Preprocessing Script (Python, one-off)

**Goal:** produce 2 JSON files for easy static loading.

1. **packages.json**

   ```jsonc
   [
     {
       "id": 0,
       "name": "fastapi",
       "summary": "Fast (high-performance) web framework...",
       "downloads": 1234567,
       "x": 0.123,
       "y": -1.234,
       "clusterId": 3
     },
     ...
   ]
   ```

2. **clusters.json**

   ```jsonc
   [
     {
       "clusterId": 3,
       "label": "Web APIs & Frameworks",
       "centroidX": 0.05,
       "centroidY": -1.0,
       "downloads": 987654
     },
     ...
   ]
   ```

**Design choices:**

* Normalize `downloads` later in JS (log-scale for node size/brightness).
* Assign a stable color per `clusterId` in the frontend.
* Keep JSON small: only essentials.

---

## 3. High-Level App Architecture

### 3.1 Top-level layout

`App.tsx`:

* `<GalaxyCanvas />` — full-screen R3F canvas.
* `<UIOverlay />` — regular React DOM, absolutely positioned over canvas:

  * Top-left: app title + small info (instructions).
  * Top-center: search bar (with autocomplete dropdown).
  * Right: cluster legend + filters.
  * Bottom/right: selected package detail panel.

Use CSS grid or absolute positioning; canvas should sit behind everything, full viewport.

---

## 4. Visualization Design

### 4.1 Camera & Controls

* **Camera:** orthographic or low-tilt perspective.
* Use `OrbitControls` from `@react-three/drei`:

  * Enable pan and zoom.
  * Limit rotation so the view stays near top-down (very shallow tilt at most).
* Implement a “Reset View” / “Fit to data” control:

  * Precompute bounding box of all `x,y`.
  * On click: animate camera/controls to target position & zoom.

### 4.2 Package Nodes (Galaxy Points)

Component: `<PackagePoints />`

* Use `InstancedMesh` or `Points` for performance:

  * One geometry (e.g. sphere or square sprite).
  * One material with per-instance color & size via attributes or uniforms.
* Position each instance at `(x, y, 0)`.

**Styling:**

* Size based on `downloads`:

  * `size = size_min + size_range * log(downloads + 1) / log(max_downloads + 1)`
* Color based on `clusterId`:

  * Fixed palette (e.g. d3 scheme) → map cluster → color.
* Opacity:

  * Global base opacity ~0.6–0.8 for galaxy feel.
  * On hover/selection, bump opacity/size.

### 4.3 “Breathing” Galaxy Animation

Subtle, non-annoying animation:

* In shader/JS:

  * Apply a small time-based modulation to alpha or size:

    * `size = baseSize * (1 + 0.05 * sin(time * 0.5 + clusterIdOffset))`
* Or apply a soft radial glow using additive blending:

  * Slight halo around points via material settings.

Goal: gentle motion, not distracting.

---

## 5. Labels & Cluster Info

### 5.1 Cluster Labels

Component: `<ClusterLabels />`

* For each cluster in `clusters.json`:

  * Place a label at `(centroidX, centroidY, 0)`.
* Render labels via:

  * `Html` from `@react-three/drei` (DOM overlays anchored to 3D position), or
  * Plain DOM absolutely positioned if you project coords manually.

**Behavior:**

* Only show labels:

  * Above a certain zoom level (i.e. when zoomed out enough, or *in* enough—you can experiment).
  * For clusters currently visible.
* Style:

  * Slight glow or semi-transparent background.
  * Small, non-overwhelming text.

### 5.2 Package Tooltips / Details

* Hover: show a minimal tooltip (name) close to cursor or use `Html` tag near the point.
* Click: set `selectedPackage` in global state; show full details in sidebar:

  * Name
  * Summary
  * Downloads (formatted)
  * Cluster label
  * “Copy `pip install <name>`” button

---

## 6. Interaction Design

### 6.1 Global State

Use React Context or `zustand` for:

* `packages` (array)
* `clusters` (array)
* `visibleClusterIds: Set<number>`
* `selectedPackageId: number | null`
* `searchQuery: string`
* `searchResults: Package[]` (for autocomplete dropdown)

### 6.2 Cluster Filtering

UI: right-side list of cluster labels with colored dots + checkboxes.

Behavior:

* Toggling a cluster:

  * Update `visibleClusterIds`.
  * In `<PackagePoints />`:

    * Either don’t render invisible clusters, or
    * Set their size = 0/opacity = 0.
* Show aggregate info:

  * e.g. downloads per cluster, count of packages.

### 6.3 Search & Autocomplete

UI: search field in top-center overlay.

Logic:

* On input:

  * Use `fuse.js` (or simple `.filter`) to search by `name` (and maybe `summary`).
  * Show dropdown with top N matches.
* On selecting a package:

  * Set `selectedPackageId`.
  * Animate camera to center on that package:

    * Compute its position.
    * Smoothly interpolate camera target and zoom so it feels like flying to that star.
  * Optionally highlight the point (size + color).

---

## 7. Hover & Click Handling

In `<PackagePoints />`:

* Use raycasting (via R3F’s event system) to detect pointer over instance:

  * `onPointerMove` → set `hoveredPackageId`.
  * `onClick` → set `selectedPackageId`.

Visual feedback:

* Hovered point:

  * Slightly larger + brighter.
* Selected point:

  * Larger, maybe white outline / special color.
  * Ensure it stays visible even if cluster filter toggles temporarily (or auto-enable its cluster).

---

## 8. Static Build & GitHub Pages

### 8.1 Vite Config

* Set `base` in `vite.config.ts` to `"/<repo-name>/"` for GitHub Pages.
* Ensure assets (JSON) are placed in `public/`:

  * e.g. `public/data/packages.json`
  * `public/data/clusters.json`

### 8.2 Build & Deploy

* `npm run build` → static `dist/` directory.
* Deploy to GitHub Pages:

  * Either via GitHub Actions workflow or `gh-pages` branch push.

Constraints:

* No server-side logic needed; all JSON fetched with `fetch("/data/packages.json")`.
* Keep JSON under a couple of MB for fast load (10k rows is fine).

---

## 9. Implementation Phases (Step-by-step)

1. **Bootstrap**

   * Vite + React + TS.
   * Add Tailwind, `@react-three/fiber`, `@react-three/drei`.

2. **Basic Galaxy**

   * Load `packages.json`.
   * Render simple point cloud in `<GalaxyCanvas />` (no clusters/animation yet).
   * Pan/zoom working.

3. **Scaling & Colors**

   * Add download-based sizes.
   * Add cluster-based colors.
   * Add subtle “breathing” animation.

4. **UI Overlay**

   * Add static overlay with title + basic info.
   * Add cluster list (no filtering logic yet).

5. **Interaction**

   * Hook up cluster filtering → change visibility in point cloud.
   * Implement hover & click → tooltips and selection panel.

6. **Search**

   * Add search bar + autocomplete via Fuse.
   * Implement “fly to package” camera animation.

7. **Cluster Labels**

   * Load `clusters.json`.
   * Render labels at centroids (visibility based on zoom).

8. **Polish**

   * Galaxy-like background (gradient/vignette).
   * Smooth transitions, easing.
   * Keyboard shortcuts (e.g. `Esc` to clear selection, `R` to reset view).

9. **Static Export**

   * Confirm `npm run build` output works via `npm run preview`.
   * Configure GitHub Pages & verify it works offline as static.

---

If you want, next step we can sketch the actual component tree (`App`, `GalaxyCanvas`, `PackagePoints`, `ClusterLegend`, etc.) and some TypeScript interfaces for `Package`/`Cluster` so you can start wiring code without thinking about structure again.
