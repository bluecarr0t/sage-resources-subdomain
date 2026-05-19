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
  'RV parks & resorts',
  'Traditional campgrounds',
  'Only listed on OTAs (e.g. Airbnb)',
  'State Parks',
  'National Parks',
  'Other public land',
] as const;

/** Footer note in the scope disclosure modal. */
export const GLAMPING_MARKET_SCOPE_FOOTNOTE =
  'Counts and rates on this page reflect professionalized glamping properties: a majority of units are glamping inventory, the operator maintains a business website, and the property has at least 3 units. Tier filters (Luxury, Upscale, etc.) narrow within this cohort—they do not change who qualifies.';
