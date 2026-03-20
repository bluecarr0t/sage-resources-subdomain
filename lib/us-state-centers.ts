/**
 * US state + DC geographic centroids (fallback when no property coordinates).
 * Used by client map API and CSV import — keep in sync across consumers.
 */
export const STATE_CENTERS: Record<string, [number, number]> = {
  AL: [32.3182, -86.9023],
  AK: [61.3707, -152.4044],
  AZ: [34.0489, -111.0937],
  AR: [34.9697, -92.3731],
  CA: [36.7783, -119.4179],
  CO: [39.113, -105.3119],
  CT: [41.6032, -73.0877],
  DE: [38.9108, -75.5277],
  DC: [38.9072, -77.0369],
  FL: [27.7663, -82.6404],
  GA: [32.1574, -82.9071],
  HI: [19.8968, -155.5828],
  ID: [44.0682, -114.742],
  IL: [40.6331, -89.3985],
  IN: [40.2672, -86.1349],
  IA: [41.878, -93.0977],
  KS: [38.5266, -96.7265],
  KY: [37.6681, -84.6701],
  LA: [31.1695, -91.8678],
  ME: [45.2538, -69.4455],
  MD: [39.0458, -76.6413],
  MA: [42.4072, -71.3824],
  MI: [43.3266, -84.5361],
  MN: [46.7296, -94.6859],
  MS: [32.3547, -89.3985],
  MO: [37.9643, -91.8318],
  MT: [46.8797, -110.3626],
  NE: [41.4925, -99.9018],
  NV: [38.8026, -116.4194],
  NH: [43.1939, -71.5724],
  NJ: [40.0583, -74.4057],
  NM: [34.5199, -105.8701],
  NY: [43.2994, -74.2179],
  NC: [35.7596, -79.0193],
  ND: [47.5515, -101.002],
  OH: [40.4173, -82.9071],
  OK: [35.0078, -97.0929],
  OR: [43.8041, -120.5542],
  PA: [41.2033, -77.1945],
  RI: [41.5801, -71.4774],
  SC: [33.8361, -81.1637],
  SD: [43.9695, -99.9018],
  TN: [35.5175, -86.5804],
  TX: [31.9686, -99.9018],
  UT: [39.321, -111.0937],
  VT: [44.5588, -72.5778],
  VA: [37.4316, -78.6569],
  WA: [47.7511, -120.7401],
  WV: [38.5976, -80.4549],
  WI: [43.7844, -89.6165],
  WY: [43.076, -107.2903],
};

export const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];

/** Resolve 2-letter USPS code for STATE_CENTERS lookup (handles "OR" and "Oregon"). */
export function resolveUsStateAbbr(state: string | null | undefined): string | null {
  const raw = (state || '').trim().toUpperCase();
  if (!raw) return null;
  if (raw.length === 2) return raw in STATE_CENTERS ? raw : null;
  const fullToAbbr: Record<string, string> = {
    ALABAMA: 'AL',
    ALASKA: 'AK',
    ARIZONA: 'AZ',
    ARKANSAS: 'AR',
    CALIFORNIA: 'CA',
    COLORADO: 'CO',
    CONNECTICUT: 'CT',
    DELAWARE: 'DE',
    'DISTRICT OF COLUMBIA': 'DC',
    FLORIDA: 'FL',
    GEORGIA: 'GA',
    HAWAII: 'HI',
    IDAHO: 'ID',
    ILLINOIS: 'IL',
    INDIANA: 'IN',
    IOWA: 'IA',
    KANSAS: 'KS',
    KENTUCKY: 'KY',
    LOUISIANA: 'LA',
    MAINE: 'ME',
    MARYLAND: 'MD',
    MASSACHUSETTS: 'MA',
    MICHIGAN: 'MI',
    MINNESOTA: 'MN',
    MISSISSIPPI: 'MS',
    MISSOURI: 'MO',
    MONTANA: 'MT',
    NEBRASKA: 'NE',
    NEVADA: 'NV',
    'NEW HAMPSHIRE': 'NH',
    'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM',
    'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC',
    'NORTH DAKOTA': 'ND',
    OHIO: 'OH',
    OKLAHOMA: 'OK',
    OREGON: 'OR',
    PENNSYLVANIA: 'PA',
    'RHODE ISLAND': 'RI',
    'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD',
    TENNESSEE: 'TN',
    TEXAS: 'TX',
    UTAH: 'UT',
    VERMONT: 'VT',
    VIRGINIA: 'VA',
    WASHINGTON: 'WA',
    'WEST VIRGINIA': 'WV',
    WISCONSIN: 'WI',
    WYOMING: 'WY',
  };
  return fullToAbbr[raw] ?? null;
}

const EPS_DEG = 0.012;

/** True when lat/lng matches the stored US state centroid (CSV import used these as fake coords). */
export function isLikelyStateCenterPlaceholder(
  lat: number,
  lng: number,
  state: string | null | undefined
): boolean {
  const key = resolveUsStateAbbr(state);
  if (!key) return false;
  const center = STATE_CENTERS[key];
  if (!center) return false;
  const [clat, clng] = center;
  return Math.abs(lat - clat) < EPS_DEG && Math.abs(lng - clng) < EPS_DEG;
}
