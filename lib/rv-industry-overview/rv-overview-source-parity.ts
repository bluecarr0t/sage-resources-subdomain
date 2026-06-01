/**
 * Explicit Campspot vs RoverPass rules for RV Industry Overview charts.
 * @see docs/data/RV_OVERVIEW_ROVERPASS_PARITY.md
 */

import type { RvOverviewChartTransparencyKey } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

export type RvOverviewYoYChartKey =
  | 'regionalMap'
  | 'regionalMapStateModal'
  | 'trends'
  | 'resortSize';

export const RV_OVERVIEW_YOY_CHART_KEYS: readonly RvOverviewYoYChartKey[] = [
  'regionalMap',
  'regionalMapStateModal',
  'trends',
  'resortSize',
];

/** Charts that include RoverPass rows when `source=all` (2025-heavy or single-year). */
export const RV_OVERVIEW_ROVERPASS_ELIGIBLE_CHART_KEYS: readonly RvOverviewChartTransparencyKey[] =
  [
    'regionalMap',
    'stateAdrChoropleth',
    'trends',
    'resortSize',
    'unitTypeRate',
    'unitTypeDistribution',
    'seasonRates',
    'surfaceRates',
    'amenityPropertyPct',
    'amenityAdr',
    'rvParking',
  ];

export type RvOverviewChartSourceRule = {
  chartKey: string;
  includesRoverpassWhenAll: boolean;
  requiresMatched2024And2025: boolean;
  roverpassTypicalContribution: 'none' | '2025_only' | 'mixed';
  notes: string;
};

export const RV_OVERVIEW_CHART_SOURCE_RULES: RvOverviewChartSourceRule[] = [
  {
    chartKey: 'regionalMap',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: false,
    roverpassTypicalContribution: '2025_only',
    notes:
      '2025 regional means use classified rows with 2025 ARDR + occupancy in band. RoverPass rows count when classified.',
  },
  {
    chartKey: 'regionalMapStateModal',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: true,
    roverpassTypicalContribution: 'none',
    notes:
      'State pop-up YoY uses matched 2024+2025 annual occupancy and ARDR. RoverPass lacks 2024 annual fields → effectively Campspot.',
  },
  {
    chartKey: 'trends',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: true,
    roverpassTypicalContribution: 'mixed',
    notes:
      '2025 buckets include RoverPass where classified. 2024 buckets need annual columns → mostly Campspot.',
  },
  {
    chartKey: 'resortSize',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: true,
    roverpassTypicalContribution: 'mixed',
    notes: 'Same YoY gate as trends (either year can qualify a row).',
  },
  {
    chartKey: 'stateAdrChoropleth',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: false,
    roverpassTypicalContribution: '2025_only',
    notes: '2025 ARDR only; no occupancy gate on choropleth shading.',
  },
  {
    chartKey: 'seasonRates',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: false,
    roverpassTypicalContribution: '2025_only',
    notes: 'Seasonal weekday/weekend columns when present on the row.',
  },
  {
    chartKey: 'unitTypeRate',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: false,
    roverpassTypicalContribution: '2025_only',
    notes: '2025 ARDR + standard quality band; all three unit types in one pass.',
  },
  {
    chartKey: 'amenityPropertyPct',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: false,
    roverpassTypicalContribution: '2025_only',
    notes: 'Property-level cohort with 2025 occupancy + ARDR in band.',
  },
  {
    chartKey: 'rvParking',
    includesRoverpassWhenAll: true,
    requiresMatched2024And2025: false,
    roverpassTypicalContribution: '2025_only',
    notes: 'Always RV Sites classifier; not affected by unit toggle.',
  },
];

export function isYoYChartKey(chartKey: string): chartKey is RvOverviewYoYChartKey {
  return (RV_OVERVIEW_YOY_CHART_KEYS as readonly string[]).includes(chartKey);
}
