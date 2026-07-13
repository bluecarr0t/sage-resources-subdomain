/** Copy for the Glamping Market Overview scope disclosure. */

import { glampingMarketOverviewDisplayCurrency } from '@/lib/glamping-market-overview-currency';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

export const GLAMPING_MARKET_SCOPE_SHORT_LABEL = 'Private commercial glamping';

/** Lead-in above the example glamping unit types in the scope modal. */
export const GLAMPING_MARKET_SCOPE_INCLUDED_INTRO =
  'Sage-classified primarily-glamping properties (unit types below).';

export const GLAMPING_MARKET_SCOPE_INCLUDED = [
  'Safari Tents',
  'Cabins',
  'Tiny Homes',
  'Airstream',
  'Domes',
  'Other glamping units',
] as const;

export const GLAMPING_MARKET_SCOPE_EXCLUDED = [
  'Non-glamping property types (hotels, marinas, etc.)',
  'Non-glamping unit types (RV pads, campsites, hotel rooms)',
  'RV parks & resorts',
  'Traditional campgrounds',
  'Only listed on OTAs (e.g. Airbnb)',
  'State Parks & National Parks',
] as const;

/** Compact always-visible footer disclaimer (hybrid option A-level copy). */
export function glampingMarketOverviewFooterDisclaimer(
  market: GlampingMarketSnapshotMarket = 'us'
): string {
  const currency = glampingMarketOverviewDisplayCurrency(market);
  return `Sage research snapshot · private commercial glamping · rates in ${currency}. Estimates only, not financial or investment advice.`;
}

/** Methodology modal bullets (opened from footer “Methodology”). */
export const GLAMPING_MARKET_METHODOLOGY_NOTES = [
  'Cohort: published private commercial glamping properties in Sage research (see Included / Excluded). Inclusion is Sage-classified primarily-glamping product, not a hard unit-count floor in this snapshot; newer discovery targets multi-unit sites when inventory is verified.',
  'Classification: Luxury / Upscale / Comfort / Rustic are Sage service tiers from amenities and published rates, not brand names or OTA star ratings (see “What do these mean?” on the filter).',
  'Rates: avg. retail daily rate (ARDR) from operating properties with a published nightly rate (not PMS ADR); headline mean/median use one value per property (the median of that property’s rated unit rows).',
  'Brand rankings: avg. retail daily rate (ARDR) is the mean of each property’s published average rate within the brand, not the same as the national overview’s property-median ARDR. Non-glamping unit SKUs (RV pads, campsites, hotel rooms) are excluded from brand unit and rate rollups.',
  'Currency: United States figures are shown in USD. Canada figures are shown in CAD as published by operators until a USD conversion backfill is complete.',
  'Intended Use: for market sizing and benchmarking only, not financial, investment, lending, or appraisal advice.',
] as const;
