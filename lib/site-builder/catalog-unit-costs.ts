/**
 * Derive glamping unit base costs from cce_catalog_units (Walden Insights).
 * Uses price percentiles by catalog_section and quality tier to produce
 * realistic cost ranges per unit type (e.g. Budget A-Frame >> $889).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Percentile of catalog prices to use per quality tier (0–100) */
const QUALITY_TO_PERCENTILE: Record<string, number> = {
  Budget: 12,
  Economy: 25,
  'Mid-Range': 40,
  Premium: 55,
  Luxury: 75,
  'Ultra Luxury': 92,
};

/** site_builder_glamping_types slug → catalog_section(s). First with data wins. */
const UNIT_SLUG_TO_CATALOG_SECTIONS: Record<string, string[]> = {
  'a-frame': ['A-Frames', 'Tents'],
  airstream: ['Converted Containers'],
  'bell-tent': ['Tents'],
  cabin: ['Converted Containers'],
  'canvas-tent': ['Tents'],
  dome: ['Domes'],
  pod: ['Pods'],
  /** No dedicated Walden section; approximate with small alternative dwellings */
  'house-boat': ['Converted Containers'],
  'mirror-cabin': ['Mirror Cabins', 'Converted Containers'],
  'safari-tent': ['Tents'],
  'tiny-home': ['Converted Containers'],
  treehouse: ['Treehouses'],
  'vintage-trailer': ['Vintage Trailers', 'Converted Containers'],
  wagon: ['Wagons'],
  yurt: ['Yurts'],
};

/**
 * Multiplier applied when unit type falls back to a shared catalog section.
 * Baseline 1.0 = no adjustment. Differentiates costs for types that share
 * the same section (e.g. Mirror Cabin vs Vintage Trailer both use Converted Containers).
 */
const UNIT_SLUG_TO_MULTIPLIER: Record<string, number> = {
  'tiny-home': 1.0,
  cabin: 1.05,
  airstream: 0.95,
  'mirror-cabin': 1.2,
  'house-boat': 1.05,
  'vintage-trailer': 0.85,
};

export interface CatalogCostMap {
  /** (unitTypeSlug, qualityType) -> base cost from catalog */
  bySlugAndQuality: Record<string, number>;
  /** catalog_section -> sample count used */
  sampleCount: Record<string, number>;
}

/**
 * Fetch catalog units by section, compute price percentiles per quality tier,
 * and return base costs for each (unitTypeSlug, qualityType) combination.
 */
export async function getCatalogDerivedGlampingCosts(
  supabase: SupabaseClient,
  unitTypeSlugs: string[],
  qualityTypes: string[]
): Promise<CatalogCostMap> {
  const bySlugAndQuality: Record<string, number> = {};
  const sampleCount: Record<string, number> = {};
  const sectionPricesCache: Record<string, number[]> = {};

  for (const slug of unitTypeSlugs) {
    const sections = UNIT_SLUG_TO_CATALOG_SECTIONS[slug];
    if (!sections?.length) continue;

    let prices: number[] | null = null;
    let usedSection: string | null = null;
    for (const section of sections) {
      if (!sectionPricesCache[section]) {
        const { data: rows } = await supabase
          .from('cce_catalog_units')
          .select('price')
          .eq('catalog_section', section)
          .not('price', 'is', null)
          .gte('price', 1000)
          .lte('price', 500000);
        const arr = (rows ?? [])
          .map((r) => Number(r.price))
          .filter((p) => !Number.isNaN(p) && p >= 1000 && p <= 500000)
          .sort((a, b) => a - b);
        sectionPricesCache[section] = arr;
      }
      const arr = sectionPricesCache[section];
      if (arr.length >= 3) {
        prices = arr;
        usedSection = section;
        break;
      }
    }
    if (!prices?.length || !usedSection) continue;

    sampleCount[usedSection] = prices.length;
    const percentile = (pct: number) => {
      const idx = Math.min(Math.floor((pct / 100) * prices!.length), prices!.length - 1);
      return prices![Math.max(0, idx)];
    };

    // Apply multiplier when using shared "Converted Containers" section to differentiate unit types.
    // When unit type has its own section (Mirror Cabins, Vintage Trailers), raw prices are used.
    const multiplier =
      usedSection === 'Converted Containers' && UNIT_SLUG_TO_MULTIPLIER[slug] != null
        ? UNIT_SLUG_TO_MULTIPLIER[slug]!
        : 1;

    for (const quality of qualityTypes) {
      const pct = QUALITY_TO_PERCENTILE[quality] ?? 50;
      const basePrice = percentile(pct);
      bySlugAndQuality[`${slug}:${quality}`] = Math.round(basePrice * multiplier);
    }
  }

  return { bySlugAndQuality, sampleCount };
}
