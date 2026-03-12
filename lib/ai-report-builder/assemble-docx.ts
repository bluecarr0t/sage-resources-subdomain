/**
 * Assemble DOCX from template and generated sections.
 * Fetches templates from Supabase Storage by market type; caches in memory.
 * Preserves all template formatting, images, tables, fonts, and styles.
 */

import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { createServerClient } from '@/lib/supabase';
import type { EnrichedInput } from './types';
import type { GeneratedSections } from './types';

const BUCKET_NAME = 'report-templates';

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
      details.push(`Rate range: $${Math.round(c.low_rate)}–$${Math.round(c.high_rate)}`);
    }
    if (c.low_occupancy != null && c.peak_occupancy != null) {
      details.push(`Occupancy: ${c.low_occupancy}%–${c.peak_occupancy}%`);
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

  const replacement = `${buildProjectOverviewTableXml(input)}<w:p/>`;
  zip.file(xmlPath, xml.replace(linkedExcelParaPattern, replacement));
}

/**
 * Replace static template image blocks with explicit placeholders for author review.
 * This prevents stale template photos/maps/comparable screenshots from leaking into
 * generated reports.
 */
function replaceTemplateImagesWithPlaceholders(zip: PizZip): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();
  const projectOverviewAnchor = xml.indexOf('<w:t>Project Overview</w:t>');
  if (projectOverviewAnchor < 0) return;

  const prefix = xml.slice(0, projectOverviewAnchor);
  const suffix = xml.slice(projectOverviewAnchor);
  const placeholder =
    '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>[Image placeholder - add author-selected image]</w:t></w:r></w:p>';

  const updated = suffix.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (para) => {
    if (/<w:drawing[\s>]/.test(para) || /<mc:AlternateContent[\s>][\s\S]*?<w:drawing/.test(para)) {
      return placeholder;
    }
    return para;
  });

  zip.file(xmlPath, prefix + updated);
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
 * Replace template's static "Site Analysis" narrative with generated content.
 * Keeps subsequent maps/images/figures in place (or placeholders after image pass).
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

    if (
      para.includes('<w:drawing') ||
      para.includes('<w:t>Development Costs</w:t>') ||
      /<w:pStyle w:val="Heading1"\s*\/>/.test(para)
    ) {
      break;
    }

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
  if ((sections.citations?.length ?? 0) > 0) {
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
  replaceTemplateImagesWithPlaceholders(doc.getZip());

  const { removed, bytesFreed } = stripUnreferencedMedia(doc.getZip());
  if (removed > 0) {
    console.log(
      `[assemble-docx] Stripped ${removed} unreferenced media files (~${(bytesFreed / 1024 / 1024).toFixed(1)} MB freed)`
    );
  }

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
}
