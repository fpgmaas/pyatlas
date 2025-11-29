import type { Package, Cluster } from '../types';

export async function loadPackages(): Promise<Package[]> {
  const response = await fetch('/data/packages.json');
  if (!response.ok) {
    throw new Error('Failed to load packages data');
  }
  return response.json();
}

export async function loadClusters(): Promise<Cluster[]> {
  const response = await fetch('/data/clusters.json');
  if (!response.ok) {
    throw new Error('Failed to load clusters data');
  }
  return response.json();
}
