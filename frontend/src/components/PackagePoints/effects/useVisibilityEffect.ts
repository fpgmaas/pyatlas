import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import type { Package } from "../../../types";

export function useVisibilityEffect(
  meshRef: RefObject<THREE.InstancedMesh | null>,
  packages: Package[],
  baseSizes: Map<number, number>,
  selectedClusterIds: Set<number>,
): void {
  useEffect(() => {
    if (!meshRef.current) return;
    const geom = meshRef.current.geometry;
    const sizeAttr = geom.getAttribute(
      "instanceSize",
    ) as THREE.InstancedBufferAttribute;

    packages.forEach((pkg, i) => {
      const baseSize = baseSizes.get(pkg.id) || 16;
      const visible = selectedClusterIds.has(pkg.clusterId);
      sizeAttr.setX(i, visible ? baseSize : 0);
    });
    sizeAttr.needsUpdate = true;
  }, [meshRef, selectedClusterIds, packages, baseSizes]);
}
