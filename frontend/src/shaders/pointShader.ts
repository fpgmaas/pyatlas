import * as THREE from 'three';

export const vertexShader = `
attribute float size;
attribute vec3 color;
attribute float hovered;
varying vec3 vColor;
varying float vHovered;

void main() {
  vColor = color;
  vHovered = hovered;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const fragmentShader = `
varying vec3 vColor;
varying float vHovered;

void main() {
  // Circular points
  vec2 center = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(center);

  if (dist > 0.5) {
    discard;
  }

  // If hovered, render border
  if (vHovered > 0.5) {
    // Border range: 0.4 to 0.5 (thin border at the edge)
    if (dist > 0.4 && dist <= 0.5) {
      // White border with high opacity
      gl_FragColor = vec4(1.0, 1.0, 1.0, 0.9);
    } else {
      // Normal point color
      gl_FragColor = vec4(vColor, 0.5);
    }
  } else {
    // Normal point color
    gl_FragColor = vec4(vColor, 0.5);
  }
}
`;

export function createPointShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}
