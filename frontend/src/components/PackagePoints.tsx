import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useGalaxyStore } from "../store/useGalaxyStore";
import { getClusterColor } from "../utils/colorPalette";
import { precomputeSizes } from "../utils/sizeScaling";
import { createInstancedQuadMaterial } from "../shaders/instancedQuadShader";
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
  const { camera, size, controls } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const prevHoveredIndex = useRef<number | null>(null);
  const prevSelectedIndex = useRef<number | null>(null);
  const lastHoverTimeRef = useRef(0);

  // Camera movement detection refs
  const prevCameraTarget = useRef(new THREE.Vector3());
  const prevCameraZoom = useRef(0);
  const isCameraMovingRef = useRef(false);

  // Compute total data bounds for density calculation
  const dataBounds = useMemo(() => computeBounds(packages), [packages]);

  // Precompute geometry, material, and mesh
  const { mesh, baseSizes } = useMemo(() => {
    if (packages.length === 0) {
      // Return empty mesh for empty packages
      const emptyGeometry = new THREE.PlaneGeometry(1, 1);
      const emptyMaterial = createInstancedQuadMaterial();
      const emptyMesh = new THREE.InstancedMesh(
        emptyGeometry,
        emptyMaterial,
        0,
      );
      return { mesh: emptyMesh, baseSizes: new Map<number, number>() };
    }

    // Base geometry: 1x1 plane centered at origin
    const geometry = new THREE.PlaneGeometry(1, 1);

    // Per-instance data
    const instanceCount = packages.length;
    const colors = new Float32Array(instanceCount * 3);
    const sizes = new Float32Array(instanceCount);
    const hovered = new Float32Array(instanceCount);
    const selected = new Float32Array(instanceCount);
    const sizeMap = precomputeSizes(packages);

    packages.forEach((pkg, i) => {
      const color = new THREE.Color(getClusterColor(pkg.clusterId));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = sizeMap.get(pkg.id) || 16;
      hovered[i] = 0;
      selected[i] = 0;
    });

    // Attach as InstancedBufferAttributes
    geometry.setAttribute(
      "instanceColor",
      new THREE.InstancedBufferAttribute(colors, 3),
    );
    geometry.setAttribute(
      "instanceSize",
      new THREE.InstancedBufferAttribute(sizes, 1),
    );
    geometry.setAttribute(
      "instanceHovered",
      new THREE.InstancedBufferAttribute(hovered, 1),
    );
    geometry.setAttribute(
      "instanceSelected",
      new THREE.InstancedBufferAttribute(selected, 1),
    );

    const material = createInstancedQuadMaterial();

    // Create InstancedMesh
    const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);

    // Set instance matrices with position (required for raycasting to work)
    const matrix = new THREE.Matrix4();
    packages.forEach((pkg, i) => {
      matrix.setPosition(pkg.x, pkg.y, 0);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;

    // Set bounding sphere for frustum culling
    if (dataBounds) {
      const centerX = (dataBounds.minX + dataBounds.maxX) / 2;
      const centerY = (dataBounds.minY + dataBounds.maxY) / 2;
      const radius =
        Math.max(dataBounds.width, dataBounds.height) / 2 +
        100; /* padding for glow */
      geometry.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(centerX, centerY, 0),
        radius,
      );
    }

    // Store base sizes in a Map for easy lookup
    const baseSizes = new Map<number, number>();
    packages.forEach((pkg) => {
      baseSizes.set(pkg.id, sizeMap.get(pkg.id) || 16);
    });

    return { mesh, baseSizes };
  }, [packages, dataBounds]);

  // Handle visibility filtering
  useEffect(() => {
    if (!meshRef.current) return;
    const geom = meshRef.current.geometry;
    const sizeAttr = geom.getAttribute(
      "instanceSize",
    ) as THREE.InstancedBufferAttribute;

    packages.forEach((pkg, i) => {
      const baseSize = baseSizes.get(pkg.id) || 16;
      const visible = selectedClusterIds.has(pkg.clusterId);
      sizeAttr.setX(i, visible ? baseSize : 0);
    });
    sizeAttr.needsUpdate = true;
  }, [selectedClusterIds, packages, baseSizes]);

  // Handle hover state - incremental update (only 2 entries instead of all)
  useEffect(() => {
    if (!meshRef.current) return;
    const hoveredAttr = meshRef.current.geometry.getAttribute(
      "instanceHovered",
    ) as THREE.InstancedBufferAttribute;

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
  }, [selectedPackageId, packages]);

  // Find the closest visible package to a point
  const findClosestPackage = useCallback(
    (point: THREE.Vector3) => {
      let closestIdx = -1;
      let closestDistSq = Infinity;

      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        // Skip hidden clusters
        if (!selectedClusterIds.has(pkg.clusterId)) continue;
        // Skip packages with size 0 (hidden)
        const dx = pkg.x - point.x;
        const dy = pkg.y - point.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closestIdx = i;
        }
      }

      return closestIdx;
    },
    [packages, selectedClusterIds],
  );

  // Convert mouse event to world position (stable, doesn't depend on quad geometry)
  const getWorldPosition = useCallback(
    (event: ThreeEvent<PointerEvent>): THREE.Vector3 | null => {
      const cam = camera as THREE.OrthographicCamera;
      // event.pointer is normalized device coordinates (-1 to 1)
      const x = event.pointer.x;
      const y = event.pointer.y;

      // Convert NDC to world space for orthographic camera
      const worldX =
        ((x + 1) / 2) * ((cam.right - cam.left) / cam.zoom) +
        cam.position.x -
        (cam.right - cam.left) / cam.zoom / 2;
      const worldY =
        ((y + 1) / 2) * ((cam.top - cam.bottom) / cam.zoom) +
        cam.position.y -
        (cam.top - cam.bottom) / cam.zoom / 2;

      return new THREE.Vector3(worldX, worldY, 0);
    },
    [camera],
  );

  // Track current hover state in ref to avoid dependency issues
  const currentHoveredRef = useRef<number | null>(null);
  currentHoveredRef.current = hoveredIndex;

  // R3F pointer event handlers
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // Skip hover processing while camera is moving
      if (isCameraMovingRef.current) return;

      const now = performance.now();
      if (now - lastHoverTimeRef.current < HOVER_THROTTLE_MS) return;
      lastHoverTimeRef.current = now;

      // Get world position from mouse (stable, not dependent on geometry)
      const worldPos = getWorldPosition(event);
      if (!worldPos) {
        if (currentHoveredRef.current !== null) setHoveredIndex(null);
        return;
      }

      const idx = findClosestPackage(worldPos);

      if (idx < 0 || idx >= packages.length) {
        if (currentHoveredRef.current !== null) setHoveredIndex(null);
        return;
      }

      // Check distance threshold based on zoom
      // Use hysteresis: larger threshold to stay hovered, smaller to enter
      const cam = camera as THREE.OrthographicCamera;
      const worldUnitsPerPixel = (cam.right - cam.left) / cam.zoom / size.width;
      const isCurrentlyHovered = currentHoveredRef.current === idx;
      const maxDist = worldUnitsPerPixel * (isCurrentlyHovered ? 40 : 30); // hysteresis

      const pkg = packages[idx];
      const dx = pkg.x - worldPos.x;
      const dy = pkg.y - worldPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxDist) {
        if (currentHoveredRef.current !== null) setHoveredIndex(null);
        document.body.style.cursor = "default";
        return;
      }

      if (currentHoveredRef.current !== idx) {
        setHoveredIndex(idx);
      }

      document.body.style.cursor = "pointer";
    },
    [
      packages,
      setHoveredIndex,
      findClosestPackage,
      getWorldPosition,
      camera,
      size.width,
    ],
  );

  const handlePointerOut = useCallback(() => {
    if (currentHoveredRef.current !== null) {
      setHoveredIndex(null);
      document.body.style.cursor = "default";
    }
  }, [setHoveredIndex]);

  const handleClick = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // Get world position from mouse
      const worldPos = getWorldPosition(event);
      if (!worldPos) return;

      const idx = findClosestPackage(worldPos);

      if (idx < 0 || idx >= packages.length) return;

      // Check distance threshold based on zoom
      const cam = camera as THREE.OrthographicCamera;
      const worldUnitsPerPixel = (cam.right - cam.left) / cam.zoom / size.width;
      const maxDist = 30 * worldUnitsPerPixel;
      const pkg = packages[idx];
      const dx = pkg.x - worldPos.x;
      const dy = pkg.y - worldPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxDist) return;

      setSelectedPackageId(pkg.id);
    },
    [
      packages,
      findClosestPackage,
      getWorldPosition,
      setSelectedPackageId,
      camera,
      size.width,
    ],
  );

  // Update uniforms and detect camera movement
  useFrame((state) => {
    if (!meshRef.current) return;

    const mat = meshRef.current.material as THREE.ShaderMaterial;

    // Time for animation
    if (mat.uniforms?.time) {
      mat.uniforms.time.value = state.clock.elapsedTime;
    }

    const cam = camera as THREE.OrthographicCamera;

    // Update zoom uniform
    if (mat.uniforms?.zoom) {
      mat.uniforms.zoom.value = cam.zoom;
    }

    // Update frustumHeight for pixel-to-world conversion
    if (mat.uniforms?.frustumHeight) {
      mat.uniforms.frustumHeight.value = (cam.top - cam.bottom) / cam.zoom;
    }

    // Update resolution
    if (mat.uniforms?.resolution) {
      mat.uniforms.resolution.value.set(size.width, size.height);
    }

    // Calculate density based on viewport coverage of total data
    const visibleWidth = (cam.right - cam.left) / cam.zoom;
    const visibleHeight = (cam.top - cam.bottom) / cam.zoom;
    const viewportArea = visibleWidth * visibleHeight;
    const totalDataArea = dataBounds
      ? dataBounds.width * dataBounds.height
      : viewportArea;

    const coverageRatio = Math.min(1.0, viewportArea / totalDataArea);
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

    const dx = Math.abs(currentTarget.x - prevCameraTarget.current.x);
    const dy = Math.abs(currentTarget.y - prevCameraTarget.current.y);
    const dz = Math.abs(currentZoom - prevCameraZoom.current);

    const isMoving =
      dx > CAMERA_MOVE_THRESHOLD ||
      dy > CAMERA_MOVE_THRESHOLD ||
      dz > CAMERA_MOVE_THRESHOLD;
    isCameraMovingRef.current = isMoving;

    // Clear hover when camera is moving (use ref to avoid stale closure)
    if (isMoving && currentHoveredRef.current !== null) {
      setHoveredIndex(null);
      document.body.style.cursor = "default";
    }

    prevCameraTarget.current.copy(currentTarget);
    prevCameraZoom.current = currentZoom;
  });

  // Create an invisible plane that covers the data bounds for stable hover detection
  const hoverPlane = useMemo(() => {
    if (!dataBounds) return null;
    const width = dataBounds.width + 200;
    const height = dataBounds.height + 200;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(
      (dataBounds.minX + dataBounds.maxX) / 2,
      (dataBounds.minY + dataBounds.maxY) / 2,
      -0.1, // Slightly behind the points
    );
    return plane;
  }, [dataBounds]);

  return (
    <>
      {hoverPlane && (
        <primitive
          object={hoverPlane}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />
      )}
      <primitive ref={meshRef} object={mesh} />
    </>
  );
}
