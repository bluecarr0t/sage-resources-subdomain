/**
 * Assemble DOCX from template and generated sections.
 * Fetches templates from Supabase Storage by market type; caches in memory.
 * Preserves all template formatting, images, tables, fonts, and styles.
 */

import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import sharp from 'sharp';
import { createServerClient } from '@/lib/supabase';
import type { DevelopmentCostsData, EnrichedInput } from './types';
import type { GeneratedSections } from './types';

const BUCKET_NAME = 'report-templates';
const INCLUDE_CITATIONS_IN_DOCX =
  process.env.REPORT_BUILDER_INCLUDE_CITATIONS_IN_DOCX === 'true';

/** Map market_type to template key in storage (rv/template.docx, glamping/template.docx) */
export function getTemplateKeyForMarketType(marketType?: string | null): string {
  if (!marketType) return 'rv';
  const t = marketType.toLowerCase();
  if (t === 'glamping') return 'glamping';
  if (t === 'rv' || t === 'rv_glamping') return 'rv';
  return 'rv';
}

const templateCache = new Map<string, { content: string; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearTemplateCache() {
  templateCache.clear();
}

async function fetchTemplateFromSupabase(templateKey: string): Promise<string | null> {
  const storagePath = `${templateKey}/template.docx`;
  const supabase = createServerClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(storagePath);

  if (error || !data) {
    console.warn(`[assemble-docx] Supabase template fetch failed for ${storagePath}:`, error?.message);
    return null;
  }

  const arrayBuffer = await data.arrayBuffer();
  const binary = Buffer.from(arrayBuffer).toString('binary');
  return binary;
}

function getLocalFallbackTemplate(templateKey: string): string {
  const specificPath = path.join(process.cwd(), 'templates', templateKey, 'template.docx');
  if (fs.existsSync(specificPath)) {
    return fs.readFileSync(specificPath, 'binary');
  }
  const genericPath = path.join(process.cwd(), 'templates', 'feasibility-draft.docx');
  if (!fs.existsSync(genericPath)) {
    throw new Error(
      `Template not found at ${specificPath} or ${genericPath}. Run: npx tsx scripts/create-feasibility-draft-template.ts`
    );
  }
  return fs.readFileSync(genericPath, 'binary');
}

async function getTemplateContent(templateKey: string): Promise<string> {
  const cached = templateCache.get(templateKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.content;
  }

  const fromSupabase = await fetchTemplateFromSupabase(templateKey);
  const content = fromSupabase ?? getLocalFallbackTemplate(templateKey);
  templateCache.set(templateKey, { content, fetchedAt: Date.now() });
  return content;
}

export interface AssembleDraftDocxOptions {
  marketType?: string | null;
}

const DOCX_XML_PARTS = [
  'word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
  'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
];

/**
 * Pre-render: strip <w:highlight/> from runs containing {placeholder} tags
 * so docxtemplater-replaced values won't inherit the template's highlighting.
 */
function stripHighlightsFromPlaceholderRuns(zip: PizZip): void {
  for (const xmlPath of DOCX_XML_PARTS) {
    const file = zip.file(xmlPath);
    if (!file) continue;

    let xml = file.asText();
    xml = xml.replace(
      /(<w:r\b[^>]*>)([\s\S]*?)(<\/w:r>)/g,
      (match, open: string, inner: string, close: string) => {
        if (!/\{[a-z_]+\}/i.test(inner)) return match;
        return open + inner.replace(/<w:highlight\b[^/]*\/>/g, '') + close;
      }
    );
    zip.file(xmlPath, xml);
  }
}

/**
 * Post-render: strip cyan highlights from runs whose text matches any
 * form-filled value. Preserves highlights on static template text that
 * genuinely needs manual review (author names, TBD- prefixes, etc.).
 */
function stripHighlightsFromFormValues(zip: PizZip, formValues: Set<string>): void {
  for (const xmlPath of DOCX_XML_PARTS) {
    const file = zip.file(xmlPath);
    if (!file) continue;

    let xml = file.asText();

    xml = xml.replace(
      /(<w:r\b[^>]*>)([\s\S]*?)(<\/w:r>)/g,
      (match, open: string, inner: string, close: string) => {
        if (!/<w:highlight\b/.test(inner)) return match;

        const textMatch = inner.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        const runText = textMatch?.[1]?.trim() ?? '';
        if (!runText) return match;

        if (formValues.has(runText)) {
          return open + inner.replace(/<w:highlight\b[^/]*\/>/g, '') + close;
        }
        return match;
      }
    );

    // Also strip <w:highlight> from paragraph-mark rPr (<w:pPr><w:rPr>)
    // when the paragraph contains ONLY form-filled text (no static content)
    xml = xml.replace(
      /<w:pPr>([\s\S]*?)<\/w:pPr>/g,
      (pprMatch, pprInner: string) => {
        if (!/<w:highlight\b/.test(pprInner)) return pprMatch;
        return '<w:pPr>' + pprInner.replace(/<w:highlight\b[^/]*\/>/g, '') + '</w:pPr>';
      }
    );

    zip.file(xmlPath, xml);
  }
}

function buildComparablesAnalysis(input: EnrichedInput): string {
  const comps = input.nearby_comps;
  if (!comps?.length) return '';

  const lines: string[] = [];

  for (const c of comps) {
    const parts = [c.property_name];
    if (c.city && c.state) parts[0] += ` (${c.city}, ${c.state})`;
    else if (c.state) parts[0] += ` (${c.state})`;

    const details: string[] = [];
    if (c.distance_miles >= 0) details.push(`${c.distance_miles} miles from subject`);
    if (c.property_total_sites) details.push(`${c.property_total_sites} total sites`);
    if (c.unit_type) details.push(`Unit type: ${c.unit_type}`);
    if (c.avg_retail_daily_rate) details.push(`Avg daily rate: $${Math.round(c.avg_retail_daily_rate)}`);
    if (c.high_rate && c.low_rate) {
      details.push(`Rate range: $${Math.round(c.low_rate)}-$${Math.round(c.high_rate)}`);
    }
    if (c.low_occupancy != null && c.peak_occupancy != null) {
      details.push(`Occupancy: ${c.low_occupancy}%-${c.peak_occupancy}%`);
    }

    const sourceMap: Record<string, string> = {
      all_glamping_properties: 'Glamping DB',
      hipcamp: 'Hipcamp',
      all_roverpass_data_new: 'RoverPass',
      campspot: 'Campspot',
      past_reports: 'Past Sage Report',
      tavily_web_research: 'Web Research',
    };
    details.push(`Source: ${sourceMap[c.source_table] ?? c.source_table}`);

    lines.push(`${parts[0]}: ${details.join('. ')}.`);
  }

  return lines.join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildProjectOverviewRows(input: EnrichedInput): Array<[string, string]> {
  const location = [input.address_1, input.city, input.state, input.zip_code]
    .filter(Boolean)
    .join(', ');
  const totalSites = input.unit_mix.reduce((sum, u) => sum + (u.count || 0), 0);
  const unitMixText = input.unit_mix.length > 0
    ? input.unit_mix.map((u) => `${u.type}: ${u.count}`).join('; ')
    : 'Not specified';
  const resortType = (input.market_type || 'rv').toLowerCase() === 'glamping'
    ? 'Glamping Resort'
    : 'RV Resort';

  return [
    ['Resort Name', input.property_name || 'Not specified'],
    ['Resort Type', resortType],
    ['Resort Full Address', location || 'Not specified'],
    ['Lot Size (Acres)', input.acres != null ? String(input.acres) : 'Not specified'],
    ['Parcel Number(s)', input.parcel_number || 'Not specified'],
    ['Units / Sites', totalSites > 0 ? `${totalSites}` : 'Not specified'],
    ['Unit Mix', unitMixText],
    ['Total Units / Sites', totalSites > 0 ? `${totalSites}` : 'Not specified'],
    [
      'Additional Development, Improvements, Amenities',
      input.amenities_description || 'Not specified',
    ],
    [
      'What amenities are planned for the property / guest experience?',
      input.amenities_description || 'Not specified',
    ],
  ];
}

function buildProjectOverviewTableXml(input: EnrichedInput): string {
  const rows = buildProjectOverviewRows(input).map(([label, value]) => `
<w:tr>
  <w:tc>
    <w:tcPr><w:tcW w:w="4300" w:type="dxa"/></w:tcPr>
    <w:p><w:pPr><w:pStyle w:val="TableParagraph"/></w:pPr><w:r><w:t>${escapeXml(label)}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="4300" w:type="dxa"/></w:tcPr>
    <w:p><w:pPr><w:pStyle w:val="TableParagraph"/></w:pPr><w:r><w:t>${escapeXml(value)}</w:t></w:r></w:p>
  </w:tc>
</w:tr>`).join('');

  return `<w:tbl>
  <w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblLook w:val="04A0"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="4300"/>
    <w:gridCol w:w="4300"/>
  </w:tblGrid>
  ${rows}
</w:tbl>`;
}

/**
 * Older RV templates include a static linked Excel object for the Project Overview intake table.
 * Replace that object with a runtime table populated from current report input.
 */
function replaceLinkedProjectOverviewTable(zip: PizZip, input: EnrichedInput): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();
  const linkedExcelParaPattern =
    /<w:p>(?:(?!<\/w:p>).)*?<w:instrText[^>]*>(?:(?!<\/w:p>).)*?ToT \(Intake Form\)!R22C2:R48C3(?:(?!<\/w:p>).)*?<\/w:instrText>(?:(?!<\/w:p>).)*?<\/w:p>/s;

  if (!linkedExcelParaPattern.test(xml)) return;

  const relinkNote =
    '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>' +
    '<w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr>' +
    '<w:t>[Linked table: To re-link this table to the companion .xlsx file, right-click the table in Word, ' +
    'select "Linked Worksheet Object" &gt; "Links", then update the source to point to the downloaded .xlsx ' +
    '(ToT Intake Form sheet, rows 22-48).]</w:t></w:r></w:p>';

  const replacement = `${buildProjectOverviewTableXml(input)}${relinkNote}<w:p/>`;
  zip.file(xmlPath, xml.replace(linkedExcelParaPattern, replacement));
}

const SECTION_HEADINGS = [
  'Project Overview',
  'Industry Overview',
  'Demand Indicators',
  'Site Analysis',
  'Development Costs',
  'Comparables',
  'SWOT',
  'Pro Forma',
  'Addenda',
];

const SECTION_IMAGE_DESCRIPTIONS: Record<string, string> = {
  'Project Overview': 'project site photo or aerial view',
  'Demand Indicators': 'WeatherSpark climate/weather chart',
  'Site Analysis': 'aerial/site photo or map',
  'Development Costs': 'development cost illustration',
  'Comparables': 'comparable property photo',
  'SWOT': 'SWOT analysis visual',
  'Pro Forma': 'financial projection chart',
  'Addenda': 'appendix figure',
};

function extractParagraphPlainText(paraXml: string): string {
  return paraXml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function detectSectionHeading(paraXml: string): string | null {
  const isHeading = /<w:pStyle\s+w:val="Heading[12]"/.test(paraXml);
  if (!isHeading) return null;
  const plain = extractParagraphPlainText(paraXml);
  for (const heading of SECTION_HEADINGS) {
    if (plain.toLowerCase().includes(heading.toLowerCase())) return heading;
  }
  return null;
}

/**
 * Find the start of the actual "Project Overview" section heading paragraph,
 * not the TOC entry. The TOC lists "Project Overview" first; we need the
 * real section heading (which has Heading1/2 style in the same paragraph).
 * Skip TOC entries (usually inside hyperlinks) and find the first Heading
 * paragraph containing "Project Overview".
 */
function findProjectOverviewSectionAnchor(xml: string): number {
  const paraPattern = /<w:p\b[\s\S]*?<\/w:p>/g;
  let match;
  while ((match = paraPattern.exec(xml)) !== null) {
    const para = match[0];
    const plain = para.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!plain.toLowerCase().includes('project overview')) continue;
    if (/<w:hyperlink\b/.test(para)) continue;
    if (/<w:pStyle\s+w:val="Heading[12]"/.test(para)) {
      return match.index;
    }
  }
  return xml.indexOf('<w:t>Project Overview</w:t>');
}

/**
 * Replace template images selectively: preserve images inside the
 * "Industry Overview" section while replacing images in other sections
 * with descriptive placeholders that tell the author what to add.
 */
function replaceTemplateImagesSelectively(zip: PizZip): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();
  const projectOverviewAnchor = findProjectOverviewSectionAnchor(xml);
  if (projectOverviewAnchor < 0) return;

  const prefix = xml.slice(0, projectOverviewAnchor);
  const suffix = xml.slice(projectOverviewAnchor);

  let currentSection = 'Project Overview';
  const imageCountBySection: Record<string, number> = {};

  const updated = suffix.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (para) => {
    const heading = detectSectionHeading(para);
    if (heading) currentSection = heading;

    const hasImage =
      /<w:drawing[\s>]/.test(para) ||
      /<mc:AlternateContent[\s>][\s\S]*?<w:drawing/.test(para);
    if (!hasImage) return para;

    if (currentSection === 'Industry Overview') return para;

    imageCountBySection[currentSection] = (imageCountBySection[currentSection] || 0) + 1;
    const imgNum = imageCountBySection[currentSection];
    const desc = SECTION_IMAGE_DESCRIPTIONS[currentSection] || 'relevant image';

    return `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>[Image placeholder ${imgNum}: Add ${desc} for ${escapeXml(currentSection)} section]</w:t></w:r></w:p>`;
  });

  zip.file(xmlPath, prefix + updated);
}

