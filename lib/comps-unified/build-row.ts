/**
 * Shared types + helpers for the `unified_comps` matview used by
 * /api/admin/comps/unified and the /admin/comps page.
 *
 * Keep the `UnifiedCompRow` shape in sync with the column list of the
 * matview in `scripts/migrations/unified-comps-matview.sql`.
 */

export const UNIFIED_SOURCES = [
  'reports',
  'all_glamping_properties',
  'hipcamp',
  'campspot',
  'all_roverpass_data_new',
] as const;

export type UnifiedSource = (typeof UNIFIED_SOURCES)[number];

/**
 * Friendly label for a source — shown in the Source column badge and the
 * Source filter dropdown. Kept parallel to `compsV2FriendlySourceTable` so the
 * two admin surfaces stay consistent.
 */
export function unifiedSourceLabel(source: string): string {
  switch (source) {
    case 'reports':
      return 'Past Reports';
    case 'all_glamping_properties':
      return 'Sage';
    case 'hipcamp':
      return 'Hipcamp';
    case 'campspot':
      return 'Campspot';
    case 'all_roverpass_data_new':
      return 'RoverPass';
    default:
      return source;
  }
}

/** Tailwind badge classes per source — keeps the Source column skimmable. */
export function unifiedSourceBadgeClass(source: string): string {
  switch (source) {
    case 'reports':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    case 'all_glamping_properties':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'hipcamp':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
    case 'campspot':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
    case 'all_roverpass_data_new':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }
}

/** One row of `unified_comps`. `source` discriminates the provenance. */
export interface UnifiedCompRow {
  /** Prefixed synthetic id (e.g. "rep:<uuid>", "glamp:42"). */
  id: string;
  source: UnifiedSource;
  source_row_id: string;
  property_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  property_type: string | null;
  /** For Sage, matview merges `unit_type` + `site_name` + `property_type` so unit filters match site labels. */
  unit_type: string | null;
  unit_category: string | null;
  /** All unit_category values observed for the row (reports source only). */
  unit_categories: string[] | null;
  total_sites: number | null;
  num_units: number | null;
  low_adr: number | null;
  peak_adr: number | null;
  avg_adr: number | null;
  low_occupancy: number | null;
  peak_occupancy: number | null;
  quality_score: number | null;
  amenity_keywords: string[];
  study_id: string | null;
  overview: string | null;
  report_property_name: string | null;
  /** Primary property website when present (`url` on Sage and other sources; reports: null). */
  website_url: string | null;
  /** Dedupe key for distinct property counts (address / geocode–based; see matview). */
  address_key: string;
  created_at: string;
}

export type UnifiedSortKey =
  | 'created_at'
  | 'property_name'
  | 'state'
  | 'total_sites'
  | 'quality_score'
  | 'low_adr'
  | 'peak_adr';

export const UNIFIED_SORT_COLUMNS: Record<UnifiedSortKey, string> = {
  created_at: 'created_at',
  property_name: 'property_name',
  state: 'state',
  total_sites: 'total_sites',
  quality_score: 'quality_score',
  low_adr: 'low_adr',
  peak_adr: 'peak_adr',
};

export function isUnifiedSource(v: string): v is UnifiedSource {
  return (UNIFIED_SOURCES as readonly string[]).includes(v);
}

export function filterUnifiedSources(values: string[]): UnifiedSource[] {
  return values
    .map((v) => v.trim())
    .filter(isUnifiedSource);
}
