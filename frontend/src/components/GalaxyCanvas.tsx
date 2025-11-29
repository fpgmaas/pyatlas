import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useDataBounds } from '../hooks/useDataBounds';
import type { Bounds } from '../utils/dataBounds';
import { PackagePoints } from './PackagePoints';
import { HoverLabel } from './HoverLabel';
import { ClusterLabels } from './ClusterLabels';
import { useCameraAnimation } from '../hooks/useCameraAnimation';
import { useGalaxyStore } from '../store/useGalaxyStore';

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
  const { animateTo } = useCameraAnimation();
  const { packages, selectedPackageId } = useGalaxyStore();

  useEffect(() => {
    if (selectedPackageId !== null) {
      const pkg = packages.find(p => p.id === selectedPackageId);
      if (pkg) {
        animateTo(pkg.x, pkg.y, 8);
      }
    }
  }, [selectedPackageId, packages, animateTo]);

  return null;
}

export function GalaxyCanvas() {
  const bounds = useDataBounds();

  if (!bounds) return null; // or loading skeleton

  return (
    <div className="fixed inset-0 w-full h-full">
      <Canvas gl={{ alpha: false, antialias: true }}>
        <color attach="background" args={['#0a0a0a']} />

        <OrthographicCamera
          makeDefault
          position={[bounds.centerX, bounds.centerY, 10]}
          zoom={1}
        />

        <CameraSetup bounds={bounds} />

        <OrbitControls
          target={[bounds.centerX, bounds.centerY, 0]}
          enableRotate={false}
          enablePan={true}
          enableZoom={true}
          minZoom={0.5}
          maxZoom={20}
          zoomSpeed={0.5}
          panSpeed={0.8}
        />

        <ambientLight intensity={0.8} />

        <CameraAnimationController />
        <PackagePoints />
        <HoverLabel />
        <ClusterLabels />
      </Canvas>
    </div>
  );
}
