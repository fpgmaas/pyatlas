interface Package {
  id: number;
  downloads: number;
}

export function calculatePointSize(
  downloads: number,
  minDownloads: number,
  maxDownloads: number,
  minSize = 12,
  maxSize = 80,
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
