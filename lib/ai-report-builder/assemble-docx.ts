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

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
}
