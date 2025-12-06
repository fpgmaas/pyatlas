import { ZoomIn, Move, MousePointer2, Tag } from "lucide-react";
import { Modal } from "./Modal";
import { useModal } from "../../hooks/useModal";

interface ControlItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function ControlItem({ icon: Icon, label }: ControlItemProps) {
  return (
    <div className="flex items-center gap-3 text-gray-300">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800/70 border border-gray-700/50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-400" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ControlsModal() {
  const { isOpen, close } = useModal("controls");

  return (
    <Modal isOpen={isOpen} onClose={close} title="Controls" size="sm">
      <div className="space-y-4">
        <ControlItem icon={ZoomIn} label="Scroll to zoom in/out" />
        <ControlItem icon={Move} label="Right-click + drag to pan" />
        <ControlItem icon={MousePointer2} label="Click package for details" />
        <ControlItem icon={Tag} label="Click cluster label to toggle" />
      </div>
    </Modal>
  );
}
