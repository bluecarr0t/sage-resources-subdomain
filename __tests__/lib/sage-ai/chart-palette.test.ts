import {
  formatChartSeriesLegendLabel,
  SAGE_AI_CHART_COLORS,
} from '@/lib/sage-ai/chart-palette';

describe('formatChartSeriesLegendLabel', () => {
  it('replaces underscores and title-cases words', () => {
    expect(formatChartSeriesLegendLabel('total_sites')).toBe('Total Sites');
    expect(formatChartSeriesLegendLabel('avg_daily_rate')).toBe('Avg Daily Rate');
    expect(formatChartSeriesLegendLabel('count')).toBe('Count');
  });
});

describe('SAGE_AI_CHART_COLORS', () => {
  it('has enough distinct entries for multi-series charts', () => {
    expect(SAGE_AI_CHART_COLORS.length).toBeGreaterThanOrEqual(6);
    const unique = new Set(SAGE_AI_CHART_COLORS);
    expect(unique.size).toBe(SAGE_AI_CHART_COLORS.length);
  });
});
