import { Html } from '@react-three/drei';
import { useGalaxyStore } from '../store/useGalaxyStore';

export function ClusterLabels() {
  const clusters = useGalaxyStore((s) => s.clusters);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const toggleCluster = useGalaxyStore((s) => s.toggleCluster);

  const handleClick = (clusterId: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCluster(clusterId);
  };

  return (
    <>
      {clusters.map(cluster => {
        const isVisible = selectedClusterIds.has(cluster.clusterId);
        const opacity = isVisible ? 1.0 : 0.4;

        return (
          <Html
            key={cluster.clusterId}
            position={[cluster.centroidX, cluster.centroidY, 0]}
            center
            transform={false}
            sprite={false}
            zIndexRange={[0, 0]}
          >
            <div
              onClick={handleClick(cluster.clusterId)}
              style={{
                fontSize: '12px',
                color: 'black',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: `rgba(255, 255, 255, ${0.7 * opacity})`,
                border: '1px solid rgba(0, 0, 0, 0.3)',
                borderRadius: '3px',
                padding: '2px 6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                opacity: opacity,
                transition: 'opacity 0.2s ease-in-out',
                userSelect: 'none',
              }}
            >
              {cluster.label}
            </div>
          </Html>
        );
      })}
    </>
  );
}
