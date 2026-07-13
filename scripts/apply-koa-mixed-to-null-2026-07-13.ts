#!/usr/bin/env npx tsx
/**
 * P0: Clear KOA Mixed placeholders → unit_type null (2026-07-13).
 *
 * KOA parks are multi-SKU campgrounds (RV / cabin / tent). Do not force RV Site.
 * Optional later: split sibling rows from KOA unit pages.
 *
 * Usage:
 *   npx tsx scripts/apply-koa-mixed-to-null-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-koa-mixed-to-null-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const SOURCE = 'koa_directory_sitemap_2026_05';
const TODAY = '2026-07-13';
const NOTE_PREFIX = `[${TODAY}] KOA Mixed→null P0`;
const NOTE = `${NOTE_PREFIX}: Cleared unit_type Mixed→null. KOA campgrounds are multi-product (RV pads / cabins / tent sites); do not store Mixed. Split sibling unit rows from KOA unit pages later if needed.`;
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH = 50;

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

function appendNote(existing: string | null | undefined): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX)) return base;
  return base ? `${base}\n\n${NOTE}` : NOTE;
}

async function fetchAll(): Promise<{ id: number; property_name: string; notes: string | null }[]> {
  const rows: { id: number; property_name: string; notes: string | null }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, property_name, notes')
      .eq('unit_type', 'Mixed')
      .eq('discovery_source', SOURCE)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data) {
      rows.push({
        id: Number(r.id),
        property_name: String(r.property_name),
        notes: (r.notes as string | null) ?? null,
      });
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no writes\n' : 'LIVE update\n');

  const rows = await fetchAll();
  console.log(`Found ${rows.length} KOA Mixed rows`);

  if (!rows.length) {
    console.log('Nothing to update.');
    return;
  }

  if (DRY_RUN) {
    console.log(`Would set unit_type=null on ${rows.length} rows (sample):`);
    for (const r of rows.slice(0, 5)) {
      console.log(`  #${r.id} ${r.property_name}`);
    }
    return;
  }

  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (r) => {
        const { error } = await supabase
          .from(TABLE)
          .update({
            unit_type: null,
            notes: appendNote(r.notes),
          })
          .eq('id', r.id)
          .eq('unit_type', 'Mixed');
        if (error) throw new Error(`id ${r.id}: ${error.message}`);
        updated++;
      })
    );
    console.log(`Updated ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }

  const { count } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('unit_type', 'Mixed')
    .eq('discovery_source', SOURCE);

  console.log(`\nDone. Updated ${updated}. Remaining KOA Mixed: ${count ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
