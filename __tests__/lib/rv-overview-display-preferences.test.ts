import { parseRvOverviewDataSourceFilterKey } from '@/lib/rv-industry-overview/rv-overview-data-source-filter';
import {
  parseRvOverviewDisplayPreferences,
  parseRvOverviewYearEmphasisKey,
} from '@/lib/rv-industry-overview/rv-overview-display-preferences';
import { rvOverviewYearSeriesOpacity } from '@/lib/rv-industry-overview/rv-overview-year-emphasis';

describe('parseRvOverviewDisplayPreferences', () => {
  it('defaults year and rate', () => {
    expect(parseRvOverviewDisplayPreferences({})).toEqual({
      yearEmphasis: 'both',
      rateMetric: 'retail_annual',
    });
  });

  it('parses year and rate from query', () => {
    expect(
      parseRvOverviewDisplayPreferences({ year: '2025', rate: 'retail_seasonal' })
    ).toEqual({
      yearEmphasis: '2025',
      rateMetric: 'retail_seasonal',
    });
  });
});

describe('parseRvOverviewDataSourceFilterKey', () => {
  it('defaults to all', () => {
    expect(parseRvOverviewDataSourceFilterKey(undefined)).toBe('all');
    expect(parseRvOverviewDataSourceFilterKey('campspot')).toBe('campspot');
  });
});

describe('rvOverviewYearSeriesOpacity', () => {
  it('dims non-emphasized year', () => {
    expect(rvOverviewYearSeriesOpacity('2024', '2025')).toBeLessThan(1);
    expect(rvOverviewYearSeriesOpacity('2025', '2025')).toBe(1);
  });
});

describe('parseRvOverviewYearEmphasisKey', () => {
  it('parses valid keys', () => {
    expect(parseRvOverviewYearEmphasisKey('2024')).toBe('2024');
  });
});
