import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { useGalaxyStore } from '../store/useGalaxyStore';
import type { Package } from '../types';
import { sortByDownloads } from '../utils/packageUtils';

export function PackageLabels() {
  const packages = useGalaxyStore((s) => s.packages);
  const visiblePackageIds = useGalaxyStore((s) => s.visiblePackageIds);
  const shouldShowLabels = useGalaxyStore((s) => s.shouldShowLabels);
  const currentZoom = useGalaxyStore((s) => s.currentZoom);

  // Dynamic label count based on zoom level - fewer labels at lower zoom for performance
  const maxLabels =
    currentZoom < 14 ? 80 :
    currentZoom < 20 ? 140 :
    200;

  // Get top N most downloaded packages from all visible packages
  const renderedPackages = useMemo(() => {
    if (visiblePackageIds.size === 0) return [];

    const packageMap = new Map(packages.map(p => [p.id, p]));
    const visiblePackages = Array.from(visiblePackageIds)
      .map(id => packageMap.get(id))
      .filter((p): p is Package => p !== undefined);

    const topPackages = sortByDownloads(visiblePackages, maxLabels);

    if (visiblePackageIds.size > maxLabels) {
      console.log(`Rendering cap applied: ${visiblePackageIds.size} visible → ${topPackages.length} rendered (top by downloads)`);
    }

    return topPackages;
  }, [visiblePackageIds, packages, maxLabels]);

  if (!shouldShowLabels) return null;

  console.log('PackageLabels - Rendering', renderedPackages.length, 'of', visiblePackageIds.size, 'visible packages');

  return (
    <>
      {renderedPackages.map((pkg) => (
        <Html
          key={pkg.id}
          position={[pkg.x, pkg.y, 0]}
          zIndexRange={[0, 0]}
          style={{
            color: 'white',
            fontSize: '12px',
            pointerEvents: 'none',
            transform: 'translate(-50%, 100%)',
            whiteSpace: 'nowrap',
          }}
        >
          {pkg.name}
        </Html>
      ))}
    </>
  );
}
