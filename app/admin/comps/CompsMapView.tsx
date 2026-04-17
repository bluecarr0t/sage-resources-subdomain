'use client';

/**
 * Map view for /admin/comps — Google Maps (same stack as /admin/client-map) with
 * supercluster-based clustering. Only markers visible in the current viewport
 * are instantiated so 100k+ points stay responsive.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { GoogleMap } from '@react-google-maps/api';
import { Maximize2, Minimize2 } from 'lucide-react';
import { GoogleMapsProvider, useGoogleMaps } from '@/components/GoogleMapsProvider';
import Supercluster from 'supercluster';
import type { PointFeature, ClusterFeature, AnyProps } from 'supercluster';
import { unifiedSourceLabel } from '@/lib/comps-unified/build-row';

/** Tuple payload from /api/admin/comps/unified/geo (see geo route JSDoc). */
type GeoTuple = [
  number,
  number,
  number,
  string,
  string,
  number | null,
  string | null,
  number | null,
  number | null,
];

interface GeoResponse {
  success: boolean;
  points: GeoTuple[];
  sources: string[];
  total: number;
  /** Marker counts per `source` key (after source+address_key collapse). */
  geocoded_by_source?: Record<string, number>;
  capped: boolean;
  limit: number;
  message?: string;
}

interface LeafProps {
  id: string;
  name: string;
  sourceIdx: number;
  avgAdr: number | null;
  website: string | null;
  totalSites: number | null;
  numUnits: number | null;
}

interface MapPopupLabels {
  avgRetail: string;
  website: string;
  unitsSites: string;
  websiteOpen: string;
  empty: string;
}

type ClusterProps = Supercluster.ClusterProperties & { point_count: number };

const MAP_HEIGHT_PX = 640;

/** Same defaults as /admin/client-map. */
const CONTIGUOUS_US_CENTER = { lat: 39.8283, lng: -98.5795 };
const CONTIGUOUS_US_OVERVIEW_ZOOM = 4;

function sourceHex(source: string): string {
  switch (source) {
    case 'reports':
      return '#475569';
    case 'all_glamping_properties':
      return '#10b981';
    case 'hipcamp':
      return '#f97316';
    case 'campspot':
      return '#06b6d4';
    case 'all_roverpass_data_new':
      return '#8b5cf6';
    default:
      return '#64748b';
  }
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/**
 * Normalize cluster size to [0,1] within the current viewport using log1p so
 * small clusters still spread across the cool→warm range when counts vary widely.
 */
function clusterNormT(count: number, minInView: number, maxInView: number): number {
  if (maxInView <= minInView) return 0.5;
  const lo = Math.log1p(minInView);
  const hi = Math.log1p(maxInView);
  if (hi <= lo) return 0.5;
  return Math.max(0, Math.min(1, (Math.log1p(count) - lo) / (hi - lo)));
}

/** Cool (blue, low count) → warm (red, high count) for cluster circle fill. */
function clusterCoolWarmFill(count: number, minInView: number, maxInView: number): string {
  const t = clusterNormT(count, minInView, maxInView);
  const hue = 240 - t * 240;
  return `hsl(${hue}, 76%, 44%)`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Same rules as comps table expanded row. */
function normalizePropertyWebsiteUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`;
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

function formatWebsiteHostname(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    return href;
  }
}

function formatAvgAdr(n: number | null): string | null {
  if (n === null || !Number.isFinite(n)) return null;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatSitesUnits(ts: number | null, nu: number | null): string | null {
  const parts: string[] = [];
  if (ts != null && Number.isFinite(ts)) parts.push(`${Number(ts).toLocaleString()} sites`);
  if (nu != null && Number.isFinite(nu)) parts.push(`${Number(nu).toLocaleString()} units`);
  return parts.length ? parts.join(' · ') : null;
}

function buildLeafPopupHtml(
  leaf: LeafProps,
  sourceLabel: string,
  sourceHexColor: string,
  labels: MapPopupLabels
): string {
  const safeName = escapeHtml(leaf.name || '(unnamed)');
  const avg = formatAvgAdr(leaf.avgAdr);
  const href = normalizePropertyWebsiteUrl(leaf.website);
  const sites = formatSitesUnits(leaf.totalSites, leaf.numUnits);
  const empty = labels.empty;

  const row = (label: string, value: string, isHtmlValue = false) =>
    `<div style="margin-top:6px;font-size:12px;line-height:1.35;">
      <span style="color:#6b7280;display:block;margin-bottom:2px;">${escapeHtml(label)}</span>
      <span style="color:#111827;font-weight:500;">${isHtmlValue ? value : escapeHtml(value)}</span>
    </div>`;

  let extra = '';
  if (avg) {
    extra += row(labels.avgRetail, avg, false);
  } else {
    extra += row(labels.avgRetail, empty, false);
  }
  if (href) {
    const host = escapeHtml(formatWebsiteHostname(href));
    const safeHref = escapeHtml(href);
    const open = escapeHtml(labels.websiteOpen);
    extra += row(
      labels.website,
      `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;" title="${open}">${host}</a>`,
      true
    );
  } else {
    extra += row(labels.website, empty, false);
  }
  if (sites) {
    extra += row(labels.unitsSites, sites, false);
  } else {
    extra += row(labels.unitsSites, empty, false);
  }

  return `
    <div style="font-size:14px;padding:4px;min-width:200px;max-width:280px;">
      <div style="font-weight:600;color:#111827;margin-bottom:4px;">${safeName}</div>
      <span style="display:inline-block;margin-top:2px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:${sourceHexColor}22;color:${sourceHexColor};">${escapeHtml(sourceLabel)}</span>
      ${extra}
    </div>`;
}

