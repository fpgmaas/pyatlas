import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { Package } from "../../../types";

export function useSelectionEffect(
  meshRef: RefObject<THREE.InstancedMesh | null>,
  packages: Package[],
  selectedPackageId: number | null,
): void {
  const prevSelectedIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const selectedAttr = meshRef.current.geometry.getAttribute(
      "instanceSelected",
    ) as THREE.InstancedBufferAttribute;

    // Find index of selected package
    const selectedIndex =
      selectedPackageId !== null
        ? packages.findIndex((pkg) => pkg.id === selectedPackageId)
        : -1;

    // Turn off previous selected
    if (
      prevSelectedIndex.current !== null &&
      prevSelectedIndex.current !== -1
    ) {
      selectedAttr.setX(prevSelectedIndex.current, 0);
    }

    // Turn on new selected
    if (selectedIndex !== -1) {
      selectedAttr.setX(selectedIndex, 1);
    }

    selectedAttr.needsUpdate = true;
    prevSelectedIndex.current = selectedIndex !== -1 ? selectedIndex : null;
  }, [meshRef, selectedPackageId, packages]);
}
