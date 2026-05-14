import type { CohortPropertyRow, MarketReportMapPin } from '@/lib/market-report/types';

/** Max pins returned in API JSON; remainder indicated via meta flags. */
export const MARKET_REPORT_MAP_PINS_CAP = 2500;

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Build map pins from the same cohort row order as aggregation (closest first).
 * `key` uses the row index in `rows` so it matches {@link buildPropertyAnalysis} sample keys for the first 25 rows.
 */
export function buildMapPinsFromRows(rows: CohortPropertyRow[]): {
  pins: MarketReportMapPin[];
  mapPinsTotal: number;
  mapPinsTruncated: boolean;
} {
  let mapPinsTotal = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (isValidCoord(r.geo_lat, r.geo_lng)) mapPinsTotal += 1;
  }

  const pins: MarketReportMapPin[] = [];
  for (let i = 0; i < rows.length && pins.length < MARKET_REPORT_MAP_PINS_CAP; i++) {
    const r = rows[i]!;
    if (!isValidCoord(r.geo_lat, r.geo_lng)) continue;
    pins.push({
      key: `${r.source}:${r.sourceId ?? 'noid'}:${i}:${r.distance_miles}:${Math.round(r.geo_lat * 1e5)}:${Math.round(r.geo_lng * 1e5)}`,
      lat: r.geo_lat,
      lng: r.geo_lng,
      property_name: r.property_name,
      city: r.city,
      state: r.state,
      source: r.source,
      distance_miles: r.distance_miles,
      rate_avg: r.rate_avg ?? null,
      url: r.url ?? null,
      unit_type: r.unit_type ?? null,
    });
  }

  const mapPinsTruncated = mapPinsTotal > MARKET_REPORT_MAP_PINS_CAP;
  return { pins, mapPinsTotal, mapPinsTruncated };
}
