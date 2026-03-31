'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import type { QualityTier } from '@/lib/comps-v2/types';
import { QUALITY_TIERS } from '@/lib/comps-v2/types';
import { candidateTotalUnitsOrSites } from '@/lib/comps-v2/candidate-total-units';
import { compsV2SourceTableLabel } from '@/lib/comps-v2/source-table-i18n';
import {
  COMPS_V2_LEGEND_WEB_RESEARCH,
  compsV2CandidateIsWebResearchForMap,
  compsV2MapMarkerColorForCandidate,
  compsV2SourceTableMarkerColor,
} from '@/lib/comps-v2/source-marker-color';

const MAP_HEIGHT_PX = 520;
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };

/** Stagger Maps JS Geocoder calls to reduce OVER_QUERY_LIMIT (aligns with server gap-fill cap). */
const WEB_MAP_GEOCODE_STAGGER_MS = 280;
const MAX_WEB_MAP_GEOCODE_PER_RESULTS = 40;

function hasFiniteLatLng(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Freeform queries for client Geocoder (mirrors server gap-fill intent, adds location_detail). */
function buildWebMapGeocodeQueries(c: CompsV2Candidate): string[] {
  const state = (c.state || '').trim().toUpperCase().slice(0, 2);
  const name = (c.property_name || '').trim();
  const city = (c.city || '').trim();
  const detail = c.location_detail?.trim();
  const queries: string[] = [];
  if (detail) {
    queries.push(`${detail}, USA`);
    if (state.length === 2) queries.push(`${detail}, ${state}, USA`);
  }
  if (name && city && state.length === 2) {
    queries.push(`${name}, ${city}, ${state}, USA`);
    queries.push(`${name}, ${city}, United States`);
  }
  if (name && state.length === 2) {
    queries.push(`${name}, ${state}, USA`);
  }
  const seen = new Set<string>();
  return queries.filter((q) => {
    const k = q.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function geocodeWithMapsJs(
  geocoder: google.maps.Geocoder,
  address: string
): Promise<{ lat: number; lng: number } | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await new Promise<{ lat: number; lng: number } | 'miss' | 'oql'>((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
          resolve('oql');
        } else {
          resolve('miss');
        }
      });
    });
    if (result !== 'miss' && result !== 'oql') return result;
    if (result === 'oql') {
      await sleepMs(900 * (attempt + 1));
      continue;
    }
    return null;
  }
  return null;
}

/** Legend order (matches results source filter where possible). Web rows appear even without map pins. */
const LEGEND_SOURCE_ORDER = [
  'all_glamping_properties',
  'hipcamp',
  'all_roverpass_data_new',
  'campspot',
  'past_reports',
  COMPS_V2_LEGEND_WEB_RESEARCH,
] as const;

function sortLegendSourceTables(sources: string[]): string[] {
  const rank = (s: string) => {
    const i = (LEGEND_SOURCE_ORDER as readonly string[]).indexOf(s);
    return i === -1 ? 999 : i;
  };
  return [...sources].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

const TIER_I18N_KEY: Record<QualityTier, string> = {
  budget: 'tierBudget',
  economy: 'tierEconomy',
  mid: 'tierMid',
  upscale: 'tierUpscale',
  luxury: 'tierLuxury',
};

function circleMarkerIcon(color: string): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 9,
  };
}

function searchLocationStarIcon(): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40"><path fill="#facc15" stroke="#a16207" stroke-width="1.2" d="M12 2.5l2.8 8.5h9l-7.3 5.6 2.8 8.4L12 19.5l-7.3 5.5 2.8-8.4-7.3-5.6h9L12 2.5z"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(36, 36),
    anchor: new google.maps.Point(18, 18),
  };
}

interface CompsV2ResultsMapViewProps {
  candidates: CompsV2Candidate[];
  /** Search anchor from discovery geocode (fallback center). */
  searchCenter: { lat: number; lng: number } | null;
  /** Address or place line from the search input (shown on the anchor marker). */
  searchLocationLabel?: string | null;
}

