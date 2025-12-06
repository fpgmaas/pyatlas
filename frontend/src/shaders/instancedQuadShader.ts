import * as THREE from "three";
import vertexShader from "./instancedQuad.vert";
import fragmentShader from "./instancedQuad.frag";

export { vertexShader, fragmentShader };

export function createInstancedQuadMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      time: { value: 0.0 },
      density: { value: 0.0 },
      zoom: { value: 1.0 },
      frustumHeight: { value: 1.0 },
      resolution: { value: new THREE.Vector2(1, 1) },
    },
  });
}
