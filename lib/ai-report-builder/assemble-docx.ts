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

const templateCache = new Map<string, string>();

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

function getLocalFallbackTemplate(): string {
  const templatePath = path.join(process.cwd(), 'templates', 'feasibility-draft.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Template not found at ${templatePath}. Run: npx tsx scripts/create-feasibility-draft-template.ts`
    );
  }
  return fs.readFileSync(templatePath, 'binary');
}

async function getTemplateContent(templateKey: string): Promise<string> {
  const cached = templateCache.get(templateKey);
  if (cached) return cached;

  const fromSupabase = await fetchTemplateFromSupabase(templateKey);
  const content = fromSupabase ?? getLocalFallbackTemplate();
  templateCache.set(templateKey, content);
  return content;
}

export interface AssembleDraftDocxOptions {
  marketType?: string | null;
}

export async function assembleDraftDocx(
  input: EnrichedInput,
  sections: GeneratedSections,
  options?: AssembleDraftDocxOptions
): Promise<Buffer> {
  const templateKey = getTemplateKeyForMarketType(options?.marketType ?? input.market_type);
  const content = await getTemplateContent(templateKey);
  const zip = new PizZip(content);

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

  try {
    doc.render({
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
      data_sources_appendix: data_sources_appendix || '',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Docxtemplater render failed (check template placeholders): ${msg}`
    );
  }

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
}
