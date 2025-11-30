import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useDataBounds } from '../hooks/useDataBounds';
import type { Bounds } from '../utils/dataBounds';
import { PackagePoints } from './PackagePoints';
import { HoverLabel } from './HoverLabel';
import { PackageLabels } from './PackageLabels';
import { ClusterLabels } from './ClusterLabels';
import { useCameraAnimation } from '../hooks/useCameraAnimation';
import { useZoomTracker } from '../hooks/useZoomTracker';
import { useViewportBounds } from '../hooks/useViewportBounds';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { CAMERA_ZOOM_LEVELS } from '../utils/cameraConstants';

function CameraSetup({ bounds }: { bounds: Bounds }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const updateCamera = () => {
      if (camera.type !== 'OrthographicCamera') return;
      const cam = camera as THREE.OrthographicCamera;

      const aspect = size.width / size.height;
      const padding = 0.5;
      const viewWidth = bounds.width + padding * 2;
      const viewHeight = bounds.height + padding * 2;

      if (aspect > viewWidth / viewHeight) {
        cam.top = viewHeight / 2;
        cam.bottom = -viewHeight / 2;
        cam.left = -(viewHeight / 2) * aspect;
        cam.right = (viewHeight / 2) * aspect;
      } else {
        cam.left = -viewWidth / 2;
        cam.right = viewWidth / 2;
        cam.top = (viewWidth / 2) / aspect;
        cam.bottom = -(viewWidth / 2) / aspect;
      }

      cam.updateProjectionMatrix();
    };

    updateCamera();
  }, [camera, size, bounds]);

  return null;
}

function CameraAnimationController() {
  const { controls } = useThree();
  const { animateTo } = useCameraAnimation();
  const { cameraAnimationRequest, requestCameraAnimation } = useGalaxyStore();
  useZoomTracker();
  useViewportBounds();

  useEffect(() => {
    console.log('[CameraAnimationController] Animation request changed:', cameraAnimationRequest, 'controls:', !!controls);

    // Only process if we have both a request AND controls are ready
    if (cameraAnimationRequest && controls) {
      console.log('[CameraAnimationController] Controls available, executing animation to:',
        { x: cameraAnimationRequest.x, y: cameraAnimationRequest.y, zoom: cameraAnimationRequest.zoom });

      animateTo(
        cameraAnimationRequest.x,
        cameraAnimationRequest.y,
        { zoom: cameraAnimationRequest.zoom }
      );

      console.log('[CameraAnimationController] Clearing animation request');
      requestCameraAnimation(null); // Clear the request
    } else if (cameraAnimationRequest && !controls) {
      console.warn('[CameraAnimationController] Animation requested but controls not ready yet - will retry when controls become available');
      // Don't clear the request - it will be retried when controls becomes truthy
    }
  }, [cameraAnimationRequest, animateTo, requestCameraAnimation, controls]);

  return null;
}

export function GalaxyCanvas() {
  const bounds = useDataBounds();

  if (!bounds) return null; // or loading skeleton

  return (
    <div className="w-full h-full">
      <Canvas gl={{ alpha: false, antialias: true }}>
        <color attach="background" args={['#0a0a0a']} />

        <OrthographicCamera
          makeDefault
          position={[bounds.centerX, bounds.centerY, 10]}
          zoom={1.6}
        />

        <CameraSetup bounds={bounds} />

        <OrbitControls
          makeDefault
          target={[bounds.centerX, bounds.centerY, 0]}
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          minZoom={0.5}
          maxZoom={40}
          zoomSpeed={2.5}
          panSpeed={1}
        />

        <ambientLight intensity={0.8} />

        <CameraAnimationController />
        <PackagePoints />
        <HoverLabel />
        <PackageLabels />
        <ClusterLabels />
      </Canvas>
    </div>
  );
}
