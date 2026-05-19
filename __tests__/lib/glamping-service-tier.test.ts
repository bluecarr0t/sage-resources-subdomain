import {
  aggregateRowsForTier,
  computeGlampingServiceTier,
  computeGlampingServiceTierFromRows,
  tierDisplayLabel,
} from '@/lib/glamping-service-tier';

describe('glamping-service-tier', () => {
  it('labels tiers for display', () => {
    expect(tierDisplayLabel('luxury')).toBe('Luxury Glamping');
    expect(tierDisplayLabel('midscale')).toBe('Comfort Glamping');
    expect(tierDisplayLabel('luxury', 'short')).toBe('Luxury');
    expect(tierDisplayLabel('rustic', 'short')).toBe('Rustic');
  });

  it('classifies shared-bath low ADR as rustic', () => {
    const result = computeGlampingServiceTierFromRows([
      {
        unit_private_bathroom: 'No',
        rate_avg_retail_daily_rate: 99,
      },
    ]);
    expect(result.tier).toBe('rustic');
  });

  it('classifies high ADR as luxury regardless of amenities', () => {
    const result = computeGlampingServiceTier(
      aggregateRowsForTier([{ rate_avg_retail_daily_rate: 2400 }])
    );
    expect(result.tier).toBe('luxury');
    expect(result.rationale).toContain('800');
  });

  it('classifies restaurant + pool + private bath + mid ADR as upscale', () => {
    const result = computeGlampingServiceTierFromRows([
      {
        unit_private_bathroom: 'Yes',
        unit_air_conditioning: 'Yes',
        property_restaurant: 'Yes',
        property_pool: 'Yes',
        rate_avg_retail_daily_rate: 400,
      },
    ]);
    expect(result.tier).toBe('upscale');
  });

  it('uses max ADR across site rows', () => {
    const agg = aggregateRowsForTier([
      { rate_avg_retail_daily_rate: 120, unit_private_bathroom: 'Yes' },
      {
        rate_avg_retail_daily_rate: 320,
        unit_private_bathroom: 'Yes',
        property_restaurant: 'Yes',
        property_pool: 'Yes',
      },
    ]);
    expect(agg.maxAdr).toBe(320);
    expect(computeGlampingServiceTier(agg).tier).toBe('upscale');
  });
});
