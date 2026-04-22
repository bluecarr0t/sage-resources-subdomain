/**
 * @jest-environment node
 *
 * Builder tests cover the assembly path end-to-end against the local rv +
 * glamping templates that ship with the repo. We mock the Supabase server
 * client so the builder always falls back to the local template file (no
 * network) and unit-test that:
 *
 *   - The output is a valid OOXML zip (contains word/document.xml)
 *   - The body is replaced with our style-guide-conformant XML (Calibri,
 *     1.15 line spacing, justified, bold headings, #E2EFDA table-header
 *     fill)
 *   - Sanitisation is applied (en/em dashes, tildes stripped)
 *   - Tables enforce header == row column counts
 *   - rv vs glamping template selection works
 */

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    storage: {
      from: () => ({
        download: async () => ({ data: null, error: { message: 'mock: skip' } }),
      }),
    },
  }),
}));

import PizZip from 'pizzip';
import {
  assembleFeasibilitySectionDocx,
  feasibilitySectionFilename,
  TABLE_HEADER_FILL_HEX,
  clearFeasibilitySectionTemplateCache,
} from '@/lib/sage-ai/feasibility-docx-builder';
import {
  FEASIBILITY_DOCX_SCHEMA_VERSION,
  type FeasibilityDocxPayload,
} from '@/lib/sage-ai/feasibility-docx-payload';

function readDocXml(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('document.xml missing from generated .docx');
  return docFile.asText();
}

function makePayload(
  overrides: Partial<FeasibilityDocxPayload> = {}
): FeasibilityDocxPayload {
  return {
    type: 'feasibility_section',
    schema_version: FEASIBILITY_DOCX_SCHEMA_VERSION,
    title: 'Executive Summary',
    blocks: [
      { kind: 'heading', text: '1. Project Overview', level: 2 },
      {
        kind: 'paragraph',
        name: 'Site',
        text: 'Located in Hill Country with strong demand drivers.',
      },
      {
        kind: 'numbered_list',
        items: [
          {
            name: 'Daily Rate',
            description: 'Average $185 across the comp set.',
          },
          {
            name: 'Occupancy',
            description: 'Trailing 12-month occupancy of 78%.',
          },
        ],
      },
      {
        kind: 'table',
        caption: 'Comparable Properties',
        headers: ['Property', 'ADR', 'Occupancy'],
        rows: [
          ['Property A', '$210', '82%'],
          ['Property B', '$195', '74%'],
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  clearFeasibilitySectionTemplateCache();
});

describe('assembleFeasibilitySectionDocx', () => {
  it('produces a valid OOXML zip with the expected style markers', async () => {
    const payload = makePayload();
    const buffer = await assembleFeasibilitySectionDocx(payload, {
      marketType: 'rv',
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(1000);

    const xml = readDocXml(buffer);

    // Body uses Calibri (font name appears in run properties)
    expect(xml).toMatch(/w:rFonts[^/>]*w:ascii="Calibri"/);

    // 1.15 line spacing => 276 twentieths of a point
    expect(xml).toMatch(/w:line="276"/);

    // Body justified
    expect(xml).toMatch(/<w:jc w:val="both"\/>/);

    // Section title and heading rendered as bold runs
    expect(xml).toContain('Executive Summary');
    expect(xml).toContain('1. Project Overview');

    // Bold lead-in for paragraph: "Site - " must be in a bold run
    expect(xml).toMatch(/<w:b\/>[\s\S]*?Site -/);

    // Numbered list items render with bold name + description
    expect(xml).toContain('1.');
    expect(xml).toContain('Daily Rate');
    expect(xml).toContain('Average $185 across the comp set.');

    // Table caption + header fill (#E2EFDA per style guide)
    expect(xml).toContain('Comparable Properties');
    expect(xml).toContain(`w:fill="${TABLE_HEADER_FILL_HEX}"`);
    expect(xml).toContain('Property');
    expect(xml).toContain('ADR');
    expect(xml).toContain('Occupancy');

    // Table body cells preserved
    expect(xml).toContain('Property A');
    expect(xml).toContain('$210');
  });

  it('strips ~ and en/em dashes defensively in the rendered body', async () => {
    const payload = makePayload({
      title: 'Site Analysis',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Approximately ~47 acres along the Austin\u2013Round Rock corridor\u2014ideal.',
        },
      ],
    });
    const buffer = await assembleFeasibilitySectionDocx(payload);
    const xml = readDocXml(buffer);
    expect(xml).not.toContain('~');
    expect(xml).not.toContain('\u2013');
    expect(xml).not.toContain('\u2014');
    expect(xml).toContain('Approximately 47 acres');
    expect(xml).toContain('Austin-Round Rock corridor-ideal.');
  });

  it('selects the glamping template when market_type=glamping', async () => {
    const payload = makePayload();
    const rvBuffer = await assembleFeasibilitySectionDocx(payload, {
      marketType: 'rv',
    });
    const glampingBuffer = await assembleFeasibilitySectionDocx(payload, {
      marketType: 'glamping',
    });
    // Both must be valid zips with a body
    expect(readDocXml(rvBuffer)).toContain('<w:body');
    expect(readDocXml(glampingBuffer)).toContain('<w:body');
    // The RV and Glamping templates have different sectPr / styles, so the
    // raw bytes must differ even though our injected body is identical.
    expect(Buffer.compare(rvBuffer, glampingBuffer)).not.toBe(0);
  });

  it('preserves the original sectPr from the chosen template', async () => {
    const payload = makePayload();
    const buffer = await assembleFeasibilitySectionDocx(payload, {
      marketType: 'rv',
    });
    const xml = readDocXml(buffer);
    expect(xml).toMatch(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
  });

  it('escapes XML-special characters inside text runs', async () => {
    const payload = makePayload({
      blocks: [
        {
          kind: 'paragraph',
          text: 'Risk: cost overruns & delays > 10% may occur.',
        },
      ],
    });
    const buffer = await assembleFeasibilitySectionDocx(payload);
    const xml = readDocXml(buffer);
    expect(xml).toContain('cost overruns &amp; delays &gt; 10% may occur.');
    expect(xml).not.toContain('cost overruns & delays > 10%');
  });
});

describe('feasibilitySectionFilename', () => {
  it('uses the explicit filename_hint when provided', () => {
    expect(
      feasibilitySectionFilename({
        type: 'feasibility_section',
        schema_version: FEASIBILITY_DOCX_SCHEMA_VERSION,
        title: 'Executive Summary',
        filename_hint: 'austin-glamping-exec-summary',
        blocks: [{ kind: 'paragraph', text: 'x' }],
      })
    ).toBe('austin-glamping-exec-summary.docx');
  });

  it('falls back to a slug of the title', () => {
    expect(
      feasibilitySectionFilename({
        type: 'feasibility_section',
        schema_version: FEASIBILITY_DOCX_SCHEMA_VERSION,
        title: 'SWOT Analysis',
        blocks: [{ kind: 'paragraph', text: 'x' }],
      })
    ).toBe('swot-analysis.docx');
  });
});
