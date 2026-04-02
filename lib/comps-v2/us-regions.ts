/**
 * Named US regions for comps-v2 coverage mode (2-letter abbreviations).
 * Edit here to change presets; no DB migration required.
 */

export const COMPS_V2_US_REGIONS = {
  northeast: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
  southeast: ['AL', 'AR', 'DE', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV', 'DC'],
  midwest: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  southwest: ['AZ', 'NM', 'OK', 'TX'],
  mountain: ['CO', 'ID', 'MT', 'NV', 'UT', 'WY'],
  west: ['AK', 'CA', 'HI', 'OR', 'WA'],
  pacific: ['CA', 'OR', 'WA', 'HI', 'AK'],
} as const;

export type CompsV2RegionId = keyof typeof COMPS_V2_US_REGIONS;

export function isCompsV2RegionId(id: string): id is CompsV2RegionId {
  return id in COMPS_V2_US_REGIONS;
}

export function expandCompsV2RegionToAbbreviations(regionId: string): string[] | null {
  if (!isCompsV2RegionId(regionId)) return null;
  return [...COMPS_V2_US_REGIONS[regionId]];
}
