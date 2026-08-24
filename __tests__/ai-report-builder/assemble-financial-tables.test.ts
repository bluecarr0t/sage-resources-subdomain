/**
 * Native financial tables replace stale template workbook OLE bodies.
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import {
  assembleDraftDocx,
  clearTemplateCache,
} from '@/lib/ai-report-builder/assemble-docx';
import type { FeasibilityAssumptions, FeasibilityModelOutput } from '@/lib/feasibility-model';

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    storage: {
      from: () => ({
        download: async () => ({ data: null, error: { message: 'use local template' } }),
      }),
    },
  }),
}));

function fixtureModel(): FeasibilityModelOutput {
  return {
    costs: {
      siteDev: 400_000,
      unitCosts: 600_000,
      addBldg: 0,
      hardCosts: 1_000_000,
      softCosts: 150_000,
      contingency: 50_000,
      ffe: 40_000,
      preOpening: 20_000,
      land: 200_000,
      totalDevelopmentCost: 1_460_000,
    },
    reTaxes: { assessedValue: 0, annualTax: 12_000 },
    rates: [
      {
        unitType: 'Cabin',
        quantity: 10,
        lowAdr: 180,
        peakAdr: 320,
        year1WeightedAdr: 250,
      },
    ],
    occupancy: [
      {
        unitType: 'Cabin',
        lowOccupancy: 0.4,
        peakOccupancy: 0.75,
        stabilizedWeighted: 0.58,
        ramp: [0.6, 0.75, 0.9, 0.975, 1],
      },
    ],
    proForma: [
      {
        year: 1,
        lodgingRevenue: 500_000,
        miscRevenue: 20_000,
        totalRevenue: 520_000,
        expenses: 210_000,
        propertyTaxes: 12_000,
        noi: 298_000,
        expenseRatio: 0.4,
        occupancyWeighted: 0.58,
        adrWeighted: 250,
      },
    ],
    monthlyProForma: [],
    financing: {
      totalDevelopmentCost: 1_460_000,
      loanAmount: 1_095_000,
      equityAmount: 365_000,
      annualDebtService: 110_000,
      monthlyPayment: 9_167,
      mortgageConstant: 0.1,
      dcrByYear: [1.1, 1.2, 1.3, 1.4, 1.5],
      cashOnCashByYear: [0.08, 0.09, 0.1, 0.11, 0.12],
      paybackYears: 8,
    },
    irr: { equityIrr10Year: 0.182, terminalValue: 0, year10EquityCashFlow: 0 },
    assumptionsUsed: {} as FeasibilityAssumptions,
  };
}

describe('assembleDraftDocx native financial tables', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    it.skip('glamping template missing', () => undefined);
    return;
  }

  beforeEach(() => clearTemplateCache());

  it('injects model figures under Rate/PF headings and drops the sample workbook name', async () => {
    const { buffer, diagnostics } = await assembleDraftDocx(
      {
        property_name: 'Test Resort',
        city: 'Peninsula',
        state: 'OH',
        address_1: '1 Main St',
        zip_code: '44264',
        acres: 10,
        parcel_number: '1',
        market_type: 'glamping',
        unit_mix: [{ type: 'Cabin', count: 5 }],
        client_contact_name: 'Pat Example',
        client_entity: 'Example LLC',
      },
      {
        executive_summary:
          '=== Project Overview ===\nOverview.\n\n=== Demand Indicators ===\nDemand positive.\n\n=== Feasibility Conclusion ===\nFeasible.',
        model_output: fixtureModel(),
      },
      { marketType: 'glamping', companionWorkbookFileName: 'template.xlsx' }
    );

    expect(diagnostics.sectionHits.financial_model).toBe('replaced');

    const zip = new PizZip(buffer.toString('binary'));
    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).toMatch(/deterministic feasibility model/i);
    expect(xml).toMatch(/10-Year Equity IRR/i);

    const headingIdx = xml.search(/w:val="Heading1"[\s\S]{0,800}Rate Projection/);
    expect(headingIdx).toBeGreaterThan(-1);
    const following = xml.slice(headingIdx, headingIdx + 16_000);
    expect(following).toMatch(/deterministic feasibility model/i);
    expect(following).not.toMatch(/GLAMPING FS TEMPLATE/i);
  }, 90_000);
});
