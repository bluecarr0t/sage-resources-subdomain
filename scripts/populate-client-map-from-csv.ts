#!/usr/bin/env npx tsx
/**
 * Populate Client Map from Sage Outdoor Client Projects CSV
 *
 * Usage:
 *   npx tsx scripts/populate-client-map-from-csv.ts [--dry-run] [--csv path/to/file.csv]
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 * Geocoding: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (see lib/geocode.ts); Nominatim fallback if Google fails
 *
 * - One row per CSV line: Job Number "ARG" and duplicate job IDs get unique study_id (ARG-<slug>, JOB__2, …)
 * - Skips rows where a "Past Report" already exists (has_docx, has_xlsx, unit_mix, dropbox_url, narrative)
 * - Inserts or updates sparse reports from CSV data
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { geocodeCityStateUsa } from '../lib/geocode';
import { csvLocationToGeocodeParts } from '../lib/parse-csv-location';
import { DEFAULT_CENTER, STATE_CENTERS, resolveUsStateAbbr } from '../lib/us-state-centers';

config({ path: resolve(process.cwd(), '.env.local') });

const DEFAULT_CSV_PATH = resolve(
  process.cwd(),
  'local_data/Sage Outdoor Client Projects - Website MAP - Internal Projects Map.csv'
);

const GEOCODE_DELAY_MS = 200;

interface CsvRow {
  'Job Number': string;
  Property: string;
  'Location ': string;
  State: string;
  'Resort Type': string;
  Service: string;
}

function parseArgs(): { dryRun: boolean; csvPath: string } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvIdx = args.indexOf('--csv');
  const csvPath =
    csvIdx >= 0 && args[csvIdx + 1]
      ? resolve(process.cwd(), args[csvIdx + 1])
      : DEFAULT_CSV_PATH;
  return { dryRun, csvPath };
}

function parseCsv(filePath: string): CsvRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((r) => ({
    'Job Number': (r['Job Number'] ?? '').trim(),
    Property: (r['Property'] ?? '').trim(),
    'Location ': (r['Location '] ?? r['Location'] ?? '').trim(),
    State: (r['State'] ?? '').trim(),
    'Resort Type': (r['Resort Type'] ?? '').trim(),
    Service: (r['Service'] ?? '').trim(),
  })) as CsvRow[];
}

function isValidRow(row: CsvRow): boolean {
  const job = row['Job Number'];
  if (!job) return false;
  if (job.toLowerCase().startsWith('value in column')) return false;
  if (row.Property?.toLowerCase().includes('value in column')) return false;
  return true;
}

function slugifyPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
}

/**
 * Every CSV line becomes one report. Shared placeholder job "ARG" and repeated job numbers
 * would collide on study_id — disambiguate for Supabase uniqueness and the client map.
 */
function assignStudyIds(validRows: CsvRow[]): Array<{ row: CsvRow; studyId: string }> {
  const jobOccurrence = new Map<string, number>();
  return validRows.map((r) => {
    const job = r['Job Number'].trim();
    const ju = job.toUpperCase();
    const st = (r.State || '').trim().toUpperCase();

    if (ju === 'ARG') {
      const slug =
        slugifyPart(`${r.Property}-${r['Location ']}-${st}`) || 'project';
      return { row: r, studyId: `ARG-${slug}` };
    }

    const n = (jobOccurrence.get(ju) ?? 0) + 1;
    jobOccurrence.set(ju, n);
    if (n === 1) return { row: r, studyId: job };
    return { row: r, studyId: `${job}__${n}` };
  });
}

function mapService(service: string): string | null {
  const s = service.trim().toLowerCase();
  if (!s) return null;
  if (s.includes('appraisal') && s.includes('feasibility')) return 'feasibility_study'; // prefer feasibility when both
  if (s.includes('appraisal')) return 'appraisal';
  if (s.includes('feasibility')) return 'feasibility_study';
  if (s.includes('consulting')) return 'consulting';
  if (s.includes('market study') || s.includes('market analysis')) return 'market_study';
  if (s.includes('glamping revenue')) return 'revenue_projection';
  return 'outdoor_hospitality';
}

function mapMarketType(resortType: string): string {
  const t = resortType.toLowerCase();
  if (t.includes('glamping') && (t.includes('rv') || t.includes('rv resort')))
    return 'rv_glamping';
  if (t.includes('glamping')) return 'glamping';
  if (t.includes('rv') || t.includes('campground') || t.includes('campground'))
    return 'rv';
  if (t.includes('marina')) return 'marina';
  return 'outdoor_hospitality';
}

