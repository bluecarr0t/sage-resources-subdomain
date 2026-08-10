import { proposeAssumptions, runFeasibilityModel } from '@/lib/feasibility-model';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

describe('monthly pro forma', () => {
  it('returns 12 monthly rows for year 1', () => {
    const enriched = {
      property_name: 'Test',
      city: 'Austin',
      state: 'TX',
      unit_mix: [
        { type: 'Cabin', count: 10 },
        { type: 'Safari Tent', count: 5 },
      ],
      market_type: 'glamping',
    } as EnrichedInput;
    const assumptions = proposeAssumptions(enriched);
    const out = runFeasibilityModel(
      {
        propertyName: 'Test',
        city: 'Austin',
        state: 'TX',
        unitMix: enriched.unit_mix,
        hardCostOverride: 2_000_000,
      },
      assumptions
    );
    expect(out.monthlyProForma).toHaveLength(12);
    expect(out.rates).toHaveLength(2);
    expect(out.occupancy).toHaveLength(2);
    const sumRev = out.monthlyProForma.reduce((s, m) => s + m.totalRevenue, 0);
    expect(sumRev).toBeGreaterThan(0);
    // Monthly allocation should roughly match Y1 annual (within rounding)
    expect(Math.abs(sumRev - out.proForma[0].totalRevenue)).toBeLessThan(20);
  });
});
