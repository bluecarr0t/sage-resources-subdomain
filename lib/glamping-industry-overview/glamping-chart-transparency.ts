import {
  createChartTransparencyAccum,
  createUnclassifiedAccum,
  finalizeChartSourceBreakdown,
  RV_OVERVIEW_CHART_TRANSPARENCY_KEYS,
  type ChartEntityCountKind,
  type ChartTransparencyAccum,
  type RvOverviewChartTransparencyKey,
  type RvOverviewChartTransparencyMap,
} from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

export { createChartTransparencyAccum, createUnclassifiedAccum };
export type { ChartEntityCountKind };

/** Whether source transparency shows unit rows or distinct properties per chart. */
export const GLAMPING_CHART_ENTITY_COUNT_KIND: Record<
  RvOverviewChartTransparencyKey,
  ChartEntityCountKind
> = {
  regionalMap: 'units',
  stateAdrChoropleth: 'properties',
  trends: 'units',
  resortSize: 'units',
  seasonRates: 'units',
  surfaceRates: 'units',
  amenityPropertyPct: 'properties',
  amenityAdr: 'units',
  rvParking: 'units',
  unitTypeRate: 'units',
  unitTypeDistribution: 'units',
};

export function finalizeGlampingChartTransparencyAccum(
  accum: ChartTransparencyAccum
): RvOverviewChartTransparencyMap {
  return RV_OVERVIEW_CHART_TRANSPARENCY_KEYS.reduce((out, key) => {
    out[key] = finalizeChartSourceBreakdown(accum[key], GLAMPING_CHART_ENTITY_COUNT_KIND[key]);
    return out;
  }, {} as RvOverviewChartTransparencyMap);
}
