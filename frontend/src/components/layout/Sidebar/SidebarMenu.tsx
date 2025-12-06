import { Settings, Palette, HelpCircle, ChevronRight } from "lucide-react";
import { useGalaxyStore } from "../../../store/useGalaxyStore";

interface MenuButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

function MenuButton({ icon: Icon, label, onClick }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                 text-gray-200 hover:bg-gray-800/70 hover:text-white
                 transition-colors text-left group"
    >
      <Icon className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-colors" />
    </button>
  );
}

export function SidebarMenu() {
  const setActiveModal = useGalaxyStore((s) => s.setActiveModal);

  return (
    <div className="px-4 py-4 flex-1">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-2">
        Menu
      </label>
      <div className="space-y-1">
        <MenuButton
          icon={Settings}
          label="Controls"
          onClick={() => setActiveModal("controls")}
        />
        <MenuButton
          icon={Palette}
          label="Clusters"
          onClick={() => setActiveModal("clusters")}
        />
        <MenuButton
          icon={HelpCircle}
          label="FAQ"
          onClick={() => setActiveModal("faq")}
        />
      </div>
    </div>
  );
}
