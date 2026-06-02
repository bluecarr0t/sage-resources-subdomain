/**
 * Off-main-thread supercluster index + viewport queries for large geo payloads.
 */
import Supercluster from 'supercluster';
import type { AnyProps, ClusterFeature, PointFeature } from 'supercluster';
import { COMPS_MAP_SUPERCLUSTER_OPTIONS } from '@/lib/comps-unified/comps-map-supercluster-options';
import type { CompsMapLeafProps } from '@/lib/comps-unified/comps-map-types';

type ClusterProps = Supercluster.ClusterProperties & { point_count: number };

type WorkerIn =
  | { type: 'load'; features: Array<PointFeature<CompsMapLeafProps>> }
  | { type: 'getClusters'; requestId: number; bbox: [number, number, number, number]; zoom: number }
  | { type: 'getExpansionZoom'; requestId: number; clusterId: number };

type WorkerOut =
  | { type: 'loaded'; pointCount: number }
  | {
      type: 'clusters';
      requestId: number;
      items: Array<ClusterFeature<ClusterProps> | PointFeature<CompsMapLeafProps & AnyProps>>;
    }
  | { type: 'expansionZoom'; requestId: number; zoom: number }
  | { type: 'error'; message: string };

let cluster: Supercluster<CompsMapLeafProps, ClusterProps> | null = null;

self.onmessage = (ev: MessageEvent<WorkerIn>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'load') {
      cluster = new Supercluster<CompsMapLeafProps, ClusterProps>({
        radius: COMPS_MAP_SUPERCLUSTER_OPTIONS.radius,
        maxZoom: COMPS_MAP_SUPERCLUSTER_OPTIONS.maxZoom,
        minPoints: COMPS_MAP_SUPERCLUSTER_OPTIONS.minPoints,
      });
      cluster.load(msg.features);
      const out: WorkerOut = { type: 'loaded', pointCount: msg.features.length };
      self.postMessage(out);
      return;
    }

    if (!cluster) {
      const out: WorkerOut = { type: 'error', message: 'Cluster index not loaded' };
      self.postMessage(out);
      return;
    }

    if (msg.type === 'getClusters') {
      const items = cluster.getClusters(msg.bbox, msg.zoom) as Array<
        ClusterFeature<ClusterProps> | PointFeature<CompsMapLeafProps & AnyProps>
      >;
      const out: WorkerOut = { type: 'clusters', requestId: msg.requestId, items };
      self.postMessage(out);
      return;
    }

    if (msg.type === 'getExpansionZoom') {
      const zoom = cluster.getClusterExpansionZoom(msg.clusterId);
      const out: WorkerOut = { type: 'expansionZoom', requestId: msg.requestId, zoom };
      self.postMessage(out);
    }
  } catch (e) {
    const out: WorkerOut = {
      type: 'error',
      message: e instanceof Error ? e.message : 'Worker cluster error',
    };
    self.postMessage(out);
  }
};
