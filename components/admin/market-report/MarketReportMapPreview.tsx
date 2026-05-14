'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { GoogleMap } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import { formatCurrency, humanLabel } from '@/lib/market-report/format-labels';
import { marketReportSourceLabel } from '@/lib/market-report/source-labels';
import type { MarketReportMapPin } from '@/lib/market-report/types';

const MAP_HEIGHT_PX = 500;
const MILES_TO_METERS = 1609.34;
const MAX_ZOOM_AFTER_FIT = 14;

const mapContainerStyle = {
  width: '100%',
  height: `${MAP_HEIGHT_PX}px`,
};

const circleOptions: google.maps.CircleOptions = {
  fillColor: '#2563eb',
  fillOpacity: 0.08,
  strokeColor: '#2563eb',
  strokeOpacity: 0.55,
  strokeWeight: 2,
  clickable: false,
};

function fmtMi(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : '—';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Returns the URL only when it parses as http(s) — guards against `javascript:`
 * and other unsafe schemes leaking into the rendered anchor `href`.
 */
function safeHttpUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
    return null;
  } catch {
    return null;
  }
}

function shortDomain(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

function buildInfoWindowHtml(
  p: MarketReportMapPin,
  opts: { presenterMode?: boolean } = {}
): string {
  const presenterMode = opts.presenterMode ?? false;
  const lines: string[] = [];
  lines.push(
    `<div style="font-weight:600;font-size:13px;margin-bottom:2px">${escapeHtml(p.property_name)}</div>`
  );
  lines.push(
    `<div style="color:#475569">${escapeHtml(p.city)}${p.city && p.state ? ', ' : ''}${escapeHtml(p.state)}</div>`
  );

  const meta: string[] = [];
  if (!presenterMode) {
    meta.push(escapeHtml(marketReportSourceLabel(p.source)));
  }
  if (Number.isFinite(p.distance_miles) && p.distance_miles > 0) {
    meta.push(`${fmtMi(p.distance_miles)} mi`);
  }
  if (p.unit_type) {
    meta.push(escapeHtml(humanLabel(p.unit_type)));
  }
  if (meta.length > 0) {
    lines.push(
      `<div style="color:#475569;margin-top:2px">${meta.join(' · ')}</div>`
    );
  }

  if (p.rate_avg != null && Number.isFinite(p.rate_avg)) {
    lines.push(
      `<div style="margin-top:6px"><span style="color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.04em">ARDR</span> <strong>${escapeHtml(formatCurrency(p.rate_avg))}</strong></div>`
    );
  }

  const safeUrl = safeHttpUrl(p.url ?? null);
  if (safeUrl) {
    lines.push(
      `<div style="margin-top:6px"><a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline">${escapeHtml(shortDomain(safeUrl))} ↗</a></div>`
    );
  }

  return `<div style="font-size:12px;max-width:260px;line-height:1.4;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">${lines.join('')}</div>`;
}

export interface MarketReportMapPreviewProps {
  anchorLat: number;
  anchorLng: number;
  radiusMiles: number;
  mapPins: MarketReportMapPin[];
  mapPinsTotal: number;
  mapPinsTruncated: boolean;
  /** When true, hide listing-source mentions from the info window. */
  presenterMode?: boolean;
}

export function MarketReportMapPreview({
  anchorLat,
  anchorLng,
  radiusMiles,
  mapPins,
  mapPinsTotal,
  mapPinsTruncated,
  presenterMode = false,
}: MarketReportMapPreviewProps) {
  const t = useTranslations('admin.marketReport');
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const anchorMarkerRef = useRef<google.maps.Marker | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  const onUnmount = useCallback(() => {
    clustererRef.current?.clearMarkers();
    clustererRef.current = null;
    circleRef.current?.setMap(null);
    circleRef.current = null;
    anchorMarkerRef.current?.setMap(null);
    anchorMarkerRef.current = null;
    infoWindowRef.current?.close();
    infoWindowRef.current = null;
    setMap(null);
  }, []);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const center = { lat: anchorLat, lng: anchorLng };
    const radiusMeters = radiusMiles * MILES_TO_METERS;

    let circle = circleRef.current;
    if (!circle) {
      circle = new google.maps.Circle({
        map,
        center,
        radius: radiusMeters,
        ...circleOptions,
      });
      circleRef.current = circle;
    } else {
      circle.setMap(map);
      circle.setCenter(center);
      circle.setRadius(radiusMeters);
    }

    if (!anchorMarkerRef.current) {
      anchorMarkerRef.current = new google.maps.Marker({
        map,
        position: center,
        title: t('mapAnchorMarkerTitle'),
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 3000,
      });
    } else {
      anchorMarkerRef.current.setMap(map);
      anchorMarkerRef.current.setPosition(center);
    }

    const bounds = new google.maps.LatLngBounds();
    const cb = circle.getBounds();
    if (cb) bounds.union(cb);
    for (const p of mapPins) {
      bounds.extend({ lat: p.lat, lng: p.lng });
    }
    let idleListener: google.maps.MapsEventListener | undefined;
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 56);
      idleListener = google.maps.event.addListenerOnce(map, 'idle', () => {
        const z = map.getZoom();
        if (z != null && z > MAX_ZOOM_AFTER_FIT) {
          map.setZoom(MAX_ZOOM_AFTER_FIT);
        }
      });
    } else {
      map.setCenter(center);
      map.setZoom(10);
    }

    return () => {
      if (idleListener) google.maps.event.removeListener(idleListener);
    };
  }, [map, isLoaded, anchorLat, anchorLng, radiusMiles, mapPins, t]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    infoWindowRef.current?.close();

    clustererRef.current?.clearMarkers();
    clustererRef.current = null;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }
    const infoWindow = infoWindowRef.current;

    const markers = mapPins.map((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        title: `${p.property_name} (${fmtMi(p.distance_miles)})`,
      });
      marker.addListener('click', () => {
        infoWindow.setContent(buildInfoWindowHtml(p, { presenterMode }));
        infoWindow.open({ map, anchor: marker });
      });
      return marker;
    });

    if (markers.length > 0) {
      clustererRef.current = new MarkerClusterer({ map, markers });
    }

    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
    };
  }, [map, isLoaded, mapPins, presenterMode]);

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-red-200 bg-red-50/90 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200`}
        style={{ height: MAP_HEIGHT_PX }}
      >
        {t('mapLoadError')}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-400"
        style={{ height: MAP_HEIGHT_PX }}
      >
        {t('mapLoading')}
      </div>
    );
  }

  const center = { lat: anchorLat, lng: anchorLng };

  return (
    <div className="market-report-pdf-keep space-y-2">
      <div className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 print:hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={10}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        />
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t('mapLegend')}
      </p>
      {mapPinsTruncated ? (
        <p className="text-xs text-amber-800 dark:text-amber-200/90" role="status">
          {t('mapPinsTruncatedNote', {
            shown: mapPins.length,
            total: mapPinsTotal,
          })}
        </p>
      ) : null}
    </div>
  );
}
