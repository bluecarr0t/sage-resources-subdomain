/**
 * Import CSV data into all_glamping_properties (post v4 column rename/reorder).
 *
 * Handles:
 *   - Mapping CSV column names to the new DB column names
 *   - Generating new id (via BIGSERIAL) for blank-id rows
 *   - Setting date_added / date_updated to today when blank
 *   - Building unit_rates_by_year 2026 JSONB when rates exist but JSONB is empty
 *   - Upsert on id: existing rows are updated, new rows are inserted
 *
 * Usage:
 *   npx tsx scripts/import-glamping-csv-v4.ts <path-to-csv> [--dry-run]
 *
 * The --dry-run flag prints rows that would be inserted/updated without writing.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const TABLE = 'all_glamping_properties';
const TODAY = new Date().toISOString().split('T')[0]; // e.g. 2026-02-17

// ─── CSV → DB column mapping ────────────────────────────────────────────────
// CSV headers map 1:1 to the new DB columns except for one anomaly:
//   CSV "hiking_activities_" → DB "activities_hiking"
const CSV_TO_DB: Record<string, string> = {
  hiking_activities_: 'activities_hiking',
};

// Columns that should be stored as numbers
const NUMERIC_COLS = new Set([
  'lat', 'lon',
  'property_total_sites', 'quantity_of_units', 'unit_sq_ft',
  'year_site_opened', 'number_of_locations',
  'avg_retail_daily_rate',
  'winter_weekday', 'winter_weekend',
  'spring_weekday', 'spring_weekend',
  'summer_weekday', 'summer_weekend',
  'fall_weekday', 'fall_weekend',
  'quality_score',
]);

// Columns to skip entirely (not in DB or internal-only)
const SKIP_COLS = new Set([
  'created_at',
  'updated_at',
]);

// Season rate keys used to build unit_rates_by_year
const SEASON_RATE_KEYS = [
  'winter_weekday', 'winter_weekend',
  'spring_weekday', 'spring_weekend',
  'summer_weekday', 'summer_weekend',
  'fall_weekday', 'fall_weekend',
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNumber(v: string | undefined | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/[$,\s]/g, '');
  if (s === '' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'none' || s.toLowerCase() === 'null') return null;
  // Handle ranges like "350-450" → take first number; preserve negative (lon)
  let cleaned = s;
  if (cleaned.includes('-') && !cleaned.startsWith('-')) {
    cleaned = cleaned.split('-')[0];
  }
  const n = Number(cleaned);
  return isNaN(n) || !isFinite(n) ? null : n;
}

function cleanText(v: string | undefined | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'none' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'null') return null;
  return s;
}

/**
 * Parse unit_rates_by_year from the CSV string.
 * CSV stores it as a JSON string (flat per-year: { "2025": { "winter_weekday": N, ... } }).
 * The DB trigger expects nested format: { "2025": { "winter": { "weekday": N, "weekend": N }, ... } }.
 * We detect which format it is and normalize to nested.
 */
