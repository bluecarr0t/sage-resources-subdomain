import {
  UNIT_TYPE_CHART_BUCKET_KEYS,
  type UnitTypeChartBucketKey,
} from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';

/** Same buckets as unit-type charts; UI labels Tent / RV / Lodging (lodging = glamping classifier). */
export type RvOverviewUnitFilterKey = UnitTypeChartBucketKey;

export const RV_OVERVIEW_UNIT_FILTER_KEYS: readonly RvOverviewUnitFilterKey[] =
  UNIT_TYPE_CHART_BUCKET_KEYS;

/** UI toggle order: RV Sites, Tent Sites, Lodging (chart bucket keys unchanged). */
export const RV_OVERVIEW_UNIT_FILTER_TOGGLE_ORDER: readonly RvOverviewUnitFilterKey[] = [
  'rv',
  'tent',
  'glamping',
];

const UNIT_SET = new Set<string>(RV_OVERVIEW_UNIT_FILTER_KEYS);

export function parseRvOverviewUnitFilterKey(raw: string | undefined | null): RvOverviewUnitFilterKey {
  const key = raw?.trim().toLowerCase();
  if (key && UNIT_SET.has(key)) return key as RvOverviewUnitFilterKey;
  return 'rv';
}
