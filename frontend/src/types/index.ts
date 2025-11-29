export interface Package {
  id: number;
  name: string;
  summary: string;
  downloads: number;
  x: number;
  y: number;
  clusterId: number;
}

export interface Cluster {
  clusterId: number;
  label: string;
  centroidX: number;
  centroidY: number;
  downloads: number;
}