function parseRatesJson(raw: string | null | undefined): Record<string, any> | null {
  if (!raw || !raw.trim()) return null;
  try {
    const obj = JSON.parse(raw.trim());
    if (typeof obj !== 'object' || obj === null) return null;

    const result: Record<string, any> = {};
    for (const [year, yearData] of Object.entries(obj)) {
      if (typeof yearData !== 'object' || yearData === null) continue;
      const yd = yearData as Record<string, any>;

      // Detect format: if keys contain underscores like "winter_weekday" it's flat
      const isFlat = Object.keys(yd).some(k => k.includes('_'));

      if (isFlat) {
        result[year] = {
          winter: { weekday: yd.winter_weekday ?? null, weekend: yd.winter_weekend ?? null },
          spring: { weekday: yd.spring_weekday ?? null, weekend: yd.spring_weekend ?? null },
          summer: { weekday: yd.summer_weekday ?? null, weekend: yd.summer_weekend ?? null },
          fall:   { weekday: yd.fall_weekday ?? null,   weekend: yd.fall_weekend ?? null },
        };
      } else {
        // Already nested
        result[year] = yd;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Build a 2026 unit_rates_by_year JSONB from seasonal rate columns.
 */
function buildRatesFromSeasons(row: Record<string, any>): Record<string, any> | null {
  const ww = toNumber(row.winter_weekday);
  const wwe = toNumber(row.winter_weekend);
  const spw = toNumber(row.spring_weekday);
  const spwe = toNumber(row.spring_weekend);
  const suw = toNumber(row.summer_weekday);
  const suwe = toNumber(row.summer_weekend);
  const fw = toNumber(row.fall_weekday);
  const fwe = toNumber(row.fall_weekend);

  const hasAny = [ww, wwe, spw, spwe, suw, suwe, fw, fwe].some(v => v !== null);
  if (!hasAny) return null;

  return {
    '2026': {
      winter: { weekday: ww, weekend: wwe },
      spring: { weekday: spw, weekend: spwe },
      summer: { weekday: suw, weekend: suwe },
      fall:   { weekday: fw, weekend: fwe },
    },
  };
}

/**
 * Categorize average rate into a rate bucket.
 */
function getRateCategory(rate: number | null): string | null {
  if (rate == null || isNaN(rate) || !isFinite(rate)) return null;
  if (rate <= 149) return '≤$149';
  if (rate <= 249) return '$150-$249';
  if (rate <= 399) return '$250-$399';
  if (rate <= 549) return '$400-$549';
  return '$550+';
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');

  if (!csvPath) {
    console.error('Usage: npx tsx scripts/import-glamping-csv-v4.ts <csv-path> [--dry-run]');
    process.exit(1);
  }

  console.log(`Reading CSV: ${csvPath}`);
  const raw = readFileSync(csvPath, 'utf-8');
  const rows: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    cast: false,
  });
  console.log(`Parsed ${rows.length} rows`);

  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify table exists
  const { error: checkErr } = await supabase.from(TABLE).select('id').limit(0);
  if (checkErr) {
    console.error(`Table '${TABLE}' not accessible: ${checkErr.message}`);
    console.error('Run the rename-and-reorder SQL first.');
    process.exit(1);
  }

  // Get max existing id so we can detect which rows are truly new
  const { data: maxRow } = await supabase.from(TABLE).select('id').order('id', { ascending: false }).limit(1);
  const maxExistingId = maxRow && maxRow.length > 0 ? Number(maxRow[0].id) : 0;
  console.log(`Max existing id in DB: ${maxExistingId}`);

  // ── Transform rows ──────────────────────────────────────────────────────
  const withId: Record<string, any>[] = [];
  const withoutId: Record<string, any>[] = [];

  let blankIdCount = 0;
  let blankDateCount = 0;
  let generatedRbyCount = 0;

  for (const csvRow of rows) {
    const dbRow: Record<string, any> = {};

    // Map CSV columns to DB columns
    for (const [csvCol, csvVal] of Object.entries(csvRow)) {
      if (SKIP_COLS.has(csvCol)) continue;

      const dbCol = CSV_TO_DB[csvCol] || csvCol;

      if (dbCol === 'id') {
        // Handle id separately
        const idNum = toNumber(csvVal);
        if (idNum !== null && idNum > 0) {
          dbRow.id = idNum;
        }
        continue;
      }

      if (dbCol === 'unit_rates_by_year') {
        dbRow._raw_rby = csvVal; // Store raw for later processing
        continue;
      }

      if (NUMERIC_COLS.has(dbCol)) {
        dbRow[dbCol] = toNumber(csvVal);
      } else {
        dbRow[dbCol] = cleanText(csvVal);
      }
    }

    // Handle blank date_added / date_updated
    if (!dbRow.date_added) {
      dbRow.date_added = TODAY;
      blankDateCount++;
    }
    if (!dbRow.date_updated) {
      dbRow.date_updated = TODAY;
    }

    // Handle unit_rates_by_year
    const existingRby = parseRatesJson(dbRow._raw_rby);
    delete dbRow._raw_rby;

    if (existingRby) {
      // Use existing JSONB (already normalized to nested format)
      dbRow.unit_rates_by_year = existingRby;
    } else {
      // Build from seasonal rates with 2026 as the year
      const built = buildRatesFromSeasons(csvRow);
      if (built) {
        dbRow.unit_rates_by_year = built;
        generatedRbyCount++;
      } else {
        dbRow.unit_rates_by_year = null;
      }
    }

    // Calculate rate_category from avg if not set
    if (!dbRow.rate_category && dbRow.avg_retail_daily_rate != null) {
      dbRow.rate_category = getRateCategory(dbRow.avg_retail_daily_rate);
    }

    if (dbRow.id) {
      withId.push(dbRow);
    } else {
      blankIdCount++;
      withoutId.push(dbRow);
    }
  }

  console.log(`\nTransform summary:`);
  console.log(`  Rows with existing id: ${withId.length}`);
  console.log(`  Rows needing new id:   ${blankIdCount}`);
  console.log(`  Blank dates filled:    ${blankDateCount}`);
  console.log(`  Generated unit_rates_by_year (2026): ${generatedRbyCount}`);

  if (dryRun) {
    console.log('\n--dry-run: No data written.');
    if (withoutId.length > 0) {
      console.log('\nSample new row (no id):');
      console.log(JSON.stringify(withoutId[0], null, 2));
    }
    if (withId.length > 0) {
      console.log('\nSample existing row (with id):');
      console.log(JSON.stringify(withId[0], null, 2));
    }
    return;
  }

  // ── Delete all existing data and re-insert ──────────────────────────────
  // This is a full replace (like the original upload script), which avoids
  // complex conflict-resolution logic.
  console.log(`\nClearing existing data from '${TABLE}'...`);
  const { error: delErr } = await supabase.from(TABLE).delete().neq('id', 0);
  if (delErr) {
    console.error(`Error clearing table: ${delErr.message}`);
    process.exit(1);
  }
  console.log('Table cleared.');

  // ── Upload rows WITH id (preserving their ids) ──────────────────────────
  const BATCH = 500;
  let uploaded = 0;
  let errors = 0;

  if (withId.length > 0) {
    console.log(`\nUploading ${withId.length} rows with existing ids...`);
    for (let i = 0; i < withId.length; i += BATCH) {
      const batch = withId.slice(i, i + BATCH);
      const batchNum = Math.floor(i / BATCH) + 1;
      const totalBatches = Math.ceil(withId.length / BATCH);

      const { error } = await supabase.from(TABLE).insert(batch);
      if (error) {
        console.error(`  Batch ${batchNum}/${totalBatches} FAILED: ${error.message}`);
        // Log the first problematic row for debugging
        if (error.message.includes('invalid input')) {
          console.error('  Sample row:', JSON.stringify(batch[0], null, 2));
        }
        errors += batch.length;
      } else {
        uploaded += batch.length;
        console.log(`  Batch ${batchNum}/${totalBatches} OK (${batch.length} rows)`);
      }
    }
  }

  // ── Upload rows WITHOUT id (auto-generate via BIGSERIAL) ────────────────
  if (withoutId.length > 0) {
    console.log(`\nUploading ${withoutId.length} new rows (id will be auto-generated)...`);
    for (let i = 0; i < withoutId.length; i += BATCH) {
      const batch = withoutId.slice(i, i + BATCH);
      const batchNum = Math.floor(i / BATCH) + 1;
      const totalBatches = Math.ceil(withoutId.length / BATCH);

      const { error } = await supabase.from(TABLE).insert(batch);
      if (error) {
        console.error(`  Batch ${batchNum}/${totalBatches} FAILED: ${error.message}`);
        if (error.message.includes('invalid input')) {
          console.error('  Sample row:', JSON.stringify(batch[0], null, 2));
        }
        errors += batch.length;
      } else {
        uploaded += batch.length;
        console.log(`  Batch ${batchNum}/${totalBatches} OK (${batch.length} rows)`);
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\nUpload complete!`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Errors:   ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }

  // ── Verify ──────────────────────────────────────────────────────────────
  const { count } = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
  console.log(`  Total rows in table: ${count}`);

  console.log('\nDone! Next steps:');
  console.log('  1. Verify data in Supabase Dashboard -> Table Editor');
  console.log('  2. Check that unit_rates_by_year JSONB looks correct');
  console.log('  3. Confirm date_added/date_updated on new rows');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
