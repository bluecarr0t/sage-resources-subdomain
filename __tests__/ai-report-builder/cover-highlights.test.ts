/**
 * Cyan author-mark policy: clear highlight only when text was updated / affirmed.
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

function coverLines(xml: string): Array<{ plain: string; cyan: boolean }> {
  const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
  const lines: Array<{ plain: string; cyan: boolean }> = [];
  for (const p of paras) {
    const plain = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
      .map((x) => x[1])
      .join('')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    if (!plain) continue;
    if (/^Table of Contents$/i.test(plain)) break;
    if (/Letter of Transmittal/i.test(plain) && /Heading1/.test(p)) break;
    lines.push({ plain, cyan: /w:val="cyan"/i.test(p) });
  }
  return lines;
}

describe('selective cyan highlight clearing', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    it.skip('glamping template missing', () => undefined);
    return;
  }

  beforeEach(() => clearTemplateCache());

  it('clears cyan on updated cover fields but keeps co-author marks', async () => {
    const input: EnrichedInput = {
      property_name: 'Nordic Wellness Glamping',
      city: 'Peninsula',
      state: 'OH',
      zip_code: '44264',
      address_1: '6050 Riverview Rd',
      acres: 40,
      parcel_number: '1100539',
      market_type: 'glamping',
      service: 'Feasibility Study',
      unit_mix: [{ type: 'Safari Tent', count: 10 }],
      client_contact_name: 'David Baiko',
      client_entity: 'Heritage Farms',
    };

    const { buffer } = await assembleDraftDocx(
      input,
      {
        executive_summary:
          '=== Project Overview ===\nOverview.\n\n=== Demand Indicators ===\nDemand positive.\n\n=== Feasibility Conclusion ===\nFeasible.',
      },
      { marketType: 'glamping' }
    );

    const xml = new PizZip(buffer.toString('binary')).file('word/document.xml')!.asText();
    const cover = coverLines(xml);

    const byPlain = (re: RegExp) => cover.find((l) => re.test(l.plain));

    const addr = byPlain(/6050 Riverview Rd/);
    expect(addr).toBeTruthy();
    expect(addr!.cyan).toBe(false);

    const city = byPlain(/Peninsula,\s*OH/);
    expect(city).toBeTruthy();
    expect(city!.cyan).toBe(false);

    const parcel = byPlain(/Parcel Number 1100539/);
    expect(parcel).toBeTruthy();
    expect(parcel!.cyan).toBe(false);

    const study = byPlain(/^Feasibility Study$/i);
    expect(study).toBeTruthy();
    expect(study!.cyan).toBe(false);

    expect(cover.some((l) => /If no exact address/i.test(l.plain))).toBe(false);

    // Unresolved co-author marks stay highlighted for author review
    const kristin = byPlain(/Kristin Andersen Garwood/);
    expect(kristin).toBeTruthy();
    expect(kristin!.cyan).toBe(true);

    const elizabeth = byPlain(/Elizabeth Reid/);
    expect(elizabeth).toBeTruthy();
    expect(elizabeth!.cyan).toBe(true);

    // Sample remnant must be gone
    expect(cover.some((l) => /144 009/.test(l.plain))).toBe(false);
    expect(cover.some((l) => /TVA Road/i.test(l.plain))).toBe(false);
  }, 90_000);
});
