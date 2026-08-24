/**
 * US states + Canadian provinces/territories for pipeline coverage sweeps.
 * Live inventory counts are computed from all_sage_data; this module owns
 * identifiers, display names, Modern Campground URL slugs, and sweep priority.
 */

import { CA_PROVINCE_DISPLAY_NAME, normalizeCaProvinceToCode } from '@/lib/normalize-ca-province-key';
import { normalizeDbStateToUspsAbbr } from '@/lib/normalize-us-state-abbr';
import { US_STATE_NAMES, US_STATES } from '@/lib/us-states';
import type { PipelineCountry } from './constants';
import { PIPELINE_REGION_DISCOVERY_SOURCE_PREFIX } from './constants';

export type PipelineRegion = {
  code: string;
  name: string;
  country: PipelineCountry;
  /** Path slug under moderncampground.com/usa|canada/{slug} */
  archiveSlug: string;
  /**
   * Sweep order: 0 = highest (uncovered high-activity markets).
   * Lower numbers run first in `--priority` / rotation cron.
   */
  priority: number;
};

function slugifyRegionName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Uncovered high-activity US markets (zero or near-zero pipeline rows). */
const US_PRIORITY_0 = new Set(['TX', 'FL', 'NC', 'SC', 'NM', 'OK']);
const US_PRIORITY_1 = new Set(['IL', 'WI', 'MN', 'MO', 'OH', 'IN']);
const US_PRIORITY_2 = new Set(['AL', 'LA', 'MS', 'KY', 'WV']);
const US_PRIORITY_3 = new Set(['CT', 'NJ', 'MD', 'DE', 'RI', 'NH', 'VT']);
const US_PRIORITY_4 = new Set(['AK', 'WY', 'ND', 'SD', 'IA', 'KS']);

function usPriority(code: string): number {
  if (US_PRIORITY_0.has(code)) return 0;
  if (US_PRIORITY_1.has(code)) return 1;
  if (US_PRIORITY_2.has(code)) return 2;
  if (US_PRIORITY_3.has(code)) return 3;
  if (US_PRIORITY_4.has(code)) return 4;
  return 5;
}

/** Canadian provinces without existing pipeline batches. */
const CA_PRIORITY_0 = new Set(['QC', 'MB', 'PE', 'NL']);
const CA_PRIORITY_1 = new Set(['SK', 'NT', 'YT', 'NU']);

function caPriority(code: string): number {
  if (CA_PRIORITY_0.has(code)) return 0;
  if (CA_PRIORITY_1.has(code)) return 1;
  return 2;
}

export const US_PIPELINE_REGIONS: readonly PipelineRegion[] = US_STATES.map(
  (code) => ({
    code,
    name: US_STATE_NAMES[code],
    country: 'United States' as const,
    archiveSlug: slugifyRegionName(US_STATE_NAMES[code]),
    priority: usPriority(code),
  })
);

export const CA_PIPELINE_REGIONS: readonly PipelineRegion[] = (
  Object.keys(CA_PROVINCE_DISPLAY_NAME) as Array<
    keyof typeof CA_PROVINCE_DISPLAY_NAME
  >
).map((code) => ({
  code,
  name: CA_PROVINCE_DISPLAY_NAME[code],
  country: 'Canada' as const,
  archiveSlug: slugifyRegionName(CA_PROVINCE_DISPLAY_NAME[code]),
  priority: caPriority(code),
}));

export const ALL_PIPELINE_REGIONS: readonly PipelineRegion[] = [
  ...US_PIPELINE_REGIONS,
  ...CA_PIPELINE_REGIONS,
];

const REGION_BY_KEY = new Map<string, PipelineRegion>();
for (const region of ALL_PIPELINE_REGIONS) {
  REGION_BY_KEY.set(`${region.country}:${region.code}`, region);
}

export function pipelineRegionKey(
  country: PipelineCountry,
  code: string
): string {
  return `${country}:${code.toUpperCase()}`;
}

export function findPipelineRegion(
  country: PipelineCountry,
  code: string
): PipelineRegion | null {
  return REGION_BY_KEY.get(pipelineRegionKey(country, code)) ?? null;
}

export function parsePipelineCountry(
  raw: string | null | undefined
): PipelineCountry | null {
  const t = (raw ?? '').trim();
  if (!t) return null;
  const collapsed = t.replace(/\./g, '').toUpperCase();
  if (
    collapsed === 'UNITED STATES' ||
    collapsed === 'USA' ||
    collapsed === 'US' ||
    collapsed === 'UNITED STATES OF AMERICA'
  ) {
    return 'United States';
  }
  if (collapsed === 'CANADA' || collapsed === 'CA') {
    return 'Canada';
  }
  return null;
}

export function regionsForCountry(
  country: PipelineCountry
): readonly PipelineRegion[] {
  return country === 'Canada' ? CA_PIPELINE_REGIONS : US_PIPELINE_REGIONS;
}

export function regionsAtPriority(
  country: PipelineCountry | 'all',
  priority: number
): PipelineRegion[] {
  const pool =
    country === 'all' ? ALL_PIPELINE_REGIONS : regionsForCountry(country);
  return pool.filter((r) => r.priority === priority);
}

export function sortRegionsByPriority(
  regions: readonly PipelineRegion[]
): PipelineRegion[] {
  return [...regions].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.country !== b.country) {
      return a.country === 'United States' ? -1 : 1;
    }
    return a.code.localeCompare(b.code);
  });
}

/** Discovery source tag for inserts from a state/province sweep. */
export function pipelineDiscoverySourceForRegion(
  country: PipelineCountry,
  regionCode: string
): string {
  const kind = country === 'Canada' ? 'province' : 'state';
  return `${PIPELINE_REGION_DISCOVERY_SOURCE_PREFIX}_${kind}_${regionCode.toUpperCase()}`;
}

/** True when extracted `state` matches the sweep region (abbrev or full name). */
export function extractedStateMatchesRegion(
  rawState: string | null | undefined,
  country: PipelineCountry,
  regionCode: string
): boolean {
  const expected = regionCode.trim().toUpperCase();
  if (!expected) return false;
  if (country === 'Canada') {
    const code = normalizeCaProvinceToCode(rawState);
    return code === expected;
  }
  const code = normalizeDbStateToUspsAbbr(rawState);
  return code === expected;
}

export function assertNeverSweep(x: never): never {
  throw new Error(`Unhandled pipeline sweep status: ${String(x)}`);
}
