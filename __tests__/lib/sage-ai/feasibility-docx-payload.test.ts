/**
 * @jest-environment node
 */
import {
  FEASIBILITY_DOCX_SCHEMA_VERSION,
  feasibilityDocxPayloadSchema,
  isFeasibilityDocxPayload,
  sanitizeFeasibilityText,
  slugifyFeasibilityFilename,
  type FeasibilityDocxPayload,
} from '@/lib/sage-ai/feasibility-docx-payload';

describe('sanitizeFeasibilityText', () => {
  it('strips the ~ approximate character', () => {
    expect(sanitizeFeasibilityText('approximately ~47 acres')).toBe(
      'approximately 47 acres'
    );
  });

  it('replaces en/em dashes with the standard short hyphen', () => {
    expect(sanitizeFeasibilityText('Austin\u2013Round Rock')).toBe(
      'Austin-Round Rock'
    );
    expect(sanitizeFeasibilityText('Phase 1\u2014Site Plan')).toBe(
      'Phase 1-Site Plan'
    );
  });

  it('collapses non-breaking and exotic spaces to a regular space', () => {
    expect(sanitizeFeasibilityText('Sage\u00A0Outdoor\u2009Advisory')).toBe(
      'Sage Outdoor Advisory'
    );
  });

  it('leaves regular hyphens, parens, and percentages untouched', () => {
    expect(sanitizeFeasibilityText('ADR (87%) - strong')).toBe(
      'ADR (87%) - strong'
    );
  });
});

describe('slugifyFeasibilityFilename', () => {
  it('lowercases and dasherizes whitespace', () => {
    expect(slugifyFeasibilityFilename('Executive Summary')).toBe(
      'executive-summary'
    );
  });

  it('strips punctuation and collapses repeated dashes', () => {
    expect(slugifyFeasibilityFilename('SWOT: Strengths/Weaknesses!!')).toBe(
      'swot-strengthsweaknesses'
    );
  });

  it('falls back to "feasibility-section" for empty/all-symbol input', () => {
    expect(slugifyFeasibilityFilename('')).toBe('feasibility-section');
    expect(slugifyFeasibilityFilename('!!!')).toBe('feasibility-section');
  });

  it('caps stem length at 80 characters', () => {
    const long = 'a'.repeat(200);
    expect(slugifyFeasibilityFilename(long).length).toBe(80);
  });
});

describe('feasibilityDocxPayloadSchema', () => {
  const baseBlocks = [
    { kind: 'heading' as const, text: 'Project Overview', level: 2 as const },
    { kind: 'paragraph' as const, text: 'Body text.' },
  ];

  it('accepts a minimal valid payload', () => {
    const payload: FeasibilityDocxPayload = {
      type: 'feasibility_section',
      schema_version: FEASIBILITY_DOCX_SCHEMA_VERSION,
      title: 'Executive Summary',
      blocks: baseBlocks,
    };
    expect(feasibilityDocxPayloadSchema.parse(payload)).toMatchObject({
      type: 'feasibility_section',
      title: 'Executive Summary',
    });
  });

  it('rejects unknown block kinds', () => {
    const result = feasibilityDocxPayloadSchema.safeParse({
      type: 'feasibility_section',
      schema_version: FEASIBILITY_DOCX_SCHEMA_VERSION,
      title: 'X',
      blocks: [{ kind: 'image', url: 'http://example.com/x.png' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects table rows with mismatched column counts', () => {
    const result = feasibilityDocxPayloadSchema.safeParse({
      type: 'feasibility_section',
      schema_version: FEASIBILITY_DOCX_SCHEMA_VERSION,
      title: 'Comparables',
      blocks: [
        {
          kind: 'table',
          headers: ['Property', 'ADR', 'Occupancy'],
          rows: [
            ['Property A', '$200', '78%'],
            ['Property B', '$210'],
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes('cells but headers has 3')
        )
      ).toBe(true);
    }
  });

  it('rejects payloads with the wrong schema_version', () => {
    const result = feasibilityDocxPayloadSchema.safeParse({
      type: 'feasibility_section',
      schema_version: 99,
      title: 'X',
      blocks: baseBlocks,
    });
    expect(result.success).toBe(false);
  });

  it('rejects payloads with no blocks', () => {
    const result = feasibilityDocxPayloadSchema.safeParse({
      type: 'feasibility_section',
      schema_version: FEASIBILITY_DOCX_SCHEMA_VERSION,
      title: 'X',
      blocks: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('isFeasibilityDocxPayload', () => {
  it('returns true for a valid payload object', () => {
    expect(
      isFeasibilityDocxPayload({
        type: 'feasibility_section',
        schema_version: FEASIBILITY_DOCX_SCHEMA_VERSION,
        title: 'X',
        blocks: [{ kind: 'paragraph', text: 'a' }],
      })
    ).toBe(true);
  });

  it('returns false for unrelated tool outputs', () => {
    expect(isFeasibilityDocxPayload(null)).toBe(false);
    expect(isFeasibilityDocxPayload({ type: 'dashboard' })).toBe(false);
    expect(
      isFeasibilityDocxPayload({
        type: 'feasibility_section',
        schema_version: 99,
      })
    ).toBe(false);
  });
});
