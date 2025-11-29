import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export function useCameraAnimation() {
  const { camera, controls } = useThree();
  const targetPosition = useRef<THREE.Vector3 | null>(null);
  const targetZoom = useRef<number | null>(null);
  const startPosition = useRef(new THREE.Vector3());
  const startZoom = useRef(1);
  const progress = useRef(0);
  const duration = 1000; // milliseconds

  useFrame((_state, delta) => {
    if (!targetPosition.current || !targetZoom.current) return;

    progress.current += (delta * 1000) / duration;
    const t = Math.min(progress.current, 1);

    // Cubic ease-in-out
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    if (controls) {
      // @ts-expect-error - controls.target exists on OrbitControls
      controls.target.lerpVectors(startPosition.current, targetPosition.current, eased);
    }

    if (camera.type === 'OrthographicCamera') {
      (camera as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(
        startZoom.current,
        targetZoom.current,
        eased
      );
      camera.updateProjectionMatrix();
    }

    if (t >= 1) {
      targetPosition.current = null;
      targetZoom.current = null;
      progress.current = 0;
    }
  });

  const animateTo = useCallback((x: number, y: number, zoom = 5) => {
    if (!controls) return;

    // @ts-expect-error - controls.target exists on OrbitControls
    startPosition.current.copy(controls.target);
    startZoom.current = (camera as THREE.OrthographicCamera).zoom;
    targetPosition.current = new THREE.Vector3(x, y, 0);
    targetZoom.current = zoom;
    progress.current = 0;
  }, [camera, controls]);

  return { animateTo };
}
