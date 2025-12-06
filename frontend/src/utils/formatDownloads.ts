/**
 * Format download count to human-readable format (e.g., 1.2M, 345K)
 */
export function formatDownloads(downloads: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });

  return formatter.format(downloads);
}
