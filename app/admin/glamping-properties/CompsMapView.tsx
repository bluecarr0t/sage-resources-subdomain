'use client';

/**
 * Map view for /admin/glamping-properties — Google Maps (same stack as /admin/client-map) with
 * supercluster-based clustering. Only markers visible in the current viewport
 * are instantiated so 100k+ points stay responsive.
 */

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GoogleMap } from '@react-google-maps/api';
import { Maximize2, Minimize2 } from 'lucide-react';
import { GoogleMapsProvider, useGoogleMaps } from '@/components/GoogleMapsProvider';
import Supercluster from 'supercluster';
import type { PointFeature, ClusterFeature, AnyProps } from 'supercluster';
import { unifiedSourceLabel } from '@/lib/comps-unified/build-row';
import { distanceMiles } from '@/lib/geo/haversine';

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
  0 | 1,
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
  /** When false, exclude num_units from glamping-only radius totals. */
  isGlamping: boolean;
}

interface GeoPointRow {
  lat: number;
  lng: number;
  leaf: LeafProps;
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

/** Fixed radius presets (mi); custom values use the number field or the "Custom" select option. */
const RADIUS_PRESET_MILES = [25, 50, 100, 200] as const;
type RadiusPresetMiles = (typeof RADIUS_PRESET_MILES)[number];
const RADIUS_CUSTOM_SELECT_VALUE = 'custom';

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

function isGlampingFromTupleFlag(flag: unknown): boolean {
  if (flag === 0) return false;
  if (flag === 1) return true;
  return true;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clusterIndexRef = useRef<Supercluster<LeafProps, ClusterProps> | null>(null);
  const customMilesInputRef = useRef<HTMLInputElement>(null);
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
  const allGeoPointsRef = useRef<GeoPointRow[]>([]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const radiusCenterMarkerRef = useRef<google.maps.Marker | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [geocodedBySource, setGeocodedBySource] = useState<Record<string, number>>({});
  const [capped, setCapped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [radiusEnabled, setRadiusEnabled] = useState(false);
  const [radiusPreset, setRadiusPreset] = useState<RadiusPresetMiles>(50);
  const [customMilesInput, setCustomMilesInput] = useState('');
  const [clickPickMode, setClickPickMode] = useState(false);
  const [radiusCenter, setRadiusCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [radiusGeoError, setRadiusGeoError] = useState<string | null>(null);
  const [radiusLocating, setRadiusLocating] = useState(false);
  const [geoPointsEpoch, setGeoPointsEpoch] = useState(0);
  const [radiusStats, setRadiusStats] = useState<{
    count: number;
    sumUnits: number;
    sumSites: number;
    avgAdr: number | null;
    bySource: Record<string, number>;
  } | null>(null);

  const [mapReadyTick, setMapReadyTick] = useState(0);

  const effectiveRadiusMiles = useMemo(() => {
    const raw = customMilesInput.trim();
    if (raw !== '') {
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n >= 1) return Math.min(500, n);
    }
    return radiusPreset;
  }, [customMilesInput, radiusPreset]);

  const usingCustomMiles = useMemo(() => {
    const raw = customMilesInput.trim();
    if (raw === '') return false;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n >= 1;
  }, [customMilesInput]);

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
      setMapReadyTick((x) => x + 1);
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
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (radiusCenterMarkerRef.current) {
      radiusCenterMarkerRef.current.setMap(null);
      radiusCenterMarkerRef.current = null;
    }
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
          ([lat, lon, sourceIdx, id, name, avgAdr, website, totalSites, numUnits, glamp1]) => ({
            type: 'Feature',
            properties: {
              id,
              name,
              sourceIdx,
              avgAdr: avgAdr ?? null,
              website: website ?? null,
              totalSites: totalSites ?? null,
              numUnits: numUnits ?? null,
              isGlamping: isGlampingFromTupleFlag(glamp1),
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

        allGeoPointsRef.current = data.points.map(
          ([lat, lon, sourceIdx, id, name, avgAdr, website, totalSites, numUnits, glamp1]) => ({
            lat: Number(lat),
            lng: Number(lon),
            leaf: {
              id,
              name,
              sourceIdx,
              avgAdr: avgAdr ?? null,
              website: website ?? null,
              totalSites: totalSites ?? null,
              numUnits: numUnits ?? null,
              isGlamping: isGlampingFromTupleFlag(glamp1),
            },
          })
        );
        setGeoPointsEpoch((e) => e + 1);

        renderVisibleRef.current();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setTotal(0);
        setGeocodedBySource({});
        setCapped(false);
        allGeoPointsRef.current = [];
        setGeoPointsEpoch((e) => e + 1);
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
    const pick = searchParams.get('map_radius_pick') === '1';
    setClickPickMode(pick);
    const mi = searchParams.get('map_radius_mi');
    if (mi) {
      const m = parseFloat(mi);
      if (Number.isFinite(m) && m >= 1 && m <= 500) {
        const presets = [...RADIUS_PRESET_MILES] as RadiusPresetMiles[];
        if (presets.includes(m as RadiusPresetMiles)) {
          setRadiusPreset(m as RadiusPresetMiles);
          setCustomMilesInput('');
        } else {
          setRadiusPreset(50);
          setCustomMilesInput(String(m));
        }
      }
    }
    const on = searchParams.get('map_radius_on');
    const la = searchParams.get('map_radius_lat');
    const lo = searchParams.get('map_radius_lng');
    if (on === '1' && la != null && lo != null) {
      const lat = parseFloat(la);
      const lng = parseFloat(lo);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        setRadiusEnabled(true);
        setRadiusCenter({ lat, lng });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const radiusKeys = ['map_radius_on', 'map_radius_mi', 'map_radius_lat', 'map_radius_lng', 'map_radius_pick'];
      for (const key of radiusKeys) params.delete(key);
      if (radiusEnabled && radiusCenter) {
        params.set('map_radius_on', '1');
        params.set('map_radius_mi', String(effectiveRadiusMiles));
        params.set('map_radius_lat', radiusCenter.lat.toFixed(6));
        params.set('map_radius_lng', radiusCenter.lng.toFixed(6));
        if (clickPickMode) params.set('map_radius_pick', '1');
      }
      const next = params.toString();
      if (next !== searchParams.toString()) {
        router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
      }
    }, 320);
    return () => window.clearTimeout(id);
  }, [
    radiusEnabled,
    radiusCenter,
    effectiveRadiusMiles,
    clickPickMode,
    pathname,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!radiusEnabled || !radiusCenter || effectiveRadiusMiles <= 0) {
      setRadiusStats(null);
      return;
    }
    const rows = allGeoPointsRef.current;
    let count = 0;
    let sumUnits = 0;
    let sumSites = 0;
    const adrValues: number[] = [];
    const bySource: Record<string, number> = {};
    for (const row of rows) {
      if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue;
      const d = distanceMiles(radiusCenter.lat, radiusCenter.lng, row.lat, row.lng);
      if (d > effectiveRadiusMiles) continue;
      count += 1;
      const nu = row.leaf.numUnits;
      if (row.leaf.isGlamping && nu != null && Number.isFinite(nu)) sumUnits += Number(nu);
      const ts = row.leaf.totalSites;
      if (ts != null && Number.isFinite(ts)) sumSites += Number(ts);
      const adr = row.leaf.avgAdr;
      if (adr != null && Number.isFinite(adr)) adrValues.push(Number(adr));
      const srcKey = sourcesRef.current[row.leaf.sourceIdx] ?? 'unknown';
      bySource[srcKey] = (bySource[srcKey] ?? 0) + 1;
    }
    const avgAdr =
      adrValues.length > 0 ? adrValues.reduce((a, b) => a + b, 0) / adrValues.length : null;
    setRadiusStats({ count, sumUnits, sumSites, avgAdr, bySource });
  }, [radiusEnabled, effectiveRadiusMiles, radiusCenter, geoPointsEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    if (!radiusEnabled || !radiusCenter || effectiveRadiusMiles <= 0) {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      if (radiusCenterMarkerRef.current) {
        radiusCenterMarkerRef.current.setMap(null);
        radiusCenterMarkerRef.current = null;
      }
      return;
    }

    const meters = effectiveRadiusMiles * 1609.34;

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center: radiusCenter,
        radius: meters,
        fillColor: '#2563eb',
        fillOpacity: 0.06,
        strokeColor: '#2563eb',
        strokeOpacity: 0.55,
        strokeWeight: 2,
        clickable: false,
      });
    } else {
      circleRef.current.setMap(map);
      circleRef.current.setCenter(radiusCenter);
      circleRef.current.setRadius(meters);
    }

    if (!radiusCenterMarkerRef.current) {
      radiusCenterMarkerRef.current = new google.maps.Marker({
        map,
        position: radiusCenter,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 2000,
        clickable: false,
      });
    } else {
      radiusCenterMarkerRef.current.setMap(map);
      radiusCenterMarkerRef.current.setPosition(radiusCenter);
    }
  }, [radiusEnabled, effectiveRadiusMiles, radiusCenter, isLoaded, mapReadyTick, loading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !clickPickMode) {
      if (map) map.setOptions({ draggableCursor: undefined });
      return;
    }
    map.setOptions({ draggableCursor: 'crosshair' });
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      const ll = e.latLng;
      if (!ll) return;
      setRadiusCenter({ lat: ll.lat(), lng: ll.lng() });
      setRadiusEnabled(true);
      setClickPickMode(false);
      setRadiusGeoError(null);
    });
    return () => {
      listener.remove();
      map.setOptions({ draggableCursor: undefined });
    };
  }, [clickPickMode, isLoaded, mapReadyTick]);

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

  const applyMapCenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    if (!c) return;
    setClickPickMode(false);
    setRadiusEnabled(true);
    setRadiusCenter({ lat: c.lat(), lng: c.lng() });
    setRadiusGeoError(null);
  }, []);

  const applyGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setRadiusGeoError(t('mapRadiusGeoUnavailable'));
      return;
    }
    setClickPickMode(false);
    setRadiusLocating(true);
    setRadiusGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRadiusLocating(false);
        setClickPickMode(false);
        setRadiusEnabled(true);
        setRadiusCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setRadiusLocating(false);
        const code = (err as GeolocationPositionError).code;
        if (code === 1) setRadiusGeoError(t('mapRadiusGeoDenied'));
        else if (code === 2) setRadiusGeoError(t('mapRadiusGeoUnavailable'));
        else if (code === 3) setRadiusGeoError(t('mapRadiusGeoTimeout'));
        else setRadiusGeoError(t('mapRadiusGeoUnknown'));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  }, [t]);

  const exportRadiusCsv = useCallback(() => {
    if (!radiusEnabled || !radiusCenter) return;
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = allGeoPointsRef.current;
    const lines: string[] = ['id,name,source'];
    for (const row of rows) {
      if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue;
      if (distanceMiles(radiusCenter.lat, radiusCenter.lng, row.lat, row.lng) > effectiveRadiusMiles) continue;
      const src = sourcesRef.current[row.leaf.sourceIdx] ?? '';
      const id = row.leaf.id ?? '';
      const name = row.leaf.name ?? '';
      lines.push(`${esc(id)},${esc(name)},${esc(src)}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comps-radius-${Math.round(effectiveRadiusMiles)}mi.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [radiusCenter, radiusEnabled, effectiveRadiusMiles]);

  const clearRadius = useCallback(() => {
    setRadiusEnabled(false);
    setRadiusCenter(null);
    setRadiusStats(null);
    setRadiusGeoError(null);
    setRadiusLocating(false);
    setClickPickMode(false);
    setCustomMilesInput('');
    setRadiusPreset(50);
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ['map_radius_on', 'map_radius_mi', 'map_radius_lat', 'map_radius_lng', 'map_radius_pick']) {
      params.delete(key);
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

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
      className={`relative rounded-lg overflow-hidden border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 ${
        isFullscreen ? 'fixed inset-0 z-[2000] rounded-none border-0' : ''
      }`}
    >
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-[1000] inline-flex items-center gap-1.5 rounded-md bg-white/95 dark:bg-gray-900/95 shadow-md border border-neutral-200/75 dark:border-neutral-800 px-2.5 py-1.5 text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-neutral-50/90 dark:hover:bg-neutral-900/40"
        aria-label={isFullscreen ? t('mapExitFullscreen') : t('mapEnterFullscreen')}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        {isFullscreen ? t('mapExitFullscreen') : t('mapEnterFullscreen')}
      </button>

      <div className="absolute top-20 left-3 z-[1000] max-w-[min(100%-8rem,220px)] rounded-md bg-white/95 dark:bg-gray-900/95 shadow-md border border-neutral-200/75 dark:border-neutral-800 px-3 py-2 text-xs">
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
            <p className="mt-1.5 pt-1.5 border-t border-neutral-200/75 dark:border-neutral-700 text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
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

      <div className="absolute bottom-3 right-3 z-[1000] max-w-[min(100%-1.5rem,300px)] max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain rounded-md bg-white/95 dark:bg-gray-900/95 shadow-md border border-neutral-200/75 dark:border-neutral-800 px-3 py-2.5 text-xs space-y-2">
        <div className="font-semibold text-gray-900 dark:text-gray-100">{t('mapRadiusTitle')}</div>
        <label className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200">
          <input
            id="comps-map-radius-enabled"
            type="checkbox"
            checked={radiusEnabled}
            onChange={(e) => {
              if (e.target.checked) {
                setRadiusEnabled(true);
                setRadiusGeoError(null);
              } else {
                setRadiusEnabled(false);
                setRadiusStats(null);
                setRadiusGeoError(null);
                setClickPickMode(false);
              }
            }}
            className="rounded border-neutral-300 text-sage-600 focus:ring-sage-500"
          />
          <span>{t('mapRadiusEnable')}</span>
        </label>
        <div className="flex flex-col gap-1">
          <label htmlFor="comps-map-radius-miles" className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {t('mapRadiusPresetLabel')}
          </label>
          <select
            id="comps-map-radius-miles"
            value={usingCustomMiles ? RADIUS_CUSTOM_SELECT_VALUE : String(radiusPreset)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === RADIUS_CUSTOM_SELECT_VALUE) {
                setCustomMilesInput((prev) => (prev.trim() !== '' ? prev : String(radiusPreset)));
                window.setTimeout(() => customMilesInputRef.current?.focus(), 0);
                return;
              }
              setRadiusPreset(Number(v) as RadiusPresetMiles);
              setCustomMilesInput('');
            }}
            disabled={loading}
            className="w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
          >
            {RADIUS_PRESET_MILES.map((n) => (
              <option key={n} value={n}>
                {t('mapRadiusMilesOption', { n })}
              </option>
            ))}
            <option value={RADIUS_CUSTOM_SELECT_VALUE}>{t('mapRadiusCustomOption')}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="comps-map-radius-custom" className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {t('mapRadiusCustomLabel')}
          </label>
          <input
            id="comps-map-radius-custom"
            ref={customMilesInputRef}
            type="number"
            min={1}
            max={500}
            step={1}
            inputMode="decimal"
            placeholder={t('mapRadiusCustomPlaceholder')}
            value={customMilesInput}
            onChange={(e) => setCustomMilesInput(e.target.value)}
            disabled={loading}
            className="w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
          />
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">{t('mapRadiusCustomHint')}</p>
          {usingCustomMiles && (
            <p className="text-[10px] text-sage-700 dark:text-sage-300 font-medium">
              {t('mapRadiusUsingCustom', { n: Math.round(effectiveRadiusMiles * 100) / 100 })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={applyMapCenter}
            disabled={loading}
            className="w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-left text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {t('mapRadiusUseMapCenter')}
          </button>
          <button
            type="button"
            onClick={applyGeolocation}
            disabled={loading || radiusLocating}
            className="w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-left text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {radiusLocating ? t('mapRadiusLocating') : t('mapRadiusUseMyLocation')}
          </button>
          <button
            type="button"
            onClick={() => {
              setRadiusGeoError(null);
              setClickPickMode((v) => !v);
            }}
            disabled={loading}
            className={`w-full rounded border px-2 py-1.5 text-left text-xs font-medium disabled:opacity-50 ${
              clickPickMode
                ? 'border-sage-600 bg-sage-50 dark:bg-sage-950/40 text-sage-900 dark:text-sage-100'
                : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            {clickPickMode ? t('mapRadiusClickMapActive') : t('mapRadiusClickMap')}
          </button>
          {clickPickMode && (
            <button
              type="button"
              onClick={() => setClickPickMode(false)}
              className="w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-left text-[10px] font-medium text-gray-600 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              {t('mapRadiusClickMapCancel')}
            </button>
          )}
          <button
            type="button"
            onClick={clearRadius}
            disabled={
              !radiusEnabled && !radiusCenter && !radiusGeoError && !radiusLocating && !clickPickMode
            }
            className="w-full rounded border border-red-200/80 dark:border-red-900/50 bg-white dark:bg-neutral-900 px-2 py-1.5 text-left text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50/80 dark:hover:bg-red-950/30 disabled:opacity-40"
          >
            {t('mapRadiusClear')}
          </button>
        </div>
        {radiusGeoError && <p className="text-[10px] text-red-600 dark:text-red-400 leading-snug">{radiusGeoError}</p>}
        {radiusEnabled && !radiusCenter && !radiusGeoError && !radiusLocating && !clickPickMode && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">{t('mapRadiusHintSetCenter')}</p>
        )}
        {radiusEnabled && radiusCenter && radiusStats && (
          <div
            className="pt-2 mt-1 border-t border-neutral-200/75 dark:border-neutral-700 space-y-1.5"
            aria-live="polite"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('mapRadiusScoreTitle')}
            </div>
            <div className="flex justify-between gap-2 text-gray-800 dark:text-gray-200">
              <span>{t('mapRadiusScoreMarkers')}</span>
              <span className="tabular-nums font-semibold">{radiusStats.count.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-2 text-gray-800 dark:text-gray-200">
              <span>{t('mapRadiusScoreSumUnits')}</span>
              <span className="tabular-nums font-semibold">{radiusStats.sumUnits.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-2 text-gray-800 dark:text-gray-200">
              <span>{t('mapRadiusScoreSumSites')}</span>
              <span className="tabular-nums font-semibold">{radiusStats.sumSites.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-2 text-gray-800 dark:text-gray-200">
              <span>{t('mapRadiusScoreAvgAdr')}</span>
              <span className="tabular-nums font-semibold">
                {radiusStats.avgAdr != null
                  ? `$${Math.round(radiusStats.avgAdr).toLocaleString()}`
                  : t('mapRadiusScoreAvgAdrNa')}
              </span>
            </div>
            <div className="pt-1.5 border-t border-neutral-200/75 dark:border-neutral-700">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                {t('mapRadiusBySource')}
              </div>
              <ul className="max-h-24 overflow-y-auto space-y-0.5 pr-0.5">
                {Object.entries(radiusStats.bySource)
                  .sort((a, b) => b[1] - a[1])
                  .map(([src, cnt]) => (
                    <li key={src} className="flex items-center justify-between gap-2 text-[10px] text-gray-700 dark:text-gray-300">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sourceHex(src) }}
                        />
                        <span className="truncate">{unifiedSourceLabel(src)}</span>
                      </span>
                      <span className="tabular-nums shrink-0 text-gray-500 dark:text-gray-400">{cnt.toLocaleString()}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={exportRadiusCsv}
              className="w-full rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              {t('mapRadiusExportCsv')}
            </button>
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

function CompsMapSuspenseFallback() {
  const t = useTranslations('admin.comps');
  return (
    <div
      className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border border-neutral-200/75 dark:border-neutral-800"
      style={{ height: MAP_HEIGHT_PX }}
    >
      <span className="text-gray-500 dark:text-gray-400 text-sm">{t('mapLoadingScript')}</span>
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
      <Suspense fallback={<CompsMapSuspenseFallback />}>
        <CompsMapInner queryString={queryString} listTotalProperties={listTotalProperties} />
      </Suspense>
    </GoogleMapsProvider>
  );
}
