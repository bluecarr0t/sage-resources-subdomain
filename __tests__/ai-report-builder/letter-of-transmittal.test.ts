/**
 * Letter of Transmittal structure vs Sage template (IRR box, bold conclusion).
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import {
  assembleDraftDocx,
  clearTemplateCache,
} from '@/lib/ai-report-builder/assemble-docx';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';
import type { FeasibilityModelOutput } from '@/lib/feasibility-model';

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    storage: {
      from: () => ({
        download: async () => ({ data: null, error: { message: 'use local template' } }),
      }),
    },
  }),
}));

function minimalModel(irr: number): FeasibilityModelOutput {
  return {
    costs: {
      siteDev: 0,
      unitCosts: 0,
      addBldg: 0,
      hardCosts: 0,
      softCosts: 0,
      contingency: 0,
      ffe: 0,
      preOpening: 0,
      land: 0,
      totalDevelopmentCost: 1_000_000,
    },
    reTaxes: { assessedValue: 0, annualTax: 0 },
    rates: [],
    occupancy: [],
    proForma: [],
    monthlyProForma: [],
    financing: {
      totalDevelopmentCost: 1_000_000,
      loanAmount: 750_000,
      equityAmount: 250_000,
      annualDebtService: 80_000,
      monthlyPayment: 6_667,
      mortgageConstant: 0.1,
      dcrByYear: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9],
      cashOnCashByYear: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5],
      paybackYears: 5,
    },
    irr: {
      equityIrr10Year: irr,
      terminalValue: 0,
      year10EquityCashFlow: 0,
    },
  };
}

describe('Letter of Transmittal template parity', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    it.skip('glamping template missing', () => undefined);
    return;
  }

  beforeEach(() => clearTemplateCache());

  it('includes bold conclusion, IRR box, and Peninsula identity', async () => {
    const input: EnrichedInput = {
      property_name: 'Nordic Wellness Glamping & Christmas Tree Farm',
      city: 'Peninsula',
      state: 'OH',
      zip_code: '44264',
      address_1: '6050 Riverview Rd',
      acres: 40,
      parcel_number: '1100539',
      market_type: 'glamping',
      study_id: '26-999A-01',
      client_contact_name: 'David Baiko',
      client_entity: 'Heritage Farms',
      client_address: '123 Main St',
      client_city_state_zip: 'Akron, OH 44301',
      amenities_description: 'Wellness glamping spa and event space; power and septic',
      unit_mix: [{ type: 'Safari Tent', count: 10 }],
    };

    const { buffer, diagnostics } = await assembleDraftDocx(
      input,
      {
        executive_summary:
          '=== Project Overview ===\nOverview.\n\n=== Demand Indicators ===\nDemand positive.\n\n=== Feasibility Conclusion ===\nFeasible.',
        model_output: minimalModel(0.305),
      },
      { marketType: 'glamping' }
    );

    expect(diagnostics.sectionHits.letter_of_transmittal).toMatch(/replaced|inserted/);

    const xml = new PizZip(buffer.toString('binary')).file('word/document.xml')!.asText();
    const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
    let inLot = false;
    const lines: Array<{ plain: string; bold: boolean; bordered: boolean }> = [];
    for (const p of paras) {
      const plain = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
        .map((x) => x[1])
        .join('')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      const isH1 = /w:pStyle\s+w:val="Heading1"/.test(p);
      if (isH1 && plain.includes('Letter of Transmittal') && !/<w:hyperlink\b/.test(p)) {
        inLot = true;
        continue;
      }
      if (inLot && isH1) break;
      if (inLot && plain) {
        lines.push({
          plain,
          bold: /<w:b[\s/>]/.test(p),
          bordered: /<w:pBdr>/.test(p),
        });
      }
    }

    const body = lines.map((l) => l.plain).join('\n');
    const salutation = lines.find((l) => /Baiko/.test(l.plain) && /:$/.test(l.plain));
    expect(salutation?.plain).toBe('Mr. Baiko:');
    expect(salutation?.plain).not.toContain('Mr./Ms.');
    // Certain gender → no cyan on salutation
    expect(/w:val="cyan"/i.test(
      [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)]
        .map((m) => m[0])
        .find((p) => /Mr\. Baiko:/.test(p)) || ''
    )).toBe(false);
    expect(body).toContain('Glamping Feasibility Study');
    expect(body).toContain('Peninsula, OH 44264');
    expect(body).not.toContain('Peninsula, OH, 44264');
    expect(body).toContain('is currently undeveloped');
    expect(body).toMatch(/Wellness glamping spa and event space will also be constructed/);
    expect(body).toContain('10 Year IRR on Equity = 30.5%');
    expect(body).not.toContain('Amir Peleg');
    expect(body).not.toContain('TVA Road');
    expect(body).not.toMatch(/LINK Excel/i);

    const conclusion = lines.find((l) => /scope of this hypothetical development/i.test(l.plain));
    expect(conclusion?.bold).toBe(true);

    const irr = lines.find((l) => /10 Year IRR on Equity/i.test(l.plain));
    expect(irr?.bordered).toBe(true);
  }, 90_000);
});
