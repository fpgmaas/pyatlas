import type { Package } from "../types";

type GridCell = { idxs: number[] };

/**
 * Spatial index for efficient nearest-neighbor queries on packages.
 * Uses a simple grid-based approach that's fast enough for 10k+ points.
 */
export class PackageGrid {
  private grid: Map<string, GridCell> = new Map();
  private cellSize: number;

  constructor(packages: Package[], cellSize: number) {
    this.cellSize = cellSize;
    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      const key = this.keyFor(p.x, p.y);
      if (!this.grid.has(key)) this.grid.set(key, { idxs: [] });
      this.grid.get(key)!.idxs.push(i);
    }
  }

  private keyFor(x: number, y: number): string {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    return `${gx}:${gy}`;
  }

  /**
   * Query all package indices within a given radius of (x, y).
   * Returns indices into the original packages array.
   */
  query(x: number, y: number, radius: number): number[] {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    const r = Math.ceil(radius / this.cellSize);

    const result: number[] = [];
    for (let ix = gx - r; ix <= gx + r; ix++) {
      for (let iy = gy - r; iy <= gy + r; iy++) {
        const key = `${ix}:${iy}`;
        const cell = this.grid.get(key);
        if (cell) result.push(...cell.idxs);
      }
    }
    return result;
  }
}
