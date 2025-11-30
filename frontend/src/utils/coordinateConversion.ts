import * as THREE from 'three';

export interface ScreenCoordinates {
  canvasX: number;
  canvasY: number;
}

/**
 * Convert 3D world coordinates to canvas-relative screen coordinates
 */
export function worldToCanvasCoords(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  canvasSize: { width: number; height: number }
): ScreenCoordinates {
  const vector = worldPos.clone();
  vector.project(camera);

  const screenX = (vector.x + 1) / 2 * canvasSize.width;
  const screenY = -(vector.y - 1) / 2 * canvasSize.height;

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
  canvasSize: { width: number; height: number }
): number {
  const screenCoords = worldToCanvasCoords(worldPos, camera, canvasSize);

  const canvasMouseX = mouseClientX - canvasRect.left;
  const canvasMouseY = mouseClientY - canvasRect.top;

  const dx = screenCoords.canvasX - canvasMouseX;
  const dy = screenCoords.canvasY - canvasMouseY;

  return Math.sqrt(dx * dx + dy * dy);
}
