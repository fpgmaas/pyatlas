import { useMemo } from "react";
import { useGalaxyStore } from "../../store/useGalaxyStore";
import { getClusterColor } from "../../utils/colorPalette";

// Crosshairs/target icon for "move to" action
function CrosshairsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}

export function ClusterList() {
  const clusters = useGalaxyStore((s) => s.clusters);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const toggleCluster = useGalaxyStore((s) => s.toggleCluster);
  const setSelectedClusterIds = useGalaxyStore((s) => s.setSelectedClusterIds);
  const focusOnCluster = useGalaxyStore((s) => s.focusOnCluster);
  const setActiveModal = useGalaxyStore((s) => s.setActiveModal);

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

  // Move to cluster (close modal and focus)
  const handleMoveToCluster = (clusterId: number) => {
    setActiveModal(null); // Close the modal
    focusOnCluster(clusterId);
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
    <div className="space-y-3">
      {/* Show All / Hide All Toggle */}
      <button
        onClick={handleToggleAll}
        aria-label={allSelected ? "Hide all clusters" : "Show all clusters"}
        aria-pressed={allSelected}
        className="w-full bg-gray-800/50 hover:bg-gray-800/70 rounded-lg px-4 py-3
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
      <div className="space-y-1">
        {sortedClusters.map((cluster) => {
          const isSelected = selectedClusterIds.has(cluster.clusterId);

          return (
            <div
              key={cluster.clusterId}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg
                hover:bg-gray-800/30 transition-colors"
            >
              {/* Checkbox for visibility toggle */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleCluster(cluster.clusterId)}
                aria-label={`Toggle ${cluster.label} cluster visibility`}
                className="w-4 h-4 rounded border-gray-600 text-blue-500
                  focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0
                  bg-gray-800/70 cursor-pointer flex-shrink-0"
              />

              {/* Color Indicator */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getClusterColor(cluster.clusterId) }}
                aria-hidden="true"
              />

              {/* Cluster Label */}
              <span className="text-sm text-gray-300 flex-1 truncate select-none">
                {cluster.label}
              </span>

              {/* Move to cluster button */}
              <button
                onClick={() => handleMoveToCluster(cluster.clusterId)}
                aria-label={`Move to ${cluster.label} cluster`}
                title="Move to cluster"
                className="p-1.5 rounded-md text-gray-400 hover:text-white
                  hover:bg-gray-700/50 transition-colors flex-shrink-0
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <CrosshairsIcon />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
