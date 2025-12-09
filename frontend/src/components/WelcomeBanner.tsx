import { X } from "lucide-react";
import { useGalaxyStore } from "../store/useGalaxyStore";

export function WelcomeBanner() {
  const dismissWelcome = useGalaxyStore((s) => s.dismissWelcome);

  return (
    <div className="bg-gray-900/95 backdrop-blur-md rounded-lg px-4 py-4 sm:px-6 sm:py-4 shadow-2xl w-full sm:w-96 border border-gray-700/50 relative">
      <button
        onClick={dismissWelcome}
        className="absolute top-3 right-3 text-white bg-gray-700 hover:bg-gray-600 transition-colors p-1.5 rounded-full"
        aria-label="Dismiss welcome message"
      >
        <X size={16} />
      </button>

      <h2 className="text-white text-lg font-bold mb-2 pr-8">
        Welcome to PyAtlas
      </h2>

      <p className="text-gray-300 text-sm leading-relaxed">
        Explore 10,000 popular Python packages on an interactive map. Packages
        with similar functionality are displayed close together. Click any point
        to learn more, or use search to find a specific package.
      </p>
    </div>
  );
}
