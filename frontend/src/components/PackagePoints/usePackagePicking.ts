import { useCallback } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useGalaxyStore } from "../../store/useGalaxyStore";
import type { Package } from "../../types";
import type { PackageGrid } from "../../utils/PackageGrid";

export function usePackagePicking(
  packages: Package[],
  grid: PackageGrid,
  selectedClusterIds: Set<number>,
): {
  handlePointerMove: (event: ThreeEvent<PointerEvent>) => void;
  handlePointerOut: () => void;
  handleClick: (event: ThreeEvent<PointerEvent>) => void;
} {
  const { camera, size } = useThree();
  const setHoveredIndex = useGalaxyStore((s) => s.setHoveredIndex);
  const setSelectedPackageId = useGalaxyStore((s) => s.setSelectedPackageId);
  const setPackageDetailExpanded = useGalaxyStore(
    (s) => s.setPackageDetailExpanded,
  );

  // Find closest package using spatial index + zoom-aware threshold
  const findClosestPackage = useCallback(
    (worldPos: THREE.Vector3, maxPixels: number): number => {
      const cam = camera as THREE.OrthographicCamera;

      const worldUnitsPerPixel = (cam.right - cam.left) / cam.zoom / size.width;
      const maxWorldDist = maxPixels * worldUnitsPerPixel;

      // Query only nearby candidates using the grid
      const candidates = grid.query(worldPos.x, worldPos.y, maxWorldDist);

      let closestIdx = -1;
      let closestDistSq = maxWorldDist * maxWorldDist;

      for (const idx of candidates) {
        const pkg = packages[idx];

        // Skip hidden clusters
        if (!selectedClusterIds.has(pkg.clusterId)) continue;

        const dx = pkg.x - worldPos.x;
        const dy = pkg.y - worldPos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closestIdx = idx;
        }
      }

      return closestIdx;
    },
    [camera, size.width, grid, packages, selectedClusterIds],
  );

  // Hover handler using event.point + spatial index
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const worldPos = event.point;
      const idx = findClosestPackage(worldPos, 30); // 30px radius

      if (idx === -1) {
        setHoveredIndex(null);
        document.body.style.cursor = "default";
        return;
      }

      setHoveredIndex(idx);
      document.body.style.cursor = "pointer";
    },
    [findClosestPackage, setHoveredIndex],
  );

  // Pointer out handler
  const handlePointerOut = useCallback(() => {
    setHoveredIndex(null);
    document.body.style.cursor = "default";
  }, [setHoveredIndex]);

  // Click handler using event.point + spatial index
  const handleClick = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const worldPos = event.point;
      const idx = findClosestPackage(worldPos, 30);
      if (idx === -1) return;

      const pkg = packages[idx];
      setSelectedPackageId(pkg.id);
      setPackageDetailExpanded(true); // Always expand on manual click
    },
    [
      findClosestPackage,
      packages,
      setSelectedPackageId,
      setPackageDetailExpanded,
    ],
  );

  return { handlePointerMove, handlePointerOut, handleClick };
}
