import * as THREE from "three";

export const vertexShader = `
attribute float size;
attribute vec3 color;
attribute float hovered;
attribute float selected;
uniform float time;
uniform float density;
varying vec3 vColor;
varying float vHovered;
varying float vSelected;
varying float vTime;
varying float vSize;
varying float vDensity;

void main() {
  vColor = color;
  vHovered = hovered;
  vSelected = selected;
  vTime = time;
  vSize = size;
  vDensity = density;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Point size with space for soft glow
  float pointSize = size * 1.8;

  if (selected > 0.5) {
    pointSize = size * 2.5; // Extra space for selection glow
  } else if (hovered > 0.5) {
    pointSize = size * 2.2; // Extra space for hover glow
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
varying float vSize;
varying float vDensity;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(center);

  // Discard beyond radius 0.5
  if (dist > 0.5) {
    discard;
  }

  // === Adaptive brightness based on density ===
  // Very aggressive dimming when zoomed out (high density)
  // density 0.0 = zoomed in (few visible) -> full brightness
  // density 1.0 = zoomed out (many visible) -> very dim
  float densityFactor = smoothstep(0.0, 0.8, vDensity); // Start brightening earlier
  float haloBrightness = mix(1.0, 0.05, densityFactor); // Dramatically reduce when dense
  float coreBrightness = mix(1.0, 0.3, densityFactor);  // Core stays more visible

  // === Star geometry ===
  // Natural star: bright core with exponential falloff
  float coreRadius = 0.15;

  // === Halo intensity scales with package popularity ===
  float sizeNormalized = clamp((vSize - 12.0) / 68.0, 0.0, 1.0);
  float haloStrength = 0.2 + sizeNormalized * 0.6;

  // === Natural star glow using exponential falloff ===
  // This creates the soft, natural star appearance
  float normalizedDist = dist / 0.5;
  float starGlow = exp(-normalizedDist * 5.0) * haloStrength * haloBrightness;

  // Brighter core with smooth falloff
  float coreGlow = 0.0;
  if (dist < coreRadius) {
    coreGlow = 1.0 - (dist / coreRadius);
    coreGlow = pow(coreGlow, 0.5); // Sqrt for softer center gradient
  }

  // Combine core and halo
  vec3 starColor = vColor;
  float alpha = starGlow + coreGlow * coreBrightness * 0.8;

  // Mix towards white in the bright center
  float whiteMix = coreGlow * 0.4;
  starColor = mix(starColor, vec3(1.0), whiteMix);

  vec4 finalColor = vec4(starColor, alpha);

  // === Selection effect (pulsating star with expanding rings) ===
  if (vSelected > 0.5) {
    // Core pulsation
    float pulse = 0.85 + 0.15 * sin(vTime * 2.5);

    // Pulsating bright core
    float core = exp(-dist * 18.0) * pulse;

    // Soft glow that pulses
    float glow = exp(-dist * 8.0) * 0.3 * pulse;

    // Expanding rings - create 2 rings that travel outward
    float ringSpeed = 0.2;
    float ringWidth = 0.03;

    // Ring 1 - primary ring
    float ring1Phase = fract(vTime * ringSpeed);
    float ring1Radius = ring1Phase * 0.5; // Expand from center to edge
    float ring1Dist = abs(dist - ring1Radius);
    float ring1 = smoothstep(ringWidth, 0.0, ring1Dist);
    ring1 *= (1.0 - ring1Phase); // Fade out as it expands
    ring1 *= smoothstep(0.0, 0.1, ring1Phase); // Fade in at start

    // Ring 2 - offset by half cycle
    float ring2Phase = fract(vTime * ringSpeed + 0.5);
    float ring2Radius = ring2Phase * 0.5;
    float ring2Dist = abs(dist - ring2Radius);
    float ring2 = smoothstep(ringWidth, 0.0, ring2Dist);
    ring2 *= (1.0 - ring2Phase);
    ring2 *= smoothstep(0.0, 0.1, ring2Phase);

    float rings = (ring1 + ring2) * 0.4;

    // Combine all elements
    float starEffect = core * 0.6 + glow + rings;

    // Apply with slight color tint (warm white)
    vec3 starColor = vec3(1.0, 0.98, 0.95);
    finalColor.rgb = mix(finalColor.rgb, starColor, starEffect);
    finalColor.a = max(finalColor.a, starEffect * 0.8);
  }

  // === Hover effect (subtle brightening, no ring) ===
  if (vHovered > 0.5) {
    // Just brighten the whole star slightly
    float hoverBoost = exp(-normalizedDist * 2.5) * 0.4;
    finalColor.rgb = mix(finalColor.rgb, vec3(1.0), hoverBoost);
    finalColor.a = max(finalColor.a, finalColor.a + hoverBoost * 0.3);
  }

  gl_FragColor = finalColor;
}
`;

export function createPointShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending, // Normal blending to prevent brightness accumulation
    uniforms: {
      time: { value: 0.0 },
      density: { value: 0.0 }, // Normalized visible packages / canvas area
    },
  });
}