/** Max dimension for compressed images; JPEG quality */
const IMAGE_MAX_DIM = 1200;
const IMAGE_JPEG_QUALITY = 85;

/**
 * Compress images in the zip to reduce DOCX size. Resizes to max 1200px, re-encodes JPEG at 85%.
 */
async function compressImagesInZip(zip: PizZip): Promise<{ compressed: number; bytesSaved: number }> {
  const mediaFiles = Object.keys(zip.files).filter(
    (p) => p.startsWith('word/media/') && /\.(png|jpg|jpeg|webp)$/i.test(p),
  );
  let compressed = 0;
  let bytesSaved = 0;

  for (const mediaPath of mediaFiles) {
    const file = zip.file(mediaPath);
    if (!file) continue;
    const orig = Buffer.from(file.asBinary(), 'binary');
    if (!orig || orig.length < 2000) continue;

    try {
      let pipeline = sharp(orig);
      const meta = await pipeline.metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w > IMAGE_MAX_DIM || h > IMAGE_MAX_DIM) {
        pipeline = pipeline.resize(IMAGE_MAX_DIM, IMAGE_MAX_DIM, { fit: 'inside' });
      }
      const ext = path.extname(mediaPath).toLowerCase();
      const out =
        ext === '.png'
          ? await pipeline.png({ compressionLevel: 6 }).toBuffer()
          : await pipeline.jpeg({ quality: IMAGE_JPEG_QUALITY }).toBuffer();

      if (out.length < orig.length) {
        zip.file(mediaPath, out, { binary: true });
        compressed++;
        bytesSaved += orig.length - out.length;
      }
    } catch {
      /* skip on error */
    }
  }
  return { compressed, bytesSaved };
}

