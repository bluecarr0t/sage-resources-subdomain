import { runReportQaGates } from '@/lib/ai-report-builder/qa-gates';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';
import type { FeasibilityAssumptions, FeasibilityModelOutput } from '@/lib/feasibility-model';

function stubModel(): FeasibilityModelOutput {
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
    assumptionsUsed: {} as FeasibilityAssumptions,
  };
}

describe('runReportQaGates', () => {
  const enriched = {
    property_name: 'Test Resort',
    city: 'Peninsula',
    state: 'OH',
    unit_mix: [],
  } as EnrichedInput;

  it('passes in draft mode with STDB waiver', () => {
    const qa = runReportQaGates({
      enriched,
      model: stubModel(),
      assumptionsDraftMode: true,
      stdbWaived: true,
      placeholderCount: 0,
    });
    expect(qa.passed).toBe(true);
    expect(qa.analystTasks.some((t) => /unit mix/i.test(t))).toBe(true);
    expect(qa.analystTasks.some((t) => /TOUR-01/.test(t))).toBe(true);
    expect(qa.analystTasks.some((t) => /state tourism figures/i.test(t))).toBe(true);
  });

  it('flags leftover TN tourism fingerprints for non-TN subjects', () => {
    const qa = runReportQaGates({
      enriched,
      model: stubModel(),
      assumptionsDraftMode: true,
      stdbWaived: true,
      placeholderCount: 0,
      docxTextSample: 'SOURCE: 2022 TN DEPARTMENT OF TOURIST DEVELOPMENT',
    });
    expect(qa.passed).toBe(false);
    expect(qa.flags.some((f) => /tourism_fingerprint/i.test(f))).toBe(true);
  });

  it('flags missing STDB without waiver', () => {
    const qa = runReportQaGates({
      enriched,
      model: stubModel(),
      assumptionsDraftMode: true,
      stdbWaived: false,
      stdbImported: false,
    });
    expect(qa.passed).toBe(false);
    expect(qa.flags.some((f) => /stdb/i.test(f))).toBe(true);
  });

  it('flags empty unit mix in non-draft mode', () => {
    const qa = runReportQaGates({
      enriched,
      model: stubModel(),
      assumptionsDraftMode: false,
      stdbWaived: true,
      placeholderCount: 0,
    });
    expect(qa.passed).toBe(false);
    expect(qa.flags.some((f) => /unit_mix/i.test(f))).toBe(true);
  });

  it('flags leftover sample fingerprints', () => {
    const qa = runReportQaGates({
      enriched,
      model: stubModel(),
      assumptionsDraftMode: true,
      stdbWaived: true,
      placeholderCount: 0,
      sampleFingerprintsRemaining: ['Jasper', 'Nickajack'],
      docxTextSample: 'Peninsula OH Nordic Wellness',
    });
    expect(qa.passed).toBe(false);
    expect(qa.flags.some((f) => /sample_fingerprint/i.test(f))).toBe(true);
  });
});
