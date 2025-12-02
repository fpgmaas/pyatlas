import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { Package } from '../types';
import type { SpatialIndex } from '../utils/spatialIndex';

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
  const { camera, size, gl, controls } = useThree();
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

      // Manual orthographic unproject (more reliable than Three.js unproject with native events)
      // Three.js unproject() relies on camera matrices which may be stale outside R3F's render loop
      const ortho = camera as THREE.OrthographicCamera;
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // For orthographic camera: visible width/height = frustum size / zoom
      const visibleWidth = (ortho.right - ortho.left) / ortho.zoom;
      const visibleHeight = (ortho.top - ortho.bottom) / ortho.zoom;

      // Get the view center from OrbitControls target (not camera position)
      // OrbitControls moves the target when panning, which determines the view center
      const target = (controls as any)?.target;
      const centerX = target?.x ?? ortho.position.x;
      const centerY = target?.y ?? ortho.position.y;

      // World position = view center + NDC * half visible size
      const worldX = centerX + ndcX * (visibleWidth / 2);
      const worldY = centerY + ndcY * (visibleHeight / 2);

      // Determine which grid cell the mouse is in
      const { cellSizeX, cellSizeY, minX, minY, cells } = spatialIndex;
      const cellX = Math.floor((worldX - minX) / cellSizeX);
      const cellY = Math.floor((worldY - minY) / cellSizeY);

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

        // Calculate world-space distance (avoids camera matrix issues)
        const dx = pkg.x - worldX;
        const dy = pkg.y - worldY;
        const worldDistance = Math.sqrt(dx * dx + dy * dy);

        // Convert point radius from screen pixels to world units
        // For orthographic: screen pixels * (world units per pixel)
        const screenRadius = (baseSizes.get(pkg.id) || 16) / 2;
        const worldRadius = screenRadius * visibleWidth / size.width;

        if (worldDistance < worldRadius && worldDistance < closestDistance) {
          closestDistance = worldDistance;
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
    [spatialIndex, packages, selectedClusterIds, baseSizes, setHoveredIndexAndRef, camera, size, gl, controls]
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
