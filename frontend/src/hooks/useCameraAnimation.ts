import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export type EasingFunction = (t: number) => number;

export interface CameraAnimationOptions {
  zoom?: number;          // Target zoom level (default: 5)
  duration?: number;      // Animation duration in ms (default: 1000)
  easing?: EasingFunction; // Easing function (default: cubicInOut)
}

const cubicInOut: EasingFunction = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const DEFAULT_OPTIONS: Required<CameraAnimationOptions> = {
  zoom: 5,
  duration: 1000,
  easing: cubicInOut,
};

export function useCameraAnimation() {
  const three = useThree();
  const targetPosition = useRef<THREE.Vector3 | null>(null);
  const targetZoom = useRef<number | null>(null);
  const startPosition = useRef(new THREE.Vector3());
  const startZoom = useRef(1);
  const progress = useRef(0);
  const animationDuration = useRef(1000);
  const easingFunction = useRef<EasingFunction>(cubicInOut);

  useFrame((_state, delta) => {
    if (!targetPosition.current || !targetZoom.current) return;

    progress.current += (delta * 1000) / animationDuration.current;
    const t = Math.min(progress.current, 1);

    // Apply easing function
    const eased = easingFunction.current(t);

    if (three.controls) {
      // @ts-expect-error - controls.target exists on OrbitControls
      three.controls.target.lerpVectors(startPosition.current, targetPosition.current, eased);
    }

    if (three.camera.type === 'OrthographicCamera') {
      (three.camera as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(
        startZoom.current,
        targetZoom.current,
        eased
      );
      three.camera.updateProjectionMatrix();
    }

    if (t >= 1) {
      targetPosition.current = null;
      targetZoom.current = null;
      progress.current = 0;
    }
  });

  const animateTo = useCallback((
    x: number,
    y: number,
    optionsOrZoom?: CameraAnimationOptions | number
  ) => {

    // Support both old signature (number) and new signature (options object)
    const options = typeof optionsOrZoom === 'number'
      ? { zoom: optionsOrZoom }
      : optionsOrZoom || {};

    const finalOptions = { ...DEFAULT_OPTIONS, ...options };


    if (!three.controls) {
      console.warn('[useCameraAnimation] No controls available, animation skipped');
      return;
    }

    // @ts-expect-error - controls.target exists on OrbitControls
    const currentTarget = three.controls.target;
    startPosition.current.copy(currentTarget);
    startZoom.current = (three.camera as THREE.OrthographicCamera).zoom;
    targetPosition.current = new THREE.Vector3(x, y, 0);
    targetZoom.current = finalOptions.zoom;
    animationDuration.current = finalOptions.duration;
    easingFunction.current = finalOptions.easing;
    progress.current = 0;

  }, [three]);

  return { animateTo };
}
