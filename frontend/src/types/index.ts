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
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Constellation {
  clusterId: string;
  fromId: number;
  toId: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}
