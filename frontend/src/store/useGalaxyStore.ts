import { create } from "zustand";
import type { Package, Cluster, Constellation } from "../types";
import type { ViewportBounds } from "../hooks/useViewportBounds";

export interface CameraAnimationRequest {
  x: number;
  y: number;
  zoom: number;
}

export type ModalId = "controls" | "clusters" | "faq" | null;

// Speed multipliers (1.0 = default, 0.5 = half speed, 2.0 = double speed)
export const SPEED_DEFAULTS = {
  zoomMultiplier: 1.0,
  panMultiplier: 1.0,
} as const;

interface GalaxyStore {
  packages: Package[];
  clusters: Cluster[];
  constellations: Constellation[];
  selectedClusterIds: Set<number>; // User-controlled: which clusters user wants to see
  visibleClusterIds: Set<number>; // Viewport-based: which clusters are in viewport
  selectedPackageId: number | null;
  hoveredIndex: number | null;
  searchQuery: string;
  searchResults: Package[];
  currentZoom: number;
  viewportBounds: ViewportBounds | null;
  visiblePackageIds: Set<number>;
  shouldShowLabels: boolean;
  labeledPackageIds: Set<number>;
  cameraAnimationRequest: CameraAnimationRequest | null;
  isSidebarOpen: boolean;
  activeModal: ModalId;
  zoomSpeedMultiplier: number;
  panSpeedMultiplier: number;

  setPackages: (packages: Package[]) => void;
  setClusters: (clusters: Cluster[]) => void;
  setConstellations: (constellations: Constellation[]) => void;
  setVisibleClusterIds: (ids: Set<number>) => void;
  setSelectedClusterIds: (ids: Set<number>) => void;
  toggleCluster: (clusterId: number) => void;
  setSelectedPackageId: (id: number | null) => void;
  setHoveredIndex: (index: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Package[]) => void;
  setCurrentZoom: (zoom: number) => void;
  setViewportBounds: (bounds: ViewportBounds) => void;
  setVisiblePackageIds: (ids: Set<number>) => void;
  setLabeledPackageIds: (ids: Set<number>) => void;
  requestCameraAnimation: (request: CameraAnimationRequest | null) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  setActiveModal: (modal: ModalId) => void;
  setZoomSpeedMultiplier: (multiplier: number) => void;
  setPanSpeedMultiplier: (multiplier: number) => void;
}

export const useGalaxyStore = create<GalaxyStore>((set) => ({
  packages: [],
  clusters: [],
  constellations: [],
  selectedClusterIds: new Set(), // User-controlled cluster visibility
  visibleClusterIds: new Set(), // Viewport-based cluster culling
  selectedPackageId: null,
  hoveredIndex: null,
  searchQuery: "",
  searchResults: [],
  currentZoom: 1.6,
  viewportBounds: null,
  visiblePackageIds: new Set(),
  shouldShowLabels: false,
  labeledPackageIds: new Set(),
  cameraAnimationRequest: null,
  isSidebarOpen: false,
  activeModal: null,
  zoomSpeedMultiplier: SPEED_DEFAULTS.zoomMultiplier,
  panSpeedMultiplier: SPEED_DEFAULTS.panMultiplier,

  setPackages: (packages) => set({ packages }),
  setClusters: (clusters) => {
    const clusterIds = new Set(clusters.map((c) => c.clusterId));
    set({
      clusters,
      selectedClusterIds: clusterIds,
      visibleClusterIds: clusterIds,
    });
  },
  setConstellations: (constellations) => set({ constellations }),
  setVisibleClusterIds: (ids) => set({ visibleClusterIds: ids }),
  setSelectedClusterIds: (ids) => set({ selectedClusterIds: ids }),
  toggleCluster: (clusterId) =>
    set((state) => {
      const newSet = new Set(state.selectedClusterIds);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return { selectedClusterIds: newSet };
    }),
  setSelectedPackageId: (id) => set({ selectedPackageId: id }),
  setHoveredIndex: (index) => set({ hoveredIndex: index }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setCurrentZoom: (zoom) =>
    set({ currentZoom: zoom, shouldShowLabels: zoom >= 4 }),
  setViewportBounds: (bounds) => set({ viewportBounds: bounds }),
  setVisiblePackageIds: (ids) => set({ visiblePackageIds: ids }),
  setLabeledPackageIds: (ids) => set({ labeledPackageIds: ids }),
  requestCameraAnimation: (request) => set({ cameraAnimationRequest: request }),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setZoomSpeedMultiplier: (multiplier) =>
    set({ zoomSpeedMultiplier: multiplier }),
  setPanSpeedMultiplier: (multiplier) =>
    set({ panSpeedMultiplier: multiplier }),
}));
