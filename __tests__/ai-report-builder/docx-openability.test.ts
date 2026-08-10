/**
 * DOCX package hygiene: Content_Types for media + orphan bookmark cleanup.
 */

import PizZip from 'pizzip';
import {
  assembleDraftDocx,
  clearTemplateCache,
} from '@/lib/ai-report-builder/assemble-docx';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    storage: {
      from: () => ({
        download: async () => ({ data: null, error: { message: 'use local template' } }),
      }),
    },
  }),
}));

describe('DOCX Word-openability guards', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    it.skip('glamping template missing', () => undefined);
    return;
  }

  beforeEach(() => clearTemplateCache());

  it('declares jpg Content_Type and keeps bookmarks balanced', async () => {
    const { buffer } = await assembleDraftDocx(
      {
        property_name: 'Test Resort',
        city: 'Peninsula',
        state: 'OH',
        address_1: '1 Main St',
        zip_code: '44264',
        acres: 10,
        parcel_number: '1',
        market_type: 'glamping',
        unit_mix: [{ type: 'Tent', count: 5 }],
        client_contact_name: 'Pat Example',
        client_entity: 'Example LLC',
      },
      {
        executive_summary:
          '=== Project Overview ===\nOverview.\n\n=== Demand Indicators ===\nDemand positive.\n\n=== Feasibility Conclusion ===\nFeasible.',
      },
      { marketType: 'glamping' }
    );

    const zip = new PizZip(buffer.toString('binary'));
    const ct = zip.file('[Content_Types].xml')!.asText();
    // jpg and/or jpeg must be declared for any jpeg-family media
    expect(/Extension="jpe?g"/i.test(ct)).toBe(true);

    const xml = zip.file('word/document.xml')!.asText();
    const starts = [...xml.matchAll(/<w:bookmarkStart\b/g)].length;
    const ends = [...xml.matchAll(/<w:bookmarkEnd\b/g)].length;
    expect(starts).toBe(ends);

    // No media extension present without a Default
    for (const name of Object.keys(zip.files)) {
      if (!name.startsWith('word/media/') || zip.files[name].dir) continue;
      const ext = name.split('.').pop()!.toLowerCase();
      expect(ct.toLowerCase()).toContain(`extension="${ext}"`);
    }
  }, 90_000);
});
