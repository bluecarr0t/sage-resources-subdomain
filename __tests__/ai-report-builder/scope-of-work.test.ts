/**
 * Scope of Work content builder + DOCX rebuild.
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import {
  assembleDraftDocx,
  clearTemplateCache,
} from '@/lib/ai-report-builder/assemble-docx';
import {
  buildClientProvidedItems,
  buildScopeOfWorkContent,
  buildScopeOfWorkSteps,
} from '@/lib/ai-report-builder/scope-of-work';
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
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('buildScopeOfWorkContent', () => {
  it('uses glamping product language and intake-backed client items', () => {
    const content = buildScopeOfWorkContent({
      property_name: 'Nordic Wellness',
      city: 'Peninsula',
      state: 'OH',
      address_1: '6050 Riverview Rd',
      acres: 40,
      parcel_number: '12-345',
      market_type: 'glamping',
      amenities_description: 'Safari tents, heated pool, septic and power on site',
      unit_mix: [{ type: 'Safari Tent', count: 12 }],
    });

    expect(content.steps.some((s) => s.includes('planned glamping resort'))).toBe(true);
    expect(content.steps.some((s) => /planned RV resort/i.test(s))).toBe(false);

    const client = buildClientProvidedItems({
      property_name: 'Nordic Wellness',
      city: 'Peninsula',
      state: 'OH',
      address_1: '6050 Riverview Rd',
      acres: 40,
      parcel_number: '12-345',
      unit_mix: [{ type: 'Safari Tent', count: 12 }],
      amenities_description: 'Safari tents with septic and power',
    });
    expect(client).toEqual(
      expect.arrayContaining([
        'Subject property address',
        'Parcel number',
        'Lot size',
        'Planned unit mix / site counts',
        'Planned development concept and amenities',
        'Site infrastructure status (water, power, septic)',
      ])
    );
  });

  it('includes site-visit step only when conducted', () => {
    const without = buildScopeOfWorkSteps({
      property_name: 'X',
      city: 'Y',
      state: 'OH',
      unit_mix: [],
      market_type: 'glamping',
    });
    expect(without.some((s) => /Visited the subject property/i.test(s))).toBe(false);

    const withVisit = buildScopeOfWorkSteps({
      property_name: 'X',
      city: 'Y',
      state: 'OH',
      unit_mix: [{ type: 'Tent', count: 5 }],
      market_type: 'glamping',
      site_visit_conducted: true,
    });
    expect(withVisit[0]).toMatch(/Visited the subject property/);
    expect(withVisit.some((s) => /land, units, and amenities/i.test(s))).toBe(true);
  });
});

describe('rebuildScopeOfWorkSection', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    it.skip('glamping template missing', () => undefined);
    return;
  }

  beforeEach(() => clearTemplateCache());

  it('replaces remnant Scope of Work with intake-specific content', async () => {
    const input: EnrichedInput = {
      property_name: 'Nordic Wellness Glamping & Christmas Tree Farm',
      city: 'Peninsula',
      state: 'OH',
      address_1: '6050 Riverview Rd',
      acres: 40,
      parcel_number: 'AB-123',
      market_type: 'glamping',
      amenities_description: 'Wellness glamping with spa and event space; power and septic available',
      unit_mix: [{ type: 'Safari Tent', count: 10 }],
    };

    const { buffer, diagnostics } = await assembleDraftDocx(
      input,
      { executive_summary: '' },
      { marketType: 'glamping' }
    );

    expect(diagnostics.sectionHits.scope_of_work).toBe('replaced');

    const zip = new PizZip(buffer.toString('binary'));
    const xml = zip.file('word/document.xml')!.asText();
    const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
    let inSow = false;
    const lines: string[] = [];
    for (const p of paras) {
      const plain = extractPlain(p);
      const isH1 = /w:pStyle\s+w:val="Heading1"/.test(p);
      if (isH1 && plain.includes('Scope of Work') && !/<w:hyperlink\b/.test(p)) {
        inSow = true;
        continue;
      }
      if (inSow) {
        if (isH1) break;
        if (plain.trim()) lines.push(plain);
      }
    }
    const body = lines.join('\n');

    expect(body).toContain('planned glamping resort');
    expect(body).toContain('Subject property address');
    expect(body).toContain('Parcel number');
    expect(body).toContain('Lot size');
    expect(body).toContain('Site infrastructure status');
    // Remnant glamping template client list items that were not in intake
    expect(body).not.toMatch(/Vision board/i);
    expect(body).not.toMatch(/General business plan$/im);
  }, 60_000);
});
