import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { useGalaxyStore } from "../store/useGalaxyStore";
import { getClusterColor } from "../utils/colorPalette";
import { computeBounds } from "../utils/dataBounds";

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
}

export function Constellations() {
  const constellations = useGalaxyStore((s) => s.constellations);
  const packages = useGalaxyStore((s) => s.packages);
  const selectedClusterIds = useGalaxyStore((s) => s.selectedClusterIds);
  const { camera, size } = useThree();

  const lineRef = useRef<LineSegments2>(null);
  const glowLineRef = useRef<LineSegments2>(null);

  const dataBounds = useMemo(() => computeBounds(packages), [packages]);

  const geometry = useMemo(() => {
    if (constellations.length === 0) return null;

    const visibleEdges = constellations.filter((edge) =>
      selectedClusterIds.has(Number(edge.clusterId)),
    );

    if (visibleEdges.length === 0) return null;

    const positions: number[] = [];
    const colors: number[] = [];

    for (const edge of visibleEdges) {
      positions.push(edge.fromX, edge.fromY, 0);
      positions.push(edge.toX, edge.toY, 0);

      const color = hexToRgb(getClusterColor(Number(edge.clusterId)));
      colors.push(...color);
      colors.push(...color);
    }

    const geo = new LineSegmentsGeometry();
    geo.setPositions(positions);
    geo.setColors(colors);

    return geo;
  }, [constellations, selectedClusterIds]);

  const mainMaterial = useMemo(() => {
    return new LineMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      linewidth: 1.5,
      resolution: new THREE.Vector2(size.width, size.height),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [size.width, size.height]);

  const glowMaterial = useMemo(() => {
    return new LineMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      linewidth: 6,
      resolution: new THREE.Vector2(size.width, size.height),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [size.width, size.height]);

  const mainLine = useMemo(() => {
    if (!geometry) return null;
    return new LineSegments2(geometry, mainMaterial);
  }, [geometry, mainMaterial]);

  const glowLine = useMemo(() => {
    if (!geometry) return null;
    return new LineSegments2(geometry, glowMaterial);
  }, [geometry, glowMaterial]);

  useFrame(() => {
    if (!lineRef.current || !glowLineRef.current) return;

    const cam = camera as THREE.OrthographicCamera;
    const visibleWidth = (cam.right - cam.left) / cam.zoom;
    const visibleHeight = (cam.top - cam.bottom) / cam.zoom;

    const viewportArea = visibleWidth * visibleHeight;
    const totalDataArea = dataBounds
      ? dataBounds.width * dataBounds.height
      : viewportArea;

    const coverageRatio = Math.min(1.0, viewportArea / totalDataArea);
    const normalizedDensity = Math.sqrt(coverageRatio);

    // Opacity: very dim when zoomed out (high density), more visible when zoomed in
    const mainOpacity = 0.08 + (1.0 - normalizedDensity) * 0.25;
    const glowOpacity = 0.02 + (1.0 - normalizedDensity) * 0.08;

    // Line width: thicker when zoomed in for better visibility
    const mainWidth = 1.0 + (1.0 - normalizedDensity) * 1.5;
    const glowWidth = 3.0 + (1.0 - normalizedDensity) * 5.0;

    const mainMat = lineRef.current.material as LineMaterial;
    const glowMat = glowLineRef.current.material as LineMaterial;

    mainMat.opacity = mainOpacity;
    mainMat.linewidth = mainWidth;
    mainMat.resolution.set(size.width, size.height);

    glowMat.opacity = glowOpacity;
    glowMat.linewidth = glowWidth;
    glowMat.resolution.set(size.width, size.height);
  });

  if (!mainLine || !glowLine) return null;

  return (
    <>
      {/* Glow layer - rendered first (behind) */}
      <primitive ref={glowLineRef} object={glowLine} renderOrder={0} />
      {/* Main line layer - rendered on top */}
      <primitive ref={lineRef} object={mainLine} renderOrder={1} />
    </>
  );
}
