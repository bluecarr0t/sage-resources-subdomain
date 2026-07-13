#!/usr/bin/env npx tsx
/**
 * Lakedale Canvas Cabin → Cabin Tent.
 * Soft-wall glampground tent-cabins (no electricity/running water, shared baths),
 * not hardwall+canvas hybrid.
 *
 * Usage:
 *   npx tsx scripts/reclass-lakedale-cabin-tent-2026-07-13.ts --dry-run
 *   npx tsx scripts/reclass-lakedale-cabin-tent-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const TODAY = '2026-07-13';
const DRY_RUN = process.argv.includes('--dry-run');
const ID = 10303;
const NOTE =
  `[${TODAY}] Canvas Cabin → Cabin Tent: Lakedale Canvas Cabins are soft-wall glampground tent-cabins (no electricity/running water, shared baths), not hardwall+canvas hybrid.`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main(): Promise<void> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .select('id, property_name, site_name, unit_type, notes')
    .eq('id', ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error(`Missing id=${ID}`);

  console.log(
    `${DRY_RUN ? 'DRY ' : ''}id=${row.id} ${row.property_name} / ${row.site_name}: ${row.unit_type} → Cabin Tent`
  );

  const notes = String(row.notes ?? '').trim()
    ? `${String(row.notes).trim()}\n\n${NOTE}`
    : NOTE;

  const sqlPath = join(
    process.cwd(),
    'scripts/migrations/reclass-lakedale-cabin-tent-2026-07-13.sql'
  );
  writeFileSync(
    sqlPath,
    `-- Lakedale Canvas Cabin → Cabin Tent (${TODAY})
UPDATE public.${TABLE} SET
  unit_type = 'Cabin Tent',
  date_updated = '${TODAY}',
  notes = COALESCE(notes, '') || E'\\n\\n${NOTE.replace(/'/g, "''")}'
WHERE id = ${ID};
`,
    'utf-8'
  );

  if (!DRY_RUN) {
    const { error: upErr } = await supabase
      .from(TABLE)
      .update({ unit_type: 'Cabin Tent', date_updated: TODAY, notes })
      .eq('id', ID);
    if (upErr) throw new Error(upErr.message);
  }

  console.log(`Migration: ${sqlPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
