import { useThree, useFrame } from "@react-three/fiber";
import { useRef, useCallback } from "react";
import * as THREE from "three";

export type EasingFunction = (t: number) => number;

export interface CameraAnimationOptions {
  zoom?: number; // Target zoom level (default: 5)
  duration?: number; // Animation duration in ms (default: 800)
  easing?: EasingFunction; // Easing function (default: cubicInOut)
}

const cubicInOut: EasingFunction = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const DEFAULT_OPTIONS: Required<CameraAnimationOptions> = {
  zoom: 5,
  duration: 800,
  easing: cubicInOut,
};

export function useCameraAnimation() {
  const { camera, controls } = useThree();

  const startTarget = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());
  const startZoom = useRef(1);
  const endZoom = useRef(1);
  const progress = useRef(0);
  const duration = useRef(800);
  const easing = useRef<EasingFunction>(cubicInOut);
  const active = useRef(false);
  const cameraOffset = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!active.current) return;

    const cam = camera as THREE.OrthographicCamera;
    const ctrl = controls as any;

    if (!ctrl) {
      active.current = false;
      return;
    }

    progress.current += (delta * 1000) / duration.current;
    const t = Math.min(progress.current, 1);
    const k = easing.current(t);

    // Interpolate target
    const target = new THREE.Vector3().lerpVectors(
      startTarget.current,
      endTarget.current,
      k,
    );
    ctrl.target.copy(target);

    // Keep camera at fixed offset relative to target
    cam.position.copy(target.clone().add(cameraOffset.current));

    // Interpolate zoom
    cam.zoom = THREE.MathUtils.lerp(startZoom.current, endZoom.current, k);
    cam.updateProjectionMatrix();

    ctrl.update();

    if (t >= 1) {
      active.current = false;
    }
  });

  const animateTo = useCallback(
    (x: number, y: number, optionsOrZoom?: CameraAnimationOptions | number) => {
      // Support both old signature (number) and new signature (options object)
      const options =
        typeof optionsOrZoom === "number"
          ? { zoom: optionsOrZoom }
          : optionsOrZoom || {};

      const finalOptions = { ...DEFAULT_OPTIONS, ...options };

      const ctrl = controls as any;
      if (!ctrl) {
        console.warn(
          "[useCameraAnimation] No controls available, animation skipped",
        );
        return;
      }

      const cam = camera as THREE.OrthographicCamera;

      // Read current state
      startTarget.current.copy(ctrl.target);
      endTarget.current.set(x, y, 0);

      startZoom.current = cam.zoom;
      endZoom.current = finalOptions.zoom;

      // Camera offset (keep distance/orientation stable)
      cameraOffset.current.copy(cam.position.clone().sub(ctrl.target));

      progress.current = 0;
      duration.current = finalOptions.duration;
      easing.current = finalOptions.easing;
      active.current = true;
    },
    [camera, controls],
  );

  return { animateTo };
}
