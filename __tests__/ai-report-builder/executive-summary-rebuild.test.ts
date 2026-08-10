/**
 * Executive Summary rebuild clears OLE remnant and injects labeled sections.
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import {
  assembleDraftDocx,
  clearTemplateCache,
} from '@/lib/ai-report-builder/assemble-docx';
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

function extractPlain(xml: string): string {
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractExecBodyLines(xml: string): string[] {
  const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
  let inExec = false;
  const lines: string[] = [];
  for (const p of paras) {
    const plain = extractPlain(p);
    const isH1 = /w:pStyle\s+w:val="Heading1"/.test(p);
    if (isH1 && plain.includes('Executive Summary') && !/<w:hyperlink\b/.test(p)) {
      inExec = true;
      continue;
    }
    if (inExec) {
      if (isH1) break;
      if (plain.trim()) lines.push(plain);
    }
  }
  return lines;
}

function extractExecBodyXml(xml: string): string {
  const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
  let inExec = false;
  const chunks: string[] = [];
  for (const p of paras) {
    const plain = extractPlain(p);
    const isH1 = /w:pStyle\s+w:val="Heading1"/.test(p);
    if (isH1 && plain.includes('Executive Summary') && !/<w:hyperlink\b/.test(p)) {
      inExec = true;
      continue;
    }
    if (inExec) {
      if (isH1) break;
      chunks.push(p);
    }
  }
  return chunks.join('');
}

describe('rebuildExecutiveSummarySection', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'rv', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    it.skip('rv template missing', () => undefined);
    return;
  }

  beforeEach(() => {
    clearTemplateCache();
  });

  it('replaces remnant OLE acres/sites with generated Executive Summary content', async () => {
    const input: EnrichedInput = {
      property_name: 'Bitterroot Test Resort',
      city: 'Victor',
      state: 'MT',
      zip_code: '59875',
      address_1: '123 Highway 93',
      acres: 52,
      unit_mix: [{ type: 'RV Site', count: 80 }],
      market_type: 'rv',
      demand_drivers: {
        national_parks: {
          count: 2,
          top_names: ['Glacier National Park', 'Yellowstone'],
          items: [
            {
              name: 'Glacier National Park',
              state: 'MT',
              distance_miles: 180,
              visitors: 3_136_557,
            },
            {
              name: 'Yellowstone',
              state: 'WY',
              distance_miles: 230,
              visitors: 4_762_988,
            },
          ],
          radius_miles: 250,
        },
        ski_resorts: { count: 0, top_names: [], items: [], radius_miles: 100 },
        wineries: { count: 0, top_names: [], items: [], radius_miles: 100 },
        major_outdoor_sites: {
          count: 0,
          top_names: [],
          items: [],
          radius_miles: 150,
        },
        major_cities: { count: 0, top_names: [], items: [], radius_miles: 150 },
        source: 'test',
        fetched_at: '2026-01-01T00:00:00Z',
      },
    };

    const executive_summary = `=== Project Overview ===
The property is intended for a luxury RV resort development. The overall subject site contains approximately 52 acres. There will be 80 RV sites.

=== Demand Indicators ===
Overall, the demand indicators for the subject are positive for the Victor, Montana market.

=== Pro Forma Reference ===
The ten-year income and expense projection is as follows:

=== Feasibility Conclusion ===
Feasibility conclusion pending financial model confirmation by the analyst.`;

    const { buffer, diagnostics } = await assembleDraftDocx(
      input,
      { executive_summary },
      { marketType: 'rv' }
    );

    expect(diagnostics.sectionHits.executive_summary).toBe('replaced');

    const zip = new PizZip(buffer.toString('binary'));
    const xml = zip.file('word/document.xml')!.asText();
    const plain = extractExecBodyLines(xml).join(' ');

    expect(plain).toContain('52 acres');
    expect(plain).toContain('80 RV sites');
    expect(plain).toContain('Project Overview:');
    expect(plain).toContain('Overall Demand Indicators:');
    // Remnant template OLE acres/sites bullets must be gone from overview prose
    expect(plain).not.toContain('37.0 acres');
    expect(plain).not.toContain('5 RV sites');
    expect(plain).not.toContain('3 one-bedroom cabins');
  }, 60_000);

  it('preserves linked Excel 10-yr PF tables and adds cyan update notes', async () => {
    const glampingTemplate = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
    if (!fs.existsSync(glampingTemplate)) return;

    const input: EnrichedInput = {
      property_name: 'Peninsula Glamping',
      city: 'Peninsula',
      state: 'OH',
      zip_code: '44264',
      address_1: '123 Riverview Rd',
      acres: 47,
      unit_mix: [{ type: 'Safari Tent', count: 51 }],
      market_type: 'glamping',
      amenities_description: 'event area with a bar; undeveloped land',
    };

    const { buffer, diagnostics } = await assembleDraftDocx(
      input,
      {
        executive_summary: `=== Project Overview ===
Overview.

=== Demand Indicators ===
Positive.

=== Feasibility Conclusion ===
Feasible.`,
      },
      { marketType: 'glamping', companionWorkbookFileName: 'template.xlsx' }
    );

    expect(diagnostics.sectionHits.executive_summary).toBe('replaced');

    const zip = new PizZip(buffer.toString('binary'));
    const xml = zip.file('word/document.xml')!.asText();
    const plain = extractExecBodyLines(xml).join(' ');

    expect(plain).toContain('47 acres');
    expect(plain).toContain('51 glamping sites');
    // Linked Excel preserved (not replaced with native model tables)
    expect(xml).toMatch(/LINK\s+Excel|ProgID="Excel\.Sheet/i);
    expect(xml).toMatch(/template\.xlsx!10 yr PF!/i);
    expect(xml).toContain('[Author update required] Linked Excel table');
    expect(xml).toContain('w:highlight w:val="cyan"');
    expect(plain).not.toMatch(/deterministic feasibility model/i);
  }, 60_000);

  it('rebuilds from intake when LLM executive summary is a stub', async () => {
    const glampingTemplate = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
    if (!fs.existsSync(glampingTemplate)) {
      return;
    }

    const input: EnrichedInput = {
      property_name: 'Peninsula Glamping',
      city: 'Peninsula',
      state: 'OH',
      zip_code: '44264',
      address_1: '123 Riverview Rd',
      acres: 47,
      unit_mix: [{ type: 'Safari Tent', count: 51 }],
      market_type: 'glamping',
      amenities_description:
        'event area with a bar; self-checkout coffee shop; undeveloped land',
    };

    const { buffer, diagnostics } = await assembleDraftDocx(
      input,
      {
        executive_summary: `=== Project Overview ===
Overview.

=== Demand Indicators ===
Positive.

=== Feasibility Conclusion ===
Feasible.`,
      },
      { marketType: 'glamping', companionWorkbookFileName: 'template.xlsx' }
    );

    expect(diagnostics.sectionHits.executive_summary).toBe('replaced');

    const zip = new PizZip(buffer.toString('binary'));
    const xml = zip.file('word/document.xml')!.asText();
    const plain = extractExecBodyLines(xml).join(' ');
    const bodyXml = extractExecBodyXml(xml);

    expect(plain).toContain('47 acres');
    expect(plain).toContain('51 glamping sites');
    expect(plain).toMatch(/Planned amenities include/i);
    expect(plain).not.toMatch(/\bOverview\.\b/);
    expect(plain).toMatch(/are positive for the subject('|\&apos;)s proposed offering/);
    expect(bodyXml).toContain('w:highlight w:val="cyan"');
    expect(xml).toMatch(/LINK\s+Excel|ProgID="Excel\.Sheet/i);
  }, 60_000);
});