/**
 * After image references are removed from document.xml, the actual media
 * binaries (word/media/image*.png, etc.) still sit in the zip archive.
 * This function:
 *  1. Scans all XML parts for relationship IDs still in use (r:embed, r:link, r:id)
 *  2. Reads each .rels file and identifies image targets no longer referenced
 *  3. Removes the orphaned media files from the zip
 *  4. Rewrites the .rels file without the orphaned entries
 */
function stripUnreferencedMedia(zip: PizZip): { removed: number; bytesFreed: number } {
  const allXmlParts = [
    'word/document.xml',
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    'word/footnotes.xml', 'word/endnotes.xml',
  ];

  const referencedRIds = new Set<string>();

  const rIdPattern = /r:(?:embed|link|id)="(rId\d+)"/g;
  for (const xmlPath of allXmlParts) {
    const f = zip.file(xmlPath);
    if (!f) continue;
    const content = f.asText();
    for (const m of content.matchAll(rIdPattern)) {
      referencedRIds.add(m[1]);
    }
  }

  const relsFiles = [
    'word/_rels/document.xml.rels',
    'word/_rels/header1.xml.rels', 'word/_rels/header2.xml.rels', 'word/_rels/header3.xml.rels',
    'word/_rels/footer1.xml.rels', 'word/_rels/footer2.xml.rels', 'word/_rels/footer3.xml.rels',
  ];

  let totalRemoved = 0;
  let totalBytesFreed = 0;

  for (const relsPath of relsFiles) {
    const relsFile = zip.file(relsPath);
    if (!relsFile) continue;

    const relsXml = relsFile.asText();

    const relEntryPattern = /<Relationship\s[^>]*\/?>(?:<\/Relationship>)?/g;
    const entries: Array<{ full: string; id: string; target: string; type: string }> = [];
    for (const m of relsXml.matchAll(relEntryPattern)) {
      const el = m[0];
      const idMatch = el.match(/Id="([^"]*)"/);
      const targetMatch = el.match(/Target="([^"]*)"/);
      const typeMatch = el.match(/Type="([^"]*)"/);
      if (idMatch && targetMatch && typeMatch) {
        entries.push({ full: el, id: idMatch[1], target: targetMatch[1], type: typeMatch[1] });
      }
    }

    const imageType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
    const toRemove: typeof entries = [];

    for (const entry of entries) {
      if (entry.type !== imageType) continue;
      if (referencedRIds.has(entry.id)) continue;
      toRemove.push(entry);
    }

    if (toRemove.length === 0) continue;

    let updatedRels = relsXml;
    for (const entry of toRemove) {
      updatedRels = updatedRels.replace(entry.full, '');

      const mediaPath = entry.target.startsWith('/')
        ? entry.target.slice(1)
        : `word/${entry.target}`;
      const mediaFile = zip.file(mediaPath);
      if (mediaFile) {
        const raw = mediaFile.asBinary();
        totalBytesFreed += raw.length;
        zip.remove(mediaPath);
      }
      totalRemoved++;
    }

    updatedRels = updatedRels.replace(/\n\s*\n/g, '\n');
    zip.file(relsPath, updatedRels);
  }

  return { removed: totalRemoved, bytesFreed: totalBytesFreed };
}

