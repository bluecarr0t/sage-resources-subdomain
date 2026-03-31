import type { CompsV2Translate } from '@/lib/comps-v2/admin-client-errors';
import { COMPS_V2_LEGEND_WEB_RESEARCH } from '@/lib/comps-v2/source-marker-color';

/** Title-case unknown `source_table` values for display (locale-neutral token). */
export function compsV2SourceTableFallbackLabel(table: string): string {
  return table
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Localized source label for comps v2 UI (`admin.compsV2` keys). Use in client components with `useTranslations('admin.compsV2')`.
 */
export function compsV2SourceTableLabel(table: string, t: CompsV2Translate): string {
  switch (table) {
    case 'all_glamping_properties':
      return t('sourceGlamping');
    case 'hipcamp':
      return t('sourceHipcamp');
    case 'all_roverpass_data_new':
      return t('sourceRoverpass');
    case 'campspot':
      return t('sourceCampspot');
    case 'past_reports':
      return t('sourcePastReports');
    case 'web_search':
    case 'web_search_tavily_raw_hits':
    case 'web_search_pipeline_candidates':
    case 'tavily_gap_fill':
    case 'firecrawl_gap_fill':
    case COMPS_V2_LEGEND_WEB_RESEARCH:
      return t('resultsMapLegendWebResearch');
    case 'comps_v2_deep_enrich':
      return t('sourceTableDeepEnrich');
    default:
      return compsV2SourceTableFallbackLabel(table);
  }
}
