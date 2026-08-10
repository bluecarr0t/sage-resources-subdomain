import { extractSeasonalRates } from '@/lib/ai-report-builder/tavily-comp-research';
import { runReportQaGates } from '@/lib/ai-report-builder/qa-gates';
import {
  buildAssumptionEvidence,
  markAssumptionsReviewed,
} from '@/lib/ai-report-builder/assumption-helpers';
import { proposeAssumptions } from '@/lib/feasibility-model';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';
import type { FeasibilityAssumptions, FeasibilityModelOutput } from '@/lib/feasibility-model';

function stubModel(assumptions?: FeasibilityAssumptions): FeasibilityModelOutput {
  return {
    costs: {
      siteDev: 40,
      unitCosts: 40,
      addBldg: 0,
      hardCosts: 80,
      softCosts: 10,
      contingency: 5,
      ffe: 3,
      preOpening: 2,
      land: 0,
      totalDevelopmentCost: 100,
    },
    reTaxes: { assessedValue: 0, annualTax: 0 },
    rates: [],
    occupancy: [],
    proForma: [],
    monthlyProForma: [],
    financing: {
      totalDevelopmentCost: 100,
      loanAmount: 75,
      equityAmount: 25,
      annualDebtService: 10,
      monthlyPayment: 1,
      mortgageConstant: 0.1,
      dcrByYear: [],
      cashOnCashByYear: [],
      paybackYears: null,
    },
    irr: { equityIrr10Year: 0.1, terminalValue: 0, year10EquityCashFlow: 0 },
    assumptionsUsed: assumptions ?? ({} as FeasibilityAssumptions),
  };
}

describe('extractSeasonalRates', () => {
  it('parses midweek/weekend seasonal rates from prose', () => {
    const text = `
      Summer midweek $180 weekend $240
      Winter weekday $95 weekend $120
      Holiday rate $300
    `;
    const s = extractSeasonalRates(text);
    expect(s.summer_weekday).toBe(180);
    expect(s.summer_weekend).toBe(240);
    expect(s.winter_weekday).toBe(95);
    expect(s.winter_weekend).toBe(120);
  });
});

describe('assumption helpers + ship QA', () => {
  const enriched = {
    property_name: 'Test Resort',
    city: 'Spencer',
    state: 'TN',
    address_1: '123 Main St',
    latitude: 35.7,
    longitude: -85.5,
    unit_mix: [{ type: 'RV Site', count: 40 }],
    nearby_comps: [
      {
        property_name: 'Nearby RV',
        city: 'Spencer',
        state: 'TN',
        unit_type: 'RV Site',
        property_total_sites: 50,
        quantity_of_units: null,
        avg_retail_daily_rate: 75,
        high_rate: 90,
        low_rate: 60,
        seasonal_rates: {
          winter_weekday: null,
          winter_weekend: null,
          spring_weekday: null,
          spring_weekend: null,
          summer_weekday: null,
          summer_weekend: null,
          fall_weekday: null,
          fall_weekend: null,
        },
        operating_season_months: null,
        url: null,
        description: null,
        distance_miles: 12,
        source_table: 'past_reports',
      },
    ],
    comp_radius_pivots: {
      fetched_at: new Date().toISOString(),
      buckets: [
        {
          radius_miles: 50,
          property_count: 10,
          avg_adr: 80,
          avg_occupancy: 0.45,
          sources: ['all_roverpass_data_new'],
          by_unit_type: [
            { unit_type: 'RV Site', property_count: 8, avg_adr: 75, avg_occupancy: 0.4 },
          ],
        },
      ],
    },
  } as EnrichedInput;

  it('builds evidence and locks assumptions for ship mode', () => {
    const proposed = proposeAssumptions(enriched);
    const evidence = buildAssumptionEvidence(enriched);
    expect(evidence.pastReportCompCount).toBe(1);
    expect(evidence.ratesSource).toMatch(/past-report|pivot/i);

    const locked = markAssumptionsReviewed(proposed, 'locked');
    expect(locked.units.every((u) => u.state === 'locked')).toBe(true);
    expect(locked.realMarketAdj.state).toBe('locked');

    const qa = runReportQaGates({
      enriched,
      model: stubModel(locked),
      assumptionsDraftMode: false,
      stdbWaived: true,
      placeholderCount: 0,
      citationCount: 5,
      docxTextSample: 'Spencer TN Test Resort',
    });
    expect(qa.passed).toBe(true);
  });

  it('blocks ship when assumptions remain proposed', () => {
    const proposed = proposeAssumptions(enriched);
    const qa = runReportQaGates({
      enriched,
      model: stubModel(proposed),
      assumptionsDraftMode: false,
      stdbWaived: true,
      placeholderCount: 0,
      citationCount: 5,
      docxTextSample: 'Spencer TN Test Resort',
    });
    expect(qa.passed).toBe(false);
    expect(qa.flags.some((f) => /assumption_lock/i.test(f))).toBe(true);
  });
});