/**
 * Collapse 2+ consecutive empty paragraphs to 1 to prevent blank white pages.
 * Handles: <w:p/>, <w:p></w:p>, and <w:p><w:pPr>...</w:pPr></w:p> (no text, no sectPr).
 * Does not touch paragraphs containing w:sectPr (section breaks).
 */
function collapseExcessiveEmptyParagraphs(zip: PizZip): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  let xml = file.asText();

  const emptyPara =
    /<w:p\s*\/>|<w:p>\s*<\/w:p>|<w:p>(?![\s\S]*?<w:sectPr)(?:<w:pPr[\s\S]*?<\/w:pPr>)\s*<\/w:p>/;
  const emptySeq = new RegExp(
    `((?:${emptyPara.source})\\s*){2,}`,
    'g',
  );

  xml = xml.replace(emptySeq, '<w:p/>\n');
  zip.file(xmlPath, xml);
}

function buildSiteAnalysisParagraphsXml(siteAnalysisText: string): string {
  const lines = siteAnalysisText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const label = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        return `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(label)}:</w:t></w:r><w:r><w:t xml:space="preserve"> ${escapeXml(value)}</w:t></w:r></w:p>`;
      }
      return `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`;
    })
    .join('');
}

/**
 * Replace only the initial static text paragraphs of the "Site Analysis"
 * section with generated content. Stops at first table, linked object,
 * image, or next section heading to preserve template structure.
 */
