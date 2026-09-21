import {
  listUnitTypeNormalizePhrases,
  normalizeGlampingUnitTypeForStorage,
} from '@/lib/glamping-unit-type-normalize';

const CANONICAL_KEYS = new Set(listUnitTypeNormalizePhrases());

/** Map a site name to a stored unit type only when the whole name is a known product label. */
export function unitTypeFromSiteName(siteName: string | null | undefined): string | null {
  const raw = (siteName ?? '').trim();
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\s+/g, ' ');
  if (!CANONICAL_KEYS.has(key)) return null;
  return normalizeGlampingUnitTypeForStorage(raw);
}

export function isProposedSiteName(siteName: string | null | undefined): boolean {
  const name = (siteName ?? '').trim().toLowerCase();
  return name.startsWith('proposed ') || name.includes('not built');
}

export type MissingUnitQueue =
  | 'state_park_placeholder'
  | 'property_shell'
  | 'named_site'
  | 'proposed_placeholder';

export function classifyMissingUnitRow(input: {
  siteName: string | null;
  propertyName: string;
  landOperatorCategory: string | null;
}): MissingUnitQueue {
  if ((input.landOperatorCategory ?? '').trim() === 'state_park') {
    return 'state_park_placeholder';
  }
  const site = (input.siteName ?? '').trim();
  if (!site) return 'property_shell';
  if (isProposedSiteName(site)) return 'proposed_placeholder';
  if (site.toLowerCase() === input.propertyName.trim().toLowerCase()) {
    return 'property_shell';
  }
  return 'named_site';
}
