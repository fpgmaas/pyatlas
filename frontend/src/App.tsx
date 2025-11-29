import { useEffect } from 'react';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { SearchBar } from './components/SearchBar';
import { ClusterLegend } from './components/ClusterLegend';
import { PackageDetail } from './components/PackageDetail';
import { useGalaxyStore } from './store/useGalaxyStore';
import { loadPackages, loadClusters } from './utils/dataLoader';

function App() {
  const { setPackages, setClusters } = useGalaxyStore();

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
      {/* Left Sidebar */}
      <div className="w-96 h-full bg-gray-900/98 backdrop-blur-md border-r border-gray-700/50 shadow-2xl flex-shrink-0">
        <div className="flex flex-col h-full">
          {/* Header Section */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-700/50">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">PyPI Galaxy</h1>
            <p className="text-gray-400">Explore the Python package universe</p>
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
      <div className="flex-1 h-full relative">
        <GalaxyCanvas />

        {/* Package Detail - Bottom Right */}
        <div className="absolute bottom-6 right-6 pointer-events-auto">
          <PackageDetail />
        </div>
      </div>
    </div>
  );
}

export default App;
