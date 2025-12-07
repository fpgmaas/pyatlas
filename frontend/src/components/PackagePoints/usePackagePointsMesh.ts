import { useMemo } from "react";
import * as THREE from "three";
import { getClusterColor } from "../../utils/colorPalette";
import { precomputeSizes } from "../../utils/sizeScaling";
import { createInstancedQuadMaterial } from "../../shaders/instancedQuadShader";
import type { Package } from "../../types";
import type { Bounds } from "../../utils/dataBounds";

export function usePackagePointsMesh(
  packages: Package[],
  dataBounds: Bounds | null,
): { mesh: THREE.InstancedMesh; baseSizes: Map<number, number> } {
  return useMemo(() => {
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
}
