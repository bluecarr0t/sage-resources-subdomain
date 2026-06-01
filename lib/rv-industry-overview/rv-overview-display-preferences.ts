/**
 * URL-driven display preferences (year emphasis + rate column family).
 * Does not re-scan data; charts use pre-aggregated fields and adjust emphasis / copy.
 */

export const RV_OVERVIEW_YEAR_EMPHASIS_KEYS = ['both', '2024', '2025'] as const;
export type RvOverviewYearEmphasisKey = (typeof RV_OVERVIEW_YEAR_EMPHASIS_KEYS)[number];

export const RV_OVERVIEW_RATE_METRIC_KEYS = ['retail_annual', 'retail_seasonal'] as const;
export type RvOverviewRateMetricKey = (typeof RV_OVERVIEW_RATE_METRIC_KEYS)[number];

const YEAR_SET = new Set<string>(RV_OVERVIEW_YEAR_EMPHASIS_KEYS);
const RATE_SET = new Set<string>(RV_OVERVIEW_RATE_METRIC_KEYS);

export type RvOverviewDisplayPreferences = {
  yearEmphasis: RvOverviewYearEmphasisKey;
  rateMetric: RvOverviewRateMetricKey;
};

export function parseRvOverviewYearEmphasisKey(
  raw: string | undefined | null
): RvOverviewYearEmphasisKey {
  const key = raw?.trim().toLowerCase();
  if (key && YEAR_SET.has(key)) return key as RvOverviewYearEmphasisKey;
  return 'both';
}

export function parseRvOverviewRateMetricKey(
  raw: string | undefined | null
): RvOverviewRateMetricKey {
  const key = raw?.trim().toLowerCase();
  if (key && RATE_SET.has(key)) return key as RvOverviewRateMetricKey;
  return 'retail_annual';
}

export function parseRvOverviewDisplayPreferences(searchParams: {
  year?: string;
  rate?: string;
}): RvOverviewDisplayPreferences {
  return {
    yearEmphasis: parseRvOverviewYearEmphasisKey(searchParams.year),
    rateMetric: parseRvOverviewRateMetricKey(searchParams.rate),
  };
}

/** Charts that always use seasonal weekday/weekend columns (not annual retail). */
export const RV_OVERVIEW_SEASONAL_RATE_CHART_KEYS = [
  'seasonRates',
] as const;

export function rateMetricAppliesToChart(
  chartKey: string,
  rateMetric: RvOverviewRateMetricKey
): boolean {
  if (rateMetric === 'retail_seasonal') {
    return (RV_OVERVIEW_SEASONAL_RATE_CHART_KEYS as readonly string[]).includes(chartKey);
  }
  return !(RV_OVERVIEW_SEASONAL_RATE_CHART_KEYS as readonly string[]).includes(chartKey);
}
