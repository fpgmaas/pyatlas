import { useMemo } from "react";
import { useGalaxyStore } from "../store/useGalaxyStore";
import { getClusterColor } from "../utils/colorPalette";

export function ClusterLegend() {
  const clusters = useGalaxyStore((s) => s.clusters);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const toggleCluster = useGalaxyStore((s) => s.toggleCluster);
  const setSelectedClusterIds = useGalaxyStore((s) => s.setSelectedClusterIds);

  // Sort clusters alphabetically
  const sortedClusters = useMemo(() => {
    return [...clusters].sort((a, b) => a.label.localeCompare(b.label));
  }, [clusters]);

  // Check if all clusters are selected
  const allSelected =
    sortedClusters.length > 0 &&
    sortedClusters.every((c) => selectedClusterIds.has(c.clusterId));

  // Toggle all clusters
  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedClusterIds(new Set());
    } else {
      const allIds = new Set(clusters.map((c) => c.clusterId));
      setSelectedClusterIds(allIds);
    }
  };

  // Empty state
  if (clusters.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-700/30">
        <p className="text-gray-400 text-sm">No clusters loaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 lg:space-y-3">
      {/* Show All / Hide All Toggle */}
      <button
        onClick={handleToggleAll}
        aria-label={allSelected ? "Hide all clusters" : "Show all clusters"}
        aria-pressed={allSelected}
        className="w-full bg-gray-800/50 hover:bg-gray-800/70 rounded-lg px-3 py-2 lg:px-4 lg:py-3
          border border-gray-700/30 text-sm text-gray-300 font-medium
          transition-colors flex items-center gap-2
          focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <input
          type="checkbox"
          checked={allSelected}
          readOnly
          className="w-4 h-4 rounded border-gray-600 text-blue-500 pointer-events-none"
        />
        <span>{allSelected ? "Hide All" : "Show All"}</span>
      </button>

      {/* Cluster List */}
      <div className="space-y-0.5 lg:space-y-1">
        {sortedClusters.map((cluster) => {
          const isSelected = selectedClusterIds.has(cluster.clusterId);

          return (
            <label
              key={cluster.clusterId}
              className="flex items-center gap-2 lg:gap-3 py-1.5 lg:py-2.5 px-2 lg:px-3 rounded-md
                hover:bg-gray-800/30 transition-colors cursor-pointer
                focus-within:ring-2 focus-within:ring-blue-500/50"
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleCluster(cluster.clusterId)}
                aria-label={`Toggle ${cluster.label} cluster visibility`}
                className="w-3.5 h-3.5 lg:w-4 lg:h-4 rounded border-gray-600 text-blue-500
                  focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0
                  bg-gray-800/70 cursor-pointer"
              />

              {/* Color Indicator */}
              <div
                className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getClusterColor(cluster.clusterId) }}
                aria-hidden="true"
              />

              {/* Cluster Label */}
              <span className="text-xs lg:text-sm text-gray-300 flex-1 truncate select-none">
                {cluster.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
