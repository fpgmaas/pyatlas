import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { useGalaxyStore } from '../store/useGalaxyStore';

export function PackageLabels() {
  const packages = useGalaxyStore((s) => s.packages);
  const visiblePackageIds = useGalaxyStore((s) => s.visiblePackageIds);
  const shouldShowLabels = useGalaxyStore((s) => s.shouldShowLabels);

  // Filter to only packages that are visible in viewport
  const visiblePackages = useMemo(() => {
    return packages.filter(pkg => visiblePackageIds.has(pkg.id));
  }, [packages, visiblePackageIds]);

  // Only show all labels when zoomed in enough
  if (!shouldShowLabels) return null;

  console.log('PackageLabels - Rendering labels for', visiblePackages.length, 'packages');

  return (
    <>
      {visiblePackages.map((pkg) => (
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
