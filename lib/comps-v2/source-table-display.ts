import { COMPS_V2_LEGEND_WEB_RESEARCH } from './source-marker-color';

/**
 * Human-readable source labels for comps v2 (table, exports, counts).
 * Keep aligned with `messages/en.json` → `admin.compsV2` source* strings.
 */
export function compsV2FriendlySourceTable(table: string): string {
  switch (table) {
    case 'all_glamping_properties':
      return 'Sage Glamping Data';
    case 'hipcamp':
      return 'Hipcamp';
    case 'all_roverpass_data_new':
      return 'RoverPass';
    case 'campspot':
      return 'Campspot';
    case 'past_reports':
      return 'Past report comps';
    case 'web_search':
    case 'web_search_tavily_raw_hits':
    case 'web_search_pipeline_candidates':
      return 'Web Research';
    case 'tavily_gap_fill':
    case 'firecrawl_gap_fill':
    case COMPS_V2_LEGEND_WEB_RESEARCH:
      return 'Web Research';
    case 'comps_v2_deep_enrich':
      return 'Comps v2 deep enrichment';
    default:
      return table
        .split('_')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
  }
}
