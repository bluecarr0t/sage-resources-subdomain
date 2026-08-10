/**
 * Phase 0 template hygiene for RV and glamping DOCX templates.
 * - Ensures {letter_of_transmittal} and {comparables_analysis} placeholders
 * - Blanks stale financial / Area / Supply remnant sections
 *
 * Run: npx tsx scripts/phase0-fix-templates.ts
 * Then: npx tsx scripts/upload-report-templates.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const PLACEHOLDER_NOTE =
  '[Draft placeholder — content will be generated for this project. Prior-project remnant text has been removed.]';

interface SectionSpec {
  heading: string;
  next: string[];
  placeholder: string;
  /** Prefer heading that appears after this text (avoids TOC matches) */
  afterHint?: string;
}

const SECTIONS: SectionSpec[] = [
  {
    heading: 'Letter of Transmittal',
    next: ['Certification', 'Scope of Work', 'Executive Summary'],
    placeholder: '{letter_of_transmittal}',
  },
  {
    heading: 'Comparables',
    next: ['Rate Projection', 'Occupancy Projection', 'Occupancy', 'Revenue Projection'],
    placeholder: '{comparables_analysis}',
    afterHint: 'Supply and Competition',
  },
  {
    heading: 'Area Analysis',
    next: ['Demand Indicators', 'Site Analysis', 'Industry Overview', 'Supply and Competition'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: 'Industry Overview',
  },
  {
    heading: 'Supply and Competition Analysis',
    next: ['Comparables', 'Rate Projection', 'Revenue Projection'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: 'Demand Indicators',
  },
  {
    heading: 'Rate Projection',
    next: ['Occupancy Projection', 'Occupancy', 'Revenue Projection'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: 'Comparables',
  },
  {
    heading: 'Occupancy Projection',
    next: ['Revenue Projection', 'Operating Expenses', '10 Year Pro Forma'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: 'Rate Projection',
  },
  {
    heading: 'Revenue Projection',
    next: ['Operating Expenses', '10 Year Pro Forma', 'Feasibility Conclusion'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: 'Occupancy',
  },
  {
    heading: 'Operating Expenses',
    next: ['10 Year Pro Forma', 'Feasibility Conclusion', 'Assumptions and Limiting Conditions'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: 'Revenue Projection',
  },
  {
    heading: '10 Year Pro Forma',
    next: ['Feasibility Conclusion', 'Assumptions and Limiting Conditions'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: 'Operating Expenses',
  },
  {
    heading: 'Feasibility Conclusion',
    next: ['Assumptions and Limiting Conditions', 'Qualifications', 'Addenda'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: '10 Year Pro Forma',
  },
];

/** Extract concatenated text from a paragraph XML fragment */
function paraText(paraXml: string): string {
  const texts: string[] = [];
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(paraXml)) !== null) texts.push(m[1]);
  return texts.join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function headingMatches(text: string, heading: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t === heading) return true;
  if (t.toUpperCase() === heading.toUpperCase()) return true;
  // Heading may include soft hyphens / field codes noise — startswith check
  if (t.startsWith(heading) && t.length < heading.length + 12) return true;
  return false;
}

function splitParagraphs(xml: string): { start: number; end: number; xml: string }[] {
  const parts: { start: number; end: number; xml: string }[] = [];
  const re = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    parts.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
  }
  return parts;
}

function makePlaceholderPara(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
}

function blankSection(xml: string, spec: SectionSpec): { xml: string; changed: boolean; detail: string } {
  const paras = splitParagraphs(xml);
  if (paras.length === 0) return { xml, changed: false, detail: 'no paragraphs' };

  let searchFrom = 0;
  if (spec.afterHint) {
    for (let i = 0; i < paras.length; i++) {
      if (paraText(paras[i].xml).includes(spec.afterHint)) {
        searchFrom = i + 1;
        break;
      }
    }
  }

  let headingIdx = -1;
  for (let i = searchFrom; i < paras.length; i++) {
    if (headingMatches(paraText(paras[i].xml), spec.heading)) {
      headingIdx = i;
      break;
    }
  }
  if (headingIdx < 0) {
    // Fallback whole-doc search
    for (let i = 0; i < paras.length; i++) {
      if (headingMatches(paraText(paras[i].xml), spec.heading)) {
        headingIdx = i;
        break;
      }
    }
  }
  if (headingIdx < 0) return { xml, changed: false, detail: `heading not found: ${spec.heading}` };

  // Already placeholder-only?
  const firstContent = headingIdx + 1 < paras.length ? paraText(paras[headingIdx + 1].xml) : '';
  if (firstContent.includes(spec.placeholder) || firstContent.includes('{letter_of_transmittal}') || firstContent.includes('{comparables_analysis}')) {
    // Still blank any extra content after the placeholder until next section
  }

  let endIdx = paras.length;
  for (let i = headingIdx + 1; i < paras.length; i++) {
    const t = paraText(paras[i].xml).trim();
    if (spec.next.some((n) => headingMatches(t, n))) {
      endIdx = i;
      break;
    }
    // Section break often ends content
    if (paras[i].xml.includes('<w:sectPr')) {
      endIdx = i;
      break;
    }
  }

  const contentStart = paras[headingIdx].end;
  const contentEnd = endIdx < paras.length ? paras[endIdx].start : paras[paras.length - 1].end;

  // Check tables between heading and next heading — remove them too (already in range if only paras counted)
  // Expand contentEnd to include any <w:tbl> that sit before the next heading paragraph
  let cutEnd = contentEnd;
  if (endIdx < paras.length) {
    cutEnd = paras[endIdx].start;
  } else {
    cutEnd = paras[paras.length - 1].end;
  }

  const between = xml.slice(paras[headingIdx].end, cutEnd);
  // If already only our placeholder, skip
  const betweenText = between.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (
    (betweenText === spec.placeholder || betweenText.startsWith(spec.placeholder.slice(0, 40))) &&
    betweenText.length < spec.placeholder.length + 20
  ) {
    return { xml, changed: false, detail: `already blank: ${spec.heading}` };
  }

  const replacement = makePlaceholderPara(spec.placeholder);
  const newXml = xml.slice(0, paras[headingIdx].end) + replacement + xml.slice(cutEnd);
  return { xml: newXml, changed: true, detail: `blanked ${spec.heading}` };
}

function processTemplate(templateKey: string): void {
  const templatePath = path.join(process.cwd(), 'templates', templateKey, 'template.docx');
  if (!fs.existsSync(templatePath)) {
    console.log(`SKIP missing: ${templatePath}`);
    return;
  }

  console.log(`\n=== ${templateKey} ===`);
  const backupPath = `${templatePath}.phase0.bak`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(templatePath, backupPath);
    console.log(`Backup: ${backupPath}`);
  }

  const buf = fs.readFileSync(templatePath);
  const zip = new PizZip(buf);
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('word/document.xml missing');

  let xml = file.asText();
  const details: string[] = [];

  for (const spec of SECTIONS) {
    const result = blankSection(xml, spec);
    xml = result.xml;
    details.push(result.detail + (result.changed ? ' ✓' : ''));
  }

  // Occupancy (without Projection) for some RV templates
  const occ = blankSection(xml, {
    heading: 'Occupancy',
    next: ['Revenue Projection', 'Operating Expenses', 'Projected Occupancy'],
    placeholder: PLACEHOLDER_NOTE,
    afterHint: 'Rate Projection',
  });
  xml = occ.xml;
  details.push(occ.detail + (occ.changed ? ' ✓' : ''));

  if (!xml.includes('{data_sources_appendix}')) {
    xml = xml.replace('</w:body>', `${makePlaceholderPara('{data_sources_appendix}')}</w:body>`);
    details.push('added {data_sources_appendix} ✓');
  }

  zip.file('word/document.xml', xml);
  const out = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  fs.writeFileSync(templatePath, out);

  console.log(`Applied:`);
  for (const d of details) console.log(`  - ${d}`);
  console.log(`Wrote ${templatePath} (${(out.length / 1024 / 1024).toFixed(1)} MB)`);
}

const keys = process.argv.slice(2);
const targets = keys.length > 0 ? keys : ['rv', 'glamping'];
for (const key of targets) processTemplate(key);
console.log('\nNext: npx tsx scripts/upload-report-templates.ts');
