import {
  aggregateGlampingUsStateMetrics,
  type GlampingUsStateMetricRow,
} from '@/lib/fetch-glamping-industry-us-state-metrics';

function row(partial: Partial<GlampingUsStateMetricRow>): GlampingUsStateMetricRow {
  return {
    propertyCount: 0,
    openProperties: 0,
    underConstructionProperties: 0,
    proposedDevelopmentProperties: 0,
    unitCount: 0,
    avgRetailDailyRateMean: null,
    avgRetailDailyRateMedian: null,
    ...partial,
  };
}

describe('aggregateGlampingUsStateMetrics', () => {
  it('sums counts across selected states', () => {
    const out = aggregateGlampingUsStateMetrics(
      {
        CA: row({
          propertyCount: 10,
          openProperties: 8,
          underConstructionProperties: 1,
          proposedDevelopmentProperties: 1,
          unitCount: 40,
        }),
        OR: row({
          propertyCount: 5,
          openProperties: 4,
          underConstructionProperties: 1,
          proposedDevelopmentProperties: 0,
          unitCount: 12,
        }),
      },
      ['CA', 'OR']
    );

    expect(out.propertyCount).toBe(15);
    expect(out.openProperties).toBe(12);
    expect(out.underConstructionProperties).toBe(2);
    expect(out.proposedDevelopmentProperties).toBe(1);
    expect(out.unitCount).toBe(52);
  });

  it('property-weights ARDR mean and median', () => {
    const out = aggregateGlampingUsStateMetrics(
      {
        CA: row({
          propertyCount: 3,
          avgRetailDailyRateMean: 200,
          avgRetailDailyRateMedian: 180,
        }),
        NV: row({
          propertyCount: 1,
          avgRetailDailyRateMean: 100,
          avgRetailDailyRateMedian: 90,
        }),
      },
      ['CA', 'NV']
    );

    // (200*3 + 100*1) / 4 = 175
    expect(out.avgRetailDailyRateMean).toBe(175);
    // (180*3 + 90*1) / 4 = 157.5 → 158
    expect(out.avgRetailDailyRateMedian).toBe(158);
  });

  it('skips missing abbrs and null rates', () => {
    const out = aggregateGlampingUsStateMetrics(
      {
        TX: row({ propertyCount: 2, avgRetailDailyRateMean: 150, unitCount: 7 }),
      },
      ['TX', 'ZZ']
    );
    expect(out.propertyCount).toBe(2);
    expect(out.unitCount).toBe(7);
    expect(out.avgRetailDailyRateMean).toBe(150);
    expect(out.avgRetailDailyRateMedian).toBeNull();
  });
});
