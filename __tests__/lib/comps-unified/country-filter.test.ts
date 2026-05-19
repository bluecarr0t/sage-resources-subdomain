import {
  buildCountryFilterOptions,
  expandCountryValuesForInQuery,
  normalizeCountryFilterValue,
  parseCountryFilterFromUrl,
  parseCountryParamFromUrl,
} from '@/lib/comps-unified/country-filter';

describe('country-filter', () => {
  it('normalizes US aliases to USA', () => {
    expect(normalizeCountryFilterValue('US')).toBe('USA');
    expect(normalizeCountryFilterValue('United States')).toBe('USA');
  });

  it('expands USA to all DB aliases', () => {
    const expanded = expandCountryValuesForInQuery(['USA']);
    expect(expanded).toContain('USA');
    expect(expanded).toContain('United States');
    expect(expanded).toContain('US');
  });

  it('parses and dedupes country URL param', () => {
    expect(parseCountryParamFromUrl('USA,US,Canada')).toEqual(['USA', 'Canada']);
  });

  it('defaults missing country param to USA and treats all as no filter', () => {
    expect(parseCountryFilterFromUrl(null)).toEqual(['USA']);
    expect(parseCountryFilterFromUrl('all')).toEqual([]);
    expect(parseCountryFilterFromUrl('Canada')).toEqual(['Canada']);
  });

  it('builds canonical facet options', () => {
    const opts = buildCountryFilterOptions(['US', 'Canada', 'United States', 'MX']);
    expect(opts.map((o) => o.value)).toEqual(['Canada', 'Mexico', 'USA']);
    expect(opts.find((o) => o.value === 'USA')?.label).toBe('United States');
  });
});
