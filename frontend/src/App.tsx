import { useEffect } from "react";
import { GalaxyCanvas } from "./components/GalaxyCanvas";
import { Sidebar } from "./components/Sidebar";
import { PackageDetail } from "./components/PackageDetail";
import { useGalaxyStore } from "./store/useGalaxyStore";
import { loadPackages, loadClusters } from "./utils/dataLoader";

function App() {
  const { setPackages, setClusters, isSidebarOpen } = useGalaxyStore();

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
        console.error("Failed to load data:", error);
      }
    }

    loadData();
  }, [setPackages, setClusters]);

  return (
    <div
      className="w-full bg-black overflow-hidden flex"
      style={{ height: "100svh" }}
    >
      <Sidebar />

      {/* Main Canvas Area */}
      <main
        className="flex-1 h-full relative min-w-0"
        style={{ touchAction: "none" }}
      >
        <GalaxyCanvas />

        {/* Package Detail - Responsive positioning with safe area support */}
        {/* Hidden on mobile when sidebar is open to avoid overlap */}
        <div
          className={`absolute left-4 right-4 sm:left-auto sm:right-6 bottom-4 pointer-events-auto z-50 ${
            isSidebarOpen ? "hidden lg:block" : ""
          }`}
        >
          <PackageDetail />
        </div>
      </main>
    </div>
  );
}

export default App;
