#!/usr/bin/env npx tsx
/**
 * Backfill rate_unit_rates_by_year for records that have rate_avg_retail_daily_rate
 * but empty rate_unit_rates_by_year.
 *
 * Adds 2026 structure. Uses season-specific weekday/weekend rates when available,
 * otherwise falls back to rate_avg_retail_daily_rate.
 *
 * Usage:
 *   npx tsx scripts/backfill-rate-unit-rates-by-year.ts
 *   npx tsx scripts/backfill-rate-unit-rates-by-year.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

const TABLE = 'all_glamping_properties';
const BATCH_SIZE = 50;

function toNum(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function buildRateUnitRatesByYear(row: {
  rate_avg_retail_daily_rate: unknown;
  rate_winter_weekday: unknown;
  rate_winter_weekend: unknown;
  rate_spring_weekday: unknown;
  rate_spring_weekend: unknown;
  rate_summer_weekday: unknown;
  rate_summer_weekend: unknown;
  rate_fall_weekday: unknown;
  rate_fall_weekend: unknown;
}): Record<string, unknown> {
  const avg = toNum(row.rate_avg_retail_daily_rate) ?? 0;
  const wWd = toNum(row.rate_winter_weekday);
  const wWe = toNum(row.rate_winter_weekend);
  const sWd = toNum(row.rate_spring_weekday);
  const sWe = toNum(row.rate_spring_weekend);
  const uWd = toNum(row.rate_summer_weekday);
  const uWe = toNum(row.rate_summer_weekend);
  const fWd = toNum(row.rate_fall_weekday);
  const fWe = toNum(row.rate_fall_weekend);

  const fallback = (wd: number | null, we: number | null) => ({
    weekday: wd ?? avg,
    weekend: we ?? avg,
  });

  return {
    '2026': {
      winter: fallback(wWd, wWe),
      spring: fallback(sWd, sWe),
      summer: fallback(uWd, uWe),
      fall: fallback(fWd, fWe),
    },
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, property_name, rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend')
    .is('rate_unit_rates_by_year', null)
    .not('rate_avg_retail_daily_rate', 'is', null);

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('No records to update.');
    return;
  }

  console.log(`Found ${rows.length} records with rate_avg_retail_daily_rate but empty rate_unit_rates_by_year.\n`);

  if (dryRun) {
    const sample = rows[0] as Record<string, unknown>;
    const built = buildRateUnitRatesByYear(sample as Parameters<typeof buildRateUnitRatesByYear>[0]);
    console.log('[DRY RUN] Sample built JSON:', JSON.stringify(built, null, 2));
    console.log('\nWould update', rows.length, 'records.');
    return;
  }

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      const r = row as Record<string, unknown> & { id: number };
      const rateUnitRatesByYear = buildRateUnitRatesByYear(r);
      const { error: updateError } = await supabase
        .from(TABLE)
        .update({ rate_unit_rates_by_year: rateUnitRatesByYear })
        .eq('id', r.id);

      if (updateError) {
        console.error(`Update id=${r.id} failed:`, updateError.message);
        failed++;
      } else {
        updated++;
      }
    }
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches}: ${updated} updated, ${failed} failed`);
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
