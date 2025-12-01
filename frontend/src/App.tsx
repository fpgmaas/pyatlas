import { useEffect } from 'react';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { SearchBar } from './components/SearchBar';
import { ClusterLegend } from './components/ClusterLegend';
import { PackageDetail } from './components/PackageDetail';
import { useGalaxyStore } from './store/useGalaxyStore';
import { loadPackages, loadClusters } from './utils/dataLoader';
import { MousePointer2, Mouse, ZoomIn, Menu, X, Github, Tag } from 'lucide-react';

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-700/50 relative">
        {/* Close button - mobile only */}
        {onClose && (
          <button
            className="absolute top-4 right-4 lg:hidden
                       text-gray-400 hover:text-white transition-colors
                       p-2 rounded-lg hover:bg-gray-800/50"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        )}
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
          <div className="flex items-center gap-3 text-gray-300">
            <Tag className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Click cluster label to toggle</span>
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
      <div className="flex-1 min-h-0 max-h-96 flex flex-col px-8 py-6">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex-shrink-0">
          Package Clusters
        </label>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ClusterLegend />
        </div>
      </div>

      {/* Footer with GitHub link */}
      <div className="mt-auto flex-shrink-0 px-8 py-4 border-t border-gray-700/50">
        <a
          href="https://github.com/fpgmaas/pyatlas"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <Github className="w-5 h-5" />
          <span>View on GitHub</span>
        </a>
      </div>
    </div>
  );
}

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
    <div className="h-screen w-full bg-black overflow-hidden flex">
      {/* Backdrop overlay - mobile only */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Hamburger menu button - mobile only */}
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

      {/* Mobile sidebar - fixed overlay */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          w-80
          bg-gray-900/98 backdrop-blur-md
          border-r border-gray-700/50 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:hidden
        `}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Desktop sidebar - normal flex child */}
      <aside
        className="
          hidden lg:flex lg:flex-col
          h-full w-96 flex-shrink-0
          bg-gray-900/98 backdrop-blur-md
          border-r border-gray-700/50 shadow-2xl
        "
      >
        <SidebarContent />
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 h-full relative min-w-0" style={{ touchAction: 'none' }}>
        <GalaxyCanvas />

        {/* Package Detail - Responsive positioning */}
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 pointer-events-auto z-50">
          <PackageDetail />
        </div>
      </main>
    </div>
  );
}

export default App;
