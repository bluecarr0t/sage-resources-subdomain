/**
 * Analyst data-source filter for RV Industry Overview (URL `?source=`).
 */

export const RV_OVERVIEW_DATA_SOURCE_FILTER_KEYS = ['all', 'campspot'] as const;

export type RvOverviewDataSourceFilterKey = (typeof RV_OVERVIEW_DATA_SOURCE_FILTER_KEYS)[number];

const SOURCE_SET = new Set<string>(RV_OVERVIEW_DATA_SOURCE_FILTER_KEYS);

export function parseRvOverviewDataSourceFilterKey(
  raw: string | undefined | null
): RvOverviewDataSourceFilterKey {
  const key = raw?.trim().toLowerCase();
  if (key && SOURCE_SET.has(key)) return key as RvOverviewDataSourceFilterKey;
  return 'all';
}

export function rvOverviewDataSourceQueryValue(key: RvOverviewDataSourceFilterKey): string {
  return key === 'campspot' ? 'campspot' : 'all';
}
