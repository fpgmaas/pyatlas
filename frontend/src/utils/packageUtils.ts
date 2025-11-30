import type { Package } from '../types';

/**
 * Sort packages by download count in descending order
 * @param packages - Array of packages to sort
 * @param limit - Optional limit for number of packages to return
 * @returns Sorted array of packages (optionally limited)
 */
export function sortByDownloads(packages: Package[], limit?: number): Package[] {
  const sorted = [...packages].sort((a, b) => b.downloads - a.downloads);
  return limit ? sorted.slice(0, limit) : sorted;
}
