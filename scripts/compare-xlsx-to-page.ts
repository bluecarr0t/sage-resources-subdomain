#!/usr/bin/env node
/**
 * Compare XLSX extraction results against stored page data.
 *
 * Usage:
 *   npx tsx scripts/compare-xlsx-to-page.ts <study_id> [xlsx_path]
 *   npx tsx scripts/compare-xlsx-to-page.ts <study_id> --from-storage
 *
 * Examples:
 *   npx tsx scripts/compare-xlsx-to-page.ts 25-175A-04 __tests__/fixtures/25-175A-04.xlsx
 *   npx tsx scripts/compare-xlsx-to-page.ts 25-175A-04 --from-storage
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY in .env.local
 *
 * Note: Parsed data is in XLSX row order; stored data is fetched in display order
 * (quality_score/overall_score desc). Comparison matches by name to avoid false
 * mismatches from different sort orders.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parseWorkbook } from '@/lib/parsers/feasibility-xlsx-parser';

config({ path: '.env.local' });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadXlsxFromStorage(studyId: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const { data: report } = await supabase
    .from('reports')
    .select('id')
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) {
    console.error(`No report found for study_id ${studyId}`);
    return null;
  }

  const { data: files } = await supabase.storage
    .from('report-uploads')
    .list(`${report.id}/workbooks`, { limit: 50 });

  const xlsxFile = files?.find((f) => f.name?.toLowerCase().endsWith('.xlsx'));
  if (!xlsxFile) {
    console.error(`No XLSX file found in storage for report ${report.id}`);
    return null;
  }

  const { data: blob, error } = await supabase.storage
    .from('report-uploads')
    .download(`${report.id}/workbooks/${xlsxFile.name}`);

  if (error || !blob) {
    console.error('Failed to download XLSX:', error?.message);
    return null;
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  return { buffer, filename: xlsxFile.name };
}

function loadXlsxFromFile(filePath: string): { buffer: Buffer; filename: string } | null {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    return null;
  }
  const buffer = fs.readFileSync(resolved);
  const filename = path.basename(resolved);
  return { buffer, filename };
}

function diffComparables(
  parsed: ReturnType<typeof parseWorkbook>,
  stored: Array<{ comp_name: string; overview: string | null; total_sites: number | null; quality_score: number | null }>
): void {
  console.log('\n--- Comparables ---');
  console.log(`Parsed: ${parsed.comparables.length} | Stored: ${stored.length}`);

  const storedByName = new Map(stored.map((s) => [s.comp_name?.toLowerCase().trim() || '', s]));
  const parsedNames = new Set(parsed.comparables.map((c) => c.comp_name.toLowerCase().trim()));
  const storedNames = new Set(stored.map((s) => s.comp_name?.toLowerCase().trim()).filter(Boolean));

  const onlyInParsed = [...parsedNames].filter((n) => !storedNames.has(n));
  const onlyInStored = [...storedNames].filter((n) => !parsedNames.has(n));

  if (onlyInParsed.length > 0) {
    console.log('\n  Only in XLSX (not in DB):', onlyInParsed.slice(0, 5).join(', '));
    if (onlyInParsed.length > 5) console.log(`  ... and ${onlyInParsed.length - 5} more`);
  }
  if (onlyInStored.length > 0) {
    console.log('\n  Only in DB (not in XLSX):', onlyInStored.slice(0, 5).join(', '));
    if (onlyInStored.length > 5) console.log(`  ... and ${onlyInStored.length - 5} more`);
  }

  // Match by name (not index) — stored is sorted by quality_score, parsed is row order
  for (const p of parsed.comparables) {
    const key = p.comp_name.toLowerCase().trim();
    const s = storedByName.get(key);
    if (!s) continue;
    const mismatches: string[] = [];
    if (p.total_sites !== s.total_sites) mismatches.push(`sites: ${p.total_sites} vs ${s.total_sites}`);
    if (p.quality_score !== s.quality_score) mismatches.push(`score: ${p.quality_score} vs ${s.quality_score}`);
    if (mismatches.length > 0) {
      console.log(`\n  Mismatch "${p.comp_name}": ${mismatches.join('; ')}`);
    }
  }
}

function diffPropertyScores(
  parsed: ReturnType<typeof parseWorkbook>,
  stored: Array<{ property_name: string; overall_score: number | null; is_subject: boolean }>
): void {
  console.log('\n--- Property Scores (Best Comps) ---');
  console.log(`Parsed: ${parsed.property_scores.length} | Stored: ${stored.length}`);

  const storedByName = new Map(stored.map((s) => [s.property_name?.toLowerCase().trim() || '', s]));
  const parsedNames = new Set(parsed.property_scores.map((p) => p.property_name?.toLowerCase().trim()).filter(Boolean));
  const storedNames = new Set(stored.map((s) => s.property_name?.toLowerCase().trim()).filter(Boolean));

  const onlyInParsed = [...parsedNames].filter((n) => !storedNames.has(n));
  const onlyInStored = [...storedNames].filter((n) => !parsedNames.has(n));
  if (onlyInParsed.length > 0) {
    console.log('\n  Only in XLSX (not in DB):', onlyInParsed.slice(0, 5).join(', '));
    if (onlyInParsed.length > 5) console.log(`  ... and ${onlyInParsed.length - 5} more`);
  }
  if (onlyInStored.length > 0) {
    console.log('\n  Only in DB (not in XLSX):', onlyInStored.slice(0, 5).join(', '));
    if (onlyInStored.length > 5) console.log(`  ... and ${onlyInStored.length - 5} more`);
  }

  // Match by name (not index) — stored is sorted by overall_score, parsed is row order
  for (const p of parsed.property_scores) {
    const key = p.property_name?.toLowerCase().trim() || '';
    const s = storedByName.get(key);
    if (!s) continue;
    const mismatches: string[] = [];
    if (p.overall_score !== s.overall_score) mismatches.push(`score: ${p.overall_score} vs ${s.overall_score}`);
    if (p.is_subject !== s.is_subject) mismatches.push(`is_subject: ${p.is_subject} vs ${s.is_subject}`);
    if (mismatches.length > 0) {
      console.log(`\n  Mismatch "${p.property_name}": ${mismatches.join('; ')}`);
    }
  }
}

function diffCompUnits(
  parsed: ReturnType<typeof parseWorkbook>,
  stored: Array<{ property_name: string; unit_type: string; num_units: number | null }>
): void {
  console.log('\n--- Comp Units ---');
  console.log(`Parsed: ${parsed.comp_units.length} | Stored: ${stored.length}`);

  if (parsed.comp_units.length !== stored.length) {
    console.log(`  Count mismatch: parsed ${parsed.comp_units.length} vs stored ${stored.length}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const studyId = args[0];
  const xlsxPath = args[1];

  if (!studyId) {
    console.error('Usage: npx tsx scripts/compare-xlsx-to-page.ts <study_id> [xlsx_path|--from-storage]');
    process.exit(1);
  }

  let source: { buffer: Buffer; filename: string } | null = null;

  if (xlsxPath === '--from-storage') {
    console.log(`Downloading XLSX for ${studyId} from Supabase storage...`);
    source = await downloadXlsxFromStorage(studyId);
  } else if (xlsxPath) {
    source = loadXlsxFromFile(xlsxPath);
  } else {
    const fixturePath = path.join(process.cwd(), '__tests__', 'fixtures', `${studyId}.xlsx`);
    if (fs.existsSync(fixturePath)) {
      source = loadXlsxFromFile(fixturePath);
    } else {
      console.log(`Trying --from-storage for ${studyId}...`);
      source = await downloadXlsxFromStorage(studyId);
    }
  }

  if (!source) {
    process.exit(1);
  }

  console.log(`\nParsing ${source.filename}...`);
  const parsed = parseWorkbook(source.buffer, source.filename);

  console.log(`\nJob Number: ${parsed.study_id}`);
  console.log(`Sheets found: ${parsed.sheets_found.join(', ')}`);
  if (parsed.warnings.length > 0) {
    console.log('Warnings:', parsed.warnings);
  }

  const { data: report } = await supabase
    .from('reports')
    .select('id')
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) {
    console.log('\nNo report in DB for this study_id - cannot compare. Upload the XLSX first.');
    process.exit(0);
  }

  const { data: comparables } = await supabase
    .from('feasibility_comparables')
    .select('comp_name, overview, total_sites, quality_score')
    .eq('report_id', report.id)
    .order('quality_score', { ascending: false });

  const { data: propertyScores } = await supabase
    .from('feasibility_property_scores')
    .select('property_name, overall_score, is_subject')
    .eq('report_id', report.id)
    .order('overall_score', { ascending: false });

  const { data: compUnits } = await supabase
    .from('feasibility_comp_units')
    .select('property_name, unit_type, num_units')
    .eq('report_id', report.id);

  console.log('\n========== Comparison: XLSX vs /admin/comparables page data ==========');
  diffComparables(parsed, comparables || []);
  diffPropertyScores(parsed, propertyScores || []);
  diffCompUnits(parsed, compUnits || []);

  if (parsed.project_info) {
    console.log('\n--- Project Info (from XLSX) ---');
    console.log('  Resort:', parsed.project_info.resort_name);
    console.log('  County:', parsed.project_info.county);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
