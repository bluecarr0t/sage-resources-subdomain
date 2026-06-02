import type { ClusterFeature, AnyProps } from 'supercluster';
import type { CompsMapLeafProps } from '@/lib/comps-unified/comps-map-types';
import type { CompsMapClusterItem } from '@/lib/comps-unified/comps-map-cluster-client';
import { COMPS_MAP_MAX_MARKERS_PER_VIEWPORT } from '@/lib/comps-unified/comps-map-supercluster-options';

type ClusterProps = { cluster?: boolean; point_count?: number; cluster_id?: number };

type MarkerMeta =
  | { kind: 'cluster'; clusterId: number; lat: number; lng: number }
  | { kind: 'leaf'; leaf: CompsMapLeafProps; srcKey: string; lat: number; lng: number };

const markerMeta = new WeakMap<google.maps.Marker, MarkerMeta>();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function clusterNormT(count: number, minInView: number, maxInView: number): number {
  if (maxInView <= minInView) return 0.5;
  const lo = Math.log1p(minInView);
  const hi = Math.log1p(maxInView);
  if (hi <= lo) return 0.5;
  return Math.max(0, Math.min(1, (Math.log1p(count) - lo) / (hi - lo)));
}

function clusterCoolWarmFill(count: number, minInView: number, maxInView: number): string {
  const t = clusterNormT(count, minInView, maxInView);
  const hue = 240 - t * 240;
  return `hsl(${hue}, 76%, 44%)`;
}

function clusterSize(count: number): number {
  if (count >= 1000) return 44;
  if (count >= 100) return 36;
  if (count >= 10) return 30;
  return 26;
}

function featureMarkerKey(
  f: CompsMapClusterItem,
  props: Partial<ClusterProps> & Partial<CompsMapLeafProps>
): string | null {
  if (props.cluster) {
    const id = (f as ClusterFeature<ClusterProps>).id;
    return `c:${id}`;
  }
  const leaf = props as CompsMapLeafProps;
  if (leaf.id) return `l:${leaf.id}`;
  const [lng, lat] = f.geometry.coordinates;
  return `l:${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export interface CompsMapMarkerLayerHandlers {
  onClusterClick: (clusterId: number, lat: number, lng: number) => void;
  onLeafClick: (leaf: CompsMapLeafProps, srcKey: string, lat: number, lng: number) => void;
}

export class CompsMapMarkerLayer {
  private markers = new Map<string, google.maps.Marker>();
  private clusterIconCache = new Map<string, google.maps.Icon>();
  private leafIconCache = new Map<string, google.maps.Symbol>();

  clear(): void {
    for (const marker of this.markers.values()) {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    }
    this.markers.clear();
  }

  sync(
    map: google.maps.Map,
    items: CompsMapClusterItem[],
    sources: string[],
    minCluster: number,
    maxCluster: number,
    sourceHex: (source: string) => string,
    handlers: CompsMapMarkerLayerHandlers
  ): void {
    const slice =
      items.length > COMPS_MAP_MAX_MARKERS_PER_VIEWPORT
        ? items.slice(0, COMPS_MAP_MAX_MARKERS_PER_VIEWPORT)
        : items;

    const activeKeys = new Set<string>();

    for (const f of slice) {
      const props = f.properties as Partial<ClusterProps> & Partial<CompsMapLeafProps>;
      const key = featureMarkerKey(f, props);
      if (!key) continue;

      const [lng, lat] = f.geometry.coordinates;
      activeKeys.add(key);

      let marker = this.markers.get(key);
      if (!marker) {
        marker = new google.maps.Marker({ optimized: true });
        this.markers.set(key, marker);
        marker.addListener('click', () => {
          const meta = markerMeta.get(marker!);
          if (!meta) return;
          if (meta.kind === 'cluster') {
            handlers.onClusterClick(meta.clusterId, meta.lat, meta.lng);
          } else {
            handlers.onLeafClick(meta.leaf, meta.srcKey, meta.lat, meta.lng);
          }
        });
      }

      if (props.cluster) {
        const count = props.point_count ?? 0;
        const size = clusterSize(count);
        const text = formatCount(count);
        const fill = clusterCoolWarmFill(count, minCluster, maxCluster);
        const iconKey = `${size}:${fill}:${text}`;
        let icon = this.clusterIconCache.get(iconKey);
        if (!icon) {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${fill}" stroke="#ffffff" stroke-width="2"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="system-ui,sans-serif">${escapeHtml(text)}</text>
</svg>`;
          icon = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2),
          };
          this.clusterIconCache.set(iconKey, icon);
        }
        const clusterId = (f as ClusterFeature<ClusterProps>).properties.cluster_id;
        markerMeta.set(marker, { kind: 'cluster', clusterId, lat, lng });
        marker.setOptions({ position: { lat, lng }, map, icon });
      } else {
        const leaf = props as CompsMapLeafProps;
        const srcKey = sources[leaf.sourceIdx] ?? '';
        const color = sourceHex(srcKey);
        let icon = this.leafIconCache.get(srcKey);
        if (!icon) {
          icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: color,
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: 1,
          };
          this.leafIconCache.set(srcKey, icon);
        }
        markerMeta.set(marker, { kind: 'leaf', leaf, srcKey, lat, lng });
        marker.setOptions({ position: { lat, lng }, map, icon });
      }
    }

    for (const [key, marker] of this.markers) {
      if (!activeKeys.has(key)) {
        marker.setMap(null);
      }
    }
  }
}

export function clusterCountBounds(items: CompsMapClusterItem[]): {
  minCluster: number;
  maxCluster: number;
} {
  let minCluster = 0;
  let maxCluster = 1;
  let sawCluster = false;
  for (const f of items) {
    const p = f.properties as Partial<ClusterProps>;
    if (p?.cluster) {
      const c = p.point_count ?? 0;
      if (!sawCluster) {
        minCluster = c;
        maxCluster = c;
        sawCluster = true;
      } else {
        if (c < minCluster) minCluster = c;
        if (c > maxCluster) maxCluster = c;
      }
    }
  }
  return { minCluster, maxCluster };
}
