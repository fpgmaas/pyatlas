import { Html } from '@react-three/drei';
import { useGalaxyStore } from '../store/useGalaxyStore';

export function ClusterLabels() {
  const clusters = useGalaxyStore((s) => s.clusters);

  return (
    <>
      {clusters.map(cluster => (
          <Html
            key={cluster.clusterId}
            position={[cluster.centroidX, cluster.centroidY, 0]}
            center
            transform={false}
            sprite={false}
            zIndexRange={[0, 0]}
            style={{
              fontSize: '12px',
              color: 'black',
              fontFamily: 'Arial, sans-serif',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: '3px',
              padding: '2px 6px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {cluster.label}
          </Html>
        ))}
    </>
  );
}
