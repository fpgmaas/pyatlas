// Per-instance attributes
attribute vec3 instanceColor;
attribute float instanceSize;
attribute float instanceHovered;
attribute float instanceSelected;

// Uniforms
uniform float time;
uniform float density;
uniform float zoom;
uniform float frustumHeight;
uniform vec2 resolution;

// Varyings to fragment shader
varying vec2 vUv;
varying vec3 vColor;
varying float vHovered;
varying float vSelected;
varying float vTime;
varying float vSize;
varying float vDensity;

void main() {
  // Pass through to fragment shader
  vUv = uv;
  vColor = instanceColor;
  vHovered = instanceHovered;
  vSelected = instanceSelected;
  vTime = time;
  vSize = instanceSize;
  vDensity = density;

  // Extract instance position from instance matrix (column 3)
  vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);

  // Billboard: extract camera right and up vectors from view matrix
  vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  // Scale point size with zoom - use sqrt for subtle scaling
  // At zoom 1: scale = 1.0, at zoom 25: scale ~= 1.8
  float zoomScale = 0.8 + 0.2 * sqrt(zoom);

  // Calculate world size from pixel size
  // frustumHeight / resolution.y gives world units per pixel
  float pixelToWorld = frustumHeight / resolution.y;

  // Point size with space for soft glow
  float worldSize = instanceSize * 1.3 * zoomScale * pixelToWorld;

  if (instanceSelected > 0.5) {
    // Selected: larger for emphasis
    worldSize = instanceSize * 1.8 * zoomScale * pixelToWorld;
  } else if (instanceHovered > 0.5) {
    // Hovered: same size as normal (no shrinking to prevent flicker)
    worldSize = instanceSize * 1.3 * zoomScale * pixelToWorld;
  }

  // Billboard transformation
  // position.xy is the local quad vertex (-0.5 to 0.5 for PlaneGeometry)
  vec3 worldPos = instancePos
    + cameraRight * position.x * worldSize
    + cameraUp * position.y * worldSize;

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
