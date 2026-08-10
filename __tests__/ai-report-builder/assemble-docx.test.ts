/**
 * Unit tests for DOCX assembly and template key resolution.
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import {
  findTopLevelParagraphs,
  getTemplateKeyForMarketType,
  replaceLetterOfTransmittalBody,
  replaceProseUnderSubheads,
  replaceSectionProseByHeading,
  replaceTemplateImagesSelectively,
} from '@/lib/ai-report-builder/assemble-docx';

describe('getTemplateKeyForMarketType', () => {
  it('returns rv for null/undefined', () => {
    expect(getTemplateKeyForMarketType(null)).toBe('rv');
    expect(getTemplateKeyForMarketType(undefined)).toBe('rv');
  });

  it('returns glamping for glamping', () => {
    expect(getTemplateKeyForMarketType('glamping')).toBe('glamping');
    expect(getTemplateKeyForMarketType('Glamping')).toBe('glamping');
  });

  it('returns rv for rv and rv_glamping', () => {
    expect(getTemplateKeyForMarketType('rv')).toBe('rv');
    expect(getTemplateKeyForMarketType('rv_glamping')).toBe('rv');
  });

  it('returns rv for unknown market types', () => {
    expect(getTemplateKeyForMarketType('other')).toBe('rv');
    expect(getTemplateKeyForMarketType('')).toBe('rv');
  });
});

describe('findTopLevelParagraphs', () => {
  it('does not split on nested paragraphs inside text boxes', () => {
    const xml =
      '<w:body>' +
      '<w:p><w:r><w:drawing><w:txbxContent>' +
      '<w:p><w:r><w:t>inner A</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>inner B</w:t></w:r></w:p>' +
      '</w:txbxContent></w:drawing></w:r></w:p>' +
      '<w:p><w:r><w:t>after</w:t></w:r></w:p>' +
      '</w:body>';

    const paras = findTopLevelParagraphs(xml);
    expect(paras).toHaveLength(2);
    expect(paras[0].text).toContain('w:txbxContent');
    expect(paras[0].text).toContain('inner A');
    expect(paras[0].text).toContain('inner B');
    expect(paras[1].text).toContain('after');
  });

  it('covers the naive-regex Word corruption case', () => {
    const xml =
      '<w:p><w:r><w:drawing><w:txbxContent>' +
      '<w:p><w:r><w:t>inner</w:t></w:r></w:p>' +
      '</w:txbxContent></w:drawing></w:r></w:p>';
    const naive = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];
    // First match stops at nested </w:p>, leaving orphaned close tags — the Word bug.
    expect(naive[0]).not.toContain('</w:txbxContent>');
    expect(findTopLevelParagraphs(xml)[0].text).toContain('</w:txbxContent>');
  });
});

describe('glamping template document.xml', () => {
  it('has balanced top-level paragraphs through text boxes', () => {
    const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
    if (!fs.existsSync(templatePath)) return;

    const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));
    const xml = zip.file('word/document.xml')?.asText();
    expect(xml).toBeTruthy();

    const paras = findTopLevelParagraphs(xml!);
    expect(paras.length).toBeGreaterThan(10);
    const withTextBox = paras.filter((p) => p.text.includes('w:txbxContent'));
    for (const p of withTextBox) {
      expect(p.text).toMatch(/<\/w:txbxContent>/);
    }
  });

  it('stays well-formed after selective image placeholder replacement', () => {
    const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
    if (!fs.existsSync(templatePath)) return;

    const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));
    replaceTemplateImagesSelectively(zip);
    const xml = zip.file('word/document.xml')!.asText();

    // Tag-stack check catches the prior Word-open failure mode (orphaned </w:txbxContent>).
    const body = xml.includes('\n') ? xml.split('\n').slice(1).join('\n') : xml;
    const tagRe = /<(\/?)([\w:.-]+)([^>]*?)(\/?)>/g;
    const stack: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(body))) {
      const raw = m[0];
      if (raw.startsWith('<?') || raw.startsWith('<!')) continue;
      if (raw.endsWith('/>')) continue;
      if (m[1] === '/') {
        expect(stack[stack.length - 1]).toBe(m[2]);
        stack.pop();
      } else {
        stack.push(m[2]);
      }
    }
    expect(stack).toEqual([]);
    expect(xml).not.toMatch(/\[Image placeholder[^\]]+\]<\/w:t><\/w:r><\/w:p><\/w:txbxContent>/);
  });
});

describe('assembleDraftDocx formatting parity', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');

  function countMatches(xml: string, re: RegExp): number {
    return (xml.match(re) ?? []).length;
  }

  function countHeading2InSection(xml: string, section: string, nextSections: string[]): number {
    const paras = findTopLevelParagraphs(xml);
    let start = -1;
    for (const p of paras) {
      if (!/<w:pStyle\s+w:val="Heading1"/.test(p.text)) continue;
      const plain = (p.text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [])
        .map((t) => t.replace(/<[^>]+>/g, ''))
        .join('');
      if (plain.toLowerCase().includes(section.toLowerCase()) && !/<w:hyperlink/.test(p.text)) {
        start = p.end;
        break;
      }
    }
    if (start < 0) return 0;
    let end = xml.length;
    for (const p of paras) {
      if (p.start <= start) continue;
      if (!/<w:pStyle\s+w:val="Heading1"/.test(p.text)) continue;
      const plain = (p.text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [])
        .map((t) => t.replace(/<[^>]+>/g, ''))
        .join('')
        .toLowerCase();
      if (nextSections.some((n) => plain.includes(n.toLowerCase()))) {
        end = p.start;
        break;
      }
    }
    return countMatches(xml.slice(start, end), /<w:pStyle\s+w:val="Heading2"/g);
  }

  it('preserves letterhead, rPr, Heading2 skeletons, and sectPr on local template', () => {
    if (!fs.existsSync(templatePath)) return;

    const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));
    const templateXml = zip.file('word/document.xml')!.asText();
    const templateSectPr = countMatches(templateXml, /<w:sectPr[\s>]/g);
    const templateSwotH2 = countHeading2InSection(templateXml, 'SWOT Analysis', [
      'Project Overview',
      'Site Analysis',
    ]);
    const templateAreaH2 = countHeading2InSection(templateXml, 'Area Analysis', [
      'Demand Indicators',
      'Industry Overview',
    ]);
    const templateDemandH2 = countHeading2InSection(templateXml, 'Demand Indicators', [
      'Site Analysis',
      'Development Costs',
    ]);

    const chrome = { skipped: 0 };

    replaceLetterOfTransmittalBody(
      zip,
      'Dear David,\n\nWe are pleased to submit this feasibility study for Nordic Wellness Glamping.\n\nPlease contact us with any questions.',
      chrome
    );
    replaceSectionProseByHeading(
      zip,
      'Executive Summary',
      ['SWOT Analysis', 'Project Overview'],
      'Executive summary prose for formatting test.',
      chrome
    );
    replaceProseUnderSubheads(
      zip,
      'SWOT Analysis',
      ['Project Overview', 'Site Analysis'],
      'Strengths:\n- Strong regional demand.\n\nWeaknesses, Threats, and Risk Factors:\n- Cost variability.',
      chrome,
      'swot'
    );
    replaceProseUnderSubheads(
      zip,
      'Area Analysis',
      ['Demand Indicators', 'Industry Overview'],
      'Overview paragraph.\n\nDemographics paragraph.\n\nEmployment paragraph.',
      chrome,
      'chunks'
    );
    replaceProseUnderSubheads(
      zip,
      'Demand Indicators',
      ['Site Analysis', 'Development Costs'],
      'Seasonality overview.\n\nWeather context.\n\nAdditional drivers.',
      chrome,
      'chunks'
    );

    const outXml = zip.file('word/document.xml')!.asText();

    expect(outXml).toMatch(/5113\s+South\s+Harper|Harper/i);
    expect(outXml).toContain('<w:rPr>');
    expect(outXml).not.toContain('**Strengths');
    expect(countMatches(outXml, /<w:sectPr[\s>]/g)).toBe(templateSectPr);

    expect(
      countHeading2InSection(outXml, 'SWOT Analysis', ['Project Overview', 'Site Analysis'])
    ).toBeGreaterThanOrEqual(templateSwotH2);
    expect(
      countHeading2InSection(outXml, 'Area Analysis', ['Demand Indicators', 'Industry Overview'])
    ).toBeGreaterThanOrEqual(templateAreaH2);
    expect(
      countHeading2InSection(outXml, 'Demand Indicators', ['Site Analysis', 'Development Costs'])
    ).toBeGreaterThanOrEqual(templateDemandH2);
    expect(chrome.skipped).toBeGreaterThanOrEqual(0);
  });
});
