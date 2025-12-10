import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar/Sidebar";
import { PackageDetail } from "../PackageDetail";
import { WelcomeBanner } from "../WelcomeBanner";
import { SearchBar } from "../SearchBar";
import { FloatingGitHubButton } from "../shared/FloatingGitHubButton";
import { ZoomControls } from "../shared/ZoomControls";
import { useGalaxyStore } from "../../store/useGalaxyStore";

function CollapsedTopBar() {
  const setSidebarOpen = useGalaxyStore((s) => s.setSidebarOpen);

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex items-center gap-3">
      {/* Hamburger button */}
      <button
        className="bg-gray-900/95 backdrop-blur-md
                   p-3 rounded-lg border border-gray-700/50
                   hover:bg-gray-800 transition-colors
                   shadow-xl flex-shrink-0"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-md rounded-xl border border-gray-700/60 bg-gray-900/95 backdrop-blur-md px-3 py-1 shadow-xl">
        <SearchBar />
      </div>
    </div>
  );
}

export function DesktopLayout() {
  const isSidebarOpen = useGalaxyStore((s) => s.isSidebarOpen);
  const welcomeDismissed = useGalaxyStore((s) => s.welcomeDismissed);

  return (
    <>
      {/* Top bar with hamburger + search - visible when sidebar is closed */}
      {!isSidebarOpen && <CollapsedTopBar />}

      {/* Sidebar */}
      <Sidebar />

      {/* Welcome Banner or Package Detail - positioned next to sidebar when open */}
      <div
        className={`fixed bottom-6 z-40 pointer-events-auto transition-[left] duration-300 ease-in-out
                    ${isSidebarOpen ? "left-[344px]" : "left-6"}`}
      >
        {welcomeDismissed ? <PackageDetail /> : <WelcomeBanner />}
      </div>

      {/* Bottom right controls */}
      <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2">
        {!isSidebarOpen && <FloatingGitHubButton />}
        <ZoomControls />
      </div>
    </>
  );
}
