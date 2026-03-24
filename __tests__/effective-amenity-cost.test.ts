import { effectiveAmenityCostPerUnit } from '@/lib/site-builder/effective-amenity-cost';

describe('effectiveAmenityCostPerUnit', () => {
  it('replaces aberrant deck/patio DB values with the canonical default', () => {
    expect(effectiveAmenityCostPerUnit('deck-patio', 40500)).toBe(6500);
    expect(effectiveAmenityCostPerUnit('deck-patio', 50000)).toBe(6500);
    expect(effectiveAmenityCostPerUnit('deck-patio', 12001)).toBe(6500);
  });

  it('leaves deck/patio at or below cap unchanged', () => {
    expect(effectiveAmenityCostPerUnit('deck-patio', 6500)).toBe(6500);
    expect(effectiveAmenityCostPerUnit('deck-patio', 12000)).toBe(12000);
    expect(effectiveAmenityCostPerUnit('deck-patio', 8000)).toBe(8000);
  });

  it('does not alter other slugs', () => {
    expect(effectiveAmenityCostPerUnit('fire-pit', 40500)).toBe(40500);
    expect(effectiveAmenityCostPerUnit('private-hot-tub', 12000)).toBe(12000);
  });
});
