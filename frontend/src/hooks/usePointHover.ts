import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
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
  onClickIndex?: (index: number) => void;
}

// Throttle interval in ms (64ms ≈ 15 checks/sec)
const HOVER_THROTTLE_MS = 32;

// Click detection thresholds
const CLICK_MAX_DURATION_MS = 300;
const CLICK_MAX_DISTANCE_PX = 5;

export function usePointHover({
  packages,
  spatialIndex,
  selectedClusterIds,
  baseSizes,
  setHoveredIndex,
  onClickIndex,
}: UsePointHoverOptions): void {
  const { camera, size, gl } = useThree();
  const canvasRectRef = useRef<DOMRect | null>(null);
  const lastHoverCheckRef = useRef<number>(0);
  const hoveredIndexRef = useRef<number | null>(null);

  // Click detection state
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Keep hoveredIndexRef in sync with the store value
  const setHoveredIndexAndRef = useCallback(
    (index: number | null) => {
      hoveredIndexRef.current = index;
      setHoveredIndex(index);
    },
    [setHoveredIndex]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const now = performance.now();

      // Throttle: skip if we checked recently
      if (now - lastHoverCheckRef.current < HOVER_THROTTLE_MS) {
        return;
      }
      lastHoverCheckRef.current = now;

      if (!spatialIndex) {
        return;
      }

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
        setHoveredIndexAndRef(closestIndex);
      } else {
        document.body.style.cursor = 'default';
        setHoveredIndexAndRef(null);
      }
    },
    [spatialIndex, packages, selectedClusterIds, baseSizes, setHoveredIndexAndRef, camera, size, gl]
  );

  const handlePointerLeave = useCallback(() => {
    document.body.style.cursor = 'default';
    setHoveredIndexAndRef(null);
  }, [setHoveredIndexAndRef]);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    pointerDownRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const down = pointerDownRef.current;
      if (!down) return;

      const duration = performance.now() - down.time;
      const dx = Math.abs(event.clientX - down.x);
      const dy = Math.abs(event.clientY - down.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if this qualifies as a click (short duration, minimal movement)
      if (duration < CLICK_MAX_DURATION_MS && distance < CLICK_MAX_DISTANCE_PX) {
        const currentHovered = hoveredIndexRef.current;
        if (currentHovered !== null && onClickIndex) {
          onClickIndex(currentHovered);
        }
      }

      pointerDownRef.current = null;
    },
    [onClickIndex]
  );

  // Attach native event listeners to the canvas
  useEffect(() => {
    const canvas = gl.domElement;

    // Cache bounding rect
    canvasRectRef.current = canvas.getBoundingClientRect();
    const handleResize = () => {
      canvasRectRef.current = canvas.getBoundingClientRect();
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl, handlePointerMove, handlePointerLeave, handlePointerDown, handlePointerUp]);
}
