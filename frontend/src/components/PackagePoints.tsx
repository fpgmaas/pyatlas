import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { getClusterColor } from '../utils/colorPalette';
import { precomputeSizes } from '../utils/sizeScaling';
import { createPointShaderMaterial } from '../shaders/pointShader';
import { getCanvasPointDistance } from '../utils/coordinateConversion';

export function PackagePoints() {
  const packages = useGalaxyStore((s) => s.packages);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const hoveredIndex = useGalaxyStore((s) => s.hoveredIndex);
  const setSelectedPackageId = useGalaxyStore((s) => s.setSelectedPackageId);
  const setHoveredIndex = useGalaxyStore((s) => s.setHoveredIndex);
  const pointsRef = useRef<THREE.Points>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const { camera, size, gl } = useThree();

  // Precompute positions, colors, sizes
  const { sizes, geometry, material } = useMemo(() => {
    const positions = new Float32Array(packages.length * 3);
    const colors = new Float32Array(packages.length * 3);
    const sizes = new Float32Array(packages.length);
    const hovered = new Float32Array(packages.length);
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
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('hovered', new THREE.BufferAttribute(hovered, 1));

    const material = createPointShaderMaterial();

    return { positions, colors, sizes, hovered, geometry, material };
  }, [packages]);

  // Handle visibility filtering
  useEffect(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const sizeAttr = geom.attributes.size as THREE.BufferAttribute;

    packages.forEach((pkg, i) => {
      const baseSize = sizes[i];
      const visible = selectedClusterIds.has(pkg.clusterId);
      sizeAttr.setX(i, visible ? baseSize : 0);
    });
    sizeAttr.needsUpdate = true;
  }, [selectedClusterIds, packages, sizes]);

  // Handle hover state
  useEffect(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const hoveredAttr = geom.attributes.hovered as THREE.BufferAttribute;

    for (let i = 0; i < packages.length; i++) {
      hoveredAttr.setX(i, i === hoveredIndex ? 1 : 0);
    }
    hoveredAttr.needsUpdate = true;
  }, [hoveredIndex, packages.length]);

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

    let closestIndex = -1;
    let closestDistance = Infinity;

    packages.forEach((pkg, i) => {
      // Skip invisible points
      if (!selectedClusterIds.has(pkg.clusterId)) return;

      // Get cached canvas position (or compute if not cached)
      const rect = canvasRectRef.current || gl.domElement.getBoundingClientRect();

      // Calculate distance using coordinate conversion utility
      const distance = getCanvasPointDistance(
        new THREE.Vector3(pkg.x, pkg.y, 0),
        event.clientX,
        event.clientY,
        camera,
        rect,
        size
      );

      // Check if within point radius (using actual point size)
      const pointRadius = sizes[i] / 2;
      if (distance < pointRadius && distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });

    if (closestIndex !== -1) {
      console.log('Hover index:', closestIndex, 'Package:', packages[closestIndex]?.name);
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
