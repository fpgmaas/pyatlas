import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar/Sidebar";
import { PackageDetail } from "../PackageDetail";
import { FloatingGitHubButton } from "../shared/FloatingGitHubButton";
import { useGalaxyStore } from "../../store/useGalaxyStore";

function SidebarToggleButton() {
  const setSidebarOpen = useGalaxyStore((s) => s.setSidebarOpen);

  return (
    <button
      className="fixed top-4 left-4 z-50
                 bg-gray-900/95 backdrop-blur-md
                 p-3 rounded-lg border border-gray-700/50
                 hover:bg-gray-800 transition-colors
                 shadow-xl"
      onClick={() => setSidebarOpen(true)}
      aria-label="Open sidebar"
    >
      <Menu className="w-6 h-6 text-white" />
    </button>
  );
}

export function DesktopLayout() {
  const isSidebarOpen = useGalaxyStore((s) => s.isSidebarOpen);

  return (
    <>
      {/* Sidebar toggle button - visible when sidebar is closed */}
      {!isSidebarOpen && <SidebarToggleButton />}

      {/* Sidebar */}
      <Sidebar />

      {/* Package Detail - bottom-left positioning */}
      <div className="fixed left-6 bottom-6 z-40 pointer-events-auto">
        <PackageDetail />
      </div>

      {/* Floating GitHub button - bottom-right */}
      <FloatingGitHubButton />
    </>
  );
}
