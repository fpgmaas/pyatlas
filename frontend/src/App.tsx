import { useEffect } from "react";
import { GalaxyCanvas } from "./components/GalaxyCanvas";
import { MobileLayout } from "./components/layout/MobileLayout";
import { DesktopLayout } from "./components/layout/DesktopLayout";
import { Modals } from "./components/modals/Modals";
import { useGalaxyStore } from "./store/useGalaxyStore";
import { useIsMobile } from "./hooks/useIsMobile";
import {
  loadPackages,
  loadClusters,
  loadConstellations,
} from "./utils/dataLoader";

function App() {
  const { setPackages, setClusters, setConstellations } = useGalaxyStore();
  const isMobile = useIsMobile(1024); // lg breakpoint

  useEffect(() => {
    // Load data on mount
    async function loadData() {
      try {
        const [packages, clusters, constellations] = await Promise.all([
          loadPackages(),
          loadClusters(),
          loadConstellations(),
        ]);
        setPackages(packages);
        setClusters(clusters);
        setConstellations(constellations);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    }

    loadData();
  }, [setPackages, setClusters, setConstellations]);

  return (
    <div
      className="w-full bg-black overflow-hidden"
      style={{ height: "100svh", touchAction: "none" }}
    >
      {/* Canvas layer */}
      <GalaxyCanvas />

      {/* Layout layer - responsive */}
      {isMobile ? <MobileLayout /> : <DesktopLayout />}

      {/* Global modals - single mount point */}
      <Modals />
    </div>
  );
}

export default App;
