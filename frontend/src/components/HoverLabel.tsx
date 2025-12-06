import { Html } from "@react-three/drei";
import { useGalaxyStore } from "../store/useGalaxyStore";

export function HoverLabel() {
  const { packages, hoveredIndex, labeledPackageIds } = useGalaxyStore();

  if (hoveredIndex === null) return null;

  const pkg = packages[hoveredIndex];
  if (!pkg) return null;

  // Don't show hover label if this package already has a visible label
  if (labeledPackageIds.has(pkg.id)) return null;

  return (
    <Html
      position={[pkg.x, pkg.y, 0]}
      center
      zIndexRange={[0, 0]}
      style={{
        color: "white",
        fontSize: "12px",
        pointerEvents: "none",
        transform: "translateY(20px)",
        whiteSpace: "nowrap",
      }}
    >
      {pkg.name}
    </Html>
  );
}
