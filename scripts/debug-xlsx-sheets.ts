#!/usr/bin/env node
/**
 * Debug script: dump raw ToT and Best Comps sheet content for a study.
 * Usage: npx tsx scripts/debug-xlsx-sheets.ts <study_id> [--from-storage]
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

config({ path: '.env.local' });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

function sheetToRows(ws: XLSX.WorkSheet): unknown[][] {
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: '' });
  return data as unknown[][];
}

async function getXlsxBuffer(studyId: string): Promise<{ buffer: Buffer; filename: string } | null> {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
    return null;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: report } = await supabase
    .from('reports')
    .select('id')
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!report) return null;
  const { data: files } = await supabase.storage.from('report-uploads').list(`${report.id}/workbooks`, { limit: 50 });
  const xlsxFile = files?.find((f) => f.name?.toLowerCase().endsWith('.xlsx'));
  if (!xlsxFile) return null;
  const { data: blob, error } = await supabase.storage.from('report-uploads').download(`${report.id}/workbooks/${xlsxFile.name}`);
  if (error || !blob) return null;
  return { buffer: Buffer.from(await blob.arrayBuffer()), filename: xlsxFile.name };
}

function main() {
  const args = process.argv.slice(2);
  const studyId = args[0];
  const fromStorage = args.includes('--from-storage');
  if (!studyId) {
    console.error('Usage: npx tsx scripts/debug-xlsx-sheets.ts <study_id> [--from-storage]');
    process.exit(1);
  }

  (async () => {
    let source: { buffer: Buffer; filename: string } | null = null;
    if (fromStorage) {
      source = await getXlsxBuffer(studyId);
    } else {
      const fixturePath = path.join(process.cwd(), '__tests__', 'fixtures', `${studyId}.xlsx`);
      if (fs.existsSync(fixturePath)) {
        source = { buffer: fs.readFileSync(fixturePath), filename: path.basename(fixturePath) };
      } else {
        source = await getXlsxBuffer(studyId);
      }
    }
    if (!source) {
      console.error('Could not load XLSX');
      process.exit(1);
    }

    const wb = XLSX.read(source.buffer, { type: 'buffer' });
    console.log('\n=== Sheet names ===');
    console.log(wb.SheetNames.join(', '));

    const totNames = ['ToT (Intake Form)', 'ToT', 'TOT', 'Intake Form', 'Table of Contents'];
    const totWs = totNames.map((n) => wb.Sheets[n]).find(Boolean);
    if (totWs) {
      console.log('\n=== ToT (Intake Form) - first 25 rows ===');
      const rows = sheetToRows(totWs);
      rows.slice(0, 25).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
      });
    } else {
      console.log('\nToT sheet not found');
    }

    const bestNames = ['Best Comps', 'Best Comparables', 'Property Scores'];
    const bestWs = bestNames.map((n) => wb.Sheets[n]).find(Boolean);
    if (bestWs) {
      console.log('\n=== Best Comps - first 30 rows ===');
      const rows = sheetToRows(bestWs);
      rows.slice(0, 30).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
      });
    } else {
      console.log('\nBest Comps sheet not found');
    }

    console.log('\nDone.');
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

main();
