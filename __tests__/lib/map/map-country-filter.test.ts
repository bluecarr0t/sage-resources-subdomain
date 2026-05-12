import { getMapCountryFilterKey, propertyMatchesCountryFilters } from '@/lib/map/map-country-filter';

describe('map-country-filter', () => {
  describe('getMapCountryFilterKey', () => {
    it('maps US variants to United States', () => {
      expect(getMapCountryFilterKey({ country: 'USA', state: 'TX' })).toBe('United States');
      expect(getMapCountryFilterKey({ country: 'United States', state: 'Texas' })).toBe('United States');
    });

    it('maps Canada variants to Canada', () => {
      expect(getMapCountryFilterKey({ country: 'Canada', state: 'ON' })).toBe('Canada');
      expect(getMapCountryFilterKey({ country: 'CA', state: 'BC' })).toBe('Canada');
    });

    it('title-cases other countries', () => {
      expect(getMapCountryFilterKey({ country: 'Belgium', state: 'Flanders' })).toBe('Belgium');
      expect(getMapCountryFilterKey({ country: 'belgium', state: null })).toBe('Belgium');
    });

    it('returns null when country missing', () => {
      expect(getMapCountryFilterKey({ country: '', state: null })).toBeNull();
    });
  });

  describe('propertyMatchesCountryFilters', () => {
    it('matches all when filter list empty', () => {
      expect(propertyMatchesCountryFilters({ country: 'Belgium', state: 'Flanders' }, [])).toBe(true);
    });

    it('single United States matches canonical map country key', () => {
      expect(propertyMatchesCountryFilters({ country: 'United States', state: 'TX' }, ['United States'])).toBe(true);
      expect(propertyMatchesCountryFilters({ country: 'Belgium', state: 'Flanders' }, ['United States'])).toBe(false);
    });

    it('single Canada matches canonical map country key', () => {
      expect(propertyMatchesCountryFilters({ country: 'Canada', state: 'ON' }, ['Canada'])).toBe(true);
      expect(propertyMatchesCountryFilters({ country: 'Belgium', state: 'Flanders' }, ['Canada'])).toBe(false);
    });

    it('does not treat northern US coordinates as Canada when country is United States', () => {
      // Duluth, MN area: inside isLikelyCanadaByCoords polygon but clearly US in the database
      expect(
        getMapCountryFilterKey({
          country: 'United States',
          state: 'Minnesota',
          lat: 46.7867,
          lon: -92.1005,
        })
      ).toBe('United States');
      expect(propertyMatchesCountryFilters({ country: 'United States', state: 'MN', lat: 46.7867, lon: -92.1005 }, ['Canada'])).toBe(false);
    });

    it('matches subset including non–North America', () => {
      expect(propertyMatchesCountryFilters({ country: 'Belgium', state: 'Flanders' }, ['Belgium', 'United States'])).toBe(
        true
      );
      expect(propertyMatchesCountryFilters({ country: 'Belgium', state: 'Flanders' }, ['France'])).toBe(false);
    });
  });
});
