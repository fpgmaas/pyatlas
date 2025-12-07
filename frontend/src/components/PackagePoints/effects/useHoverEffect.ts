import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

export function useHoverEffect(
  meshRef: RefObject<THREE.InstancedMesh | null>,
  hoveredIndex: number | null,
): void {
  const prevHoveredIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const hoveredAttr = meshRef.current.geometry.getAttribute(
      "instanceHovered",
    ) as THREE.InstancedBufferAttribute;

    // Turn off previous hovered
    if (prevHoveredIndex.current !== null) {
      hoveredAttr.setX(prevHoveredIndex.current, 0);
    }

    // Turn on new hovered
    if (hoveredIndex !== null) {
      hoveredAttr.setX(hoveredIndex, 1);
    }

    hoveredAttr.needsUpdate = true;
    prevHoveredIndex.current = hoveredIndex ?? null;
  }, [meshRef, hoveredIndex]);
}
