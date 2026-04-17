/** Shared geospatial helpers for comp discovery (Haversine + bounding box). */

export const DEG_PER_MILE_LAT = 1 / 69;
export const DEG_PER_MILE_LNG = (lat: number) => 1 / (69 * Math.cos((lat * Math.PI) / 180));

export const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getBoundingBox(lat: number, lng: number, radiusMiles: number) {
  const dLat = radiusMiles * DEG_PER_MILE_LAT;
  const dLng = radiusMiles * DEG_PER_MILE_LNG(lat);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

export function parseNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export type ParseRowLatLonOptions = {
  /**
   * `all_glamping_properties` uses `lat` / `lon` column headers only (ignore `lat_num`/`lon_num`
   * if those columns are ever added). Hipcamp/Campspot prefer `lat_num`/`lon_num` with text fallback.
   */
  columns?: 'hipcamp_campspot' | 'all_glamping_properties';
};

/**
 * Parse coordinates from a market row. Default (`hipcamp_campspot`): prefer `lat_num`/`lon_num`,
 * else text `lat`/`lon`. For Sage (`all_glamping_properties`), pass `{ columns: 'all_glamping_properties' }`
 * to use only `lat`/`lon`.
 */
export function parseRowLatLon(
  row: Record<string, unknown>,
  options?: ParseRowLatLonOptions
): { lat: number; lon: number } | null {
  const mode = options?.columns ?? 'hipcamp_campspot';
  const lat =
    mode === 'all_glamping_properties'
      ? parseNum(row.lat)
      : parseNum(row.lat_num) ?? parseNum(row.lat);
  const lon =
    mode === 'all_glamping_properties'
      ? parseNum(row.lon)
      : parseNum(row.lon_num) ?? parseNum(row.lon);
  if (lat == null || lon == null) return null;
  return { lat, lon };
}

/** All supported US state abbreviations (50 states; DC not in map — add if dataset includes it). */
export function usStateAbbreviations(): string[] {
  return Object.keys(STATE_ABBR_TO_NAME).sort();
}

/**
 * Values for `.in('state', …)` on tables that may store either "TX" or "Texas" (glamping, RoverPass).
 */
export function stateSqlValuesGlampingRoverpass(stateAbbrs: string[]): string[] {
  const out = new Set<string>();
  for (const raw of stateAbbrs) {
    const abbr = raw.trim().toUpperCase().slice(0, 2);
    if (!STATE_ABBR_TO_NAME[abbr]) continue;
    out.add(abbr);
    out.add(STATE_ABBR_TO_NAME[abbr]);
  }
  return [...out];
}

/**
 * @deprecated Use {@link stateSqlValuesGlampingRoverpass}. Hipcamp/Campspot `state` may be stored as
 * "TX" or "Texas" (same as glamping/RoverPass); full-name-only `.in()` missed abbreviation rows.
 */
export function stateSqlValuesHipcampCampspot(stateAbbrs: string[]): string[] {
  return stateSqlValuesGlampingRoverpass(stateAbbrs);
}

export function resolveStateName(stateInput: string): string {
  const upper = stateInput.trim().toUpperCase();
  if (upper.length === 2 && STATE_ABBR_TO_NAME[upper]) {
    return STATE_ABBR_TO_NAME[upper];
  }
  return stateInput.trim();
}
