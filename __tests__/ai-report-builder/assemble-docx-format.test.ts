/**
 * Unit tests for DOCX style cloning and SWOT/body parsing helpers.
 */

import {
  bodyTextToStyledParagraphsXml,
  extractParagraphStyleTemplate,
  FALLBACK_PARAGRAPH_STYLE,
  isLayoutChromeParagraph,
  isLetterheadParagraph,
  isSignatureParagraph,
  matchSwotBucketKey,
  parseSwotBuckets,
  splitBodyIntoChunks,
  stripMarkdownEmphasis,
  withBoldRunProps,
} from '@/lib/ai-report-builder/assemble-docx-format';

describe('stripMarkdownEmphasis', () => {
  it('strips bold and heading markers', () => {
    expect(stripMarkdownEmphasis('**Strengths**\n### Overview')).toBe('Strengths\nOverview');
  });
});

describe('extractParagraphStyleTemplate', () => {
  it('clones pPr and first-run rPr', () => {
    const para =
      '<w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:after="120"/></w:pPr>' +
      '<w:r><w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="22"/><w:highlight w:val="yellow"/></w:rPr>' +
      '<w:t>Hello</w:t></w:r></w:p>';
    const style = extractParagraphStyleTemplate(para);
    expect(style.pPr).toContain('w:spacing');
    expect(style.rPr).toContain('Calibri');
    expect(style.rPr).not.toContain('highlight');
  });
});

describe('bodyTextToStyledParagraphsXml', () => {
  it('emits cloned rPr on each line', () => {
    const xml = bodyTextToStyledParagraphsXml('Line one\nLine two', FALLBACK_PARAGRAPH_STYLE);
    expect(xml).toContain('<w:rPr>');
    expect(xml).toContain('Calibri');
    expect(xml.match(/<w:p>/g)?.length).toBe(2);
    expect(xml).not.toContain('**');
  });
});

describe('layout chrome / letterhead / signature', () => {
  it('detects sectPr and page breaks', () => {
    expect(isLayoutChromeParagraph('<w:p><w:pPr><w:sectPr><w:pgSz/></w:sectPr></w:pPr></w:p>')).toBe(
      true
    );
    expect(isLayoutChromeParagraph('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')).toBe(true);
    expect(isLayoutChromeParagraph('<w:p><w:r><w:t>body</w:t></w:r></w:p>')).toBe(false);
  });

  it('detects right-aligned letterhead', () => {
    expect(
      isLetterheadParagraph(
        '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>5113 South Harper</w:t></w:r></w:p>',
        '5113 South Harper'
      )
    ).toBe(true);
  });

  it('detects signature cues', () => {
    expect(isSignatureParagraph('', 'Sincerely,')).toBe(true);
    expect(isSignatureParagraph('', 'Shari Harsell, MAI')).toBe(true);
  });
});

describe('parseSwotBuckets', () => {
  it('splits labeled SWOT without markdown', () => {
    const buckets = parseSwotBuckets(
      'Strengths:\n- Great location\n\nWeaknesses, Threats, and Risk Factors:\n- Cost risk\n'
    );
    expect(buckets.strengths).toContain('Great location');
    expect(buckets.weaknesses).toContain('Cost risk');
  });

  it('maps Heading2 titles to bucket keys', () => {
    expect(matchSwotBucketKey('Strengths')).toBe('strengths');
    expect(matchSwotBucketKey('Weaknesses, Threats, and Risk Factors')).toBe('weaknesses');
  });
});

describe('splitBodyIntoChunks', () => {
  it('maps leftover groups into the last chunk', () => {
    const chunks = splitBodyIntoChunks('A\n\nB\n\nC\n\nD', 2);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe('A');
    expect(chunks[1]).toContain('B');
    expect(chunks[1]).toContain('D');
  });
});

describe('withBoldRunProps', () => {
  it('injects bold into existing rPr', () => {
    expect(withBoldRunProps('<w:rPr><w:sz w:val="22"/></w:rPr>')).toContain('<w:b/>');
  });
});
