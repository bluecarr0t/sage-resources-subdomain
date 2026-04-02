import { parseSitesExportBody, sitesExportHasRegionScope } from '@/lib/sites-export/parse-body';

describe('sitesExportHasRegionScope', () => {
  it('is false when no country, state, or zip+radius', () => {
    expect(
      sitesExportHasRegionScope({
        countries: [],
        states: [],
        zip: '',
        radiusMiles: null,
      })
    ).toBe(false);
  });

  it('is true with a country', () => {
    expect(
      sitesExportHasRegionScope({
        countries: ['United States'],
        states: [],
        zip: '',
        radiusMiles: null,
      })
    ).toBe(true);
  });

  it('is true with zip and radius', () => {
    expect(
      sitesExportHasRegionScope({
        countries: [],
        states: [],
        zip: '90210',
        radiusMiles: 25,
      })
    ).toBe(true);
  });
});

describe('parseSitesExportBody', () => {
  it('returns null when sources missing', () => {
    expect(parseSitesExportBody({ format: 'xlsx' })).toBeNull();
  });

  it('coerces numeric zip to string', () => {
    const b = parseSitesExportBody({
      sources: ['campspot'],
      countries: [],
      states: [],
      unitTypes: [],
      zip: 96094 as unknown as string,
      radiusMiles: 200,
      format: 'csv',
    });
    expect(b?.zip).toBe('96094');
    expect(b?.radiusMiles).toBe(200);
  });

  it('parses valid body with zip and radius', () => {
    const b = parseSitesExportBody({
      sources: ['hipcamp', 'campspot'],
      countries: [],
      states: ['CA', 'TX'],
      unitTypes: ['Cabin'],
      zip: '90210',
      radiusMiles: 25,
      format: 'csv',
    });
    expect(b).toEqual({
      sources: ['hipcamp', 'campspot'],
      countries: [],
      states: ['CA', 'TX'],
      unitTypes: ['Cabin'],
      zip: '90210',
      radiusMiles: 25,
      format: 'csv',
    });
  });

  it('requires zip when radius set', () => {
    expect(
      parseSitesExportBody({
        sources: ['hipcamp'],
        countries: [],
        states: [],
        unitTypes: [],
        zip: '',
        radiusMiles: 10,
        format: 'xlsx',
      })
    ).toBeNull();
  });

  it('requires radius when zip set', () => {
    expect(
      parseSitesExportBody({
        sources: ['hipcamp'],
        countries: [],
        states: [],
        unitTypes: [],
        zip: '10001',
        radiusMiles: null,
        format: 'xlsx',
      })
    ).toBeNull();
  });

  it('allows empty zip and null radius', () => {
    const b = parseSitesExportBody({
      sources: ['all_glamping_properties'],
      countries: ['United States'],
      states: [],
      unitTypes: [],
      zip: '',
      radiusMiles: null,
      format: 'xlsx',
    });
    expect(b?.zip).toBe('');
    expect(b?.radiusMiles).toBeNull();
  });

  it('normalizes states to two uppercase letters (callers must send abbreviations; full names are wrong)', () => {
    const b = parseSitesExportBody({
      sources: ['hipcamp'],
      countries: [],
      states: ['ca', 'New York'],
      unitTypes: [],
      zip: '',
      radiusMiles: null,
      format: 'xlsx',
    });
    expect(b?.states).toEqual(['CA', 'NE']);
  });

  it('parses optional cacheKey', () => {
    const b = parseSitesExportBody({
      sources: ['hipcamp'],
      countries: [],
      states: [],
      unitTypes: [],
      zip: '',
      radiusMiles: null,
      format: 'csv',
      cacheKey: '  abc-123  ',
    });
    expect(b?.cacheKey).toBe('abc-123');
  });
});
