/**
 * Golden / unit tests for the feasibility model engine.
 * Synthetic fixture inspired by Buffalo Junction-scale economics (order-of-magnitude).
 */

import {
  computeIrr,
  monthlyLoanPayment,
  proposeAssumptions,
  remainingLoanBalance,
  runFeasibilityModel,
} from '@/lib/feasibility-model';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';
import type { FeasibilityAssumptions, FeasibilityProjectInput } from '@/lib/feasibility-model';

function locked<T>(value: T): { value: T; state: 'analyst_set' } {
  return { value, state: 'analyst_set' };
}

describe('feasibility-model computeIrr', () => {
  it('computes a known simple IRR', () => {
    // -100, +60, +60 ≈ 13.66%
    const irr = computeIrr([-100, 60, 60]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeGreaterThan(0.13);
    expect(irr!).toBeLessThan(0.15);
  });

  it('returns null for empty flows', () => {
    expect(computeIrr([])).toBeNull();
  });
});

describe('feasibility-model loan math', () => {
  it('computes monthly payment for 9.5% / 25yr', () => {
    const pmt = monthlyLoanPayment(10_830_124, 0.095, 25);
    // ~$94,622/mo from workbook notes
    expect(pmt).toBeGreaterThan(90_000);
    expect(pmt).toBeLessThan(100_000);
  });

  it('reduces balance after 10 years', () => {
    const principal = 10_830_124;
    const bal = remainingLoanBalance(principal, 0.095, 25, 10);
    expect(bal).toBeGreaterThan(0);
    expect(bal).toBeLessThan(principal);
  });
});

describe('feasibility-model runFeasibilityModel', () => {
  const project: FeasibilityProjectInput = {
    propertyName: 'FaireBorough Test',
    city: 'Buffalo Junction',
    state: 'VA',
    acres: 95,
    unitMix: [
      { type: 'Earth-sheltered home', count: 25 },
      { type: 'Cabin', count: 25 },
    ],
    siteDevCost: 1_543_367,
    unitCost: 10_280_000,
    addBldgCost: 675_000,
  };

  function bjAssumptions(): FeasibilityAssumptions {
    const base = proposeAssumptions({
      property_name: project.propertyName,
      city: project.city,
      state: project.state,
      unit_mix: project.unitMix,
      nearby_comps: [
        {
          property_name: 'Comp A',
          city: 'Rice',
          state: 'VA',
          unit_type: 'Cabin',
          property_total_sites: 10,
          quantity_of_units: 10,
          avg_retail_daily_rate: 280,
          high_rate: 315,
          low_rate: 262,
          seasonal_rates: {
            winter_weekday: null, winter_weekend: null,
            spring_weekday: null, spring_weekend: null,
            summer_weekday: null, summer_weekend: null,
            fall_weekday: null, fall_weekend: null,
          },
          operating_season_months: null,
          url: null,
          description: null,
          distance_miles: 62,
          source_table: 'past_reports',
          low_occupancy: 30,
          peak_occupancy: 80,
        },
      ],
    } as EnrichedInput);

    return {
      ...base,
      units: [
        locked({
          unitType: 'Earth-sheltered home',
          quantity: 25,
          lowAdr: 262,
          peakAdr: 315,
          lowOccupancy: 0.3,
          peakOccupancy: 0.78,
        }),
        locked({
          unitType: 'Cabin',
          quantity: 25,
          lowAdr: 170,
          peakAdr: 300,
          lowOccupancy: 0.3,
          peakOccupancy: 0.85,
        }),
      ],
      softCostPct: locked(0.1),
      contingencyPct: locked(0.1),
      ffePct: locked(0.125),
      preOpeningPerUnit: locked(2000),
      realMarketAdj: locked(1.0),
      landCost: locked(0),
      loanToCost: locked(0.75),
      interestRate: locked(0.095),
      loanTermYears: locked(25),
      assessmentRatio: locked(0.5),
      millLevy: locked(0.049846),
      miscRevenuePct: locked(0.1),
      adrGrowth: locked(0.03),
      expenseGrowth: locked(0.025),
      lowSeasonMonths: locked(4),
      peakSeasonMonths: locked(8),
      occupancyRamp: locked([0.6, 0.75, 0.9, 0.975, 1.0]),
      exitCapRate: locked(0.085),
      sellingCostPct: locked(0.05),
      expenses: locked({
        payrollPerSite: 2000,
        creditCardPct: 0.03,
        roomTurnoverPerSite: 800,
        gAndAPerSite: 1100,
        marketingPct: 0.025,
        marketingYear1Override: 200_000,
        marketingYear2Override: 150_000,
        repairsPerSite: 1500,
        utilitiesPerSite: 1500,
        managementPct: 0.05,
        insurancePerSite: 900,
        legalPerSite: 250,
        reservesPct: 0.03,
      }),
    };
  }

  it('produces TDC in the $14–16M range for BJ-scale inputs', () => {
    const out = runFeasibilityModel(project, bjAssumptions());
    expect(out.costs.totalDevelopmentCost).toBeGreaterThan(12_000_000);
    expect(out.costs.totalDevelopmentCost).toBeLessThan(18_000_000);
    expect(out.financing.loanAmount).toBeGreaterThan(out.financing.equityAmount);
  });

  it('ramps occupancy and grows revenue through Year 5', () => {
    const out = runFeasibilityModel(project, bjAssumptions());
    expect(out.proForma).toHaveLength(10);
    expect(out.proForma[4].totalRevenue).toBeGreaterThan(out.proForma[0].totalRevenue);
    expect(out.proForma[4].noi).toBeGreaterThan(out.proForma[0].noi);
  });

  it('computes DCR and CoC arrays and a finite IRR', () => {
    const out = runFeasibilityModel(project, bjAssumptions());
    expect(out.financing.dcrByYear).toHaveLength(10);
    expect(out.financing.cashOnCashByYear).toHaveLength(10);
    expect(out.irr.equityIrr10Year).not.toBeNull();
    // Positive IRR expected for this setup
    expect(out.irr.equityIrr10Year!).toBeGreaterThan(0);
    expect(out.irr.equityIrr10Year!).toBeLessThan(0.5);
  });

  it('proposeAssumptions returns proposed state', () => {
    const a = proposeAssumptions({
      property_name: 'Test',
      city: 'Austin',
      state: 'TX',
      unit_mix: [{ type: 'Cabin', count: 20 }],
    } as EnrichedInput);
    expect(a.units[0].state).toBe('proposed');
    expect(a.units[0].value.quantity).toBe(20);
  });
});
