import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { useGalaxyStore } from "../store/useGalaxyStore";
import { useIsMobile } from "../hooks/useIsMobile";

export function ClusterLabels() {
  const clusters = useGalaxyStore((s) => s.clusters);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const focusOnCluster = useGalaxyStore((s) => s.focusOnCluster);
  const currentZoom = useGalaxyStore((s) => s.currentZoom);
  const isMobile = useIsMobile();

  // On mobile, limit the number of visible labels based on zoom level
  const maxLabels = isMobile
    ? currentZoom < 2
      ? 30
      : currentZoom < 3
      ? 80
      : Infinity
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
    focusOnCluster(clusterId);
  };

  return (
    <>
      {visibleClusters.map((cluster) => {
        const isSelected = selectedClusterIds.has(cluster.clusterId);
        const opacity = isSelected ? 1.0 : 0.5;

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
                fontSize: "11px",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.95)",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                backgroundColor: "rgba(30, 35, 50, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                padding: "3px 10px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                opacity: opacity,
                transition: "opacity 0.2s ease-out",
                userSelect: "none",
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
