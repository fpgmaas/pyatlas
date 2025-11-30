import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useThree, useFrame } from '@react-three/fiber';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { getClusterColor } from '../utils/colorPalette';
import { precomputeSizes } from '../utils/sizeScaling';
import { createPointShaderMaterial } from '../shaders/pointShader';
import { getCanvasPointDistance } from '../utils/coordinateConversion';

// Reusable vector for hover detection to avoid allocations
const hoverScratchVec = new THREE.Vector3();

export function PackagePoints() {
  const packages = useGalaxyStore((s) => s.packages);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const hoveredIndex = useGalaxyStore((s) => s.hoveredIndex);
  const selectedPackageId = useGalaxyStore((s) => s.selectedPackageId);
  const setSelectedPackageId = useGalaxyStore((s) => s.setSelectedPackageId);
  const setHoveredIndex = useGalaxyStore((s) => s.setHoveredIndex);
  const spatialIndex = useGalaxyStore((s) => s.spatialIndex);
  const pointsRef = useRef<THREE.Points>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const prevHoveredIndex = useRef<number | null>(null);
  const prevSelectedIndex = useRef<number | null>(null);
  const { camera, size, gl } = useThree();

  // Precompute positions, colors, sizes
  const { geometry, material, baseSizes } = useMemo(() => {
    const positions = new Float32Array(packages.length * 3);
    const colors = new Float32Array(packages.length * 3);
    const sizes = new Float32Array(packages.length);
    const hovered = new Float32Array(packages.length);
    const selected = new Float32Array(packages.length);
    const sizeMap = precomputeSizes(packages);

    packages.forEach((pkg, i) => {
      positions[i * 3] = pkg.x;
      positions[i * 3 + 1] = pkg.y;
      positions[i * 3 + 2] = 0;

      const color = new THREE.Color(getClusterColor(pkg.clusterId));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = sizeMap.get(pkg.id) || 16;
      hovered[i] = 0;
      selected[i] = 0;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('hovered', new THREE.BufferAttribute(hovered, 1));
    geometry.setAttribute('selected', new THREE.BufferAttribute(selected, 1));

    const material = createPointShaderMaterial();

    // Store base sizes in a Map for easy lookup
    const baseSizes = new Map<number, number>();
    packages.forEach((pkg) => {
      baseSizes.set(pkg.id, sizeMap.get(pkg.id) || 16);
    });

    return { geometry, material, baseSizes };
  }, [packages]);

  // Handle visibility filtering
  useEffect(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const sizeAttr = geom.attributes.size as THREE.BufferAttribute;

    packages.forEach((pkg, i) => {
      const baseSize = baseSizes.get(pkg.id) || 16;
      const visible = selectedClusterIds.has(pkg.clusterId);
      sizeAttr.setX(i, visible ? baseSize : 0);
    });
    sizeAttr.needsUpdate = true;
  }, [selectedClusterIds, packages, baseSizes]);

  // Handle hover state - incremental update (only 2 entries instead of all)
  useEffect(() => {
    if (!pointsRef.current) return;
    const hoveredAttr = pointsRef.current.geometry.attributes.hovered as THREE.BufferAttribute;

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
  }, [hoveredIndex]);

  // Handle selection state - incremental update (only 2 entries instead of all)
  useEffect(() => {
    if (!pointsRef.current) return;
    const selectedAttr = pointsRef.current.geometry.attributes.selected as THREE.BufferAttribute;

    // Find index of selected package
    const selectedIndex = selectedPackageId
      ? packages.findIndex(pkg => pkg.id === selectedPackageId)
      : -1;

    // Turn off previous selected
    if (prevSelectedIndex.current !== null && prevSelectedIndex.current !== -1) {
      selectedAttr.setX(prevSelectedIndex.current, 0);
    }

    // Turn on new selected
    if (selectedIndex !== -1) {
      selectedAttr.setX(selectedIndex, 1);
    }

    selectedAttr.needsUpdate = true;
    prevSelectedIndex.current = selectedIndex !== -1 ? selectedIndex : null;
  }, [selectedPackageId, packages]);

  // Cache canvas bounding rect for performance
  useEffect(() => {
    canvasRectRef.current = gl.domElement.getBoundingClientRect();

    const handleResize = () => {
      canvasRectRef.current = gl.domElement.getBoundingClientRect();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gl]);

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
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

      // Calculate distance using coordinate conversion utility (reuses scratch vector internally)
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
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
    setHoveredIndex(null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (hoveredIndex !== null) {
      setSelectedPackageId(packages[hoveredIndex].id);
    }
  };

  // Update time uniform for animation
  useFrame((state) => {
    if (!pointsRef.current) return;

    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    if (mat.uniforms?.time) {
      mat.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
}
