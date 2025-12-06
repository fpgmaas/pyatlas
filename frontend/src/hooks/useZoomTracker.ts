import { useThree, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGalaxyStore } from "../store/useGalaxyStore";

export function useZoomTracker() {
  const { camera } = useThree();
  const setCurrentZoom = useGalaxyStore((state) => state.setCurrentZoom);
  const lastZoom = useRef(1.6);

  useFrame(() => {
    const zoom = (camera as THREE.OrthographicCamera).zoom;
    // Throttle: only update if changed by > 0.01
    if (Math.abs(zoom - lastZoom.current) > 0.01) {
      lastZoom.current = zoom;
      setCurrentZoom(zoom);
    }
  });
}
