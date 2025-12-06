import * as THREE from "three";

export interface ScreenCoordinates {
  canvasX: number;
  canvasY: number;
}

// Reusable scratch vector to avoid allocations in hot paths
const scratchVec = new THREE.Vector3();

/**
 * Convert 3D world coordinates to canvas-relative screen coordinates
 * Uses a reusable scratch vector to avoid allocations
 */
export function worldToCanvasCoords(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  canvasSize: { width: number; height: number },
): ScreenCoordinates {
  scratchVec.copy(worldPos).project(camera);

  const screenX = ((scratchVec.x + 1) / 2) * canvasSize.width;
  const screenY = (-(scratchVec.y - 1) / 2) * canvasSize.height;

  return { canvasX: screenX, canvasY: screenY };
}

/**
 * Calculate distance from mouse pointer to a world-space point
 */
export function getCanvasPointDistance(
  worldPos: THREE.Vector3,
  mouseClientX: number,
  mouseClientY: number,
  camera: THREE.Camera,
  canvasRect: DOMRect,
  canvasSize: { width: number; height: number },
): number {
  const screenCoords = worldToCanvasCoords(worldPos, camera, canvasSize);

  const canvasMouseX = mouseClientX - canvasRect.left;
  const canvasMouseY = mouseClientY - canvasRect.top;

  const dx = screenCoords.canvasX - canvasMouseX;
  const dy = screenCoords.canvasY - canvasMouseY;

  return Math.sqrt(dx * dx + dy * dy);
}
