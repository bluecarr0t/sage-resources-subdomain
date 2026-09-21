import type { OtaMonthlySource } from '@/lib/ota-monthly-radius-export';

/**
 * Warehouse amenity labels for Campspot (`sitedetails.amenities` object keys)
 * and Hipcamp (`sitedetails` / property `core_amenities` / `basic_amenities`).
 * Aliases are OR'd within one requested amenity; multiple requested amenities are AND'd.
 */
export const OTA_AMENITY_ALIASES: Record<
  string,
  { campspot: readonly string[]; hipcamp: readonly string[] }
> = {
  'hot-tub': {
    campspot: ['Hot Tub', 'Hot tub', 'Private Hot Tub'],
    hipcamp: ['Hot tub'],
  },
  wifi: {
    campspot: ['Wi-Fi', 'Internet Access'],
    hipcamp: ['Wifi'],
  },
  waterfront: {
    campspot: ['Waterfront'],
    hipcamp: ['Waterfront'],
  },
  pool: {
    campspot: ['Pool'],
    hipcamp: ['Pool'],
  },
  pets: {
    campspot: ['Pets'],
    hipcamp: ['Pets allowed'],
  },
  'full-hookup': {
    campspot: ['Water Hook-Up'],
    hipcamp: ['Water'],
  },
  '50-amp': {
    campspot: ['50-Amp'],
    hipcamp: [],
  },
  'private-bathroom': {
    campspot: ['Private Bathroom', 'Private Shower'],
    hipcamp: ['Toilet', 'Shower'],
  },
};

export type OtaAmenityResolution = {
  groups: string[][];
  unknown: string[];
};

export function normalizeAmenityToken(raw: string): string {
  const token = raw.trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (OTA_AMENITY_ALIASES[token]) return token;
  if (token.endsWith('s') && OTA_AMENITY_ALIASES[token.slice(0, -1)]) {
    return token.slice(0, -1);
  }
  return token;
}

export function resolveAmenityGroups(
  requested: string[],
  source: OtaMonthlySource,
): OtaAmenityResolution {
  const groups: string[][] = [];
  const unknown: string[] = [];
  for (const raw of requested) {
    const token = normalizeAmenityToken(raw);
    if (!token) continue;
    const mapped = OTA_AMENITY_ALIASES[token];
    if (!mapped) {
      unknown.push(raw.trim());
      groups.push([raw.trim()]);
      continue;
    }
    let labels: string[];
    switch (source) {
      case 'campspot':
        labels = [...mapped.campspot];
        break;
      case 'hipcamp':
        labels = [...mapped.hipcamp];
        break;
      default: {
        const exhaustive: never = source;
        throw new Error(`Unsupported OTA source: ${String(exhaustive)}`);
      }
    }
    if (labels.length === 0) continue;
    groups.push(labels);
  }
  return { groups, unknown };
}

export function unitTypeLikePatterns(unitTypes: string[]): string[] {
  return unitTypes
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => (value.includes('%') ? value : `%${value}%`));
}
