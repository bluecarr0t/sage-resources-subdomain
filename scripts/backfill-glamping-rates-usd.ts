#!/usr/bin/env npx tsx
/**
 * Backfill: convert non-USD nightly rates in all_glamping_properties to USD.
 *
 * Usage:
 *   npx tsx scripts/backfill-glamping-rates-usd.ts --dry-run
 *   npx tsx scripts/backfill-glamping-rates-usd.ts
 *   npx tsx scripts/backfill-glamping-rates-usd.ts --property-id 04267af0-1eb0-4fae-be23-506051ffb2ff
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  applyGlampingRatesToUsd,
  detectSourceCurrencyFromRow,
  GLAMPING_DAILY_RATE_COLUMNS,
} from '../lib/glamping-rates-usd';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = 'all_glamping_properties';
const PAGE = 500;

function parseArgs(): { dryRun: boolean; propertyId: string | null } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let propertyId: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    if (args[i] === '--property-id' && args[i + 1]) propertyId = args[++i];
  }
  return { dryRun, propertyId };
}

function pickRatePatch(row: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const col of GLAMPING_DAILY_RATE_COLUMNS) {
    if (col in row) patch[col] = row[col];
  }
  if ('rate_unit_rates_by_year' in row) {
    patch.rate_unit_rates_by_year = row.rate_unit_rates_by_year;
  }
  return patch;
}

async function main(): Promise<void> {
  const { dryRun, propertyId } = parseArgs();
  let offset = 0;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  console.log(`Backfill glamping rates → USD (dry-run: ${dryRun})`);

  for (;;) {
    let q = supabase
      .from(TABLE)
      .select(
        'id, property_name, property_id, rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend, rate_unit_rates_by_year'
      )
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (propertyId) {
      q = q.eq('property_id', propertyId);
    }

    const { data, error } = await q;
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned++;
      const currency = detectSourceCurrencyFromRow(row);
      if (!currency || currency === 'USD') {
        skipped++;
        continue;
      }
      const { row: convertedRow, converted, sourceCurrency } = applyGlampingRatesToUsd(row);
      if (!converted) {
        skipped++;
        continue;
      }
      const patch = pickRatePatch(convertedRow);
      console.log(
        `  id=${row.id} ${row.property_name} (${sourceCurrency}→USD) avg ${row.rate_avg_retail_daily_rate} → ${patch.rate_avg_retail_daily_rate}`
      );
      if (!dryRun) {
        const { error: upErr } = await supabase
          .from(TABLE)
          .update(patch)
          .eq('id', row.id);
        if (upErr) {
          console.error(`    update failed: ${upErr.message}`);
          process.exit(1);
        }
      }
      updated++;
    }

    offset += PAGE;
    if (propertyId) break;
    if (rows.length < PAGE) break;
  }

  console.log(`\nScanned: ${scanned}, updated: ${updated}, skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