function replaceStaticSiteAnalysisSection(zip: PizZip, siteAnalysisText: string): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();
  const headingPattern = /<w:p\b[\s\S]*?<w:t>Site Analysis<\/w:t>[\s\S]*?<\/w:p>/;
  const headingMatch = xml.match(headingPattern);
  if (!headingMatch || headingMatch.index == null) return;

  const startIdx = headingMatch.index + headingMatch[0].length;
  const suffix = xml.slice(startIdx);
  const paragraphPattern = /<w:p\b[\s\S]*?<\/w:p>/g;

  let removeUntil = 0;
  let foundTextParagraph = false;
  for (const m of suffix.matchAll(paragraphPattern)) {
    const para = m[0];
    const idx = m.index ?? 0;

    if (para.includes('<w:t>Development Costs</w:t>')) break;
    if (/<w:pStyle\s+w:val="Heading[12]"/.test(para)) break;
    if (para.includes('<w:tbl>')) break;
    if (/<w:instrText[^>]*>/.test(para)) break;
    if (para.includes('<w:drawing') || /<mc:AlternateContent[\s>][\s\S]*?<w:drawing/.test(para)) break;

    const plain = para.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) {
      if (foundTextParagraph) removeUntil = idx + para.length;
      continue;
    }

    foundTextParagraph = true;
    removeUntil = idx + para.length;
  }

  if (!foundTextParagraph || removeUntil === 0) return;

  const fallback =
    'Shape: Not yet verified; analyst to confirm.\n' +
    'Frontage: Not yet verified; analyst to confirm.\n' +
    'Surrounding Uses: Not yet verified; analyst to confirm.\n' +
    'Apparent Easements, Encroachments, or Restrictions: Not yet verified; analyst to confirm.\n' +
    'Topography and Drainage: Not yet verified; analyst to confirm.\n' +
    'Soil and Subsoil Condition: Not yet verified; analyst to confirm.\n' +
    'Street Improvements and Access: Not yet verified; analyst to confirm.\n' +
    'Utilities: Not yet verified; analyst to confirm.\n' +
    'Relationship to its Surroundings: Not yet verified; analyst to confirm.\n' +
    'Zoning: Not yet verified; analyst to confirm.';

  const replacement = buildSiteAnalysisParagraphsXml(siteAnalysisText || fallback) + '<w:p/>';
  zip.file(xmlPath, xml.slice(0, startIdx) + replacement + suffix.slice(removeUntil));
}

