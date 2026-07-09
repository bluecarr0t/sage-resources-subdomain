#!/usr/bin/env npx tsx
/**
 * Round 3 Safari Tent unit-mix corrections (Jul 2026 tier-16 audit):
 * Yellowstone Dreamin duplicate delete, UC Great Smoky/Moab 41→40,
 * Rustic Rook 30→28, Camp Aramoni 12→11, null/duplicate stub deletes.
 *
 * Usage:
 *   npx tsx scripts/apply-safari-tent-unit-mix-corrections-round3-2026-07-08.ts
 *   npx tsx scripts/apply-safari-tent-unit-mix-corrections-round3-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const RESEARCH_TAG = 'safari_tent_unit_mix_corrections_round3_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  const marker = addition.slice(0, 48);
  if (base.includes(marker)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

async function patchById(
  client: SupabaseClient,
  id: number,
  patch: Record<string, unknown>,
  label: string
): Promise<void> {
  console.log(`PATCH ${label} id=${id}`, JSON.stringify(patch, null, 2));
  if (DRY_RUN) return;
  const { error } = await client.from(TABLE).update(patch).eq('id', id);
  if (error) throw new Error(`${label} id=${id}: ${error.message}`);
}

async function deleteByIds(client: SupabaseClient, ids: number[], label: string): Promise<void> {
  console.log(`DELETE ${label} ids=${ids.join(',')}`);
  if (DRY_RUN) return;
  const { error } = await client.from(TABLE).delete().in('id', ids);
  if (error) throw new Error(`${label} delete: ${error.message}`);
}

async function main(): Promise<void> {
  // 1. Yellowstone Dreamin Camp — duplicate row (12 + 12 → 12)
  await deleteByIds(supabase, [10184], 'Yellowstone Dreamin Camp duplicate Tent Camp row');

  // 2. Under Canvas Great Smoky Mountains — 41 → 40 (UC 2026 fact sheet)
  const gsmQty: Record<number, number> = {
    10248: 4,
    10249: 18, // Deluxe reduced 19→18
    10250: 6,
    10251: 12,
  };
  for (const [id, qty] of Object.entries(gsmQty)) {
    await patchById(
      supabase,
      Number(id),
      { quantity_of_units: String(qty), property_total_sites: '40', date_updated: TODAY },
      'UC Great Smoky Mountains SKU'
    );
  }

  // 3. Under Canvas Moab — 41 → 40 (UC 2026 fact sheet)
  const moabQty: Record<number, number> = {
    10293: 5,
    10294: 2,
    10295: 18, // Deluxe reduced 19→18
    10296: 15,
  };
  for (const [id, qty] of Object.entries(moabQty)) {
    await patchById(
      supabase,
      Number(id),
      { quantity_of_units: String(qty), property_total_sites: '40', date_updated: TODAY },
      'UC Moab SKU'
    );
  }

  // 4. Rustic Rook Resort — 30 → 28 glamping tents (operator 2026 employment page)
  const { data: rusticRook } = await supabase.from(TABLE).select('notes').eq('id', 10119).single();
  await patchById(
    supabase,
    10119,
    {
      quantity_of_units: '23',
      property_total_sites: '28',
      notes: appendNote(
        rusticRook?.notes,
        `${RESEARCH_TAG}: Homestead tent count 25→23; property total glamping tents 28 per operator (5 Estate + 23 Homestead).`
      ),
      date_updated: TODAY,
    },
    'Rustic Rook Homestead tents'
  );
  await patchById(
    supabase,
    10118,
    { property_total_sites: '28', date_updated: TODAY },
    'Rustic Rook Estate tents'
  );

  // 5. Camp Aramoni — 12 → 11 safari tents (operator site)
  await deleteByIds(supabase, [9693], 'Camp Aramoni null safari stub');
  await patchById(
    supabase,
    10140,
    {
      quantity_of_units: '11',
      property_total_sites: '11',
      date_updated: TODAY,
    },
    'Camp Aramoni tents'
  );

  // 6. Null / duplicate stub cleanup
  await deleteByIds(supabase, [9718], 'Beaver Island Retreat null safari stub');
  await deleteByIds(supabase, [9551], 'Ventana Big Sur duplicate non-glamping safari row');

  console.log(DRY_RUN ? '\nDry run complete.' : '\nSafari tent unit-mix corrections round 3 applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
