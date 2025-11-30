import { create } from 'zustand';
import type { Package, Cluster } from '../types';
import type { ViewportBounds } from '../hooks/useViewportBounds';

interface GalaxyStore {
  packages: Package[];
  clusters: Cluster[];
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

  setPackages: (packages: Package[]) => void;
  setClusters: (clusters: Cluster[]) => void;
  setVisibleClusterIds: (ids: Set<number>) => void;
  toggleCluster: (clusterId: number) => void;
  setSelectedPackageId: (id: number | null) => void;
  setHoveredIndex: (index: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Package[]) => void;
  setCurrentZoom: (zoom: number) => void;
  setViewportBounds: (bounds: ViewportBounds) => void;
  setVisiblePackageIds: (ids: Set<number>) => void;
}

export const useGalaxyStore = create<GalaxyStore>((set) => ({
  packages: [],
  clusters: [],
  selectedClusterIds: new Set(), // User-controlled cluster visibility
  visibleClusterIds: new Set(), // Viewport-based cluster culling
  selectedPackageId: null,
  hoveredIndex: null,
  searchQuery: '',
  searchResults: [],
  currentZoom: 1.6,
  viewportBounds: null,
  visiblePackageIds: new Set(),
  shouldShowLabels: false,

  setPackages: (packages) => set({ packages }),
  setClusters: (clusters) => {
    const clusterIds = new Set(clusters.map(c => c.clusterId));
    set({ clusters, selectedClusterIds: clusterIds, visibleClusterIds: clusterIds });
  },
  setVisibleClusterIds: (ids) => set({ visibleClusterIds: ids }),
  toggleCluster: (clusterId) => set((state) => {
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
  setCurrentZoom: (zoom) => set({ currentZoom: zoom, shouldShowLabels: zoom >= 12 }),
  setViewportBounds: (bounds) => set({ viewportBounds: bounds }),
  setVisiblePackageIds: (ids) => set({ visiblePackageIds: ids }),
}));
