/**
 * Front-matter (cover / LoT / certification) + cyan author-mark stripping.
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import {
  assembleDraftDocx,
  clearTemplateCache,
} from '@/lib/ai-report-builder/assemble-docx';
import {
  buildCertificationContent,
  buildCostAssumptionBullet,
  buildLetterOfTransmittalText,
} from '@/lib/ai-report-builder/front-matter';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    storage: {
      from: () => ({
        download: async () => ({ data: null, error: { message: 'use local template' } }),
      }),
    },
  }),
}));

function extractPlain(xmlFrag: string): string {
  return [...xmlFrag.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join('')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

describe('front-matter builders', () => {
  it('builds LoT with intake identity and cost branch', () => {
    const text = buildLetterOfTransmittalText({
      property_name: 'Nordic Wellness',
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
      amenities_description: 'Safari tents with septic and power; undeveloped site',
      unit_mix: [{ type: 'Safari Tent', count: 10 }],
      client_provided_cost_info: true,
    });

    expect(text).toContain('David Baiko');
    expect(text).toContain('Heritage Farms');
    expect(text).toContain('123 Main St');
    expect(text).toContain('Nordic Wellness');
    expect(text).toContain('6050 Riverview Rd');
    expect(text).toContain('26-999A-01');
    expect(text).toContain('approximately 40 acres');
    expect(text).toContain('10 sites');
    expect(text).toContain('proposed glamping resort');
    expect(text).toContain('Glamping Feasibility Study');
    expect(text).toContain('is currently undeveloped');
    expect(text).toContain('10 Year IRR on Equity');
    expect(text).toContain('ownership provided limited cost information');
    expect(text).not.toContain('Amir Peleg');
    expect(text).not.toContain('TVA Road');
    expect(text).not.toMatch(/property currently undeveloped/);
  });

  it('uses amenity clause (not infrastructure notes) in LoT assumption', () => {
    const text = buildLetterOfTransmittalText({
      property_name: 'Nordic Wellness',
      city: 'Peninsula',
      state: 'OH',
      market_type: 'glamping',
      amenities_description: 'Wellness glamping spa and event space; power and septic',
      unit_mix: [{ type: 'Tent', count: 5 }],
    });
    expect(text).toMatch(/assumed that Wellness glamping spa and event space will also be constructed/);
    expect(text).not.toMatch(/assumed that .*power and septic will also be constructed/);
  });

  it('uses Marshall/Swift-only cost bullet by default', () => {
    expect(
      buildCostAssumptionBullet({
        property_name: 'X',
        city: 'Y',
        state: 'OH',
        unit_mix: [],
      })
    ).toMatch(/Marshall and Swift Cost Manual/);
    expect(
      buildCostAssumptionBullet({
        property_name: 'X',
        city: 'Y',
        state: 'OH',
        unit_mix: [],
      })
    ).not.toMatch(/ownership provided limited/);
  });

  it('resolves site visit have / have not', () => {
    const noVisit = buildCertificationContent({
      property_name: 'X',
      city: 'Y',
      state: 'OH',
      unit_mix: [],
    });
    expect(noVisit.bullets.some((b) => b.includes('I have not made a personal visit'))).toBe(
      true
    );

    const visited = buildCertificationContent({
      property_name: 'X',
      city: 'Y',
      state: 'OH',
      unit_mix: [],
      site_visit_conducted: true,
    });
    expect(visited.bullets.some((b) => /^I have made a personal visit/.test(b))).toBe(true);
  });
});

describe('assembleDraftDocx front-matter + cyan strip', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    it.skip('glamping template missing', () => undefined);
    return;
  }

  beforeEach(() => clearTemplateCache());

  it('updates teal fields and strips cyan highlights', async () => {
    const input: EnrichedInput = {
      property_name: 'Nordic Wellness Glamping',
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
      amenities_description: 'Wellness glamping; power and septic on site',
      unit_mix: [{ type: 'Safari Tent', count: 10 }],
      site_visit_conducted: false,
    };

    const { buffer, diagnostics } = await assembleDraftDocx(
      input,
      {
        executive_summary:
          '=== Project Overview ===\nOverview for Peninsula.\n\n=== Demand Indicators ===\nDemand is positive.\n\n=== Feasibility Conclusion ===\nFeasible with adequate returns.',
      },
      { marketType: 'glamping' }
    );

    expect(diagnostics.sectionHits.letter_of_transmittal).toMatch(/replaced|inserted/);
    expect(diagnostics.sectionHits.certification).toBe('replaced');
    expect(diagnostics.sectionHits.scope_of_work).toBe('replaced');

    const zip = new PizZip(buffer.toString('binary'));
    const xml = zip.file('word/document.xml')!.asText();

    expect(xml).not.toMatch(/If no exact address/i);
    expect(xml).not.toContain('Amir Peleg');
    expect(xml).not.toContain('TVA Road');
    expect(xml).not.toContain('have or have not');

    // Updated cover fields clear cyan; unresolved co-author marks keep it
    const coverParas: Array<{ plain: string; cyan: boolean }> = [];
    for (const m of xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
      const p = m[0];
      const plain = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
        .map((x) => x[1])
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (!plain) continue;
      if (/^Table of Contents$/i.test(plain)) break;
      coverParas.push({ plain, cyan: /w:val="cyan"/i.test(p) });
    }
    expect(coverParas.find((l) => /6050 Riverview Rd/.test(l.plain))?.cyan).toBe(false);
    expect(coverParas.find((l) => /Parcel Number 1100539/.test(l.plain))?.cyan).toBe(false);
    expect(coverParas.find((l) => /Kristin Andersen Garwood/.test(l.plain))?.cyan).toBe(true);

    const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
    let inLot = false;
    let inCert = false;
    const lot: string[] = [];
    const cert: string[] = [];
    for (const p of paras) {
      const plain = extractPlain(p);
      const isH1 = /w:pStyle\s+w:val="Heading1"/.test(p);
      if (isH1 && plain.includes('Letter of Transmittal') && !/<w:hyperlink\b/.test(p)) {
        inLot = true;
        inCert = false;
        continue;
      }
      if (isH1 && plain.includes('Certification') && !/<w:hyperlink\b/.test(p)) {
        inLot = false;
        inCert = true;
        continue;
      }
      if (isH1 && (plain.includes('Scope of Work') || plain.includes('Executive Summary'))) {
        inLot = false;
        inCert = false;
      }
      if (inLot && plain) lot.push(plain);
      if (inCert && plain) cert.push(plain);
    }

    const lotBody = lot.join('\n');
    expect(lotBody).toContain('David Baiko');
    expect(lotBody).toContain('Heritage Farms');
    expect(lotBody).toContain('Nordic Wellness Glamping');
    expect(lotBody).toContain('26-999A-01');
    expect(lotBody).toContain('approximately 40 acres');

    const certBody = cert.join('\n');
    expect(certBody).toContain('I have not made a personal visit');
    expect(certBody).toContain('Kristin Andersen Garwood and Elizabeth Reid');
  }, 90_000);
});
