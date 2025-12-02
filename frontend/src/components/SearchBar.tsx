import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useGalaxyStore } from '../store/useGalaxyStore';
import type { Package } from '../types';
import { sortByDownloads } from '../utils/packageUtils';
import { CAMERA_ZOOM_LEVELS } from '../utils/cameraConstants';
import { TrendingUp } from 'lucide-react';
import { formatDownloads } from '../utils/formatDownloads';

export function SearchBar() {
  const {
    packages,
    setSelectedPackageId,
    requestCameraAnimation,
    setSearchQuery,
    setSearchResults,
    selectedClusterIds,
    toggleCluster,
    setSidebarOpen
  } = useGalaxyStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Package[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fuse = useMemo(() => new Fuse(packages, {
    keys: ['name', 'summary'],
    threshold: 0.2,
    includeScore: true,
  }), [packages]);

  useEffect(() => {
    if (query.length > 1) {
      const fuseResults = fuse.search(query).map(r => r.item);
      const searchResults = sortByDownloads(fuseResults, 25);
      setResults(searchResults);
      setShowDropdown(true);
      setSearchQuery(query);
      setSearchResults(searchResults);
    } else {
      setResults([]);
      setShowDropdown(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [query, fuse, setSearchQuery, setSearchResults]);

  const handleSelect = (pkg: Package) => {

    // If the package's cluster is not selected, make it visible
    if (!selectedClusterIds.has(pkg.clusterId)) {
      toggleCluster(pkg.clusterId);
    }

    // Request camera animation to package location
    const animationRequest = {
      x: pkg.x,
      y: pkg.y,
      zoom: CAMERA_ZOOM_LEVELS.PACKAGE
    };
    requestCameraAnimation(animationRequest);

    // Update selection state (for detail panel)
    setSelectedPackageId(pkg.id);

    // Close sidebar on mobile after selection
    setSidebarOpen(false);

    // Clear search UI
    setQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search packages..."
        className="bg-gray-800/70 text-white px-4 py-3 rounded-lg outline-none w-full focus:ring-2 focus:ring-blue-500/50 focus:bg-gray-800 border border-gray-700/30 transition-all placeholder:text-gray-500"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full mt-3 w-full bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-2xl max-h-[60vh] sm:max-h-96 overflow-y-auto z-10 border border-gray-700/50">
          {results.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => handleSelect(pkg)}
              className="w-full text-left px-4 py-3 hover:bg-gray-700/70 text-white border-b border-gray-700/30 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{pkg.name}</div>
                  {pkg.summary && (
                    <div className="text-xs text-gray-400 truncate mt-1">{pkg.summary}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs flex-shrink-0">
                  <TrendingUp size={14} />
                  <span className="font-medium">{formatDownloads(pkg.downloads)}/week</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
