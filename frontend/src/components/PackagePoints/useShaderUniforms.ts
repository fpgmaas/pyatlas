import { type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGalaxyStore, HIGHLIGHT_TIMING } from "../../store/useGalaxyStore";
import type { Bounds } from "../../utils/dataBounds";

export function useShaderUniforms(
  meshRef: RefObject<THREE.InstancedMesh | null>,
  dataBounds: Bounds | null,
  highlightedClusterId: number | null,
  highlightStartTime: number | null,
): void {
  const { camera, size } = useThree();
  const setHighlightedCluster = useGalaxyStore((s) => s.setHighlightedCluster);

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
}