export default function CompsV2ResultsMapView({
  candidates,
  searchCenter,
  searchLocationLabel,
}: CompsV2ResultsMapViewProps) {
  const t = useTranslations('admin.compsV2');
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [infoStableId, setInfoStableId] = useState<string | null>(null);
  const [showAnchorInfo, setShowAnchorInfo] = useState(false);
  /** Client Geocoder results for web-gap rows missing server lat/lng (Maps JS API). */
  const [webGeoResolved, setWebGeoResolved] = useState<Record<string, { lat: number; lng: number }>>({});
  /** False while a client geocode pass is in progress (avoids a stuck “locating…” banner when all attempts fail). */
  const [webMapClientGeoPassComplete, setWebMapClientGeoPassComplete] = useState(true);
  const webGeoResolvedRef = useRef(webGeoResolved);
  webGeoResolvedRef.current = webGeoResolved;

  const mapGeocodeDeps = useMemo(
    () =>
      candidates
        .map((c) =>
          [
            c.stable_id,
            c.source_table,
            c.web_research_supplement ? '1' : '',
            c.geo_lat ?? '',
            c.geo_lng ?? '',
            c.property_name,
            c.city ?? '',
            c.state ?? '',
            c.location_detail ?? '',
          ].join('\t')
        )
        .sort()
        .join('\n'),
    [candidates]
  );

  const webNeedingClientGeo = useMemo(
    () =>
      candidates.filter(
        (c) =>
          compsV2CandidateIsWebResearchForMap(c) && !hasFiniteLatLng(c.geo_lat, c.geo_lng)
      ),
    [candidates]
  );

  const anchorTitle = useMemo(() => {
    const line = searchLocationLabel?.trim();
    return line && line.length > 0 ? line : t('resultsMapSearchLocationFallback');
  }, [searchLocationLabel, t]);

  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    []
  );

  const plotted = useMemo(() => {
    return candidates.filter((c) => {
      const o = webGeoResolved[c.stable_id];
      const lat = o?.lat ?? c.geo_lat;
      const lng = o?.lng ?? c.geo_lng;
      return hasFiniteLatLng(lat, lng);
    });
  }, [candidates, webGeoResolved]);

  const positionFor = useCallback(
    (c: CompsV2Candidate): { lat: number; lng: number } => {
      const o = webGeoResolved[c.stable_id];
      const lat = o?.lat ?? c.geo_lat;
      const lng = o?.lng ?? c.geo_lng;
      return { lat: lat!, lng: lng! };
    },
    [webGeoResolved]
  );

  useEffect(() => {
    if (!isLoaded || typeof google === 'undefined' || !google.maps?.Geocoder) return;

    let cancelled = false;
    setWebMapClientGeoPassComplete(false);

    setWebGeoResolved((prev) => {
      const allowed = new Set(candidates.map((c) => c.stable_id));
      const next: Record<string, { lat: number; lng: number }> = {};
      for (const [id, pos] of Object.entries(prev)) {
        if (!allowed.has(id)) continue;
        const row = candidates.find((x) => x.stable_id === id);
        if (!row || !compsV2CandidateIsWebResearchForMap(row)) continue;
        if (hasFiniteLatLng(row.geo_lat, row.geo_lng)) continue;
        next[id] = pos;
      }
      webGeoResolvedRef.current = next;
      return next;
    });

    const targets = candidates.filter(
      (c) => compsV2CandidateIsWebResearchForMap(c) && !hasFiniteLatLng(c.geo_lat, c.geo_lng)
    );
    const capped = targets.slice(0, MAX_WEB_MAP_GEOCODE_PER_RESULTS);

    if (capped.length === 0) {
      setWebMapClientGeoPassComplete(true);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        await sleepMs(0);
        const geocoder = new google.maps.Geocoder();
        for (const c of capped) {
          if (cancelled) return;
          if (webGeoResolvedRef.current[c.stable_id]) continue;

          const queries = buildWebMapGeocodeQueries(c);
          let hit: { lat: number; lng: number } | null = null;
          for (const q of queries) {
            if (cancelled) return;
            hit = await geocodeWithMapsJs(geocoder, q);
            if (hit) break;
            await sleepMs(120);
          }
          if (cancelled) return;
          if (hit) {
            setWebGeoResolved((prev) => {
              if (prev[c.stable_id]) return prev;
              const merged = { ...prev, [c.stable_id]: hit! };
              webGeoResolvedRef.current = merged;
              return merged;
            });
          }
          await sleepMs(WEB_MAP_GEOCODE_STAGGER_MS);
        }
      } finally {
        if (!cancelled) setWebMapClientGeoPassComplete(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, mapGeocodeDeps]);

  const legendSources = useMemo(() => {
    const set = new Set<string>();
    let hasWeb = false;
    for (const c of plotted) {
      if (compsV2CandidateIsWebResearchForMap(c)) hasWeb = true;
      else set.add(c.source_table);
    }
    for (const c of candidates) {
      if (compsV2CandidateIsWebResearchForMap(c)) hasWeb = true;
    }
    if (hasWeb) set.add(COMPS_V2_LEGEND_WEB_RESEARCH);
    return sortLegendSourceTables([...set]);
  }, [plotted, candidates]);

  const onMapLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const closeAllInfo = useCallback(() => {
    setInfoStableId(null);
    setShowAnchorInfo(false);
  }, []);

  const onMapClick = useCallback(() => {
    closeAllInfo();
  }, [closeAllInfo]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (plotted.length === 0) {
      const c = searchCenter ?? DEFAULT_CENTER;
      map.setCenter(c);
      map.setZoom(searchCenter ? 9 : 4);
      return;
    }

    if (plotted.length === 1 && !searchCenter) {
      const p = positionFor(plotted[0]);
      map.setCenter(p);
      map.setZoom(11);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const c of plotted) {
      bounds.extend(positionFor(c));
    }
    if (searchCenter) {
      bounds.extend(searchCenter);
    }
    map.fitBounds(bounds, 56);
  }, [map, isLoaded, plotted, searchCenter, positionFor]);

  const tierLabel = useCallback(
    (tier: string | null | undefined) => {
      if (tier == null || tier === '') return null;
      if (QUALITY_TIERS.includes(tier as QualityTier)) {
        return t(TIER_I18N_KEY[tier as QualityTier]);
      }
      return tier;
    },
    [t]
  );

  const mapSourceLabel = useCallback(
    (c: CompsV2Candidate) =>
      compsV2CandidateIsWebResearchForMap(c)
        ? t('resultsMapLegendWebResearch')
        : compsV2SourceTableLabel(c.source_table, t),
    [t]
  );

  if (loadError) {
    return <p className="text-sm text-red-600 dark:text-red-300">{t('previewMapLoadError')}</p>;
  }

  if (!isLoaded) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t('previewMapLoading')}</p>;
  }

  const starIcon = searchLocationStarIcon();

  return (
    <div className="space-y-3">
      {webNeedingClientGeo.length > 0 && !webMapClientGeoPassComplete ? (
        <p className="text-sm text-sky-900 dark:text-sky-100/90 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 rounded-md px-3 py-2">
          {t('resultsMapWebGeocoding')}
        </p>
      ) : null}
      {candidates.length > 0 && plotted.length < candidates.length ? (
        <p className="text-sm text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md px-3 py-2">
          {t('resultsMapPartialCoords', {
            shown: plotted.length,
            total: candidates.length,
          })}
        </p>
      ) : null}

      {legendSources.length > 0 || searchCenter ? (
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('resultsMapLegend')}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {searchCenter ? (
              <li className="flex items-center gap-2">
                <span
                  className="inline-block size-3 shrink-0"
                  style={{
                    clipPath:
                      'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    backgroundColor: '#facc15',
                    boxShadow: 'inset 0 0 0 1px #a16207',
                  }}
                  aria-hidden
                />
                <span className="text-gray-700 dark:text-gray-300">{t('resultsMapSearchLocationLegend')}</span>
              </li>
            ) : null}
            {legendSources.map((src) => (
              <li key={src} className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full shrink-0 border border-white shadow-sm"
                  style={{ backgroundColor: compsV2SourceTableMarkerColor(src) }}
                  aria-hidden
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {src === COMPS_V2_LEGEND_WEB_RESEARCH
                    ? t('resultsMapLegendWebResearch')
                    : compsV2SourceTableLabel(src, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: MAP_HEIGHT_PX }}
          center={searchCenter ?? DEFAULT_CENTER}
          zoom={searchCenter ? 8 : 4}
          onLoad={onMapLoad}
          onUnmount={onUnmount}
          onClick={onMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {searchCenter ? (
            <Marker
              position={searchCenter}
              title={anchorTitle}
              icon={starIcon}
              zIndex={1000}
              onClick={() => {
                setInfoStableId(null);
                setShowAnchorInfo(true);
              }}
            >
              {showAnchorInfo ? (
                <InfoWindow onCloseClick={() => setShowAnchorInfo(false)}>
                  <div className="max-w-[280px] text-gray-900 text-sm leading-snug pr-1">
                    <p className="text-xs font-medium text-gray-500 m-0 mb-1">{t('resultsMapSearchLocationLegend')}</p>
                    <p className="font-semibold m-0 text-gray-900">{anchorTitle}</p>
                  </div>
                </InfoWindow>
              ) : null}
            </Marker>
          ) : null}

          {plotted.map((c) => (
            <Marker
              key={c.stable_id}
              position={positionFor(c)}
              title={`${c.property_name} — ${mapSourceLabel(c)}`}
              icon={circleMarkerIcon(compsV2MapMarkerColorForCandidate(c))}
              onClick={() => {
                setShowAnchorInfo(false);
                setInfoStableId(c.stable_id);
              }}
            >
              {infoStableId === c.stable_id ? (
                <InfoWindow onCloseClick={() => setInfoStableId(null)}>
                  <div className="max-w-[260px] text-gray-900 text-sm leading-snug pr-1">
                    <p className="font-semibold m-0 mb-2">{c.property_name}</p>
                    <dl className="m-0 space-y-1.5">
                      <div>
                        <dt className="text-xs text-gray-500 m-0">{t('city')}, {t('state')}</dt>
                        <dd className="m-0 font-medium">
                          {c.city}
                          {c.city && c.state ? ', ' : ''}
                          {c.state}
                        </dd>
                      </div>
                      {c.location_detail?.trim() ? (
                        <div>
                          <dt className="text-xs text-gray-500 m-0">{t('colLocation')}</dt>
                          <dd className="m-0 text-xs leading-snug">{c.location_detail.trim()}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-xs text-gray-500 m-0">{t('colSource')}</dt>
                        <dd className="m-0">{mapSourceLabel(c)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500 m-0">{t('colMi')}</dt>
                        <dd className="m-0 tabular-nums">
                          {c.distance_miles != null && Number.isFinite(c.distance_miles)
                            ? `${c.distance_miles} ${t('milesAbbrev')}`
                            : t('summaryDash')}
                        </dd>
                      </div>
                      {c.avg_retail_daily_rate != null && c.avg_retail_daily_rate > 0 ? (
                        <div>
                          <dt className="text-xs text-gray-500 m-0">{t('colAdr')}</dt>
                          <dd className="m-0 tabular-nums">
                            {currencyFmt.format(Math.round(c.avg_retail_daily_rate))}
                          </dd>
                        </div>
                      ) : null}
                      {(() => {
                        const units = candidateTotalUnitsOrSites(c);
                        return units != null && units > 0 ? (
                          <div>
                            <dt className="text-xs text-gray-500 m-0">{t('colTotalUnitsSites')}</dt>
                            <dd className="m-0 tabular-nums">{units.toLocaleString()}</dd>
                          </div>
                        ) : null;
                      })()}
                      {c.adr_quality_tier ? (
                        <div>
                          <dt className="text-xs text-gray-500 m-0">{t('colTier')}</dt>
                          <dd className="m-0">{tierLabel(c.adr_quality_tier) ?? c.adr_quality_tier}</dd>
                        </div>
                      ) : null}
                      {c.url?.trim() ? (
                        <div className="pt-1">
                          <a
                            href={c.url!.startsWith('http') ? c.url! : `https://${c.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#4a624a] dark:text-green-400 font-medium underline"
                          >
                            {t('openWebsite')}
                          </a>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </InfoWindow>
              ) : null}
            </Marker>
          ))}
        </GoogleMap>
      </div>
    </div>
  );
}
