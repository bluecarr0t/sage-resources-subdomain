/** Copy for the Glamping Market Overview scope disclosure. */

export const GLAMPING_MARKET_SCOPE_SHORT_LABEL = 'Private commercial glamping';

export const GLAMPING_MARKET_SCOPE_INCLUDED = [
  'Safari Tents',
  'Cabins',
  'Tiny Homes',
  'Airstream',
  'Domes',
  'Other glamping units',
] as const;

export const GLAMPING_MARKET_SCOPE_EXCLUDED = [
  'Non-glamping property types (hotels, campgrounds, marinas, etc.)',
  'RV parks & resorts',
  'Traditional campgrounds',
  'Only listed on OTAs (e.g. Airbnb)',
  'State Parks & National Parks',
] as const;

/** Footer note in the scope disclosure modal. */
export const GLAMPING_MARKET_SCOPE_FOOTNOTE =
  'Counts and rates on this page include only published properties classified as Glamping (property type), with glamping unit inventory, a business website, and at least 3 units where applicable. Tier filters (Luxury, Upscale, etc.) narrow within this cohort—they do not change who qualifies.';