/** Build a simple cost table: header row + data rows (Item, Qty, Cost/Unit, Total) */
function buildCostTableXml(
  headers: string[],
  rows: Array<Record<string, string | number>>
): string {
  const fmt = (v: string | number) =>
    typeof v === 'number' ? (v === 0 ? '0' : v.toLocaleString('en-US', { maximumFractionDigits: 0 })) : String(v);
  const cell = (val: string | number, bold = false) => {
    const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
    return `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="TableParagraph"/></w:pPr><w:r>${rPr}<w:t>${escapeXml(fmt(val))}</w:t></w:r></w:p></w:tc>`;
  };
  const headerRow = `<w:tr>${headers.map((h) => cell(h, true)).join('')}</w:tr>`;
  const dataRows = rows
    .map((r) => `<w:tr>${headers.map((h) => cell(r[h] ?? '')).join('')}</w:tr>`)
    .join('');
  const colCount = headers.length;
  const gridCols = Array(colCount).fill('<w:gridCol w:w="2000"/>').join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>${headerRow}${dataRows}</w:tbl>`;
}

/** Build Development Costs section content: intro + tables */
function buildDevelopmentCostsSectionXml(data: DevelopmentCostsData): string {
  const intro =
    'Development costs are estimated using Marshall & Swift (MVS) Section 63 for manufactured housing parks and Section 66 for site improvements. Quality level and local multipliers are applied per MVS guidelines.';
  const introPara = `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>${escapeXml(intro)}</w:t></w:r></w:p>`;

  const siteDevRows: Array<Record<string, string | number>> = data.siteDevCosts.lineItems
    .filter((r) => r.quantity > 0 || r.name.includes('confirm'))
    .map((r) => ({
      Item: r.name,
      Qty: r.quantity,
      'Cost/Unit': r.costPerUnit,
      Total: r.subtotal,
    }));
  if (siteDevRows.length === 0 && data.siteDevCosts.rvTotal + data.siteDevCosts.glampingTotal > 0) {
    siteDevRows.push({
      Item: 'Site Development (horizontal + units)',
      Qty: data.siteDevCosts.totalRVSites + data.siteDevCosts.totalGlampingUnits,
      'Cost/Unit': 0,
      Total: data.siteDevCosts.rvTotal + data.siteDevCosts.glampingTotal,
    });
  }
  const siteDevTable = buildCostTableXml(['Item', 'Qty', 'Cost/Unit', 'Total'], siteDevRows);

  const unitRows = data.unitCosts.items
    .filter((r) => r.qty > 0 || r.name.includes('confirm'))
    .map((r) => ({ Item: r.name, Qty: r.qty, 'Cost/Unit': r.costPerUnit, Total: r.subtotal }));
  const unitTable = buildCostTableXml(['Item', 'Qty', 'Cost/Unit', 'Total'], unitRows);

  const addBldgRows: Array<Record<string, string | number>> = data.addBldgImprovements.items.map((r) => ({
    Item: r.name,
    SF: r.sf ?? '-',
    '$/SF': r.costPerSf ?? '-',
    Total: r.total,
  }));
  if (addBldgRows.length === 0 && data.addBldgImprovements.total > 0) {
    addBldgRows.push({ Item: 'Additional structures', SF: '-', '$/SF': '-', Total: data.addBldgImprovements.total });
  }
  const addBldgTable = buildCostTableXml(['Item', 'SF', '$/SF', 'Total'], addBldgRows);

  const totalRows = [
    { Line: 'Site Development', Amount: data.totalProjectCost.siteDev },
    { Line: 'Unit Costs', Amount: data.totalProjectCost.unitCosts },
    { Line: 'Additional Structures', Amount: data.totalProjectCost.addBldg },
    { Line: 'Hard Costs Subtotal', Amount: data.totalProjectCost.hardCosts },
    { Line: 'Soft Costs (est.)', Amount: data.totalProjectCost.softCosts },
    { Line: 'Land', Amount: data.totalProjectCost.land },
    { Line: 'Total Project Cost', Amount: data.totalProjectCost.total },
  ];
  const totalTable = buildCostTableXml(['Line', 'Amount'], totalRows);

  const subhead = (text: string) =>
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

  return (
    introPara +
    '<w:p/>' +
    subhead('Site Development Costs') +
    siteDevTable +
    '<w:p/>' +
    subhead('Unit Costs (Glamping / Lodging)') +
    unitTable +
    '<w:p/>' +
    subhead('Additional Structures and Site Improvements') +
    addBldgTable +
    '<w:p/>' +
    subhead('Total Project Cost') +
    totalTable +
    '<w:p/>'
  );
}

/**
 * Replace the Development Costs section content with generated tables.
 * Finds the "Development Costs" heading and replaces content until the next section.
 */
function replaceDevelopmentCostsSection(
  zip: PizZip,
  developmentCostsData: DevelopmentCostsData | undefined
): void {
  if (!developmentCostsData) return;

  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();
  const headingPattern = /<w:p\b[\s\S]*?<w:t[^>]*>(?:[^<]*)?Development Costs(?:[^<]*)?<\/w:t>[\s\S]*?<\/w:p>/;
  const headingMatch = xml.match(headingPattern);
  if (!headingMatch || headingMatch.index == null) return;

  const startIdx = headingMatch.index + headingMatch[0].length;
  const suffix = xml.slice(startIdx);
  const paragraphPattern = /<w:p\b[\s\S]*?<\/w:p>/g;

  let removeUntil = 0;
  for (const m of suffix.matchAll(paragraphPattern)) {
    const para = m[0];
    const idx = m.index ?? 0;

    if (/<w:pStyle\s+w:val="Heading[12]"/.test(para)) {
      removeUntil = idx;
      break;
    }
    if (para.includes('<w:t>Comparables</w:t>') || para.includes('<w:t>Supply and Competition</w:t>') ||
        para.includes('<w:t>SWOT</w:t>') || para.includes('<w:t>Pro Forma</w:t>') || para.includes('<w:t>Addenda</w:t>')) {
      removeUntil = idx;
      break;
    }
    removeUntil = idx + para.length;
  }

  const replacement = buildDevelopmentCostsSectionXml(developmentCostsData);
  zip.file(xmlPath, xml.slice(0, startIdx) + replacement + suffix.slice(removeUntil));
}

function buildDemandIndicatorsParagraphsXml(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`,
    )
    .join('');
}

/** Skip URLs that are spinners, thumbnails, or non-chart assets */
function isEmbeddableWeatherSparkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes('spinner') || lower.includes('thumbnail')) return false;
  if (lower.includes('anyclip.com') || lower.includes('_1000x650_')) return false;
  return /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(url) || lower.includes('cloudfront.net');
}

/** Fetch image from URL; returns buffer and extension or null on failure */
async function fetchImageFromUrl(
  url: string,
): Promise<{ buffer: Buffer; ext: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf.length > 5 * 1024 * 1024) return null;
    const ct = res.headers.get('content-type') ?? '';
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    return { buffer: buf, ext };
  } catch {
    return null;
  }
}

