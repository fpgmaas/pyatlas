import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useGalaxyStore, HIGHLIGHT_TIMING } from "../store/useGalaxyStore";
import { getClusterColor } from "../utils/colorPalette";
import { precomputeSizes } from "../utils/sizeScaling";
import { createInstancedQuadMaterial } from "../shaders/instancedQuadShader";
import { computeBounds } from "../utils/dataBounds";
import { PackageGrid } from "../utils/PackageGrid";

export function PackagePoints() {
  const packages = useGalaxyStore((s) => s.packages);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const hoveredIndex = useGalaxyStore((s) => s.hoveredIndex);
  const selectedPackageId = useGalaxyStore((s) => s.selectedPackageId);
  const setSelectedPackageId = useGalaxyStore((s) => s.setSelectedPackageId);
  const setHoveredIndex = useGalaxyStore((s) => s.setHoveredIndex);
  const highlightedClusterId = useGalaxyStore((s) => s.highlightedClusterId);
  const highlightStartTime = useGalaxyStore((s) => s.highlightStartTime);
  const setHighlightedCluster = useGalaxyStore((s) => s.setHighlightedCluster);
  const { camera, size } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const prevHoveredIndex = useRef<number | null>(null);
  const prevSelectedIndex = useRef<number | null>(null);
  const prevHighlightedClusterId = useRef<number | null>(null);

  // Compute total data bounds for density calculation
  const dataBounds = useMemo(() => computeBounds(packages), [packages]);

  // Build spatial index for efficient picking
  const grid = useMemo(
    () => new PackageGrid(packages, /* cellSize= */ 50),
    [packages],
  );

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
    const highlighted = new Float32Array(instanceCount);
    const sizeMap = precomputeSizes(packages);

    packages.forEach((pkg, i) => {
      const color = new THREE.Color(getClusterColor(pkg.clusterId));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = sizeMap.get(pkg.id) || 16;
      hovered[i] = 0;
      selected[i] = 0;
      highlighted[i] = 0;
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
    geometry.setAttribute(
      "instanceHighlighted",
      new THREE.InstancedBufferAttribute(highlighted, 1),
    );

    const material = createInstancedQuadMaterial();

    // Create InstancedMesh
    const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);

    // Set instance matrices with position only (no scale needed for raycasting)
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    packages.forEach((pkg, i) => {
      position.set(pkg.x, pkg.y, 0);
      matrix.compose(position, quaternion, scale);
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

  // Handle cluster highlight state - update all packages in the cluster
  useEffect(() => {
    if (!meshRef.current) return;
    const highlightedAttr = meshRef.current.geometry.getAttribute(
      "instanceHighlighted",
    ) as THREE.InstancedBufferAttribute;

    // Clear previous highlighted cluster
    if (prevHighlightedClusterId.current !== null) {
      packages.forEach((pkg, i) => {
        if (pkg.clusterId === prevHighlightedClusterId.current) {
          highlightedAttr.setX(i, 0);
        }
      });
    }

    // Set new highlighted cluster
    if (highlightedClusterId !== null) {
      packages.forEach((pkg, i) => {
        if (pkg.clusterId === highlightedClusterId) {
          highlightedAttr.setX(i, 1);
        }
      });
    }

    highlightedAttr.needsUpdate = true;
    prevHighlightedClusterId.current = highlightedClusterId;
  }, [highlightedClusterId, packages]);

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
    },
    [findClosestPackage, packages, setSelectedPackageId],
  );

  // Update shader uniforms
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

    // Update highlight progress
    if (mat.uniforms?.highlightProgress) {
      if (highlightStartTime !== null && highlightedClusterId !== null) {
        const elapsed = performance.now() - highlightStartTime;
        const progress = Math.min(1.0, elapsed / HIGHLIGHT_TIMING.TOTAL);
        mat.uniforms.highlightProgress.value = progress;

        // Auto-clear highlight when animation completes
        if (progress >= 1.0) {
          setHighlightedCluster(null);
        }
      } else {
        mat.uniforms.highlightProgress.value = 0.0;
      }
    }
  });

  // Invisible hover plane for reliable raycasting
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
      {/* Invisible hover plane for picking - all pointer events go here */}
      {hoverPlane && (
        <primitive
          object={hoverPlane}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />
      )}
      {/* InstancedMesh for rendering only - no pointer events */}
      <primitive ref={meshRef} object={mesh} />
    </>
  );
}
