import type { Package, Cluster, Constellation } from "../types";

// Local: '/data' -> fetches '/data/packages.json'
// Remote: 'https://fpgmaas.github.io/pyatlas-data' -> fetches from GitHub Pages
const DATA_BASE_URL = import.meta.env.VITE_DATA_BASE_URL || "/data";

export async function loadPackages(): Promise<Package[]> {
  const response = await fetch(`${DATA_BASE_URL}/packages.json`);
  if (!response.ok) {
    throw new Error("Failed to load packages data");
  }
  return response.json();
}

export async function loadClusters(): Promise<Cluster[]> {
  const response = await fetch(`${DATA_BASE_URL}/clusters.json`);
  if (!response.ok) {
    throw new Error("Failed to load clusters data");
  }
  return response.json();
}

export async function loadConstellations(): Promise<Constellation[]> {
  const response = await fetch(`${DATA_BASE_URL}/constellations.json`);
  if (!response.ok) {
    throw new Error("Failed to load star signs data");
  }
  return response.json();
}
