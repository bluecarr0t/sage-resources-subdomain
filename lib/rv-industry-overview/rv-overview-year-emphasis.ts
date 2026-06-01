import type { RvOverviewYearEmphasisKey } from '@/lib/rv-industry-overview/rv-overview-display-preferences';

/** Visual weight for YoY series when analyst emphasizes one year. */
export function rvOverviewYearSeriesOpacity(
  seriesYear: '2024' | '2025',
  emphasis: RvOverviewYearEmphasisKey
): number {
  if (emphasis === 'both') return 1;
  return emphasis === seriesYear ? 1 : 0.32;
}
