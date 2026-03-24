/**
 * Map Report Builder unit_mix types to Site Builder cost configs.
 * Report Builder uses display names (e.g. "Cabin", "RV Site - Full Hookup");
 * Site Builder uses slugs (e.g. "cabin", "full-hookup-back-in").
 */

import type { GlampingConfig, RVConfig, SiteBuilderConfig } from '@/lib/site-builder/cost-calculator';

/** Report Builder glamping type → site_builder_glamping_types slug */
const GLAMPING_TYPE_TO_SLUG: Record<string, string> = {
  'A-Frame': 'a-frame',
  Airstream: 'airstream',
  'Bell Tent': 'bell-tent',
  'Bubble Tent': 'bell-tent',
  Cabin: 'cabin',
  'Canvas Tent': 'canvas-tent',
  'Container Home': 'tiny-home',
  'Covered Wagon': 'wagon',
  Dome: 'dome',
  'Glamping Pod': 'pod',
  'Hobbit House': 'cabin',
  'House Boat': 'house-boat',
  'Mirror Cabin': 'mirror-cabin',
  'Safari Tent': 'safari-tent',
  "Shepherd's Hut": 'pod',
  Silo: 'dome',
  'Tiny Home': 'tiny-home',
  Tipi: 'canvas-tent',
  Treehouse: 'treehouse',
  'Vintage Trailer': 'vintage-trailer',
  'Wall Tent': 'canvas-tent',
  Yurt: 'yurt',
};

/** Report Builder RV type → site_builder_rv_site_types slug */
const RV_TYPE_TO_SLUG: Record<string, string> = {
  'RV Site - Back-in': 'full-hookup-back-in',
  'RV Site - Full Hookup': 'full-hookup-back-in',
  'RV Site - General': 'full-hookup-back-in',
  'RV Site - Pull thru': 'full-hookup-pull-thru',
};

/** Default sqft when not in DB (fallback for Report Builder without Site Builder config) */
const DEFAULT_SQFT_BY_SLUG: Record<string, number> = {
  'a-frame': 350,
  airstream: 200,
  'bell-tent': 200,
  cabin: 500,
  'canvas-tent': 250,
  dome: 700,
  pod: 300,
  'house-boat': 450,
  'mirror-cabin': 450,
  'safari-tent': 400,
  'tiny-home': 400,
  treehouse: 450,
  'vintage-trailer': 200,
  wagon: 300,
  yurt: 350,
};

/** Default quality tier for Report Builder (no Site Builder config) */
const DEFAULT_QUALITY = 'Premium';

/**
 * Convert Report Builder unit_mix to SiteBuilderConfig[] for cost calculation.
 * Glamping types use default sqft and quality; RV types use default site type.
 */
export function unitMixToCostConfigs(
  unitMix: Array<{ type: string; count: number }>
): SiteBuilderConfig[] {
  const configs: SiteBuilderConfig[] = [];

  for (const { type, count } of unitMix) {
    if (!type || count <= 0) continue;

    const trimmed = type.trim();
    const rvSlug = RV_TYPE_TO_SLUG[trimmed];
    const glampingSlug = GLAMPING_TYPE_TO_SLUG[trimmed];

    if (rvSlug) {
      configs.push({
        type: 'rv',
        siteTypeSlug: rvSlug,
        quantity: count,
        qualityType: DEFAULT_QUALITY,
        amenitySlugs: [],
      } satisfies RVConfig);
    } else if (glampingSlug) {
      const sqft = DEFAULT_SQFT_BY_SLUG[glampingSlug] ?? 400;
      configs.push({
        type: 'glamping',
        unitTypeSlug: glampingSlug,
        quantity: count,
        sqft,
        qualityType: DEFAULT_QUALITY,
        amenitySlugs: [],
      } satisfies GlampingConfig);
    }
    // Unknown types are skipped (no cost config)
  }

  return configs;
}
