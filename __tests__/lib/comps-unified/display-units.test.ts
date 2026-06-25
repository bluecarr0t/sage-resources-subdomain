import { unifiedCompDisplayUnits } from '@/lib/comps-unified/display-units';

describe('unifiedCompDisplayUnits', () => {
  it('prefers num_units when both are present (Glamping Loft Lake Geneva pattern)', () => {
    expect(unifiedCompDisplayUnits({ num_units: 12, total_sites: 1 })).toBe(12);
  });

  it('falls back to total_sites when num_units is missing', () => {
    expect(unifiedCompDisplayUnits({ num_units: null, total_sites: 24 })).toBe(24);
  });

  it('uses num_units when total_sites is null', () => {
    expect(unifiedCompDisplayUnits({ num_units: 5, total_sites: null })).toBe(5);
  });

  it('returns null when both are missing', () => {
    expect(unifiedCompDisplayUnits({ num_units: null, total_sites: null })).toBeNull();
  });
});
