#!/usr/bin/env npx tsx
/**
 * Rerun the report draft pipeline using input data from the last generated report.
 * Run with: npx tsx scripts/rerun-last-report-draft.ts
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY,
 *           OPENAI_API_KEY
 *
 * Fetches the most recent report from Supabase, maps its data to ReportDraftInput,
 * runs enrich → generate → assemble, and saves DOCX + XLSX to reports/ folder.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { ReportDraftInput } from '@/lib/ai-report-builder/types';

config({ path: resolve(process.cwd(), '.env.local') });
config();

async function main() {
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error('OPENAI_API_KEY required for report generation');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch last report (most recent by created_at)
  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('Failed to fetch last report:', fetchError.message);
    process.exit(1);
  }

  const report = reports?.[0];
  if (!report) {
    console.error('No reports found');
    process.exit(1);
  }

  console.log(`Using last report: ${report.study_id} - ${report.property_name} (${report.city}, ${report.state})`);
  console.log(`Created: ${report.created_at}`);

  // Map report to ReportDraftInput
  const rawUnitMix = report.unit_mix;
  const unitMix = Array.isArray(rawUnitMix) ? rawUnitMix : [];
  const rawUnitDesc = report.unit_descriptions;
  const unitDescriptions = Array.isArray(rawUnitDesc) ? rawUnitDesc : [];

  let unit_mix: Array<{ type: string; count: number }>;
  if (unitMix.length > 0) {
    unit_mix = unitMix
      .filter((u: { type?: string; count?: number }) => u?.type && (u.count ?? 0) > 0)
      .map((u: { type?: string; count?: number }) => ({ type: String(u.type), count: Number(u.count) || 1 }));
  } else if (unitDescriptions.length > 0) {
    unit_mix = unitDescriptions
      .filter((u: { type?: string; quantity?: number | null }) => u?.type)
      .map((u: { type?: string; quantity?: number | null }) => ({ type: String(u.type), count: Number(u.quantity) || 1 }));
  } else {
    unit_mix = [];
  }

  const keyAmenities = (report.key_amenities as string[] | null) ?? [];
  const amenities_description = keyAmenities.length > 0
    ? keyAmenities.join(', ')
    : '';

  const input: ReportDraftInput = {
    property_name: report.property_name ?? '',
    city: report.city ?? '',
    state: report.state ?? '',
    zip_code: report.zip_code ?? undefined,
    address_1: report.address_1 ?? undefined,
    acres: report.lot_size_acres != null ? Number(report.lot_size_acres) : undefined,
    parcel_number: report.parcel_number ?? undefined,
    client_entity: report.client_entity ?? undefined,
    client_contact_name: (report as { client_contact_name?: string }).client_contact_name ?? undefined,
    client_address: (report as { client_address?: string }).client_address ?? undefined,
    client_city_state_zip: (report as { client_city_state_zip?: string }).client_city_state_zip ?? undefined,
    unit_mix,
    amenities_description: amenities_description || undefined,
    study_id: (() => {
      const now = new Date();
      return `DRAFT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(16).slice(2, 10)}`;
    })(),
    market_type: report.market_type ?? 'glamping',
    include_web_research: true,
    service: report.service ?? undefined,
  };

  if (!input.property_name || !input.city || !input.state) {
    console.error('Last report missing required fields: property_name, city, state');
    process.exit(1);
  }

  console.log('\nInput data:');
  console.log(JSON.stringify(input, null, 2));

  // Run pipeline
  console.log('\n--- Running pipeline ---\n');

  const { enrichReportInput } = await import('@/lib/ai-report-builder/enrich');
  const {
    generateExecutiveSummary,
    generateLetterOfTransmittal,
    generateSWOTAnalysis,
    generateSiteAnalysis,
  } = await import('@/lib/ai-report-builder/generate');
  const { factCheckExecutiveSummary } = await import('@/lib/ai-report-builder/fact-check');
  const { assembleDraftDocx, assembleDraftXlsx } = await import('@/lib/ai-report-builder');

  const enriched = await enrichReportInput(input);
  console.log('✓ Enriched');

  const [execSummaryResult, letter_of_transmittal, swot_analysis, site_analysis] = await Promise.all([
    generateExecutiveSummary(enriched),
    generateLetterOfTransmittal(enriched),
    generateSWOTAnalysis(enriched),
    generateSiteAnalysis(enriched),
  ]);
  let executive_summary = execSummaryResult.executive_summary;
  const citations = execSummaryResult.citations ?? [];

  const factCheck = factCheckExecutiveSummary(executive_summary, enriched);
  if (!factCheck.passed && factCheck.flags.length > 0) {
    executive_summary += `\n\n[Note: AI-generated draft. Some figures may require verification: ${factCheck.flags.map((f) => f.claim).join('; ')}.]`;
  }
  console.log('✓ Generated sections');

  const [docxBuffer, xlsxBuffer] = await Promise.all([
    assembleDraftDocx(
      enriched,
      { executive_summary, citations, letter_of_transmittal, swot_analysis, site_analysis },
      { marketType: input.market_type }
    ),
    assembleDraftXlsx(enriched, { marketType: input.market_type }),
  ]);
  console.log('✓ Assembled DOCX and XLSX');

  const studyId = input.study_id!;
  const outDir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(outDir, { recursive: true });

  const docxPath = path.join(outDir, `${studyId}-report.docx`);
  const xlsxPath = path.join(outDir, `${studyId}-template.xlsx`);

  fs.writeFileSync(docxPath, docxBuffer);
  fs.writeFileSync(xlsxPath, xlsxBuffer);

  console.log('\n--- Done ---');
  console.log(`DOCX: ${docxPath} (${(docxBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`XLSX: ${xlsxPath} (${(xlsxBuffer.length / 1024).toFixed(1)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