function extractTotalSites(resortType: string): number | null {
  const m = resortType.match(/(\d+)[-\s]*(?:site|unit)/i);
  if (m) return parseInt(m[1], 10);
  const m2 = resortType.match(/(\d+)[-\s]*(?:room|cabin|slip)/i);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function getCoords(state: string): [number, number] {
  const cleaned = state.replace(/\s*Canada\s*/i, '').trim();
  const key = resolveUsStateAbbr(cleaned);
  if (key) return STATE_CENTERS[key] ?? DEFAULT_CENTER;
  return DEFAULT_CENTER;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const NOMINATIM_DELAY_MS = 1100;

async function nominatimCityState(city: string, stateAbbr: string): Promise<[number, number] | null> {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'us',
    city: city.trim(),
    state: stateAbbr.trim(),
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SageOutdoorAdvisory-CSVImport/1.0' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || !data[0]) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}

async function resolveLatLng(city: string, state: string): Promise<[number, number]> {
  const c = city.trim();
  const abbr = resolveUsStateAbbr(state.replace(/\s*Canada\s*/i, '').trim());
  if (c && abbr) {
    const coords = await geocodeCityStateUsa(c, abbr);
    if (coords) return [coords.lat, coords.lng];
    await sleep(NOMINATIM_DELAY_MS);
    const nom = await nominatimCityState(c, abbr);
    if (nom) return nom;
  }
  return getCoords(state);
}

async function main() {
  const { dryRun, csvPath } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  let userId: string | null = null;
  if (!dryRun) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: managed } = await supabase
      .from('managed_users')
      .select('user_id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    userId = managed?.user_id ?? null;
    if (!userId) {
      console.error('No active managed user found. Add a user to managed_users first.');
      process.exit(1);
    }
  }

  console.log(`Reading CSV: ${csvPath}`);
  const rawRows = parseCsv(csvPath);
  const validRows = rawRows.filter(isValidRow);
  const rows = assignStudyIds(validRows);

  console.log(`  Total rows: ${rawRows.length}`);
  console.log(`  Valid: ${validRows.length}`);
  console.log(`  Import rows (one per line, unique study_id): ${rows.length}`);
  if (dryRun) {
    console.log('\n[DRY RUN] Sample (CSV Job → study_id):');
    rows.slice(0, 25).forEach(({ row: r, studyId }) =>
      console.log(`  - ${r['Job Number']} → ${studyId}: ${r.Property}`)
    );
    if (rows.length > 25) console.log(`  ... and ${rows.length - 25} more`);
    console.log('\nRun without --dry-run to apply changes.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const studyIds = rows.map(({ studyId }) => studyId).filter(Boolean);
  const chunkSize = 120;
  const existingReports: Array<{
    id: string;
    study_id: string | null;
    has_docx: boolean | null;
    has_xlsx: boolean | null;
    unit_mix: unknown;
    dropbox_url: string | null;
    narrative_file_path: string | null;
  }> = [];
  for (let i = 0; i < studyIds.length; i += chunkSize) {
    const slice = studyIds.slice(i, i + chunkSize);
    const { data, error: fetchError } = await supabase
      .from('reports')
      .select('id, study_id, has_docx, has_xlsx, unit_mix, dropbox_url, narrative_file_path')
      .in('study_id', slice)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('Failed to fetch existing reports:', fetchError);
      process.exit(1);
    }
    existingReports.push(...(data ?? []));
  }

  const existingByStudyId = new Map<string, (typeof existingReports)[0][]>();
  for (const r of existingReports ?? []) {
    if (r.study_id) {
      const key = r.study_id.toUpperCase();
      const list = existingByStudyId.get(key) ?? [];
      list.push(r);
      existingByStudyId.set(key, list);
    }
  }

  function isPastReport(r: (typeof existingReports)[0]): boolean {
    if (r.has_docx) return true;
    if (r.has_xlsx) return true;
    if (r.unit_mix != null && JSON.stringify(r.unit_mix) !== '[]') return true;
    if (r.dropbox_url && r.dropbox_url !== '#') return true;
    if (r.narrative_file_path) return true;
    return false;
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { row, studyId } of rows) {
    const jobNumber = row['Job Number'].trim();
    if (!studyId) continue;

    const existingList = existingByStudyId.get(studyId.toUpperCase()) ?? [];
    const hasPastReport = existingList.some(isPastReport);
    if (hasPastReport) {
      skipped++;
      continue;
    }
    const existing = existingList[0] ?? null;

    const { city, stateAbbr } = csvLocationToGeocodeParts(row['Location '], row.State);
    const stateForGeocode = stateAbbr ?? row.State.trim();
    await sleep(GEOCODE_DELAY_MS);
    const [lat, lng] = await resolveLatLng(city, stateForGeocode);
    const stateLabel = stateAbbr ?? (row.State.trim().toUpperCase() || '');
    const location =
      [city, stateLabel].filter(Boolean).join(', ') || row.State.trim() || null;
    const totalSites = extractTotalSites(row['Resort Type']);
    const service = mapService(row.Service);
    const marketType = mapMarketType(row['Resort Type']);

    const payload = {
      user_id: userId!,
      study_id: studyId,
      title: `${row.Property} - ${jobNumber}`,
      property_name: row.Property || 'Unnamed Property',
      location,
      city: city || null,
      state: stateLabel || null,
      latitude: lat,
      longitude: lng,
      market_type: marketType,
      total_sites: totalSites ?? 0,
      service,
      status: 'draft',
    };

    if (existing) {
      const { error } = await supabase
        .from('reports')
        .update(payload)
        .eq('id', existing.id);
      if (error) {
        errors.push(`${studyId}: ${error.message}`);
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from('reports').insert(payload);
      if (error) {
        errors.push(`${studyId}: ${error.message}`);
      } else {
        inserted++;
      }
    }
  }

  console.log('\nDone.');
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (Past Report): ${skipped}`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length}`);
    errors.slice(0, 10).forEach((e) => console.error(`    ${e}`));
    if (errors.length > 10) console.error(`    ... and ${errors.length - 10} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
