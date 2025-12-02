import { useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { getClusterColor } from '../utils/colorPalette';
import { precomputeSizes } from '../utils/sizeScaling';
import { createPointShaderMaterial } from '../shaders/pointShader';
import { usePointHover } from '../hooks/usePointHover';

export function PackagePoints() {
  const packages = useGalaxyStore((s) => s.packages);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const hoveredIndex = useGalaxyStore((s) => s.hoveredIndex);
  const selectedPackageId = useGalaxyStore((s) => s.selectedPackageId);
  const setSelectedPackageId = useGalaxyStore((s) => s.setSelectedPackageId);
  const setHoveredIndex = useGalaxyStore((s) => s.setHoveredIndex);
  const spatialIndex = useGalaxyStore((s) => s.spatialIndex);
  const pointsRef = useRef<THREE.Points>(null);
  const prevHoveredIndex = useRef<number | null>(null);
  const prevSelectedIndex = useRef<number | null>(null);

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

  // Handle click on a point
  const handleClickIndex = useCallback(
    (index: number) => {
      setSelectedPackageId(packages[index].id);
    },
    [packages, setSelectedPackageId]
  );

  // Hover detection logic (spatial index lookup, cursor management, click handling)
  // Uses native canvas events to bypass R3F's expensive raycasting
  usePointHover({
    packages,
    spatialIndex,
    selectedClusterIds,
    baseSizes,
    setHoveredIndex,
    onClickIndex: handleClickIndex,
  });

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
    />
  );
}
