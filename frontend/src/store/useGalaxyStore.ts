import { create } from 'zustand';
import type { Package, Cluster } from '../types';

interface GalaxyStore {
  packages: Package[];
  clusters: Cluster[];
  visibleClusterIds: Set<number>;
  selectedPackageId: number | null;
  hoveredIndex: number | null;
  searchQuery: string;
  searchResults: Package[];

  setPackages: (packages: Package[]) => void;
  setClusters: (clusters: Cluster[]) => void;
  toggleCluster: (clusterId: number) => void;
  setSelectedPackageId: (id: number | null) => void;
  setHoveredIndex: (index: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Package[]) => void;
}

export const useGalaxyStore = create<GalaxyStore>((set) => ({
  packages: [],
  clusters: [],
  visibleClusterIds: new Set(),
  selectedPackageId: null,
  hoveredIndex: null,
  searchQuery: '',
  searchResults: [],

  setPackages: (packages) => set({ packages }),
  setClusters: (clusters) => {
    const clusterIds = new Set(clusters.map(c => c.clusterId));
    set({ clusters, visibleClusterIds: clusterIds });
  },
  toggleCluster: (clusterId) => set((state) => {
    const newSet = new Set(state.visibleClusterIds);
    if (newSet.has(clusterId)) {
      newSet.delete(clusterId);
    } else {
      newSet.add(clusterId);
    }
    return { visibleClusterIds: newSet };
  }),
  setSelectedPackageId: (id) => set({ selectedPackageId: id }),
  setHoveredIndex: (index) => set({ hoveredIndex: index }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
}));
