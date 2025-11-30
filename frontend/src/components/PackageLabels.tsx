import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { useGalaxyStore } from '../store/useGalaxyStore';
import type { Package } from '../types';

const MAX_RENDERED_LABELS = 200;

/**
 * Get the top N most downloaded packages from a set of package IDs
 */
function getTopDownloaded(
  packageIds: Set<number>,
  packages: Package[],
  limit: number
): Package[] {
  const packageMap = new Map(packages.map(p => [p.id, p]));

  return Array.from(packageIds)
    .map(id => packageMap.get(id))
    .filter((p): p is Package => p !== undefined)
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
}

export function PackageLabels() {
  const packages = useGalaxyStore((s) => s.packages);
  const visiblePackageIds = useGalaxyStore((s) => s.visiblePackageIds);
  const shouldShowLabels = useGalaxyStore((s) => s.shouldShowLabels);

  // Get top 200 most downloaded packages from all visible packages
  const renderedPackages = useMemo(() => {
    if (visiblePackageIds.size === 0) return [];

    const topPackages = getTopDownloaded(visiblePackageIds, packages, MAX_RENDERED_LABELS);

    if (visiblePackageIds.size > MAX_RENDERED_LABELS) {
      console.log(`Rendering cap applied: ${visiblePackageIds.size} visible → ${topPackages.length} rendered (top by downloads)`);
    }

    return topPackages;
  }, [visiblePackageIds, packages]);

  if (!shouldShowLabels) return null;

  console.log('PackageLabels - Rendering', renderedPackages.length, 'of', visiblePackageIds.size, 'visible packages');

  return (
    <>
      {renderedPackages.map((pkg) => (
        <Html
          key={pkg.id}
          position={[pkg.x, pkg.y, 0]}
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
