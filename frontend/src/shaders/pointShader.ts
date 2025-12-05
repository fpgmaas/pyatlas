import * as THREE from "three";

export const vertexShader = `
attribute float size;
attribute vec3 color;
attribute float hovered;
attribute float selected;
uniform float time;
varying vec3 vColor;
varying float vHovered;
varying float vSelected;
varying float vTime;

void main() {
  vColor = color;
  vHovered = hovered;
  vSelected = selected;
  vTime = time;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Increase point size for selected or hovered points to accommodate glow
  float pointSize = size;
  if (selected > 0.5) {
    pointSize = size * 2.0; // Double the size for selection glow
  } else if (hovered > 0.5) {
    pointSize = size * 1.3; // Slightly larger for hover glow
  }

  gl_PointSize = pointSize;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const fragmentShader = `
varying vec3 vColor;
varying float vHovered;
varying float vSelected;
varying float vTime;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(center);

  // For selected points, we've doubled the point size
  // So the main point circle is at radius 0.25, and we have space up to 0.5 for glow
  if (vSelected > 0.5) {
    // Discard beyond radius 0.5
    if (dist > 0.5) {
      discard;
    }

    // Animation parameters
    float pulseSpeed = 2.0;
    float pulseAmount = 0.1;
    float pulse = 1.0 + pulseAmount * sin(vTime * pulseSpeed);

    // Start with transparent
    vec4 finalColor = vec4(0.0, 0.0, 0.0, 0.0);

    // Render selection glow between radius 0.25 and 0.35 (smaller, more subtle glow)
    if (dist > 0.25 && dist <= 0.35) {
      float glowDist = dist - 0.25;
      float maxGlowRadius = 0.1 * pulse;

      // Keep glow brighter - less aggressive falloff
      float glowAlpha = 1.0 - smoothstep(0.0, maxGlowRadius, glowDist);
      glowAlpha *= 0.8 + 0.2 * sin(vTime * pulseSpeed); // Higher base opacity (0.8)
      // Don't square - keeps it brighter
      glowAlpha = glowAlpha * 0.9; // Scale to 90% max

      finalColor = vec4(1.0, 1.0, 1.0, glowAlpha);
    }

    // Hover glow on top of selection glow (if both are active)
    if (vHovered > 0.5 && dist > 0.25 && dist <= 0.32) {
      float glowDist = dist - 0.25;
      float maxGlowRadius = 0.07;

      float hoverAlpha = 1.0 - smoothstep(0.0, maxGlowRadius, glowDist);
      hoverAlpha = hoverAlpha * 0.7; // Static at 70% max

      // Blend with existing color
      finalColor.rgb = mix(finalColor.rgb, vec3(1.0, 1.0, 1.0), hoverAlpha);
      finalColor.a = max(finalColor.a, hoverAlpha);
    }

    // Main point at radius 0.25 (renders on top)
    if (dist <= 0.25) {
      finalColor = vec4(vColor, 0.5);
    }

    gl_FragColor = finalColor;
  } else {
    // Normal (non-selected) points
    // For hovered points, we've scaled to 1.3x, so point is at radius ~0.385
    float pointRadius = vHovered > 0.5 ? 0.385 : 0.5;

    if (dist > 0.5) {
      discard;
    }

    vec4 finalColor = vec4(vColor, 0.5);

    // Hover glow for normal points - static glowing ring
    if (vHovered > 0.5 && dist > pointRadius && dist <= 0.5) {
      float glowDist = dist - pointRadius;
      float maxGlowRadius = 0.115; // 0.5 - 0.385

      float hoverAlpha = 1.0 - smoothstep(0.0, maxGlowRadius, glowDist);
      hoverAlpha = hoverAlpha * 0.7; // Static at 70% max

      finalColor = vec4(1.0, 1.0, 1.0, hoverAlpha);
    }

    // Main point
    if (dist <= pointRadius) {
      finalColor = vec4(vColor, 0.5);
    }

    gl_FragColor = finalColor;
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
    uniforms: {
      time: { value: 0.0 },
    },
  });
}
