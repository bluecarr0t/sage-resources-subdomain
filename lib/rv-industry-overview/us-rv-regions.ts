/**
 * Five-region US split for RV Industry Overview choropleth (matches legacy Excel map grouping).
 * Two-letter USPS codes. West includes AK/HI for aggregation; map renders lower 48 + AK (Albers USA) + custom HI inset above AK.
 */

import { STATE_FULL_TO_ABBR } from '@/lib/anchor-point-insights/constants';

export const RV_INDUSTRY_REGION_IDS = [
  'west',
  'southwest',
  'midwest',
  'southeast',
  'northeast',
] as const;

export type RvIndustryRegionId = (typeof RV_INDUSTRY_REGION_IDS)[number];

const WEST = new Set([
  'WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'UT', 'CO', 'AK', 'HI',
]);
const SOUTHWEST = new Set(['AZ', 'NM', 'TX', 'OK']);
const MIDWEST = new Set([
  'ND', 'SD', 'NE', 'KS', 'MN', 'IA', 'MO', 'WI', 'IL', 'MI', 'IN', 'OH',
]);
const SOUTHEAST = new Set([
  'AR', 'LA', 'MS', 'AL', 'TN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
]);
const NORTHEAST = new Set([
  'MD', 'DE', 'NJ', 'PA', 'NY', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME',
]);

/** Fill colors (SVG) — dark orange, yellow, green, amber, blue */
export const RV_REGION_FILL: Record<RvIndustryRegionId, string> = {
  west: '#c2410c',
  southwest: '#ca8a04',
  midwest: '#15803d',
  southeast: '#f59e0b',
  northeast: '#1d4ed8',
};

const ABBR_TO_REGION: Record<string, RvIndustryRegionId> = {};
for (const abbr of WEST) ABBR_TO_REGION[abbr] = 'west';
for (const abbr of SOUTHWEST) ABBR_TO_REGION[abbr] = 'southwest';
for (const abbr of MIDWEST) ABBR_TO_REGION[abbr] = 'midwest';
for (const abbr of SOUTHEAST) ABBR_TO_REGION[abbr] = 'southeast';
for (const abbr of NORTHEAST) ABBR_TO_REGION[abbr] = 'northeast';

export function getRvIndustryRegionForStateAbbr(abbr: string): RvIndustryRegionId | null {
  const upper = abbr.trim().toUpperCase();
  return ABBR_TO_REGION[upper] ?? null;
}

/** Map TopoJSON/US-Atlas full state name (e.g. "New York") to USPS abbreviation */
export function fullStateNameToUspsAbbr(name: string | undefined): string | null {
  if (!name?.trim()) return null;
  const key = name.trim().toLowerCase();
  return STATE_FULL_TO_ABBR[key] ?? null;
}

/** Exclude HI from main Albers map — Hawaii is drawn as a separate inset above Alaska. */
export const EXCLUDE_FROM_MAP_ABBR = new Set(['HI']);

/** Approximate region centroids [lon, lat] for Albers USA labels */
export const RV_REGION_LABEL_COORDS: Record<RvIndustryRegionId, [number, number]> = {
  west: [-114.5, 44],
  southwest: [-103, 33.5],
  midwest: [-93, 43],
  southeast: [-84, 33.5],
  northeast: [-73.5, 42.5],
};
