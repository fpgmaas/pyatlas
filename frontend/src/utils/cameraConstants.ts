/**
 * Standard zoom levels for different view types in the PyPI Galaxy visualization
 */
export const CAMERA_ZOOM_LEVELS = {
  OVERVIEW: 1.6,      // Full galaxy view (default initial view)
  CLUSTER: 8,         // Viewing a cluster of related packages
  PACKAGE: 24,         // Focusing on a single package
  DETAIL: 12,         // Very close inspection (labels become visible)
  MAX: 40,            // Maximum zoom (from OrbitControls config)
  MIN: 0.5,           // Minimum zoom (from OrbitControls config)
} as const;

/**
 * Standard animation durations in milliseconds
 */
export const CAMERA_ANIMATION_DURATION = {
  FAST: 600,
  NORMAL: 1000,
  SLOW: 1500,
} as const;
