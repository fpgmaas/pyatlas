import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

const TOUCHPAD_DAMPENING = 0.3;
const RAPID_EVENT_THRESHOLD_MS = 50;
const MOUSE_WHEEL_MIN_DELTA = 50;

export function useNormalizedZoom() {
  const { gl } = useThree();
  const lastWheelTime = useRef<number>(0);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleWheel = (event: WheelEvent) => {
      // Skip if already normalized (prevent infinite loop)
      if ((event as WheelEvent & { _normalized?: boolean })._normalized) return;

      const now = performance.now();
      const timeSinceLastWheel = now - lastWheelTime.current;
      lastWheelTime.current = now;

      // Get the raw delta
      let delta = event.deltaY;

      // Normalize based on deltaMode
      // deltaMode: 0 = pixels, 1 = lines, 2 = pages
      if (event.deltaMode === 1) {
        // Line mode (typical mouse) - multiply by standard line height
        delta *= 16;
      } else if (event.deltaMode === 2) {
        // Page mode - multiply by page height estimate
        delta *= window.innerHeight;
      }
      // deltaMode === 0 is already in pixels

      // Detect likely touchpad: rapid succession of small deltas
      const isLikelyTouchpad =
        Math.abs(delta) < MOUSE_WHEEL_MIN_DELTA &&
        timeSinceLastWheel < RAPID_EVENT_THRESHOLD_MS;

      if (isLikelyTouchpad) {
        // Dampen touchpad events significantly
        delta *= TOUCHPAD_DAMPENING;
      }

      // Prevent the original event from reaching OrbitControls
      event.preventDefault();
      event.stopPropagation();

      // Create a new wheel event with normalized delta
      const normalizedEvent = new WheelEvent("wheel", {
        deltaX: event.deltaX,
        deltaY: delta,
        deltaZ: event.deltaZ,
        deltaMode: 0, // Always use pixel mode for normalized events
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        button: event.button,
        buttons: event.buttons,
        bubbles: true,
        cancelable: true,
        view: event.view,
      });

      // Mark as normalized to prevent infinite loop
      (normalizedEvent as WheelEvent & { _normalized: boolean })._normalized =
        true;

      // Dispatch to OrbitControls
      canvas.dispatchEvent(normalizedEvent);
    };

    // Capture phase to intercept before OrbitControls
    canvas.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      canvas.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [gl]);
}
