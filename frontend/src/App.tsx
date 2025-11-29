import { useEffect } from 'react';
import { GalaxyCanvas } from './components/GalaxyCanvas';
import { UIOverlay } from './components/UIOverlay';
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
    <div className="w-screen h-screen bg-black overflow-hidden">
      <GalaxyCanvas />
      <UIOverlay />
    </div>
  );
}

export default App;