function CompsMapInner({
  queryString,
  listTotalProperties,
}: {
  queryString: string;
  /** Same as list “properties” count so the map legend can show ~18k vs ~2k geocoded. */
  listTotalProperties?: number | null;
}) {
  const t = useTranslations('admin.comps');
  const { isLoaded, loadError } = useGoogleMaps();

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clusterIndexRef = useRef<Supercluster<LeafProps, ClusterProps> | null>(null);
  const sourcesRef = useRef<string[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const renderVisibleRef = useRef<() => void>(() => {});
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapPopupLabelsRef = useRef<MapPopupLabels>({
    avgRetail: '',
    website: '',
    unitsSites: '',
    websiteOpen: '',
    empty: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [geocodedBySource, setGeocodedBySource] = useState<Record<string, number>>({});
  const [capped, setCapped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mapContainerStyle = useMemo(
    () => ({
      width: '100%',
      height: isFullscreen ? '100vh' : MAP_HEIGHT_PX,
    }),
    [isFullscreen]
  );

  mapPopupLabelsRef.current = {
    avgRetail: t('mapPopupAvgRetailDailyRate'),
    website: t('mapPopupWebsite'),
    unitsSites: t('mapPopupUnitsSites'),
    websiteOpen: t('mapPopupWebsiteOpenNewTab'),
    empty: t('mapPopupEmpty'),
  };

  const renderVisible = useCallback(() => {
    const map = mapRef.current;
    const cluster = clusterIndexRef.current;
    if (!map || !cluster) return;

    for (const m of markersRef.current) {
      m.setMap(null);
    }
    markersRef.current = [];

    const bounds = map.getBounds();
    if (!bounds) return;

    const bbox: [number, number, number, number] = [
      bounds.getSouthWest().lng(),
      bounds.getSouthWest().lat(),
      bounds.getNorthEast().lng(),
      bounds.getNorthEast().lat(),
    ];
    const zoom = Math.round(map.getZoom() ?? CONTIGUOUS_US_OVERVIEW_ZOOM);
    const items = cluster.getClusters(bbox, zoom) as Array<
      ClusterFeature<ClusterProps> | PointFeature<LeafProps & AnyProps>
    >;

    const MAX_RENDERED = 4_000;
    const slice = items.length > MAX_RENDERED ? items.slice(0, MAX_RENDERED) : items;

    const clusterCounts: number[] = [];
    for (const f of slice) {
      const p = f.properties as Partial<ClusterProps> & Partial<LeafProps>;
      if (p && p.cluster) clusterCounts.push(p.point_count ?? 0);
    }
    const minCluster =
      clusterCounts.length > 0 ? Math.min(...clusterCounts) : 0;
    const maxCluster =
      clusterCounts.length > 0 ? Math.max(...clusterCounts) : 1;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }
    const infoWindow = infoWindowRef.current;

    for (const f of slice) {
      const [lng, lat] = f.geometry.coordinates;
      const props = f.properties as Partial<ClusterProps> & Partial<LeafProps>;

      if (props && props.cluster) {
        const count = props.point_count ?? 0;
        const size = count >= 1000 ? 44 : count >= 100 ? 36 : count >= 10 ? 30 : 26;
        const text = formatCount(count);
        const fill = clusterCoolWarmFill(count, minCluster, maxCluster);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${fill}" stroke="#ffffff" stroke-width="2"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="system-ui,sans-serif">${escapeHtml(text)}</text>
</svg>`;
        const icon: google.maps.Icon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, size / 2),
        };

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon,
          optimized: true,
        });
        marker.addListener('click', () => {
          const clusterId = (f as ClusterFeature<ClusterProps>).properties.cluster_id;
          const expansion = Math.min(cluster.getClusterExpansionZoom(clusterId), 18);
          map.setCenter({ lat, lng });
          map.setZoom(expansion);
        });
        markersRef.current.push(marker);
      } else {
        const leaf = props as LeafProps;
        const srcKey = sourcesRef.current[leaf.sourceIdx] ?? '';
        const color = sourceHex(srcKey);
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: color,
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: 1,
          },
          optimized: true,
        });
        marker.addListener('click', () => {
          const label = unifiedSourceLabel(srcKey);
          infoWindow.setContent(buildLeafPopupHtml(leaf, label, color, mapPopupLabelsRef.current));
          infoWindow.setPosition({ lat, lng });
          infoWindow.open({ map, anchor: marker });
        });
        markersRef.current.push(marker);
      }
    }
  }, []);

  renderVisibleRef.current = renderVisible;

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }
      map.addListener('idle', () => {
        renderVisibleRef.current();
      });
      renderVisibleRef.current();
    },
    []
  );

  const onMapUnmount = useCallback(() => {
    for (const m of markersRef.current) {
      m.setMap(null);
    }
    markersRef.current = [];
    mapRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/admin/comps/unified/geo?${queryString}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as GeoResponse;
        if (!res.ok || !data.success) {
          throw new Error(data.message || `Failed (${res.status})`);
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        sourcesRef.current = data.sources;
        setTotal(typeof data.total === 'number' && Number.isFinite(data.total) ? data.total : 0);
        setGeocodedBySource(
          data.geocoded_by_source && typeof data.geocoded_by_source === 'object'
            ? data.geocoded_by_source
            : {}
        );
        setCapped(data.capped === true);

        const features: Array<PointFeature<LeafProps>> = data.points.map(
          ([lat, lon, sourceIdx, id, name, avgAdr, website, totalSites, numUnits]) => ({
            type: 'Feature',
            properties: {
              id,
              name,
              sourceIdx,
              avgAdr: avgAdr ?? null,
              website: website ?? null,
              totalSites: totalSites ?? null,
              numUnits: numUnits ?? null,
            },
            geometry: { type: 'Point', coordinates: [lon, lat] },
          })
        );

        const cluster = new Supercluster<LeafProps, ClusterProps>({
          radius: 60,
          // Un-cluster above this zoom so source-colored pins appear at city zoom (~12+).
          maxZoom: 12,
          minPoints: 3,
        });
        cluster.load(features);
        clusterIndexRef.current = cluster;
        renderVisibleRef.current();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setTotal(0);
        setGeocodedBySource({});
        setCapped(false);
        setError(err instanceof Error ? err.message : 'Failed to load map');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryString]);

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const id = window.setTimeout(() => {
      google.maps.event.trigger(mapRef.current!, 'resize');
      renderVisibleRef.current();
    }, 150);
    return () => clearTimeout(id);
  }, [isFullscreen, isLoaded]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }, []);

  const legend = useMemo(() => {
    return [
      'reports',
      'all_glamping_properties',
      'hipcamp',
      'campspot',
      'all_roverpass_data_new',
    ];
  }, []);

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800"
        style={{ height: MAP_HEIGHT_PX }}
      >
        <span className="text-red-600 dark:text-red-400 px-4 text-center">{t('mapLoadError')}</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg"
        style={{ height: MAP_HEIGHT_PX }}
      >
        <span className="text-gray-500 dark:text-gray-400">{t('mapLoadingScript')}</span>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${
        isFullscreen ? 'fixed inset-0 z-[2000] rounded-none border-0' : ''
      }`}
    >
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-md bg-white/95 dark:bg-gray-900/95 shadow-md border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        aria-label={isFullscreen ? t('mapExitFullscreen') : t('mapEnterFullscreen')}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        {isFullscreen ? t('mapExitFullscreen') : t('mapEnterFullscreen')}
      </button>

      <div className="absolute top-20 left-3 z-[1000] max-w-[min(100%-8rem,220px)] rounded-md bg-white/95 dark:bg-gray-900/95 shadow-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs">
        {loading ? (
          <span className="text-gray-600 dark:text-gray-300">{t('mapLoadingPoints')}</span>
        ) : error ? (
          <span className="text-red-600 dark:text-red-400">{error}</span>
        ) : (
          <div className="flex flex-col gap-1">
            {listTotalProperties != null && (
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                <span className="text-sage-600 dark:text-sage-400">
                  {t('summaryUniqueProperties', { count: listTotalProperties })}
                </span>
                <span className="text-gray-500 dark:text-gray-400 font-normal">{t('mapListSuffix')}</span>
              </div>
            )}
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {t('mapGeocodedCount', { count: Number.isFinite(total) ? total : 0 })}
              {capped ? ` ${t('mapGeocodedCapped')}` : ''}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
              {t('mapGeocodedVersusListHint')}
            </p>
            <div className="flex flex-col gap-0.5 text-gray-700 dark:text-gray-300">
              {legend.map((s) => {
                const n = geocodedBySource[s] ?? 0;
                return (
                  <div key={s} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: sourceHex(s) }}
                      />
                      <span className="truncate">{unifiedSourceLabel(s)}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                      {n.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600 text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
              {t('mapPinVersusClusterHint')}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
              {t('mapClusterColorHint')}
            </p>
            <div
              className="mt-1 h-1.5 w-full rounded-full shrink-0"
              style={{
                background:
                  'linear-gradient(90deg, hsl(240,76%,44%) 0%, hsl(120,76%,44%) 50%, hsl(0,76%,44%) 100%)',
              }}
              aria-hidden
            />
          </div>
        )}
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={CONTIGUOUS_US_CENTER}
        zoom={CONTIGUOUS_US_OVERVIEW_ZOOM}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        options={{
          mapTypeId: 'terrain',
          zoomControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
        }}
      />
    </div>
  );
}

export default function CompsMapView({
  queryString,
  listTotalProperties,
}: {
  queryString: string;
  listTotalProperties?: number | null;
}) {
  return (
    <GoogleMapsProvider>
      <CompsMapInner queryString={queryString} listTotalProperties={listTotalProperties} />
    </GoogleMapsProvider>
  );
}
