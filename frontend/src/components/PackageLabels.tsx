import { Html } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { useGalaxyStore } from "../store/useGalaxyStore";
import { useIsMobile } from "../hooks/useIsMobile";
import type { Package } from "../types";
import { sortByDownloads } from "../utils/packageUtils";

export function PackageLabels() {
  const packages = useGalaxyStore((s) => s.packages);
  const visiblePackageIds = useGalaxyStore((s) => s.visiblePackageIds);
  const shouldShowLabels = useGalaxyStore((s) => s.shouldShowLabels);
  const currentZoom = useGalaxyStore((s) => s.currentZoom);
  const setLabeledPackageIds = useGalaxyStore((s) => s.setLabeledPackageIds);
  const isMobile = useIsMobile();

  // Dynamic label count based on zoom level - fewer labels on mobile for performance
  const maxLabels = isMobile
    ? currentZoom < 7
      ? 25
      : currentZoom < 12
      ? 35
      : currentZoom < 25
      ? 40
      : 60
    : currentZoom < 7
    ? 50
    : currentZoom < 12
    ? 80
    : 200;

  // Get top N most downloaded packages from all visible packages
  const renderedPackages = useMemo(() => {
    if (visiblePackageIds.size === 0) return [];

    const packageMap = new Map(packages.map((p) => [p.id, p]));
    const visiblePackages = Array.from(visiblePackageIds)
      .map((id) => packageMap.get(id))
      .filter((p): p is Package => p !== undefined);

    const topPackages = sortByDownloads(visiblePackages, maxLabels);

    return topPackages;
  }, [visiblePackageIds, packages, maxLabels]);

  // Update store with which packages have visible labels
  useEffect(() => {
    if (shouldShowLabels) {
      setLabeledPackageIds(new Set(renderedPackages.map((p) => p.id)));
    } else {
      setLabeledPackageIds(new Set());
    }
  }, [renderedPackages, shouldShowLabels, setLabeledPackageIds]);

  if (!shouldShowLabels) return null;

  return (
    <>
      {renderedPackages.map((pkg) => (
        <Html
          key={pkg.id}
          position={[pkg.x, pkg.y, 0]}
          zIndexRange={[0, 0]}
          style={{
            color: "white",
            fontSize: "12px",
            pointerEvents: "none",
            transform: "translate(-50%, 100%)",
            whiteSpace: "nowrap",
          }}
        >
          {pkg.name}
        </Html>
      ))}
    </>
  );
}
