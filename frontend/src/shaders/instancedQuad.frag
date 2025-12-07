varying vec2 vUv;
varying vec3 vColor;
varying float vHovered;
varying float vSelected;
varying float vHighlighted;
varying float vHighlightProgress;
varying float vTime;
varying float vSize;
varying float vDensity;

void main() {
  // Center UV coordinates: PlaneGeometry UVs go from (0,0) to (1,1)
  // We need (0,0) at center, same as gl_PointCoord - 0.5
  vec2 center = vUv - vec2(0.5, 0.5);
  float dist = length(center);

  // Discard beyond radius 0.5 (creates circular quad)
  if (dist > 0.5) {
    discard;
  }

  // === Adaptive brightness based on density ===
  // Very aggressive dimming when zoomed out (high density)
  // density 0.0 = zoomed in (few visible) -> full brightness
  // density 1.0 = zoomed out (many visible) -> very dim
  float densityFactor = smoothstep(0.0, 0.8, vDensity);
  float haloBrightness = mix(1.0, 0.25, densityFactor);
  float coreBrightness = mix(1.0, 0.55, densityFactor);

  // === Star geometry ===
  // Natural star: bright core with exponential falloff
  float coreRadius = 0.15;

  // === Halo intensity scales with package popularity ===
  float sizeNormalized = clamp((vSize - 12.0) / 68.0, 0.0, 1.0);
  float haloStrength = 0.2 + sizeNormalized * 0.6;

  // === Natural star glow using exponential falloff ===
  float normalizedDist = dist / 0.5;
  float starGlow = exp(-normalizedDist * 5.0) * haloStrength * haloBrightness;

  // Brighter core with smooth falloff
  float coreGlow = 0.0;
  if (dist < coreRadius) {
    coreGlow = 1.0 - (dist / coreRadius);
    coreGlow = pow(coreGlow, 0.5);
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
    float ring1Radius = ring1Phase * 0.5;
    float ring1Dist = abs(dist - ring1Radius);
    float ring1 = smoothstep(ringWidth, 0.0, ring1Dist);
    ring1 *= (1.0 - ring1Phase);
    ring1 *= smoothstep(0.0, 0.1, ring1Phase);

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
    vec3 warmWhite = vec3(1.0, 0.98, 0.95);
    finalColor.rgb = mix(finalColor.rgb, warmWhite, starEffect);
    finalColor.a = max(finalColor.a, starEffect * 0.8);
  }

  // === Hover effect (subtle brightening, no ring) ===
  if (vHovered > 0.5) {
    float hoverBoost = exp(-normalizedDist * 2.5) * 0.4;
    finalColor.rgb = mix(finalColor.rgb, vec3(1.0), hoverBoost);
    finalColor.a = max(finalColor.a, finalColor.a + hoverBoost * 0.3);
  }

  // === Cluster highlight effect (brightness pulse with fade) ===
  if (vHighlighted > 0.5 && vHighlightProgress > 0.0) {
    // Compute intensity based on progress (quick fade in, longer fade out)
    // Progress 0.0-0.09: fade in (200ms / 2200ms)
    // Progress 0.09-0.32: hold at peak (500ms / 2200ms)
    // Progress 0.32-1.0: fade out (1500ms / 2200ms)
    float intensity = 0.0;
    if (vHighlightProgress < 0.09) {
      // Fade in: quick ramp up
      intensity = smoothstep(0.0, 0.09, vHighlightProgress);
    } else if (vHighlightProgress < 0.32) {
      // Hold at peak
      intensity = 1.0;
    } else {
      // Fade out: slower decay
      intensity = 1.0 - smoothstep(0.32, 1.0, vHighlightProgress);
    }

    // Apply brightness boost
    float highlightBoost = exp(-normalizedDist * 2.0) * 0.6 * intensity;
    vec3 warmWhite = vec3(1.0, 0.98, 0.94);
    finalColor.rgb = mix(finalColor.rgb, warmWhite, highlightBoost);
    finalColor.a = max(finalColor.a, finalColor.a + highlightBoost * 0.4);
  }

  gl_FragColor = finalColor;
}
