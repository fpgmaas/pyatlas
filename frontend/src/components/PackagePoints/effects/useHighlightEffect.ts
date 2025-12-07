import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Package } from "../../../types";

export function useHighlightEffect(
  meshRef: RefObject<THREE.InstancedMesh | null>,
  packages: Package[],
  highlightedClusterId: number | null,
): void {
  const prevHighlightedClusterId = useRef<number | null>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const highlightedAttr = meshRef.current.geometry.getAttribute(
      "instanceHighlighted",
    ) as THREE.InstancedBufferAttribute;

    // Clear previous highlighted cluster
    if (prevHighlightedClusterId.current !== null) {
      packages.forEach((pkg, i) => {
        if (pkg.clusterId === prevHighlightedClusterId.current) {
          highlightedAttr.setX(i, 0);
        }
      });
    }

    // Set new highlighted cluster
    if (highlightedClusterId !== null) {
      packages.forEach((pkg, i) => {
        if (pkg.clusterId === highlightedClusterId) {
          highlightedAttr.setX(i, 1);
        }
      });
    }

    highlightedAttr.needsUpdate = true;
    prevHighlightedClusterId.current = highlightedClusterId;
  }, [meshRef, highlightedClusterId, packages]);
}
