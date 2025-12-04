import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { useIsMobile } from '../hooks/useIsMobile';

export function ClusterLabels() {
  const clusters = useGalaxyStore((s) => s.clusters);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const toggleCluster = useGalaxyStore((s) => s.toggleCluster);
  const currentZoom = useGalaxyStore((s) => s.currentZoom);
  const isMobile = useIsMobile();

  // On mobile, limit the number of visible labels based on zoom level
  const maxLabels = isMobile
    ? (currentZoom < 2 ? 30 : currentZoom < 3 ? 80 : Infinity)
    : Infinity;

  // Sort clusters by downloads and limit to maxLabels on mobile
  const visibleClusters = useMemo(() => {
    if (maxLabels === Infinity) return clusters;
    return [...clusters]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, maxLabels);
  }, [clusters, maxLabels]);

  const handleClick = (clusterId: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCluster(clusterId);
  };

  return (
    <>
      {visibleClusters.map(cluster => {
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
