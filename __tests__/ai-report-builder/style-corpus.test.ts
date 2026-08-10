import {
  redactStyleCorpusText,
  hasForeignGeographyFingerprint,
} from '@/lib/ai-report-builder/style-corpus-redact';
import {
  extractStyleSectionsFromRaw,
  isHoldoutStudyId,
} from '@/lib/ai-report-builder/style-corpus-extract';
import { DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS } from '@/lib/ai-report-builder/style-corpus-types';

describe('style-corpus-redact', () => {
  it('redacts PII names and numeric claims', () => {
    const raw = `
The subject property for Acme Glamping LLC is a proposed 47 acre resort with 32 safari tents.
ADR of $245 and occupancy of 68% support an IRR of 14.2%.
Dear Jane Smith, Principal of Acme Glamping LLC.
Total development cost of $4,200,000 is concluded to be feasible.
Population of 125,000 residents within 60 minutes is a positive demand indicator.
Contact jane.smith@example.com or (615) 555-1212.
`.trim();

    const result = redactStyleCorpusText(raw, {
      clientEntity: 'Acme Glamping LLC',
      contactName: 'Jane Smith',
      propertyName: null,
    });

    expect(result.dropped).toBe(false);
    expect(result.redactedText).toContain('{{CLIENT}}');
    expect(result.redactedText).toMatch(/\{\{ADR\}\}|\{\{USD\}\}/);
    expect(result.redactedText).toMatch(/\{\{OCC\}\}|\{\{PCT\}\}/);
    expect(result.redactedText).toContain('{{IRR}}');
    expect(result.redactedText).toContain('{{TDC}}');
    expect(result.redactedText).toContain('{{EMAIL}}');
    expect(result.redactedText).toContain('{{PHONE}}');
    expect(result.redactedText).not.toContain('Acme Glamping LLC');
    expect(result.redactedText).not.toContain('jane.smith@example.com');
  });

  it('drops foreign geography sections', () => {
    expect(hasForeignGeographyFingerprint('Located near Toronto, Ontario')).toBe(true);
    const result = redactStyleCorpusText(
      'This Ontario market near Toronto shows strong demand for glamping with ample visitation from Montreal.',
      {}
    );
    expect(result.dropped).toBe(true);
    expect(result.dropReason).toBe('foreign_geography');
  });
});

describe('style-corpus-extract', () => {
  it('maps headings to canonical sections', () => {
    const sections = extractStyleSectionsFromRaw({
      fullText: '',
      sections: [
        {
          heading: '1. Executive Summary',
          headingLevel: 1,
          content:
            'The property is intended for a luxury RV resort development on approximately forty acres with pull thru sites and full hookups. Overall demand indicators are positive.',
          paragraphs: [],
        },
        {
          heading: 'Letter of Transmittal',
          headingLevel: 1,
          content:
            'We are pleased to submit this feasibility study for the subject property. The analysis concludes the project merits further investment consideration by ownership.',
          paragraphs: [],
        },
        {
          heading: 'SWOT Analysis',
          headingLevel: 2,
          content:
            'Strengths include scenic views and highway access. Weaknesses include limited utilities. Opportunities include tourism growth. Threats include new competitive supply.',
          paragraphs: [],
        },
      ],
    });

    const keys = sections.map((s) => s.section).sort();
    expect(keys).toEqual(['executive_summary', 'letter_of_transmittal', 'swot'].sort());
  });

  it('flags holdout study ids', () => {
    expect(isHoldoutStudyId('26-107A-01 Spencer TN', DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS)).toBe(
      true
    );
    expect(isHoldoutStudyId('24-050 Somewhere Else', DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS)).toBe(
      false
    );
  });
});