/** Build OOXML inline drawing for an embedded image (EMU: 3657600 x 2286000 ≈ 4" x 2.5") */
function buildInlineImageDrawingXml(rId: string): string {
  return (
    `<w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="3657600" cy="2286000"/>` +
    `<wp:docPr id="${Math.floor(Math.random() * 100000) + 1}" name="WeatherSpark Chart"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="chart"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3657600" cy="2286000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
  );
}

/** Build WeatherSpark image blocks: embed when URLs are fetchable, else placeholders */
async function buildWeatherSparkImageXml(
  zip: PizZip,
  city: string,
  state: string,
  weatherSparkUrl: string,
  imageUrls: string[],
): Promise<string> {
  const chartTypes = [
    'average temperature',
    'precipitation',
    'tourism score',
    'comfort level (humidity/dew point)',
  ];
  const embeddable = imageUrls.filter(isEmbeddableWeatherSparkUrl).slice(0, 4);
  const relsPath = 'word/_rels/document.xml.rels';
  const relsFile = zip.file(relsPath);
  if (!relsFile) {
    return buildWeatherSparkImagePlaceholderXml(city, state, weatherSparkUrl, imageUrls);
  }

  let relsXml = relsFile.asText();
  const maxRId = Math.max(
    0,
    ...Array.from(relsXml.matchAll(/rId(\d+)/g)).map((m) => parseInt(m[1], 10)),
  );

  const parts: string[] = [];
  let nextRId = maxRId + 1;

  for (let i = 0; i < 4; i++) {
    const url = embeddable[i];
    if (url) {
      const fetched = await fetchImageFromUrl(url);
      if (fetched) {
        let buf = fetched.buffer;
        let ext = fetched.ext;
        if (ext === 'webp') {
          try {
            buf = await sharp(buf).jpeg({ quality: IMAGE_JPEG_QUALITY }).toBuffer();
            ext = 'jpg';
          } catch {
            continue;
          }
        }
        const mediaName = `imageWeatherSpark${i + 1}.${ext}`;
        const mediaPath = `word/media/${mediaName}`;
        zip.file(mediaPath, buf, { binary: true });
        const rId = `rId${nextRId++}`;
        const rel =
          `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`;
        relsXml = relsXml.replace('</Relationships>', `${rel}\n</Relationships>`);
        parts.push(
          `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r>${buildInlineImageDrawingXml(rId)}</w:r></w:p>`,
        );
        continue;
      }
    }
    parts.push(
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:t>[Image placeholder ${i + 1}: Add WeatherSpark ${chartTypes[i]} chart for ${escapeXml(city)}, ${escapeXml(state)}${url ? ` - ${escapeXml(url)}` : ''}]</w:t></w:r></w:p>`,
    );
  }

  zip.file(relsPath, relsXml);
  parts.push(
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr>` +
      `<w:t>SOURCE: WEATHERSPARK.COM - ${escapeXml(weatherSparkUrl)}</w:t></w:r></w:p>`,
  );
  return parts.join('');
}

function buildWeatherSparkImagePlaceholderXml(
  city: string,
  state: string,
  weatherSparkUrl: string,
  imageUrls: string[],
): string {
  const parts: string[] = [];
  const chartTypes = [
    'average temperature',
    'precipitation',
    'tourism score',
    'comfort level (humidity/dew point)',
  ];
  if (imageUrls.length > 0) {
    for (let i = 0; i < imageUrls.length && i < 4; i++) {
      parts.push(
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
          `<w:r><w:t>[Image placeholder ${i + 1}: Download and insert WeatherSpark ${chartTypes[i] || 'climate'} chart from: ${escapeXml(imageUrls[i])}]</w:t></w:r></w:p>`,
      );
    }
  } else {
    for (let i = 0; i < chartTypes.length; i++) {
      parts.push(
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
          `<w:r><w:t>[Image placeholder ${i + 1}: Add WeatherSpark ${chartTypes[i]} chart for ${escapeXml(city)}, ${escapeXml(state)} - Source: ${escapeXml(weatherSparkUrl)}]</w:t></w:r></w:p>`,
      );
    }
  }
  parts.push(
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr>` +
      `<w:t>SOURCE: WEATHERSPARK.COM - ${escapeXml(weatherSparkUrl)}</w:t></w:r></w:p>`,
  );
  return parts.join('');
}

/**
 * Replace only the initial static text paragraphs of the "Demand Indicators"
 * section with generated content. Stops at first table, linked object,
 * image, or next section heading to preserve template structure.
 * Embeds WeatherSpark images when URLs are fetchable.
 */
async function replaceDemandIndicatorsSection(
  zip: PizZip,
  demandIndicatorsText: string,
  input: EnrichedInput,
): Promise<void> {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();

  const headingPattern = /<w:p\b[\s\S]*?<w:t[^>]*>(?:[^<]*)?Demand Indicators(?:[^<]*)?<\/w:t>[\s\S]*?<\/w:p>/;
  const headingMatch = xml.match(headingPattern);
  if (!headingMatch || headingMatch.index == null) return;

  const startIdx = headingMatch.index + headingMatch[0].length;
  const suffix = xml.slice(startIdx);
  const paragraphPattern = /<w:p\b[\s\S]*?<\/w:p>/g;

  let removeUntil = 0;
  let foundTextParagraph = false;
  for (const m of suffix.matchAll(paragraphPattern)) {
    const para = m[0];
    const idx = m.index ?? 0;

    if (/<w:pStyle\s+w:val="Heading[12]"/.test(para)) break;
    if (para.includes('<w:t>Site Analysis</w:t>')) break;
    if (para.includes('<w:t>Development Costs</w:t>')) break;
    if (para.includes('<w:t>Supply and Competition</w:t>')) break;
    if (para.includes('<w:tbl>')) break;
    if (/<w:instrText[^>]*>/.test(para)) break;
    if (/<w:drawing[\s>]/.test(para) || /<mc:AlternateContent[\s>][\s\S]*?<w:drawing/.test(para)) break;

    const plain = para.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) {
      if (foundTextParagraph) removeUntil = idx + para.length;
      continue;
    }

    foundTextParagraph = true;
    removeUntil = idx + para.length;
  }

  if (!foundTextParagraph || removeUntil === 0) return;

  let replacement = buildDemandIndicatorsParagraphsXml(demandIndicatorsText);

  const weatherData = input.weather_data;
  if (weatherData) {
    replacement += await buildWeatherSparkImageXml(
      zip,
      weatherData.city || input.city,
      weatherData.state || input.state,
      weatherData.url,
      weatherData.image_urls,
    );
  }

  replacement += '<w:p/>';
  zip.file(xmlPath, xml.slice(0, startIdx) + replacement + suffix.slice(removeUntil));
}

