#!/usr/bin/env npx tsx
/**
 * Bulk re-extract DOCX for ALL past reports.
 * Downloads each DOCX from storage, re-parses with LLM fallback for missing fields
 * (resort_name, address, city, state, zip_code, client_name, client_entity, report_date),
 * and updates the report record.
 *
 * Usage:
 *   npx tsx scripts/bulk-re-extract-docx.ts
 *   npx tsx scripts/bulk-re-extract-docx.ts --limit 5
 *   npx tsx scripts/bulk-re-extract-docx.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseDocxReport } from '@/lib/parsers/feasibility-docx-parser';
import { geocodeAddress } from '@/lib/geocode';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET_NAME = 'report-uploads';
const DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(String(args[limitIdx + 1] || '').replace('--limit=', '') || '0', 10)
      : undefined;
  const dryRun = args.includes('--dry-run');

  console.log('Fetching reports with DOCX files...\n');

  const { data: allReports, error } = await supabase
    .from('reports')
    .select('id, study_id, docx_file_path, narrative_file_path')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit((limit ?? 1000) * 2);

  const reports = (allReports ?? []).filter((r) => {
    if (r.docx_file_path) return true;
    const n = r.narrative_file_path ?? '';
    return n.toLowerCase().endsWith('.docx') || n.toLowerCase().endsWith('.doc');
  }).slice(0, limit ?? 1000);

  if (error) {
    console.error('Failed to fetch reports:', error);
    process.exit(1);
  }

  const getDocxPath = (r: { docx_file_path: string | null; narrative_file_path: string | null }) =>
    r.docx_file_path ?? (r.narrative_file_path?.toLowerCase().endsWith('.docx') || r.narrative_file_path?.toLowerCase().endsWith('.doc') ? r.narrative_file_path : null);

  const total = reports?.length ?? 0;
  console.log(`Found ${total} reports with DOCX files.\n`);

  if (total === 0) {
    console.log('No reports to process.');
    return;
  }

  if (dryRun) {
    console.log('DRY RUN - would process:');
    reports?.forEach((r, i) => {
      const path = getDocxPath(r);
      console.log(`  ${i + 1}. ${r.study_id ?? r.id} (${path})`);
    });
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const report = reports![i];
    const docxPath = getDocxPath(report);
    if (!docxPath) continue;

    const studyId = report.study_id ?? report.id;
    const label = `[${i + 1}/${total}] ${studyId}`;

    try {
      let fileData: Blob | null = null;
      let downloadError: { message?: string; error?: string } | null = null;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(docxPath);
      fileData = data;
      downloadError = error;

      // Fallback: try narrative.docx if report.docx not found (legacy paths)
      if ((downloadError || !fileData) && docxPath.endsWith('/report.docx')) {
        const altPath = docxPath.replace(/\/report\.docx$/i, '/narrative.docx');
        const alt = await supabase.storage.from(BUCKET_NAME).download(altPath);
        if (!alt.error && alt.data) {
          fileData = alt.data;
          downloadError = null;
        }
      }

      // Fallback: list folder and try any .docx/.doc file when primary path missing
      if ((downloadError || !fileData) && docxPath.includes('/')) {
        const folder = docxPath.split('/').slice(0, -1).join('/');
        const { data: list } = await supabase.storage.from(BUCKET_NAME).list(folder, { limit: 50 });
        const docFile = list?.find(
          (f) =>
            !f.name?.startsWith('.') &&
            (f.name?.toLowerCase().endsWith('.docx') || f.name?.toLowerCase().endsWith('.doc'))
        );
        if (docFile) {
          const foundPath = `${folder}/${docFile.name}`;
          const found = await supabase.storage.from(BUCKET_NAME).download(foundPath);
          if (!found.error && found.data) {
            fileData = found.data;
            downloadError = null;
          }
        }
      }

      if (downloadError || !fileData) {
        const errMsg =
          downloadError?.message ??
          (typeof downloadError?.error === 'string' ? downloadError.error : null) ??
          (downloadError ? 'File not found in storage (400)' : 'No data');
        console.error(`${label} - Failed to download: ${errMsg}`);
        failed++;
        continue;
      }

      const docxFilename = docxPath.split('/').pop() || `${studyId}.docx`;
      const docxBuffer = Buffer.from(await fileData.arrayBuffer());

      const parsed = await parseDocxReport(docxBuffer, docxFilename, {
        useLLMForMissing: true,
      });

      let latitude: number | null = null;
      let longitude: number | null = null;
      if (parsed.city || parsed.address) {
        const coords = await geocodeAddress(
          parsed.address || '',
          parsed.city || '',
          parsed.state || '',
          parsed.zip_code || '',
          'USA'
        );
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      const reportUpdate: Record<string, unknown> = {
        has_docx: true,
        has_narrative: true,
        status: 'completed',
      };

      if (parsed.resort_name) reportUpdate.property_name = parsed.resort_name;
      if (parsed.resort_name && report.study_id) reportUpdate.title = `${parsed.resort_name} - ${report.study_id}`;
      reportUpdate.city = parsed.city ?? null;
      reportUpdate.state = parsed.state ?? null;
      reportUpdate.address_1 = parsed.address ?? null;
      reportUpdate.zip_code = parsed.zip_code ?? null;
      reportUpdate.county = parsed.county ?? null;
      reportUpdate.parcel_number = parsed.parcel_number ?? null;
      reportUpdate.lot_size_acres = parsed.lot_size_acres ?? null;
      reportUpdate.total_sites = parsed.total_units ?? null;
      reportUpdate.market_type = parsed.market_type ?? null;
      reportUpdate.report_date = parsed.report_date ?? null;
      if (parsed.executive_summary) reportUpdate.executive_summary = parsed.executive_summary;
      if (parsed.swot) reportUpdate.swot = parsed.swot;
      if (parsed.authors) reportUpdate.authors = parsed.authors;
      if (parsed.client_name) reportUpdate.client_name = parsed.client_name;
      if (parsed.client_entity) reportUpdate.client_entity = parsed.client_entity;
      if (parsed.report_purpose) reportUpdate.report_purpose = parsed.report_purpose;
      if (parsed.development_phase) reportUpdate.development_phase = parsed.development_phase;
      if (parsed.zoning) reportUpdate.zoning = parsed.zoning;
      if (parsed.unit_mix) reportUpdate.unit_mix = parsed.unit_mix;
      if (parsed.financial_assumptions) reportUpdate.financial_assumptions = parsed.financial_assumptions;
      if (parsed.recommendations) reportUpdate.recommendations = parsed.recommendations;
      if (parsed.extraction_messages?.length) reportUpdate.docx_extraction_messages = parsed.extraction_messages;
      if (latitude !== null) reportUpdate.latitude = latitude;
      if (longitude !== null) reportUpdate.longitude = longitude;

      const locationParts = [parsed.city, parsed.state].filter(Boolean);
      reportUpdate.location = locationParts.length > 0 ? locationParts.join(', ') : null;

      const { error: updateError } = await supabase
        .from('reports')
        .update(reportUpdate)
        .eq('id', report.id);

      if (updateError) {
        console.error(`${label} - Update failed: ${updateError.message}`);
        failed++;
      } else {
        const added: string[] = [];
        if (parsed.report_date) added.push(`report_date=${parsed.report_date}`);
        if (parsed.client_name) added.push(`client_name`);
        if (parsed.resort_name) added.push(`resort_name`);
        if (parsed.address) added.push(`address`);
        console.log(`${label} - OK${added.length ? ` (LLM added: ${added.join(', ')})` : ''}`);
        success++;
      }
    } catch (err) {
      console.error(`${label} - Error:`, err instanceof Error ? err.message : err);
      failed++;
    }

    if (i < total - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
