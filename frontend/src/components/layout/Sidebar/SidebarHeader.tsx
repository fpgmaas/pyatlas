import { X } from "lucide-react";
import { useGalaxyStore } from "../../../store/useGalaxyStore";

export function SidebarHeader() {
  const setSidebarOpen = useGalaxyStore((s) => s.setSidebarOpen);

  return (
    <div className="px-6 pt-6 pb-4 border-b border-gray-700/50 relative flex-shrink-0">
      {/* Close button - always visible */}
      <button
        className="absolute top-4 right-4
                   text-gray-400 hover:text-white transition-colors
                   p-2 rounded-lg hover:bg-gray-800/50"
        onClick={() => setSidebarOpen(false)}
        aria-label="Close sidebar"
      >
        <X className="w-5 h-5" />
      </button>

      <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
        PyAtlas
      </h1>
      <p className="text-gray-400 text-sm pr-8">
        Explore the top 10,000 packages on PyPI
      </p>
    </div>
  );
}
