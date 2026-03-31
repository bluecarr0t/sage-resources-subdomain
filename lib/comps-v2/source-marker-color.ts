/** Single map color for Tavily + Firecrawl web gap-fill rows (legend + markers). */
export const COMPS_V2_WEB_RESEARCH_MARKER_COLOR = '#4ade80';

/** Synthetic legend / results-filter key (not a DB `source_table`). */
export const COMPS_V2_LEGEND_WEB_RESEARCH = 'web_research';

/**
 * `source_table` values shown as one “Web Research” data source (Tavily, Firecrawl, future LLM/API rows).
 * Extend when new web-research pipelines write their own `source_table`.
 */
export const COMPS_V2_WEB_GAP_SOURCE_TABLES: ReadonlySet<string> = new Set([
  'tavily_gap_fill',
  'firecrawl_gap_fill',
]);

/** Map / client geocode: treat as web research (gap-fill row or merged with gap-fill). */
export function compsV2CandidateIsWebResearchForMap(c: {
  source_table: string;
  web_research_supplement?: boolean | null;
}): boolean {
  return COMPS_V2_WEB_GAP_SOURCE_TABLES.has(c.source_table) || Boolean(c.web_research_supplement);
}

/** Marker color for a result row (web wins when gap-fill contributed, even if `source_table` is a market table). */
export function compsV2MapMarkerColorForCandidate(c: {
  source_table: string;
  web_research_supplement?: boolean | null;
}): string {
  if (compsV2CandidateIsWebResearchForMap(c)) {
    return COMPS_V2_WEB_RESEARCH_MARKER_COLOR;
  }
  return compsV2SourceTableMarkerColor(c.source_table);
}

/** Marker fill colors for Google Maps (comps v2 results), keyed by `source_table` or legend key. */
export function compsV2SourceTableMarkerColor(sourceTable: string): string {
  switch (sourceTable) {
    case 'all_glamping_properties':
      return '#1b4332';
    case 'hipcamp':
      return '#e85d04';
    case 'all_roverpass_data_new':
      return '#2563eb';
    case 'campspot':
      return '#7c3aed';
    case 'past_reports':
      return '#64748b';
    case 'tavily_gap_fill':
    case 'firecrawl_gap_fill':
    case COMPS_V2_LEGEND_WEB_RESEARCH:
      return COMPS_V2_WEB_RESEARCH_MARKER_COLOR;
    default:
      return '#6b7280';
  }
}
