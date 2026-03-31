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

/** Full state names for Hipcamp / Campspot (match existing `.eq('state', stateFullName)`). */
export function stateSqlValuesHipcampCampspot(stateAbbrs: string[]): string[] {
  const out: string[] = [];
  for (const raw of stateAbbrs) {
    const abbr = raw.trim().toUpperCase().slice(0, 2);
    const full = STATE_ABBR_TO_NAME[abbr];
    if (full) out.push(full);
  }
  return [...new Set(out)];
}

export function resolveStateName(stateInput: string): string {
  const upper = stateInput.trim().toUpperCase();
  if (upper.length === 2 && STATE_ABBR_TO_NAME[upper]) {
    return STATE_ABBR_TO_NAME[upper];
  }
  return stateInput.trim();
}
