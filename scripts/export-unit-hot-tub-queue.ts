#!/usr/bin/env npx tsx
/**
 * Export prioritized unit_hot_tub blank queue (Amenity Impact P0).
 *
 *   npx tsx scripts/export-unit-hot-tub-queue.ts
 *   npx tsx scripts/export-unit-hot-tub-queue.ts --unit-types "Safari Tent,Cabin"
 *
 * Writes scripts/.tmp-hot-tub-review/unit-hot-tub-queue-YYYY-MM-DD.csv
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import {
  buildPrioritizedUnitHotTubQueue,
  fetchCohortByProperty,
  parseUnitTypesArg,
} from '@/lib/glamping-hot-tub-research/cohort';
import { todayIsoDate } from '@/lib/glamping-hot-tub-research/normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const args = process.argv.slice(2);
  const unitTypesIdx = args.indexOf('--unit-types');
  const unitTypes = parseUnitTypesArg(
    unitTypesIdx >= 0 ? args[unitTypesIdx + 1] : undefined
  );

  const byProperty = await fetchCohortByProperty(supabase, {
    onlyUnitHotTubNull: true,
    unitTypes,
    skipAlreadyResearched: false,
  });

  const queue = buildPrioritizedUnitHotTubQueue(byProperty).filter((row) =>
    unitTypes == null || unitTypes.length === 0
      ? true
      : unitTypes.some(
          (u) =>
            String(row.unit_type ?? '')
              .trim()
              .toLowerCase() === u.trim().toLowerCase()
        )
  );

  const outDir = resolve(process.cwd(), 'scripts/.tmp-hot-tub-review');
  mkdirSync(outDir, { recursive: true });
  const stamp = todayIsoDate();
  const outPath = join(outDir, `unit-hot-tub-queue-${stamp}.csv`);

  const header = [
    'priority_stratum',
    'id',
    'property_id',
    'property_name',
    'site_name',
    'unit_type',
    'state',
    'unit_weight',
    'rate_avg_retail_daily_rate',
    'unit_hot_tub_current',
    'property_hot_tub_current',
    'unit_hot_tub_or_sauna_current',
    'url',
    'ota_url_hipcamp',
    'ota_url_airbnb',
    'discovery_source',
  ];

  const lines = [
    header.join(','),
    ...queue.map((r) =>
      [
        r.priority_stratum,
        r.id,
        r.property_id,
        r.property_name ?? '',
        r.site_name ?? '',
        r.unit_type ?? '',
        r.state ?? '',
        r.unit_weight,
        r.rate_avg_retail_daily_rate ?? '',
        r.unit_hot_tub_current,
        r.property_hot_tub_current,
        r.unit_hot_tub_or_sauna_current,
        r.url ?? '',
        r.ota_url_hipcamp ?? '',
        r.ota_url_airbnb ?? '',
        r.discovery_source ?? '',
      ]
        .map((v) => escapeCsv(String(v)))
        .join(',')
    ),
  ];

  writeFileSync(outPath, lines.join('\n') + '\n');

  const safariCabin = queue.filter(
    (r) => r.priority_stratum === 'P0-Safari/Cabin-blank'
  );
  const ratedSafariCabin = safariCabin.filter(
    (r) => r.rate_avg_retail_daily_rate != null
  );
  console.log(`Wrote ${queue.length} queue rows → ${outPath}`);
  console.log(
    `  P0 Safari/Cabin blanks: ${safariCabin.length} rows (${ratedSafariCabin.length} rated)`
  );
  console.log(
    `  Distinct properties (all strata): ${new Set(queue.map((r) => r.property_id)).size}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