export async function assembleDraftDocx(
  input: EnrichedInput,
  sections: GeneratedSections,
  options?: AssembleDraftDocxOptions
): Promise<Buffer> {
  const templateKey = getTemplateKeyForMarketType(options?.marketType ?? input.market_type);
  const content = await getTemplateContent(templateKey);
  const zip = new PizZip(content);

  // Phase 1: strip highlights from placeholder runs before docxtemplater renders
  stripHighlightsFromPlaceholderRuns(zip);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const location = [input.address_1, input.city, input.state, input.zip_code]
    .filter(Boolean)
    .join(', ');

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalSites = input.unit_mix.reduce((sum, u) => sum + u.count, 0) || '';

  const meta = input.enrichment_metadata;
  const appendixParts: string[] = [];
  if (meta) {
    appendixParts.push(
      `Data sources: ${meta.data_sources.join(', ')}.`
    );
    if (meta.benchmark_sample_count > 0) {
      appendixParts.push(
        `Benchmarks: ${meta.benchmark_sample_count} records (${meta.benchmark_categories.join(', ')}).`
      );
    }
    appendixParts.push(`Generated on ${meta.enrichment_date}.`);
  }
  if (INCLUDE_CITATIONS_IN_DOCX && (sections.citations?.length ?? 0) > 0) {
    appendixParts.push(
      '',
      'Citations:',
      ...sections.citations!.map((c) => `• ${c.claim} (Source: ${c.source})`)
    );
  }
  const data_sources_appendix = appendixParts.join('\n');

  const renderData = {
    property_name: input.property_name,
    location: location || 'Not specified',
    client_entity: input.client_entity || 'Client',
    client_contact_name: input.client_contact_name || input.client_entity || 'Client',
    client_address: input.client_address || '',
    client_city_state_zip: input.client_city_state_zip || '',
    client_salutation: input.client_salutation || input.client_contact_name || 'Client',
    report_date: reportDate,
    study_id: input.study_id || '',
    address_1: input.address_1 || '',
    city: input.city,
    state: input.state,
    zip_code: input.zip_code || '',
    acres: input.acres != null ? String(input.acres) : '',
    total_sites: totalSites ? String(totalSites) : '',
    parcel_number: input.parcel_number || '',
    amenities_description: input.amenities_description || '',
    executive_summary: sections.executive_summary,
    letter_of_transmittal: sections.letter_of_transmittal || '',
    swot_analysis: sections.swot_analysis || '',
    site_analysis: sections.site_analysis || '',
    comparables_analysis: buildComparablesAnalysis(input),
    data_sources_appendix: data_sources_appendix || '',
  };

  try {
    doc.render(renderData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Docxtemplater render failed (check template placeholders): ${msg}`
    );
  }

  // Phase 2: strip highlights from rendered form-filled values
  const formValues = new Set<string>();
  for (const v of Object.values(renderData)) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s && s.length < 200) formValues.add(s);
  }
  // Also add sub-parts that might appear in split runs
  const compositeParts = [
    input.city, input.state, input.zip_code,
    `${input.city},`, `${input.city}, ${input.state}`,
    `${input.state} ${input.zip_code}`,
    `${input.city}, ${input.state} ${input.zip_code}`,
  ];
  for (const p of compositeParts) {
    if (p) formValues.add(p.trim());
  }

  stripHighlightsFromFormValues(doc.getZip(), formValues);
  replaceLinkedProjectOverviewTable(doc.getZip(), input);
  replaceStaticSiteAnalysisSection(doc.getZip(), sections.site_analysis || '');
  if (sections.demand_indicators) {
    await replaceDemandIndicatorsSection(doc.getZip(), sections.demand_indicators, input);
  }
  replaceDevelopmentCostsSection(doc.getZip(), sections.development_costs_data);
  replaceTemplateImagesSelectively(doc.getZip());

  const { compressed, bytesSaved } = await compressImagesInZip(doc.getZip());
  if (compressed > 0) {
    console.log(
      `[assemble-docx] Compressed ${compressed} images (~${(bytesSaved / 1024).toFixed(0)} KB saved)`,
    );
  }

  const { removed, bytesFreed } = stripUnreferencedMedia(doc.getZip());
  if (removed > 0) {
    console.log(
      `[assemble-docx] Stripped ${removed} unreferenced media files (~${(bytesFreed / 1024 / 1024).toFixed(1)} MB freed)`
    );
  }

  collapseExcessiveEmptyParagraphs(doc.getZip());

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
}
