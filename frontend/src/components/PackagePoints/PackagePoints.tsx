import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useGalaxyStore } from "../../store/useGalaxyStore";
import { computeBounds } from "../../utils/dataBounds";
import { PackageGrid } from "../../utils/PackageGrid";

import { usePackagePointsMesh } from "./usePackagePointsMesh";
import { usePackagePicking } from "./usePackagePicking";
import { useShaderUniforms } from "./useShaderUniforms";
import { HoverPlane } from "./HoverPlane";

import { useVisibilityEffect } from "./effects/useVisibilityEffect";
import { useHoverEffect } from "./effects/useHoverEffect";
import { useSelectionEffect } from "./effects/useSelectionEffect";
import { useHighlightEffect } from "./effects/useHighlightEffect";

export function PackagePoints() {
  // Store subscriptions
  const packages = useGalaxyStore((s) => s.packages);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const hoveredIndex = useGalaxyStore((s) => s.hoveredIndex);
  const selectedPackageId = useGalaxyStore((s) => s.selectedPackageId);
  const highlightedClusterId = useGalaxyStore((s) => s.highlightedClusterId);
  const highlightStartTime = useGalaxyStore((s) => s.highlightStartTime);

  // Refs
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Compute data bounds for density calculation and hover plane
  const dataBounds = useMemo(() => computeBounds(packages), [packages]);

  // Build spatial index for efficient picking
  const grid = useMemo(
    () => new PackageGrid(packages, /* cellSize= */ 50),
    [packages],
  );

  // Create mesh with geometry, materials, and instance attributes
  const { mesh, baseSizes } = usePackagePointsMesh(packages, dataBounds);

  // Picking handlers
  const { handlePointerMove, handlePointerOut, handleClick } =
    usePackagePicking(packages, grid, selectedClusterIds);

  // Effects for attribute updates
  useVisibilityEffect(meshRef, packages, baseSizes, selectedClusterIds);
  useHoverEffect(meshRef, hoveredIndex);
  useSelectionEffect(meshRef, packages, selectedPackageId);
  useHighlightEffect(meshRef, packages, highlightedClusterId);

  // Shader uniform updates
  useShaderUniforms(
    meshRef,
    dataBounds,
    highlightedClusterId,
    highlightStartTime,
  );

  return (
    <>
      {/* Invisible hover plane for picking - all pointer events go here */}
      <HoverPlane
        dataBounds={dataBounds}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      {/* InstancedMesh for rendering only - no pointer events */}
      <primitive ref={meshRef} object={mesh} />
    </>
  );
}
