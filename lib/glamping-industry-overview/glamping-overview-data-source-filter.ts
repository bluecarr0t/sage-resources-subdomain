/**
 * Analyst data-source filter for Glamping Industry Overview (URL `?source=`).
 */

export const GLAMPING_OVERVIEW_DATA_SOURCE_FILTER_KEYS = ['all', 'hipcamp', 'sage'] as const;

export type GlampingOverviewDataSourceFilterKey =
  (typeof GLAMPING_OVERVIEW_DATA_SOURCE_FILTER_KEYS)[number];

const SOURCE_SET = new Set<string>(GLAMPING_OVERVIEW_DATA_SOURCE_FILTER_KEYS);

export function parseGlampingOverviewDataSourceFilterKey(
  raw: string | undefined | null
): GlampingOverviewDataSourceFilterKey {
  const key = raw?.trim().toLowerCase();
  if (key && SOURCE_SET.has(key)) return key as GlampingOverviewDataSourceFilterKey;
  return 'all';
}

export function glampingOverviewDataSourceQueryValue(
  key: GlampingOverviewDataSourceFilterKey
): string {
  return key;
}
