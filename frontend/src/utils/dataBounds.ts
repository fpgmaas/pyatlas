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
