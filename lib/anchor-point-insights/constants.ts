/**
 * Constants for Anchor Point Insights
 */

export const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
export const MAX_COUNTY_ROWS = 5_000; // US has ~3,100 counties; cap for safety
export const MAX_PER_TABLE = 50_000;
export const FETCH_PAGE_SIZE = 1000; // Supabase/PostgREST default max per request
export const MAX_STATE_ROWS = 10;
export const MAX_PROPERTY_SAMPLE = 10;
export const MAX_ANCHORS_WITH_COUNTS = 10;
export const MAP_MARKER_LIMIT = 500;
export const MAP_DISTANCE_MI = 75;
export const DEGREES_PRE_FILTER = 10; // ~700 mi; spatial pre-filter for anchor lookup
export const COORD_PRECISION = 4; // ~11m; for deduplication

/** Full state name -> abbreviation for county-population parsing */
export const STATE_FULL_TO_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC',
};
