import { SearchBar } from './SearchBar';
import { ClusterLegend } from './ClusterLegend';
import { PackageDetail } from './PackageDetail';

export function UIOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Left Sidebar - Desktop, Bottom Bar - Mobile (future) */}
      <div className="absolute left-0 top-0 bottom-0 w-96 bg-gray-900/98 backdrop-blur-md border-r border-gray-700/50 pointer-events-auto shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header Section */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-700/50">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">PyAtlas</h1>
            <p className="text-gray-400">Explore the top 10,000 packages on PyPI</p>
          </div>

          {/* Search Section */}
          <div className="px-8 py-6 border-b border-gray-700/30">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Search Packages
            </label>
            <SearchBar />
          </div>

          {/* Clusters Section */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Package Clusters
            </label>
            <ClusterLegend />
          </div>
        </div>
      </div>

      {/* Package Detail - Bottom Right */}
      <div className="absolute bottom-6 right-6 pointer-events-auto">
        <PackageDetail />
      </div>
    </div>
  );
}
