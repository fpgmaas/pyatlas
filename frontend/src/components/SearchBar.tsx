import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useGalaxyStore } from '../store/useGalaxyStore';
import type { Package } from '../types';
import { sortByDownloads } from '../utils/packageUtils';

export function SearchBar() {
  const { packages, setSelectedPackageId, setSearchQuery, setSearchResults } = useGalaxyStore();
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
    setSelectedPackageId(pkg.id);
    setQuery('');
    setShowDropdown(false);
    // Camera animation will be added in next step
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
        <div className="absolute top-full mt-3 w-full bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-2xl max-h-96 overflow-y-auto z-10 border border-gray-700/50">
          {results.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => handleSelect(pkg)}
              className="w-full text-left px-4 py-3 hover:bg-gray-700/70 text-white border-b border-gray-700/30 last:border-b-0 transition-colors"
            >
              <div className="font-semibold text-sm">{pkg.name}</div>
              {pkg.summary && (
                <div className="text-xs text-gray-400 truncate mt-1">{pkg.summary}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
