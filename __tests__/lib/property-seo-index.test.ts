import {
  evaluatePropertyIndexTier,
  propertyTierShouldIndex,
} from '@/lib/property-seo-index';

describe('evaluatePropertyIndexTier', () => {
  it('returns c without name or location', () => {
    expect(evaluatePropertyIndexTier({ property_name: 'X' })).toBe('c');
    expect(evaluatePropertyIndexTier(null)).toBe('c');
  });

  it('returns b with city and state only', () => {
    expect(
      evaluatePropertyIndexTier({
        property_name: 'Test Resort',
        city: 'Austin',
        state: 'TX',
      })
    ).toBe('b');
  });

  it('returns a with location and description', () => {
    expect(
      evaluatePropertyIndexTier({
        property_name: 'Test Resort',
        city: 'Austin',
        state: 'TX',
        description: 'A'.repeat(100),
      })
    ).toBe('a');
  });

  it('returns a with rate signal', () => {
    expect(
      evaluatePropertyIndexTier({
        property_name: 'Test Resort',
        city: 'Austin',
        state: 'TX',
        rate_avg_retail_daily_rate: 250,
      })
    ).toBe('a');
  });
});

describe('propertyTierShouldIndex', () => {
  it('indexes a and b only', () => {
    expect(propertyTierShouldIndex('a')).toBe(true);
    expect(propertyTierShouldIndex('b')).toBe(true);
    expect(propertyTierShouldIndex('c')).toBe(false);
  });
});
