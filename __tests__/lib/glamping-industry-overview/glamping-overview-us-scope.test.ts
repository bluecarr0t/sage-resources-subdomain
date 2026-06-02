import {
  applyGlampingOverviewUsScope,
  isGlampingOverviewUsCountryValue,
} from '@/lib/glamping-industry-overview/glamping-overview-us-scope';

describe('glamping-overview-us-scope', () => {
  it('recognizes US country spellings', () => {
    expect(isGlampingOverviewUsCountryValue('United States')).toBe(true);
    expect(isGlampingOverviewUsCountryValue('USA')).toBe(true);
    expect(isGlampingOverviewUsCountryValue(null)).toBe(true);
    expect(isGlampingOverviewUsCountryValue('')).toBe(true);
    expect(isGlampingOverviewUsCountryValue('Canada')).toBe(false);
    expect(isGlampingOverviewUsCountryValue('Mexico')).toBe(false);
  });

  it('applies state and country filters on the query builder', () => {
    const calls: string[] = [];
    const q = {
      in(col: string, vals: string[]) {
        calls.push(`in:${col}:${vals.length}`);
        return this;
      },
      or(filter: string) {
        calls.push(`or:${filter.includes('United States')}`);
        return this;
      },
    };
    applyGlampingOverviewUsScope(q);
    expect(calls[0]).toMatch(/^in:state:/);
    expect(calls[1]).toBe('or:true');
  });
});
