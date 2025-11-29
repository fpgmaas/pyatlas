import { Html } from '@react-three/drei';
import { useGalaxyStore } from '../store/useGalaxyStore';

export function HoverLabel() {
  const { packages, hoveredIndex } = useGalaxyStore();

  if (hoveredIndex === null) return null;

  const pkg = packages[hoveredIndex];
  if (!pkg) return null;

  return (
    <Html
      position={[pkg.x, pkg.y, 0]}
      center
      style={{
        color: 'white',
        fontSize: '12px',
        pointerEvents: 'none',
        transform: 'translateY(20px)',
        whiteSpace: 'nowrap',
      }}
    >
      {pkg.name}
    </Html>
  );
}
