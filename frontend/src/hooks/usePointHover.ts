import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import type { Package } from '../types';
import type { SpatialIndex } from '../utils/spatialIndex';
import { getCanvasPointDistance } from '../utils/coordinateConversion';

// Reusable vector for hover detection to avoid allocations
const hoverScratchVec = new THREE.Vector3();

interface UsePointHoverOptions {
  packages: Package[];
  spatialIndex: SpatialIndex | null;
  selectedClusterIds: Set<number>;
  baseSizes: Map<number, number>;
  setHoveredIndex: (index: number | null) => void;
}

interface UsePointHoverResult {
  handlePointerMove: (event: ThreeEvent<PointerEvent>) => void;
  handlePointerOut: () => void;
}

export function usePointHover({
  packages,
  spatialIndex,
  selectedClusterIds,
  baseSizes,
  setHoveredIndex,
}: UsePointHoverOptions): UsePointHoverResult {
  const { camera, size, gl } = useThree();
  const canvasRectRef = useRef<DOMRect | null>(null);

  // Cache canvas bounding rect for performance
  useEffect(() => {
    canvasRectRef.current = gl.domElement.getBoundingClientRect();

    const handleResize = () => {
      canvasRectRef.current = gl.domElement.getBoundingClientRect();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gl]);

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (!spatialIndex) return;

      const rect = canvasRectRef.current || gl.domElement.getBoundingClientRect();

      // Convert mouse position to NDC then to world coordinates
      const ndc = hoverScratchVec.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
        0
      );
      ndc.unproject(camera); // Now in world coordinates

      // Determine which grid cell the mouse is in
      const { cellSizeX, cellSizeY, minX, minY, cells } = spatialIndex;
      const cellX = Math.floor((ndc.x - minX) / cellSizeX);
      const cellY = Math.floor((ndc.y - minY) / cellSizeY);

      // Collect candidate indices from this cell and neighbors
      const candidateIndices: number[] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${cellX + dx},${cellY + dy}`;
          const indices = cells.get(key);
          if (indices) candidateIndices.push(...indices);
        }
      }

      let closestIndex = -1;
      let closestDistance = Infinity;

      // Only test candidates from nearby cells (typically 20-100 points, not 10k)
      for (const idx of candidateIndices) {
        const pkg = packages[idx];

        // Skip invisible points
        if (!selectedClusterIds.has(pkg.clusterId)) continue;

        // Calculate distance using coordinate conversion utility
        const distance = getCanvasPointDistance(
          hoverScratchVec.set(pkg.x, pkg.y, 0),
          event.clientX,
          event.clientY,
          camera,
          rect,
          size
        );

        // Check if within point radius (using actual point size)
        const pointRadius = (baseSizes.get(pkg.id) || 16) / 2;
        if (distance < pointRadius && distance < closestDistance) {
          closestDistance = distance;
          closestIndex = idx;
        }
      }

      if (closestIndex !== -1) {
        document.body.style.cursor = 'pointer';
        setHoveredIndex(closestIndex);
      } else {
        document.body.style.cursor = 'default';
        setHoveredIndex(null);
      }
    },
    [spatialIndex, packages, selectedClusterIds, baseSizes, setHoveredIndex, camera, size, gl]
  );

  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'default';
    setHoveredIndex(null);
  }, [setHoveredIndex]);

  return { handlePointerMove, handlePointerOut };
}
