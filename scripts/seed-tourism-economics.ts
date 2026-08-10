#!/usr/bin/env npx tsx
/**
 * Seed / refresh tourism_economics from a CSV or built-in starter rows.
 *
 * Usage:
 *   npx tsx scripts/seed-tourism-economics.ts
 *   npx tsx scripts/seed-tourism-economics.ts --csv path/to/tourism.csv
 *
 * CSV columns (header required):
 *   geo_level,state,county,year,lodging_spend,total_spend,employment,source
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL + service key).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

type Row = {
  geo_level: 'state' | 'county';
  state: string;
  county: string | null;
  year: number;
  lodging_spend: number | null;
  total_spend: number | null;
  employment: number | null;
  source: string;
};

const STARTER: Row[] = [
  { geo_level: 'state', state: 'CO', county: null, year: 2023, lodging_spend: 8_500_000_000, total_spend: 28_000_000_000, employment: 180_000, source: 'manual_seed_placeholder' },
  { geo_level: 'state', state: 'OR', county: null, year: 2023, lodging_spend: 3_200_000_000, total_spend: 12_500_000_000, employment: 110_000, source: 'manual_seed_placeholder' },
  { geo_level: 'state', state: 'UT', county: null, year: 2023, lodging_spend: 4_100_000_000, total_spend: 11_800_000_000, employment: 95_000, source: 'manual_seed_placeholder' },
  { geo_level: 'state', state: 'TX', county: null, year: 2023, lodging_spend: 18_000_000_000, total_spend: 85_000_000_000, employment: 650_000, source: 'manual_seed_placeholder' },
  { geo_level: 'state', state: 'CA', county: null, year: 2023, lodging_spend: 35_000_000_000, total_spend: 150_000_000_000, employment: 1_100_000, source: 'manual_seed_placeholder' },
  { geo_level: 'state', state: 'WI', county: null, year: 2023, lodging_spend: 2_400_000_000, total_spend: 13_000_000_000, employment: 170_000, source: 'manual_seed_placeholder' },
  { geo_level: 'state', state: 'NY', county: null, year: 2023, lodging_spend: 22_000_000_000, total_spend: 79_000_000_000, employment: 450_000, source: 'manual_seed_placeholder' },
  { geo_level: 'state', state: 'FL', county: null, year: 2023, lodging_spend: 28_000_000_000, total_spend: 112_000_000_000, employment: 1_400_000, source: 'manual_seed_placeholder' },
];

function parseCsv(path: string): Row[] {
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const geo = cols[idx('geo_level')] as 'state' | 'county';
    const num = (i: number) => {
      const v = cols[i];
      if (!v) return null;
      const n = Number(v.replace(/[$,]/g, ''));
      return Number.isFinite(n) ? n : null;
    };
    return {
      geo_level: geo === 'county' ? 'county' : 'state',
      state: cols[idx('state')] ?? '',
      county: cols[idx('county')] || null,
      year: Number(cols[idx('year')]) || new Date().getFullYear() - 1,
      lodging_spend: num(idx('lodging_spend')),
      total_spend: num(idx('total_spend')),
      employment: num(idx('employment')),
      source: cols[idx('source')] || 'csv_seed',
    };
  }).filter((r) => r.state);
}

async function main() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const csvArgIdx = process.argv.indexOf('--csv');
  const csvPath = csvArgIdx >= 0 ? resolve(process.argv[csvArgIdx + 1] ?? '') : null;
  const rows =
    csvPath && existsSync(csvPath) ? parseCsv(csvPath) : STARTER;

  if (!rows.length) {
    console.error('No rows to seed');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let ok = 0;
  for (const row of rows) {
    const payload = {
      ...row,
      county: row.county || null,
      updated_at: new Date().toISOString(),
    };

    let existingQuery = supabase
      .from('tourism_economics')
      .select('id')
      .eq('geo_level', row.geo_level)
      .eq('state', row.state)
      .eq('year', row.year);
    existingQuery = row.county
      ? existingQuery.eq('county', row.county)
      : existingQuery.is('county', null);

    const { data: existing } = await existingQuery.maybeSingle();

    let error;
    if (existing?.id) {
      ({ error } = await supabase.from('tourism_economics').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('tourism_economics').insert(payload));
    }
    if (error) {
      console.warn('Upsert failed:', row.state, row.year, error.message);
    } else {
      ok += 1;
    }
  }
  console.log(`Seeded ${ok}/${rows.length} tourism_economics rows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
