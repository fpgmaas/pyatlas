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
import { useNormalizedZoom } from '../hooks/useNormalizedZoom';
import { useViewportBounds } from '../hooks/useViewportBounds';
import { useGalaxyStore } from '../store/useGalaxyStore';
import { CAMERA_ZOOM_LEVELS } from '../utils/cameraConstants';

function ZoomDebug() {
  const zoom = useGalaxyStore((s) => s.currentZoom);
  if (!import.meta.env.DEV) return null;
  return (
    <div className="absolute top-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded z-50">
      Zoom: {zoom.toFixed(2)}
    </div>
  );
}

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

function NormalizedZoomController() {
  useNormalizedZoom();
  return null;
}

function CameraAnimationController() {
  const { controls, camera } = useThree();
  const { animateTo } = useCameraAnimation();
  const { cameraAnimationRequest, requestCameraAnimation } = useGalaxyStore();
  useZoomTracker();
  useViewportBounds();

  useEffect(() => {

    // Only process if we have both a request AND controls are ready
    if (cameraAnimationRequest && controls) {
      let targetY = cameraAnimationRequest.y;

      // Apply Y offset to position package at specific screen percentage
      if (cameraAnimationRequest.screenYPercent !== undefined) {
        const cam = camera as THREE.OrthographicCamera;
        const frustumHeight = cam.top - cam.bottom;
        const visibleHeight = frustumHeight / cameraAnimationRequest.zoom;
        const offsetPercent = cameraAnimationRequest.screenYPercent - 0.5;
        targetY = cameraAnimationRequest.y - offsetPercent * visibleHeight;
      }

      animateTo(
        cameraAnimationRequest.x,
        targetY,
        { zoom: cameraAnimationRequest.zoom }
      );

      requestCameraAnimation(null); // Clear the request
    } else if (cameraAnimationRequest && !controls) {
      console.warn('[CameraAnimationController] Animation requested but controls not ready yet - will retry when controls become available');
      // Don't clear the request - it will be retried when controls becomes truthy
    }
  }, [cameraAnimationRequest, animateTo, requestCameraAnimation, controls, camera]);

  return null;
}

export function GalaxyCanvas() {
  const bounds = useDataBounds();

  if (!bounds) return null; // or loading skeleton

  return (
    <div className="w-full h-full relative">
      <ZoomDebug />
      <Canvas gl={{ alpha: false, antialias: false }} dpr={[1, 1.5]} >
        <color attach="background" args={['#0a0a0a']} />

        <OrthographicCamera
          makeDefault
          position={[bounds.centerX, bounds.centerY, 10]}
          zoom={CAMERA_ZOOM_LEVELS.OVERVIEW}
        />

        <CameraSetup bounds={bounds} />

        <OrbitControls
          makeDefault
          target={[bounds.centerX, bounds.centerY, 0]}
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          minZoom={CAMERA_ZOOM_LEVELS.MIN}
          maxZoom={CAMERA_ZOOM_LEVELS.MAX}
          zoomSpeed={2}
          panSpeed={1}
          touches={{
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_PAN
          }}
          zoomToCursor={true}
          mouseButtons={{
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }}
        />

        <NormalizedZoomController />

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
