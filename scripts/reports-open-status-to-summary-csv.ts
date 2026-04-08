/**
 * Build summary CSV from reports-properties-open-status.csv.
 * Appends City, State, Job Number from Supabase `reports` (latest row per property_name).
 *
 * Run: npx tsx scripts/reports-open-status-to-summary-csv.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY in .env.local
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config();

const src = path.join(process.cwd(), 'reports-properties-open-status.csv');
const dest = path.join(process.cwd(), 'reports-properties-summary.csv');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${String(s).replace(/"/g, '""')}"`;
  return String(s);
}

type ReportMeta = { city: string; state: string; jobNumber: string };

async function loadReportMetaByPropertyName(): Promise<Map<string, ReportMeta>> {
  const map = new Map<string, ReportMeta>();
  if (!supabaseUrl || !supabaseSecretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — City/State/Job Number will be empty');
    return map;
  }
  const supabase = createClient(supabaseUrl, supabaseSecretKey);
  const { data: rows, error } = await supabase
    .from('reports')
    .select('property_name, city, state, study_id, created_at')
    .is('deleted_at', null)
    .not('property_name', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error.message);
    return map;
  }

  for (const r of rows || []) {
    const pn = String(r.property_name || '').trim();
    if (!pn) continue;
    const key = pn.toLowerCase();
    if (map.has(key)) continue;
    map.set(key, {
      city: (r.city as string) || '',
      state: (r.state as string) || '',
      jobNumber: (r.study_id as string) || '',
    });
  }
  return map;
}

function rowMeta(
  r: Record<string, string>,
  fallback: Map<string, ReportMeta>
): ReportMeta {
  const fromCsv =
    r.City !== undefined || r.State !== undefined || r['Job Number'] !== undefined;
  if (fromCsv) {
    return {
      city: r.City ?? '',
      state: r.State ?? '',
      jobNumber: r['Job Number'] ?? '',
    };
  }
  const key = (r.property_name || '').trim().toLowerCase();
  return fallback.get(key) ?? { city: '', state: '', jobNumber: '' };
}

async function main(): Promise<void> {
  const raw = fs.readFileSync(src, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true });
  const metaByProperty = await loadReportMetaByPropertyName();

  const header = [
    'property_name',
    'website_url',
    'date_opened',
    'resort_category',
    'operational_status',
    'City',
    'State',
    'Job Number',
    'Google Review',
    'Number of Reviews',
    'Year of First Review',
  ];
  const lines = [header.join(',')];
  for (const r of records as Record<string, string>[]) {
    const m = rowMeta(r, metaByProperty);
    lines.push(
      [
        csvEscape(r.property_name || ''),
        csvEscape(r.website_url || ''),
        csvEscape(r.date_opened || ''),
        csvEscape(r.resort_category || ''),
        csvEscape(r.operational_status || ''),
        csvEscape(m.city),
        csvEscape(m.state),
        csvEscape(m.jobNumber),
        csvEscape(r['Google Review'] || ''),
        csvEscape(r['Number of Reviews'] || ''),
        csvEscape(r['Year of First Review'] || ''),
      ].join(',')
    );
  }
  fs.writeFileSync(dest, lines.join('\n'), 'utf8');
  console.error(`Wrote ${records.length} rows to ${dest}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
