import { SearchBar } from "./SearchBar";
import { ClusterLegend } from "./ClusterLegend";
import { useGalaxyStore } from "../store/useGalaxyStore";
import { useIsMobile } from "../hooks/useIsMobile";
import { MousePointer2, Move, ZoomIn, Menu, X, Tag } from "lucide-react";

function SidebarContent({
  onClose,
  isMobile,
}: {
  onClose?: () => void;
  isMobile: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="px-4 pt-4 pb-3 lg:px-8 lg:pt-8 lg:pb-6 border-b border-gray-700/50 relative flex-shrink-0">
        {/* Close button - mobile only */}
        {onClose && (
          <button
            className="absolute top-3 right-3 lg:hidden
                       text-gray-400 hover:text-white transition-colors
                       p-2 rounded-lg hover:bg-gray-800/50"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1 lg:mb-2 tracking-tight">
          PyAtlas
        </h1>
        <p className="text-gray-400 text-sm lg:text-base">
          Explore the top 10,000 packages on PyPI
        </p>
      </div>

      {/* Controls Section - Hidden on mobile to save space */}
      {!isMobile && (
        <div className="px-8 py-4 border-b border-gray-700/30 bg-gray-800/30">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Controls
          </label>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-gray-300">
              <ZoomIn className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Scroll to zoom</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Move className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>(Right) click + drag to pan</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <MousePointer2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Click package for details</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Tag className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Click cluster label to toggle</span>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="px-4 py-4 lg:px-8 lg:py-6 border-b border-gray-700/30">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Search Packages
        </label>
        <SearchBar />
      </div>

      {/* Clusters Section - flex-1 takes remaining space, max-h only on desktop */}
      <div className="flex-1 min-h-32 lg:max-h-96 flex flex-col px-4 py-4 lg:px-8 lg:py-6">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 lg:mb-4 flex-shrink-0">
          Package Clusters
        </label>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <ClusterLegend />
        </div>
      </div>

      {/* Footer with GitHub and Sponsor links */}
      <div className="mt-auto flex-shrink-0 px-4 py-3 lg:px-8 lg:py-4 border-t border-gray-700/50 flex gap-2">
        <a
          href="https://github.com/fpgmaas/pyatlas"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 lg:py-2
                     border border-gray-600 rounded-md
                     bg-gray-800 text-white text-sm
                     hover:bg-gray-700 hover:border-gray-500
                     transition-colors"
        >
          <svg
            height="18"
            width="18"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mr-2"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.45.55.38A8.001 8.001 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
        <a
          href="https://github.com/sponsors/fpgmaas"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 lg:py-2
                     border border-gray-600 rounded-md
                     bg-gray-800 text-white text-sm
                     hover:bg-gray-700 hover:border-gray-500
                     transition-colors"
        >
          <svg
            height="18"
            width="18"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mr-2 text-pink-500"
          >
            <path d="M8 14.25.345 7.26A3.5 3.5 0 0 1 5.231 1.5c1.05 0 2.063.475 2.769 1.3C8.706 1.975 9.72 1.5 10.77 1.5a3.5 3.5 0 0 1 3.115 5.76L8 14.25z" />
          </svg>
          Sponsor
        </a>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isSidebarOpen, setSidebarOpen, toggleSidebar } = useGalaxyStore();
  const isMobile = useIsMobile(1024); // lg breakpoint

  return (
    <>
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
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:hidden
        `}
      >
        <SidebarContent
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
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
        <SidebarContent isMobile={isMobile} />
      </aside>
    </>
  );
}
