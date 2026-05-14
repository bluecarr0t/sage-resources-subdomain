import { isLegacyUsCanadaOnlyCountryQuery } from '@/lib/map/legacy-map-country-query';

describe('isLegacyUsCanadaOnlyCountryQuery', () => {
  it('returns true for United States + Canada only', () => {
    expect(isLegacyUsCanadaOnlyCountryQuery(['United States', 'Canada'])).toBe(true);
    expect(isLegacyUsCanadaOnlyCountryQuery(['Canada', 'United States'])).toBe(true);
  });

  it('returns true when values have surrounding whitespace', () => {
    expect(isLegacyUsCanadaOnlyCountryQuery([' United States ', 'Canada'])).toBe(true);
  });

  it('returns false for any other set', () => {
    expect(isLegacyUsCanadaOnlyCountryQuery([])).toBe(false);
    expect(isLegacyUsCanadaOnlyCountryQuery(['United States'])).toBe(false);
    expect(isLegacyUsCanadaOnlyCountryQuery(['United States', 'Canada', 'France'])).toBe(false);
    expect(isLegacyUsCanadaOnlyCountryQuery(['United States', 'Mexico'])).toBe(false);
  });
});
