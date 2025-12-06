import { Palette, Settings, HelpCircle, Github } from "lucide-react";
import { SearchBar } from "../SearchBar";
import { Chip } from "../shared/Chip";
import { useGalaxyStore } from "../../store/useGalaxyStore";

export function TopBar() {
  const setActiveModal = useGalaxyStore((s) => s.setActiveModal);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col gap-2 px-3 pt-3 pb-2">
      {/* Search container - z-10 to stay above chips */}
      <div
        className="pointer-events-auto relative z-10 rounded-2xl border border-gray-700/60
                      bg-gray-900/95 backdrop-blur-md px-3 py-2 shadow-xl"
      >
        <SearchBar />
      </div>

      {/* Chips row - z-0 to stay below search dropdown */}
      <div className="pointer-events-auto relative z-0 flex gap-2 overflow-x-auto pb-1 -mb-1">
        <Chip
          label="Clusters"
          icon={Palette}
          onClick={() => setActiveModal("clusters")}
        />
        <Chip
          label="Controls"
          icon={Settings}
          onClick={() => setActiveModal("controls")}
        />
        <Chip
          label="FAQ"
          icon={HelpCircle}
          onClick={() => setActiveModal("faq")}
        />
        {/* GitHub chip - only visible on small screens */}
        <div className="sm:hidden">
          <Chip
            label="GitHub"
            icon={Github}
            href="https://github.com/fpgmaas/pyatlas"
          />
        </div>
      </div>
    </div>
  );
}
