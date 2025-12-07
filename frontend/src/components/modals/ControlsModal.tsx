import { ZoomIn, Move, MousePointer2, Tag, RotateCcw } from "lucide-react";
import { Modal } from "./Modal";
import { useModal } from "../../hooks/useModal";
import { useGalaxyStore, SPEED_DEFAULTS } from "../../store/useGalaxyStore";
import { useIsMobile } from "../../hooks/useIsMobile";

interface ControlItemProps {
  icon: React.ComponentType<{ className?: string }>;
  desktopLabel: string;
  mobileLabel: string;
}

function ControlItem({
  icon: Icon,
  desktopLabel,
  mobileLabel,
}: ControlItemProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex items-center gap-3 text-gray-300">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800/70 border border-gray-700/50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-400" />
      </div>
      <span className="text-sm">{isMobile ? mobileLabel : desktopLabel}</span>
    </div>
  );
}

interface SpeedSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function SpeedSlider({ label, value, onChange }: SpeedSliderProps) {
  const isDefault = value === 1.0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-xs text-gray-500">
          {isDefault ? "Default" : `${value.toFixed(1)}x`}
        </span>
      </div>
      <input
        type="range"
        min="0.25"
        max="1.75"
        step="0.25"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
                   [&::-webkit-slider-thumb]:hover:bg-blue-400 [&::-webkit-slider-thumb]:transition-colors
                   [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0
                   [&::-moz-range-thumb]:hover:bg-blue-400 [&::-moz-range-thumb]:transition-colors"
      />
      <div className="flex justify-between text-xs text-gray-600">
        <span>Slow</span>
        <span>Fast</span>
      </div>
    </div>
  );
}

export function ControlsModal() {
  const { isOpen, close } = useModal("controls");
  const zoomMultiplier = useGalaxyStore((s) => s.zoomSpeedMultiplier);
  const panMultiplier = useGalaxyStore((s) => s.panSpeedMultiplier);
  const setZoomMultiplier = useGalaxyStore((s) => s.setZoomSpeedMultiplier);
  const setPanMultiplier = useGalaxyStore((s) => s.setPanSpeedMultiplier);

  const handleReset = () => {
    setZoomMultiplier(SPEED_DEFAULTS.zoomMultiplier);
    setPanMultiplier(SPEED_DEFAULTS.panMultiplier);
  };

  const hasCustomSpeeds =
    zoomMultiplier !== SPEED_DEFAULTS.zoomMultiplier ||
    panMultiplier !== SPEED_DEFAULTS.panMultiplier;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Controls" size="sm">
      <div className="space-y-6">
        {/* Navigation controls */}
        <div className="space-y-3">
          <ControlItem
            icon={ZoomIn}
            desktopLabel="Scroll or pinch to zoom"
            mobileLabel="Pinch to zoom"
          />
          <ControlItem
            icon={Move}
            desktopLabel="Click and drag to pan"
            mobileLabel="Drag to pan"
          />
          <ControlItem
            icon={MousePointer2}
            desktopLabel="Click package for details"
            mobileLabel="Tap package for details"
          />
          <ControlItem
            icon={Tag}
            desktopLabel="Click cluster label to highlight"
            mobileLabel="Tap cluster label to highlight"
          />
        </div>

        {/* Speed settings */}
        <div className="pt-4 border-t border-gray-700/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-200">
              Speed Settings
            </h3>
            {hasCustomSpeeds && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
          <SpeedSlider
            label="Zoom Speed"
            value={zoomMultiplier}
            onChange={setZoomMultiplier}
          />
          <SpeedSlider
            label="Pan Speed"
            value={panMultiplier}
            onChange={setPanMultiplier}
          />
        </div>
      </div>
    </Modal>
  );
}
