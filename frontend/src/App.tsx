import { useEffect } from 'react';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { SearchBar } from './components/SearchBar';
import { ClusterLegend } from './components/ClusterLegend';
import { PackageDetail } from './components/PackageDetail';
import { useGalaxyStore } from './store/useGalaxyStore';
import { loadPackages, loadClusters } from './utils/dataLoader';
import { MousePointer2, Mouse, ZoomIn, Menu, X } from 'lucide-react';

function App() {
  const { setPackages, setClusters, isSidebarOpen, setSidebarOpen, toggleSidebar } = useGalaxyStore();

  useEffect(() => {
    // Load data on mount
    async function loadData() {
      try {
        const [packages, clusters] = await Promise.all([
          loadPackages(),
          loadClusters(),
        ]);
        setPackages(packages);
        setClusters(clusters);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }

    loadData();
  }, [setPackages, setClusters]);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex">
      {/* Backdrop overlay - mobile only */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Hamburger/Close menu button - mobile only, outside sidebar when closed */}
      {!isSidebarOpen && (
        <button
          className="fixed top-4 left-4 z-50 lg:hidden
                     bg-gray-900/95 backdrop-blur-md
                     p-3 rounded-lg border border-gray-700/50
                     hover:bg-gray-800 transition-colors
                     shadow-xl"
          onClick={() => toggleSidebar()}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Left Sidebar - responsive */}
      <div className={`
        h-full bg-gray-900/98 backdrop-blur-md
        border-r border-gray-700/50 shadow-2xl

        ${/* Mobile: Fixed overlay with slide animation */''}
        fixed inset-y-0 left-0 z-40
        w-80
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}

        ${/* Desktop: Normal flow, always visible */''}
        lg:relative lg:inset-auto lg:translate-x-0 lg:w-96 lg:flex-shrink-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header Section */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-700/50 relative">
            {/* Close button - mobile only, inside sidebar when open */}
            <button
              className="absolute top-4 right-4 lg:hidden
                         text-gray-400 hover:text-white transition-colors
                         p-2 rounded-lg hover:bg-gray-800/50"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">PyAtlas</h1>
            <p className="text-gray-400">Explore the top 10,000 packages on PyPI</p>
          </div>

          {/* Controls Section */}
          <div className="px-8 py-4 border-b border-gray-700/30 bg-gray-800/30">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Controls
            </label>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3 text-gray-300">
                <ZoomIn className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="lg:hidden">Pinch to zoom</span>
                <span className="hidden lg:inline">Scroll to zoom</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Mouse className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="lg:hidden">Drag to pan</span>
                <span className="hidden lg:inline">Right click + drag to pan</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <MousePointer2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="lg:hidden">Tap package for details</span>
                <span className="hidden lg:inline">Click package for details</span>
              </div>
            </div>
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

      {/* Main Canvas Area */}
      <div className="flex-1 h-full relative" style={{ touchAction: 'none' }}>
        <GalaxyCanvas />

        {/* Package Detail - Responsive positioning */}
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 pointer-events-auto z-50">
          <PackageDetail />
        </div>
      </div>
    </div>
  );
}

export default App;
