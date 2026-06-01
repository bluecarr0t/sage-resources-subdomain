import type { RvOverviewChartTransparencyKey } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

/** i18n keys under `admin.rvIndustryOverview.chartSourceScope`. */
export type RvOverviewChartSourceScopeKey =
  | 'regionalMap2025'
  | 'mapStateModalYoY'
  | 'trendsYoY'
  | 'resortSizeYoY'
  | 'stateAdrChoropleth2025'
  | 'unitTypeComparison2025'
  | 'seasonSurfaceAmenity2025'
  | 'rvParking2025';

export const RV_OVERVIEW_CHART_SOURCE_SCOPE_KEYS: RvOverviewChartSourceScopeKey[] = [
  'regionalMap2025',
  'mapStateModalYoY',
  'trendsYoY',
  'resortSizeYoY',
  'stateAdrChoropleth2025',
  'unitTypeComparison2025',
  'seasonSurfaceAmenity2025',
  'rvParking2025',
];

export const CHART_TRANSPARENCY_TO_SOURCE_SCOPE: Record<
  RvOverviewChartTransparencyKey,
  RvOverviewChartSourceScopeKey
> = {
  regionalMap: 'regionalMap2025',
  stateAdrChoropleth: 'stateAdrChoropleth2025',
  trends: 'trendsYoY',
  resortSize: 'resortSizeYoY',
  unitTypeRate: 'unitTypeComparison2025',
  unitTypeDistribution: 'unitTypeComparison2025',
  seasonRates: 'seasonSurfaceAmenity2025',
  surfaceRates: 'seasonSurfaceAmenity2025',
  amenityPropertyPct: 'seasonSurfaceAmenity2025',
  amenityAdr: 'seasonSurfaceAmenity2025',
  rvParking: 'rvParking2025',
};
