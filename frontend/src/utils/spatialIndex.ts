import type { Package } from '../types';

export interface SpatialIndex {
  cellSizeX: number;
  cellSizeY: number;
  minX: number;
  minY: number;
  gridCols: number;
  gridRows: number;
  cells: Map<string, number[]>; // CellKey -> Package indices (not IDs)
}

/**
 * Build a spatial grid index for fast viewport-based package queries.
 *
 * @param packages - All packages to index
 * @param bounds - The overall data bounds (minX, maxX, minY, maxY)
 * @param gridResolution - Number of cells along the longer axis (default 128)
 * @returns A spatial index structure
 */
export function buildSpatialIndex(
  packages: Package[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  gridResolution = 128
): SpatialIndex {
  const { minX, maxX, minY, maxY } = bounds;
  const width = maxX - minX;
  const height = maxY - minY;

  // Use gridResolution for the longer dimension
  const longerDim = Math.max(width, height);
  const cellSize = longerDim / gridResolution;

  const gridCols = Math.ceil(width / cellSize);
  const gridRows = Math.ceil(height / cellSize);

  const cells = new Map<string, number[]>();

  // Assign each package to its grid cell (storing indices, not IDs)
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

/**
 * Query which packages are visible in the given viewport using the spatial index.
 *
 * @param spatialIndex - The spatial index
 * @param packages - All packages (accessed by index directly)
 * @param visibleClusterIds - Only consider packages from these clusters
 * @param viewport - The viewport bounds
 * @param padding - Extra padding around viewport
 * @returns Set of package IDs that are visible
 */
export function queryVisiblePackagesFromGrid(
  spatialIndex: SpatialIndex,
  packages: Package[],
  visibleClusterIds: Set<number>,
  viewport: { minX: number; maxX: number; minY: number; maxY: number },
  padding: number
): Set<number> {
  const result = new Set<number>();

  const { cellSizeX, cellSizeY, minX, minY, cells } = spatialIndex;

  // Determine which grid cells overlap the viewport
  const viewMinX = viewport.minX - padding;
  const viewMaxX = viewport.maxX + padding;
  const viewMinY = viewport.minY - padding;
  const viewMaxY = viewport.maxY + padding;

  const startCellX = Math.max(0, Math.floor((viewMinX - minX) / cellSizeX));
  const endCellX = Math.floor((viewMaxX - minX) / cellSizeX);
  const startCellY = Math.max(0, Math.floor((viewMinY - minY) / cellSizeY));
  const endCellY = Math.floor((viewMaxY - minY) / cellSizeY);

  // Iterate over candidate cells
  for (let cellX = startCellX; cellX <= endCellX; cellX++) {
    for (let cellY = startCellY; cellY <= endCellY; cellY++) {
      const key = `${cellX},${cellY}`;
      const indices = cells.get(key);
      if (!indices) continue;

      // Check each package in this cell (direct index access, no map lookup)
      for (const idx of indices) {
        const pkg = packages[idx];

        // Skip packages from hidden clusters
        if (!visibleClusterIds.has(pkg.clusterId)) continue;

        // Final point-in-viewport check (with padding)
        if (
          pkg.x >= viewMinX &&
          pkg.x <= viewMaxX &&
          pkg.y >= viewMinY &&
          pkg.y <= viewMaxY
        ) {
          result.add(pkg.id);
        }
      }
    }
  }

  return result;
}
