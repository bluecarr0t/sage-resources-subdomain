/**
 * Per-table sync mode and ordering for campings → Supabase incremental upsert.
 */

export type TableSyncMode = 'incremental' | 'full_upsert' | 'full_replace';

/** No updated_at — full truncate+reload when --replace-snapshots (monthly). Skipped on weekly default. */
export const SNAPSHOT_FULL_REPLACE_TABLES = new Set([
  'hipcamp.old_data_table',
  'campspot.old_data_table',
]);

/** Legacy DB tables — skip unless explicitly syncing legacy DBs. */
export const LEGACY_ONLY_LARGE_TABLES = new Set([
  'hipcamp_public.sites',
  'campspot_public.sites',
  'hipcamp_public.average',
  'campspot_public.average',
  'hipcamp_public.listings',
  'campspot_public.listings',
  'campspot_public.average_general',
  'hipcamp_public.average_general',
]);

/** Campings large fact tables — included in weekly incremental by default (Phase 2). */
export const CAMPINGS_LARGE_TABLES = new Set([
  'hipcamp.sites',
  'hipcamp.propertys',
  'campspot.sites',
  'campspot.propertys',
]);

/** Sync order: parents before children where practical. */
export const CAMPINGS_TABLE_ORDER: Record<string, string[]> = {
  hipcamp: [
    'imports',
    'scrapings',
    'propertydetails',
    'propertys',
    'sitedetails',
    'importedsites',
    'siteseasonals',
    'sites',
    'old_data_table',
  ],
  campspot: [
    'scrapings',
    'propertydetails',
    'propertys',
    'sitedetails',
    'siteseasonals',
    'sites',
    'old_data_table',
  ],
  bookoutdoors: ['scrapings', 'propertys', 'sites'],
};

/** Re-read rows updated within this window before last watermark (clock skew / concurrent writes). */
export const WATERMARK_OVERLAP_MS = 5 * 60 * 1000;

export function getTableSyncMode(
  targetQualified: string,
  hasUpdatedAt: boolean,
  options: { full: boolean; replaceSnapshots: boolean }
): TableSyncMode | 'skip_snapshot' {
  if (SNAPSHOT_FULL_REPLACE_TABLES.has(targetQualified)) {
    if (!options.replaceSnapshots && !options.full) return 'skip_snapshot';
    return 'full_replace';
  }
  if (options.full || !hasUpdatedAt) return 'full_upsert';
  return 'incremental';
}

export function sortTablesForSchema(schema: string, tables: string[]): string[] {
  const order = CAMPINGS_TABLE_ORDER[schema];
  if (!order) return [...tables].sort();
  const rank = new Map(order.map((t, i) => [t, i]));
  return [...tables].sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
}

export function shouldSkipLargeTable(
  targetQualified: string,
  includeLarge: boolean,
  database: string
): boolean {
  if (includeLarge) return false;
  if (database !== 'campings' && LEGACY_ONLY_LARGE_TABLES.has(targetQualified)) return true;
  if (CAMPINGS_LARGE_TABLES.has(targetQualified)) return true;
  return LEGACY_ONLY_LARGE_TABLES.has(targetQualified);
}
