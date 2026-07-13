#!/usr/bin/env npx tsx
/**
 * Seed rate_basis for known package / all-inclusive (and B&B) rows.
 *
 * Usage:
 *   npx tsx scripts/apply-rate-basis-seed-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-rate-basis-seed-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { GlampingRateBasis } from '@/lib/glamping-rate-basis';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DRY_RUN = process.argv.includes('--dry-run');

type Seed = {
  id: number;
  rate_basis: GlampingRateBasis;
  rate_basis_notes: string;
};

const SEEDS: Seed[] = [
  // Rock Creek — Forbes 5-star all-inclusive ranch BAR
  {
    id: 10171,
    rate_basis: 'all_inclusive',
    rate_basis_notes:
      'Rock Creek Family Canvas Cabin — BAR includes meals, drinks, 35+ activities, airport transfers',
  },
  {
    id: 10172,
    rate_basis: 'all_inclusive',
    rate_basis_notes:
      'Rock Creek Classic Canvas Cabin — BAR includes meals, drinks, 35+ activities, airport transfers',
  },
  // Mustang Monument
  {
    id: 9907,
    rate_basis: 'all_inclusive',
    rate_basis_notes:
      'Mustang Monument Luxury Tipis — $2400/night meals, soft drinks, house wine; activities per package',
  },
  {
    id: 10495,
    rate_basis: 'all_inclusive',
    rate_basis_notes:
      'Mustang Monument Safari Cottages — $2600/night meals, soft drinks, house wine',
  },
  // Westgate / Glamping Florida Luxe Teepee — activity-package rate (coffee/pastry; not full meals)
  {
    id: 9902,
    rate_basis: 'all_inclusive',
    rate_basis_notes:
      'Westgate River Ranch Teepee — Luxe package includes activities, golf cart, VIP rodeo, coffee/pastry',
  },
  {
    id: 12061,
    rate_basis: 'all_inclusive',
    rate_basis_notes:
      'Westgate River Ranch Luxe Teepee — same all-inclusive activity package as Teepee SKU',
  },
  {
    id: 9901,
    rate_basis: 'all_inclusive',
    rate_basis_notes:
      'Glamping Florida Luxe Teepee — Westgate River Ranch Luxe activity-package product',
  },
  // Paws Up
  {
    id: 10173,
    rate_basis: 'all_inclusive',
    rate_basis_notes: 'The Resort at Paws Up One-Bedroom Tent — package resort ADR',
  },
  {
    id: 10405,
    rate_basis: 'all_inclusive',
    rate_basis_notes: 'Paws Up Montana luxury tents — package resort ADR',
  },
  {
    id: 10481,
    rate_basis: 'all_inclusive',
    rate_basis_notes: 'Paws Up Montana luxury cabins — package resort ADR',
  },
  // Dunton
  {
    id: 10116,
    rate_basis: 'all_inclusive',
    rate_basis_notes: 'Dunton River Camp — package luxury tent ADR',
  },
  {
    id: 10842,
    rate_basis: 'all_inclusive',
    rate_basis_notes: 'Dunton Hot Springs — package luxury ADR',
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or service role key');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`\n=== Seed rate_basis (${SEEDS.length} rows)${DRY_RUN ? ' DRY RUN' : ''} ===`);
  for (const seed of SEEDS) {
    const { data: row, error: fetchErr } = await supabase
      .from(TABLE)
      .select('id,property_name,site_name,rate_basis')
      .eq('id', seed.id)
      .maybeSingle();
    if (fetchErr) throw new Error(`fetch id=${seed.id}: ${fetchErr.message}`);
    if (!row) throw new Error(`Missing id=${seed.id}`);

    console.log(
      `${DRY_RUN ? 'DRY ' : ''}PATCH id=${seed.id} ${row.property_name} | ${row.site_name} | ${row.rate_basis ?? 'null'} → ${seed.rate_basis}`
    );
    if (DRY_RUN) continue;

    const { error } = await supabase
      .from(TABLE)
      .update({
        rate_basis: seed.rate_basis,
        rate_basis_notes: seed.rate_basis_notes,
        date_updated: new Date().toISOString().slice(0, 10),
      })
      .eq('id', seed.id);
    if (error) throw new Error(`update id=${seed.id}: ${error.message}`);
  }
  console.log('Done.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
