import {
  isComparableMarketArdrRateBasis,
  normalizeGlampingRateBasis,
} from '@/lib/glamping-rate-basis';

describe('glamping-rate-basis', () => {
  it('normalizes known aliases', () => {
    expect(normalizeGlampingRateBasis('all_inclusive')).toBe('all_inclusive');
    expect(normalizeGlampingRateBasis('All-Inclusive')).toBe('all_inclusive');
    expect(normalizeGlampingRateBasis('package')).toBe('all_inclusive');
    expect(normalizeGlampingRateBasis('B&B')).toBe('breakfast');
    expect(normalizeGlampingRateBasis(null)).toBe('unknown');
    expect(normalizeGlampingRateBasis('')).toBe('unknown');
  });

  it('excludes only all_inclusive from comparable market ARDR', () => {
    expect(isComparableMarketArdrRateBasis('all_inclusive')).toBe(false);
    expect(isComparableMarketArdrRateBasis('room_only')).toBe(true);
    expect(isComparableMarketArdrRateBasis('breakfast')).toBe(true);
    expect(isComparableMarketArdrRateBasis('unknown')).toBe(true);
    expect(isComparableMarketArdrRateBasis(null)).toBe(true);
  });
});
