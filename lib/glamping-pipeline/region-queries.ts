/**
 * State/province-scoped Tavily queries for the pre-opening pipeline.
 * Tier A hits Modern Campground archives; Tier B hits local planning/news.
 */

import type { PipelineRegion } from './regions';

export type PipelineQueryTier = 'A' | 'B' | 'C';

function archiveHostPath(region: PipelineRegion): string {
  const countryPath = region.country === 'Canada' ? 'canada' : 'usa';
  return `site:moderncampground.com/${countryPath}/${region.archiveSlug}`;
}

/** Modern Campground state/province archive. */
export function buildRegionTierAQueries(region: PipelineRegion): string[] {
  const site = archiveHostPath(region);
  return [
    `${site} proposed glamping`,
    `${site} glamping under construction`,
    `${site} planning commission glamping`,
    `${site} glamping cancelled denied`,
  ];
}

/** Local news / planning-board coverage outside Modern Campground. */
export function buildRegionTierBQueries(region: PipelineRegion): string[] {
  const name = region.name;
  const yearHint = '2025 2026';
  return [
    `"${name}" proposed glamping resort planning board ${yearHint}`,
    `"${name}" glamping under construction groundbreaking ${yearHint}`,
    `"${name}" glamping rezoning special use permit`,
  ];
}

/** National brands + generic "new resort" queries scoped to the region. */
export function buildRegionTierCQueries(region: PipelineRegion): string[] {
  const name = region.name;
  return [
    `Under Canvas ${name} proposed OR "coming soon" glamping`,
    `AutoCamp ${name} proposed OR "under construction" glamping`,
    `new glamping resort ${name} domes cabins yurts 2026`,
  ];
}

export function buildRegionPipelineQueries(
  region: PipelineRegion,
  tiers: readonly PipelineQueryTier[] = ['A', 'B']
): string[] {
  const queries: string[] = [];
  for (const tier of tiers) {
    switch (tier) {
      case 'A':
        queries.push(...buildRegionTierAQueries(region));
        break;
      case 'B':
        queries.push(...buildRegionTierBQueries(region));
        break;
      case 'C':
        queries.push(...buildRegionTierCQueries(region));
        break;
      default: {
        const _exhaustive: never = tier;
        throw new Error(`Unhandled pipeline query tier: ${String(_exhaustive)}`);
      }
    }
  }
  return queries;
}

/** Status-refresh query for an existing pipeline property in a region. */
export function buildPropertyStatusRefreshQuery(opts: {
  propertyName: string;
  city?: string | null;
  regionName: string;
}): string {
  const city = (opts.city ?? '').trim();
  const loc = city ? `${city} ${opts.regionName}` : opts.regionName;
  return `"${opts.propertyName}" ${loc} glamping opening OR cancelled OR groundbreaking`;
}
