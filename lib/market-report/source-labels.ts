import type { CohortPropertyRow, MarketReportSegment } from '@/lib/market-report/types';

/** Stable DB keys on cohort rows (not for end-user display). */
export type MarketReportDataSourceKey = CohortPropertyRow['source'];

const LABEL: Record<MarketReportDataSourceKey, string> = {
  all_glamping_properties: 'Sage',
  all_roverpass_data_new: 'RoverPass',
  campspot: 'Campspot',
  hipcamp: 'Hipcamp',
};

/** User-facing name for a cohort row `source` key. */
export function marketReportSourceLabel(internal: string): string {
  return LABEL[internal as MarketReportDataSourceKey] ?? internal;
}

/** Human-readable names for fetch-stats / debug table ids. */
export function marketReportFetchTableDisplayName(table: string): string {
  switch (table) {
    case 'all_glamping_properties':
      return 'Sage';
    case 'all_roverpass_data_new':
      return 'RoverPass';
    case 'campspot':
      return 'Campspot';
    case 'hipcamp':
      return 'Hipcamp';
    default:
      return table;
  }
}

/**
 * Sources queried for this segment (for meta line). Uses product names, not Supabase table names.
 *
 *   Glamping: Sage + Hipcamp (Campspot is excluded — it's an RV-park product).
 *   RV:       RoverPass + Campspot (when a US state is detected from the address).
 *
 * `includeStateGated` controls the state-gated source for each segment: it adds
 * Campspot for RV reports when a US state is known. Glamping ignores the flag
 * because Hipcamp + Sage are queried unconditionally.
 */
export function marketReportQueriedSources(segment: MarketReportSegment, includeStateGated: boolean): string[] {
  if (segment === 'glamping') {
    return ['Sage', 'Hipcamp'];
  }
  return includeStateGated ? ['RoverPass', 'Campspot'] : ['RoverPass'];
}
