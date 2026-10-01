import { lowestListingNightlyRate } from '@/lib/brand-public-pages';
import type { SageProperty } from '@/lib/types/sage';

function row(
  partial: Pick<SageProperty, 'property_type' | 'unit_type' | 'rate_avg_retail_daily_rate'>
): SageProperty {
  return partial as SageProperty;
}

describe('lowestListingNightlyRate', () => {
  it('uses the lowest glamping unit, not the oldest premium row', () => {
    const rate = lowestListingNightlyRate([
      row({ property_type: 'Glamping', unit_type: 'Tipi', rate_avg_retail_daily_rate: 718.5 }),
      row({ property_type: 'Glamping', unit_type: 'Cabin', rate_avg_retail_daily_rate: 344.5 }),
      row({ property_type: 'Glamping', unit_type: 'Safari Tent', rate_avg_retail_daily_rate: 250 }),
      row({ property_type: 'Glamping', unit_type: 'RV Site', rate_avg_retail_daily_rate: 26.5 }),
      row({ property_type: 'Glamping', unit_type: 'Hotel Room', rate_avg_retail_daily_rate: 90 }),
      row({
        property_type: 'Glamping Resort',
        unit_type: 'Luxury Tent',
        rate_avg_retail_daily_rate: 81.5,
      }),
    ]);
    expect(rate).toBe(250);
  });

  it('falls back to any row when the location has no glamping unit types', () => {
    const rate = lowestListingNightlyRate([
      row({ property_type: 'RV Resort', unit_type: 'RV Site', rate_avg_retail_daily_rate: 45 }),
      row({ property_type: 'RV Resort', unit_type: 'RV Site', rate_avg_retail_daily_rate: 80 }),
    ]);
    expect(rate).toBe(45);
  });
});
