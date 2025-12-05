import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGalaxyStore } from "../store/useGalaxyStore";
import { getClusterColor } from "../utils/colorPalette";
import { precomputeSizes } from "../utils/sizeScaling";
import { createPointShaderMaterial } from "../shaders/pointShader";
import { computeBounds } from "../utils/dataBounds";

const HOVER_THROTTLE_MS = 32;
const CAMERA_MOVE_THRESHOLD = 0.001;

export function PackagePoints() {
  const packages = useGalaxyStore((s) => s.packages);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const hoveredIndex = useGalaxyStore((s) => s.hoveredIndex);
  const selectedPackageId = useGalaxyStore((s) => s.selectedPackageId);
  const setSelectedPackageId = useGalaxyStore((s) => s.setSelectedPackageId);
  const setHoveredIndex = useGalaxyStore((s) => s.setHoveredIndex);
  const { camera, raycaster, size, controls } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const prevHoveredIndex = useRef<number | null>(null);
  const prevSelectedIndex = useRef<number | null>(null);
  const lastHoverTimeRef = useRef(0);

  // Camera movement detection refs
  const prevCameraTarget = useRef(new THREE.Vector3());
  const prevCameraZoom = useRef(0);
  const isCameraMovingRef = useRef(false);

  // Compute total data bounds for density calculation
  const dataBounds = useMemo(() => computeBounds(packages), [packages]);

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
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("hovered", new THREE.BufferAttribute(hovered, 1));
    geometry.setAttribute("selected", new THREE.BufferAttribute(selected, 1));

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
    const hoveredAttr = pointsRef.current.geometry.attributes
      .hovered as THREE.BufferAttribute;

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
    const selectedAttr = pointsRef.current.geometry.attributes
      .selected as THREE.BufferAttribute;

    // Find index of selected package
    const selectedIndex = selectedPackageId
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
  }, [selectedPackageId, packages]);

  // R3F pointer event handlers - use event.index from raycaster
  const handlePointerMove = useCallback(
    (event: { index?: number }) => {
      // Skip hover processing while camera is moving
      if (isCameraMovingRef.current) return;

      const now = performance.now();
      if (now - lastHoverTimeRef.current < HOVER_THROTTLE_MS) return;
      lastHoverTimeRef.current = now;

      // R3F + Raycaster give you the vertex index on event.index
      const idx = event.index;
      if (idx == null || idx < 0 || idx >= packages.length) {
        if (hoveredIndex !== null) setHoveredIndex(null);
        return;
      }

      const pkg = packages[idx];

      // Respect cluster visibility
      if (!selectedClusterIds.has(pkg.clusterId)) {
        if (hoveredIndex !== null) setHoveredIndex(null);
        return;
      }

      if (hoveredIndex !== idx) {
        setHoveredIndex(idx);
      }

      document.body.style.cursor = "pointer";
    },
    [packages, selectedClusterIds, hoveredIndex, setHoveredIndex],
  );

  const handlePointerOut = useCallback(() => {
    if (hoveredIndex !== null) {
      setHoveredIndex(null);
      document.body.style.cursor = "default";
    }
  }, [hoveredIndex, setHoveredIndex]);

  const handleClick = useCallback(
    (event: { index?: number }) => {
      const idx = event.index;
      if (idx == null || idx < 0 || idx >= packages.length) return;

      const pkg = packages[idx];

      // Respect cluster visibility
      if (!selectedClusterIds.has(pkg.clusterId)) return;

      setSelectedPackageId(pkg.id);
    },
    [packages, selectedClusterIds, setSelectedPackageId],
  );

  // Update time uniform, raycaster threshold, density, and detect camera movement
  useFrame((state) => {
    if (!pointsRef.current) return;

    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    if (mat.uniforms?.time) {
      mat.uniforms.time.value = state.clock.elapsedTime;
    }

    // Update raycaster threshold based on camera zoom
    // For orthographic camera, convert screen pixels to world units
    const cam = camera as THREE.OrthographicCamera;
    const visibleWidth = (cam.right - cam.left) / cam.zoom;
    const visibleHeight = (cam.top - cam.bottom) / cam.zoom;
    const worldUnitsPerPixel = visibleWidth / size.width;
    // Use a reasonable point radius in pixels (e.g., 20px) converted to world units
    raycaster.params.Points.threshold = 20 * worldUnitsPerPixel;

    // Calculate density based on viewport coverage of total data
    // When zoomed out (seeing whole map): high density -> dim halos
    // When zoomed in (seeing small portion): low density -> bright halos
    const viewportArea = visibleWidth * visibleHeight;
    const totalDataArea = dataBounds
      ? dataBounds.width * dataBounds.height
      : viewportArea;

    // Coverage ratio: 1.0 = seeing entire map, 0.0 = zoomed in on tiny area
    const coverageRatio = Math.min(1.0, viewportArea / totalDataArea);

    // Use sqrt for smoother transition - brightness increases faster as you zoom in
    const normalizedDensity = Math.sqrt(coverageRatio);

    if (mat.uniforms?.density) {
      mat.uniforms.density.value = normalizedDensity;
    }

    // Detect camera movement
    const target = (controls as any)?.target;
    const currentTarget = target
      ? new THREE.Vector3(target.x, target.y, target.z)
      : cam.position.clone();
    const currentZoom = cam.zoom;

    // Update zoom uniform for point scaling
    if (mat.uniforms?.zoom) {
      mat.uniforms.zoom.value = currentZoom;
    }

    const dx = Math.abs(currentTarget.x - prevCameraTarget.current.x);
    const dy = Math.abs(currentTarget.y - prevCameraTarget.current.y);
    const dz = Math.abs(currentZoom - prevCameraZoom.current);

    const isMoving =
      dx > CAMERA_MOVE_THRESHOLD ||
      dy > CAMERA_MOVE_THRESHOLD ||
      dz > CAMERA_MOVE_THRESHOLD;
    isCameraMovingRef.current = isMoving;

    // Clear hover when camera is moving
    if (isMoving && hoveredIndex !== null) {
      setHoveredIndex(null);
      document.body.style.cursor = "default";
    }

    prevCameraTarget.current.copy(currentTarget);
    prevCameraZoom.current = currentZoom;
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
