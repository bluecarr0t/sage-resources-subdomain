#!/usr/bin/env npx tsx
/**
 * Upload Sage Glamping Data CSV to all_glamping_properties.
 *
 * - Rows WITH id: UPDATE existing record (override all columns from CSV)
 * - Rows WITHOUT id (blank): INSERT new record (Postgres generates id)
 *
 * Usage:
 *   npx tsx scripts/upload-glamping-csv.ts "/path/to/Sage Glamping Data 2026 - 2.18.26.csv"
 *   npx tsx scripts/upload-glamping-csv.ts "/path/to/file.csv" --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const TABLE = 'all_glamping_properties';
const BATCH_SIZE = 50;

// Columns to exclude from upsert (id used for match, created_at/updated_at are DB-managed)
const SKIP_COLS = new Set(['id', 'created_at', 'updated_at']);

function toNull(val: unknown): string | number | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function toNum(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  let s = String(val).trim().replace(/[$,\s]/g, '');
  if (s === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function toJson(val: unknown): Record<string, unknown> | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '') return null;
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function csvRowToDbRow(row: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, rawVal] of Object.entries(row)) {
    if (SKIP_COLS.has(key)) continue;

    const val = rawVal === undefined ? null : String(rawVal).trim();
    const isEmpty = val === '';

    if (key === 'rate_unit_rates_by_year') {
      out[key] = toJson(rawVal);
      continue;
    }

    // Numeric columns
    const numCols = new Set([
      'lat', 'lon', 'property_total_sites', 'quantity_of_units', 'year_site_opened',
      'number_of_locations', 'unit_sq_ft', 'rate_avg_retail_daily_rate',
      'rate_winter_weekday', 'rate_winter_weekend', 'rate_spring_weekday', 'rate_spring_weekend',
      'rate_summer_weekday', 'rate_summer_weekend', 'rate_fall_weekday', 'rate_fall_weekend',
      'quality_score',
    ]);
    if (numCols.has(key)) {
      out[key] = toNum(rawVal);
      continue;
    }

    out[key] = isEmpty ? null : val;
  }

  // Required columns for insert (NOT NULL in DB)
  if (out.is_glamping_property == null || out.is_glamping_property === '') {
    out.is_glamping_property = 'Yes';
  }
  if (out.is_closed == null || out.is_closed === '') {
    out.is_closed = 'No';
  }

  return out;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const csvPath = args[0] || resolve(process.cwd(), 'Sage Glamping Data 2026 - 2.18.26.csv');
  const dryRun = process.argv.includes('--dry-run');

  console.log(`Reading ${csvPath}...`);
  let raw: string;
  try {
    raw = readFileSync(csvPath, 'utf-8');
  } catch (e) {
    console.error(`Failed to read: ${(e as Error).message}`);
    process.exit(1);
  }

  const rows: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    cast: false,
  });

  const toUpdate: { id: number; row: Record<string, unknown> }[] = [];
  const toInsert: Record<string, unknown>[] = [];

  for (const row of rows) {
    const dbRow = csvRowToDbRow(row);
    const idVal = row.id?.trim();
    if (idVal && !isNaN(parseInt(idVal, 10))) {
      toUpdate.push({ id: parseInt(idVal, 10), row: dbRow });
    } else {
      toInsert.push(dbRow);
    }
  }

  console.log(`Rows with id (update): ${toUpdate.length}`);
  console.log(`Rows without id (insert): ${toInsert.length}`);

  if (dryRun) {
    console.log('\n[DRY RUN] No data written.');
    return;
  }

  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  // Updates: run in parallel batches
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ id, row }) => supabase.from(TABLE).update(row).eq('id', id))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.error) {
        errors++;
      } else if (r.status === 'fulfilled') {
        updated++;
      } else {
        errors++;
      }
    }
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toUpdate.length / BATCH_SIZE);
    console.log(`Updates batch ${batchNum}/${totalBatches} (${updated} updated, ${errors} errors)`);
  }

  // Inserts: batch insert (omit id, DB generates)
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(TABLE).insert(batch);
    if (error) {
      console.error(`Insert batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toInsert.length / BATCH_SIZE);
      console.log(`Inserts batch ${batchNum}/${totalBatches} (${inserted} rows)`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Inserted: ${inserted}, Errors: ${errors}`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
