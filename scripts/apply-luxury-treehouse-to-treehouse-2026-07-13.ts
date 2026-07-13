#!/usr/bin/env npx tsx
/**
 * Merge Luxury Treehouse / Luxury Tree House → Treehouse (2026-07-13).
 *
 * Usage:
 *   npx tsx scripts/apply-luxury-treehouse-to-treehouse-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-luxury-treehouse-to-treehouse-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const TODAY = '2026-07-13';
const NOTE_PREFIX = `[${TODAY}] Luxury Treehouse → Treehouse`;
const DRY_RUN = process.argv.includes('--dry-run');
const TREEHOUSE = normalizeGlampingUnitTypeForStorage('Treehouse') ?? 'Treehouse';

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

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no writes\n' : 'LIVE update\n');

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, property_name, site_name, unit_type, notes')
    .or(
      'unit_type.ilike.Luxury Treehouse,unit_type.ilike.Luxury Tree House,unit_type.ilike.Luxury Treehouses,unit_type.ilike.Luxury Tree Houses'
    );

  if (error) {
    console.error('Fetch failed:', error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('No Luxury Treehouse rows found.');
    return;
  }

  for (const row of rows) {
    const note = `${NOTE_PREFIX}: Merged "${row.unit_type}" → Treehouse (luxury is positioning, not a distinct unit type).`;
    const patch = {
      unit_type: TREEHOUSE,
      notes: appendNote(row.notes as string | null, note),
    };
    console.log(
      `#${row.id} ${row.property_name} / ${row.site_name ?? '—'} | ${row.unit_type} → ${TREEHOUSE}`
    );
    if (DRY_RUN) continue;

    const { error: upErr } = await supabase.from(TABLE).update(patch).eq('id', row.id);
    if (upErr) {
      console.error(`Update ${row.id} failed:`, upErr.message);
      process.exit(1);
    }
  }

  console.log(DRY_RUN ? '\nDry run complete.' : `\nUpdated ${rows.length} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
