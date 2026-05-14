import {
  formatCurrency,
  formatNumber,
  formatOccupancyPct,
  humanLabel,
} from '@/lib/market-report/format-labels';

describe('humanLabel', () => {
  it('title-cases snake_case tokens', () => {
    expect(humanLabel('winter_weekday')).toBe('Winter Weekday');
    expect(humanLabel('summer_weekend')).toBe('Summer Weekend');
  });

  it('preserves all-caps overrides like RV and ADR', () => {
    expect(humanLabel('rv_in_place')).toBe('RV In Place');
    expect(humanLabel('adr')).toBe('ADR');
    expect(humanLabel('ev_charging')).toBe('EV Charging');
    expect(humanLabel('wifi')).toBe('WiFi');
  });

  it('passes already-formatted multi-word strings through untouched', () => {
    expect(humanLabel('Cabin')).toBe('Cabin');
    expect(humanLabel('Safari Tent')).toBe('Safari Tent');
  });

  it('returns em-dash for null / empty input', () => {
    expect(humanLabel(null)).toBe('—');
    expect(humanLabel(undefined)).toBe('—');
    expect(humanLabel('   ')).toBe('—');
  });
});

describe('formatCurrency', () => {
  it('renders whole dollars with a $ prefix', () => {
    expect(formatCurrency(425)).toBe('$425');
    expect(formatCurrency(425.789)).toBe('$426');
    expect(formatCurrency(1234)).toBe('$1,234');
  });

  it('returns em-dash for null / non-finite', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency(Number.NaN)).toBe('—');
  });
});

describe('formatOccupancyPct', () => {
  it('treats fractions ≤ 1 as 0–1 occupancy', () => {
    expect(formatOccupancyPct(0.6)).toBe('60%');
    expect(formatOccupancyPct(0.755)).toBe('75.5%');
    expect(formatOccupancyPct(1)).toBe('100%');
  });

  it('treats values > 1 as already-percent', () => {
    expect(formatOccupancyPct(62)).toBe('62%');
    expect(formatOccupancyPct(83.4)).toBe('83.4%');
  });

  it('returns em-dash for null', () => {
    expect(formatOccupancyPct(null)).toBe('—');
    expect(formatOccupancyPct(undefined)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('respects fraction-digit cap and uses thousands separators', () => {
    expect(formatNumber(1234.567, 1)).toBe('1,234.6');
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('returns em-dash for nullish / non-finite', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
