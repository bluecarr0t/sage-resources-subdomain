import Supercluster from 'supercluster';
import type { AnyProps, ClusterFeature, PointFeature } from 'supercluster';
import { COMPS_MAP_SUPERCLUSTER_OPTIONS } from '@/lib/comps-unified/comps-map-supercluster-options';
import type { CompsMapLeafProps } from '@/lib/comps-unified/comps-map-types';

type ClusterProps = Supercluster.ClusterProperties & { point_count: number };

export type CompsMapClusterItem =
  | ClusterFeature<ClusterProps>
  | PointFeature<CompsMapLeafProps & AnyProps>;

export interface CompsMapClusterIndex {
  load(features: Array<PointFeature<CompsMapLeafProps>>): Promise<void>;
  getClusters(
    bbox: [number, number, number, number],
    zoom: number
  ): Promise<CompsMapClusterItem[]>;
  getClusterExpansionZoom(clusterId: number): Promise<number>;
  terminate(): void;
}

class SyncCompsMapClusterIndex implements CompsMapClusterIndex {
  private cluster: Supercluster<CompsMapLeafProps, ClusterProps> | null = null;

  async load(features: Array<PointFeature<CompsMapLeafProps>>): Promise<void> {
    const c = new Supercluster<CompsMapLeafProps, ClusterProps>({
      radius: COMPS_MAP_SUPERCLUSTER_OPTIONS.radius,
      maxZoom: COMPS_MAP_SUPERCLUSTER_OPTIONS.maxZoom,
      minPoints: COMPS_MAP_SUPERCLUSTER_OPTIONS.minPoints,
    });
    c.load(features);
    this.cluster = c;
  }

  async getClusters(
    bbox: [number, number, number, number],
    zoom: number
  ): Promise<CompsMapClusterItem[]> {
    if (!this.cluster) return [];
    return this.cluster.getClusters(bbox, zoom) as CompsMapClusterItem[];
  }

  async getClusterExpansionZoom(clusterId: number): Promise<number> {
    if (!this.cluster) return 18;
    return this.cluster.getClusterExpansionZoom(clusterId);
  }

  terminate(): void {
    this.cluster = null;
  }
}

class WorkerCompsMapClusterIndex implements CompsMapClusterIndex {
  private worker: Worker;
  private loadPromise: Promise<void> | null = null;
  private clustersResolvers = new Map<
    number,
    { resolve: (items: CompsMapClusterItem[]) => void; reject: (e: Error) => void }
  >();
  private expansionResolvers = new Map<
    number,
    { resolve: (zoom: number) => void; reject: (e: Error) => void }
  >();
  private nextRequestId = 1;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data as
        | { type: 'loaded' }
        | { type: 'clusters'; requestId: number; items: CompsMapClusterItem[] }
        | { type: 'expansionZoom'; requestId: number; zoom: number }
        | { type: 'error'; message: string };

      if (msg.type === 'loaded') {
        return;
      }
      if (msg.type === 'error') {
        const err = new Error(msg.message);
        for (const { reject } of this.clustersResolvers.values()) reject(err);
        for (const { reject } of this.expansionResolvers.values()) reject(err);
        this.clustersResolvers.clear();
        this.expansionResolvers.clear();
        return;
      }
      if (msg.type === 'clusters') {
        const pending = this.clustersResolvers.get(msg.requestId);
        if (pending) {
          this.clustersResolvers.delete(msg.requestId);
          pending.resolve(msg.items);
        }
        return;
      }
      if (msg.type === 'expansionZoom') {
        const pending = this.expansionResolvers.get(msg.requestId);
        if (pending) {
          this.expansionResolvers.delete(msg.requestId);
          pending.resolve(msg.zoom);
        }
      }
    };
  }

  async load(features: Array<PointFeature<CompsMapLeafProps>>): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = new Promise<void>((resolve, reject) => {
      const onMessage = (ev: MessageEvent) => {
        const msg = ev.data as { type: string; message?: string };
        if (msg.type === 'loaded') {
          this.worker.removeEventListener('message', onMessage);
          resolve();
        } else if (msg.type === 'error') {
          this.worker.removeEventListener('message', onMessage);
          reject(new Error(msg.message ?? 'Worker load failed'));
        }
      };
      this.worker.addEventListener('message', onMessage);
      this.worker.postMessage({ type: 'load', features });
    });
    return this.loadPromise;
  }

  getClusters(
    bbox: [number, number, number, number],
    zoom: number
  ): Promise<CompsMapClusterItem[]> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.clustersResolvers.set(requestId, { resolve, reject });
      this.worker.postMessage({ type: 'getClusters', requestId, bbox, zoom });
    });
  }

  getClusterExpansionZoom(clusterId: number): Promise<number> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.expansionResolvers.set(requestId, { resolve, reject });
      this.worker.postMessage({ type: 'getExpansionZoom', requestId, clusterId });
    });
  }

  terminate(): void {
    this.worker.terminate();
    this.loadPromise = null;
    for (const { reject } of this.clustersResolvers.values()) {
      reject(new Error('Cluster worker terminated'));
    }
    for (const { reject } of this.expansionResolvers.values()) {
      reject(new Error('Cluster worker terminated'));
    }
    this.clustersResolvers.clear();
    this.expansionResolvers.clear();
  }
}

/** Prefer a Web Worker when available; fall back to main-thread Supercluster. */
export function createCompsMapClusterIndex(): CompsMapClusterIndex {
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(
        new URL('./comps-map-cluster.worker.ts', import.meta.url),
        { type: 'module' }
      );
      return new WorkerCompsMapClusterIndex(worker);
    } catch {
      // bundler / SSR — sync path
    }
  }
  return new SyncCompsMapClusterIndex();
}
