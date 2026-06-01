import { parseRvOverviewUnitFilterKey } from '@/lib/rv-industry-overview/rv-overview-unit-filter';

describe('parseRvOverviewUnitFilterKey', () => {
  it('defaults to rv', () => {
    expect(parseRvOverviewUnitFilterKey(undefined)).toBe('rv');
    expect(parseRvOverviewUnitFilterKey('')).toBe('rv');
    expect(parseRvOverviewUnitFilterKey('invalid')).toBe('rv');
  });

  it('accepts rv, tent, glamping', () => {
    expect(parseRvOverviewUnitFilterKey('tent')).toBe('tent');
    expect(parseRvOverviewUnitFilterKey('GLAMPING')).toBe('glamping');
    expect(parseRvOverviewUnitFilterKey(' rv ')).toBe('rv');
  });
});
