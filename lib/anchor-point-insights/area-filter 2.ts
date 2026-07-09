/**
 * Geographic area filter for Proximity Insights (city / ZIP + radius).
 */

import { geocodePlaceLine, resolveGeocodeForCompsSearch } from '@/lib/geocode';
import { calculateDistance } from '@/lib/proximity-utils';
import type { Anchor } from './types';

export interface ProximityAreaFilter {
  lat: number;
  lng: number;
  radiusMi: number;
  /** User-entered label (city, ZIP, etc.) */
  label: string;
}

const MIN_RADIUS_MI = 1;
const MAX_RADIUS_MI = 250;
const US_ZIP_RE = /^\d{5}(-\d{4})?$/;

export function clampAreaRadiusMi(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(MAX_RADIUS_MI, Math.max(MIN_RADIUS_MI, Math.round(value)));
}

export function defaultAreaRadiusMi(distanceBandThresholds: number[] | null | undefined): number {
  if (distanceBandThresholds?.length) {
    return clampAreaRadiusMi(Math.max(...distanceBandThresholds));
  }
  return 30;
}

export function parseRadiusMiParam(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = parseFloat(raw.trim());
  if (!Number.isFinite(n)) return null;
  return clampAreaRadiusMi(n);
}

/** Normalize user location line for geocoding (US-focused). */
export function formatLocationForGeocode(location: string): string {
  const t = location.trim();
  if (!t) return '';
  if (US_ZIP_RE.test(t)) return `${t.slice(0, 5)}, USA`;
  if (/\bUSA\b/i.test(t) || /\bUnited States\b/i.test(t)) return t;
  return `${t}, USA`;
}

export async function geocodeProximityLocation(
  location: string
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = location.trim();
  if (!trimmed) return null;

  if (US_ZIP_RE.test(trimmed)) {
    const zip = trimmed.slice(0, 5);
    const fromZip = await resolveGeocodeForCompsSearch({ zip, state: '', city: '', locationLine: '' });
    if (fromZip) return { lat: fromZip.lat, lng: fromZip.lng };
  }

  const line = formatLocationForGeocode(trimmed);
  const fromLine = await geocodePlaceLine(line);
  if (fromLine) return { lat: fromLine.lat, lng: fromLine.lng };

  const fromResolve = await resolveGeocodeForCompsSearch({ locationLine: line });
  if (fromResolve) return { lat: fromResolve.lat, lng: fromResolve.lng };

  return null;
}

export async function resolveProximityAreaFilter(
  location: string,
  radiusMi: number
): Promise<ProximityAreaFilter | null> {
  const coords = await geocodeProximityLocation(location);
  if (!coords) return null;
  return {
    lat: coords.lat,
    lng: coords.lng,
    radiusMi: clampAreaRadiusMi(radiusMi),
    label: location.trim(),
  };
}

export function distanceMilesFromAreaCenter(
  area: ProximityAreaFilter,
  lat: number,
  lon: number
): number {
  return calculateDistance(area.lat, area.lng, lat, lon);
}

export function filterPropertiesByArea<T extends { lat: number; lon: number }>(
  properties: T[],
  area: ProximityAreaFilter
): T[] {
  return properties.filter((p) => distanceMilesFromAreaCenter(area, p.lat, p.lon) <= area.radiusMi);
}

export function filterAnchorsByArea(anchors: Anchor[], area: ProximityAreaFilter): Anchor[] {
  return anchors.filter((a) => distanceMilesFromAreaCenter(area, a.lat, a.lon) <= area.radiusMi);
}

export function areaFilterCacheKeyPart(area: ProximityAreaFilter | null | undefined): string {
  if (!area) return 'area:none';
  const label = area.label.toLowerCase().replace(/\s+/g, '_').slice(0, 40);
  return `area:${label}:${area.lat.toFixed(3)},${area.lng.toFixed(3)}:${area.radiusMi}`;
}
