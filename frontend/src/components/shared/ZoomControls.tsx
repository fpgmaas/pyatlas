import { Plus, Minus } from "lucide-react";
import { useGalaxyStore } from "../../store/useGalaxyStore";
import { CAMERA_ZOOM_LEVELS } from "../../utils/cameraConstants";

const ZOOM_FACTOR = 1.4;

export function ZoomControls() {
  const currentZoom = useGalaxyStore((s) => s.currentZoom);
  const requestCameraAnimation = useGalaxyStore(
    (s) => s.requestCameraAnimation
  );

  const handleZoom = (direction: "in" | "out") => {
    const newZoom =
      direction === "in"
        ? Math.min(currentZoom * ZOOM_FACTOR, CAMERA_ZOOM_LEVELS.MAX)
        : Math.max(currentZoom / ZOOM_FACTOR, CAMERA_ZOOM_LEVELS.MIN);

    // Zoom-only animation: omit x/y to keep current camera target
    requestCameraAnimation({ zoom: newZoom, duration: 200 });
  };

  const buttonClass = `
    w-9 h-9 flex items-center justify-center
    bg-gray-900/95 border border-gray-700/60 backdrop-blur-md
    text-gray-200 hover:bg-gray-800/95 hover:text-white
    transition-colors duration-100
    focus:outline-none focus:ring-2 focus:ring-indigo-500
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  const isAtMax = currentZoom >= CAMERA_ZOOM_LEVELS.MAX;
  const isAtMin = currentZoom <= CAMERA_ZOOM_LEVELS.MIN;

  return (
    <div className="flex flex-col rounded-lg overflow-hidden shadow-xl">
      <button
        onClick={() => handleZoom("in")}
        disabled={isAtMax}
        className={`${buttonClass} rounded-t-lg border-b-0`}
        aria-label="Zoom in"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleZoom("out")}
        disabled={isAtMin}
        className={`${buttonClass} rounded-b-lg`}
        aria-label="Zoom out"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
}
