import { useMemo } from "react";
import { useGalaxyStore } from "../store/useGalaxyStore";
import { computeBounds } from "../utils/dataBounds";

export function useDataBounds() {
  const { packages } = useGalaxyStore();
  return useMemo(() => computeBounds(packages), [packages]);
}
