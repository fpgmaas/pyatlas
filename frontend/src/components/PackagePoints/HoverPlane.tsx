import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Bounds } from "../../utils/dataBounds";

interface HoverPlaneProps {
  dataBounds: Bounds | null;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
  onClick: (event: ThreeEvent<PointerEvent>) => void;
}

export function HoverPlane({
  dataBounds,
  onPointerMove,
  onPointerOut,
  onClick,
}: HoverPlaneProps) {
  const hoverPlane = useMemo(() => {
    if (!dataBounds) return null;
    const width = dataBounds.width + 200;
    const height = dataBounds.height + 200;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(
      (dataBounds.minX + dataBounds.maxX) / 2,
      (dataBounds.minY + dataBounds.maxY) / 2,
      -0.1, // Slightly behind the points
    );
    return plane;
  }, [dataBounds]);

  if (!hoverPlane) return null;

  return (
    <primitive
      object={hoverPlane}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      onClick={onClick}
    />
  );
}
