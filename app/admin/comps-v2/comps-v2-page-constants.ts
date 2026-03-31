import { COMPS_V2_LEGEND_WEB_RESEARCH } from '@/lib/comps-v2/source-marker-color';

export const DATA_SOURCE_KEYS = [
  'pastReports',
  'all_glamping_properties',
  'hipcamp',
  'all_roverpass_data_new',
  'campspot',
  'web_search',
] as const;

export type DataSourceKey = (typeof DATA_SOURCE_KEYS)[number];

/** Default search area (Google Places–style line); map + discovery start here. */
export const DEFAULT_COMPS_V2_LOCATION_LINE = 'Johnson City, TX 78636, USA';
export const DEFAULT_COMPS_V2_PLACE_ANCHOR = { lat: 30.2769, lng: -98.4119 };

export const COMPS_V2_COUNT_KEY_ORDER = [
  'all_glamping_properties',
  'hipcamp',
  'all_roverpass_data_new',
  'campspot',
  'past_reports',
  'web_search',
] as const;

/** Server still returns these with `web_search`; composition shows one combined Web Research row. */
export const COMPS_V2_COUNT_KEYS_HIDDEN_FROM_COMPOSITION = new Set([
  'web_search_tavily_raw_hits',
  'web_search_pipeline_candidates',
]);

/** `source_table` values shown in results Data source filter (stable order). */
export const RESULTS_SOURCE_TABLE_FILTER_ORDER = [
  'all_glamping_properties',
  'hipcamp',
  'all_roverpass_data_new',
  'campspot',
  'past_reports',
  COMPS_V2_LEGEND_WEB_RESEARCH,
] as const;
