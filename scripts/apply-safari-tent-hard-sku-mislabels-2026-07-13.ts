#!/usr/bin/env npx tsx
/**
 * Reclass Safari Tent rows whose site_name is clearly Cabin / Villa / Lodge / Yurt.
 * Companion SQL: scripts/migrations/safari-tent-hard-sku-mislabels-2026-07-13.sql
 *
 * Usage:
 *   npx tsx scripts/apply-safari-tent-hard-sku-mislabels-2026-07-13.ts
 *   npx tsx scripts/apply-safari-tent-hard-sku-mislabels-2026-07-13.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const TODAY = '2026-07-13';
const DRY_RUN = process.argv.includes('--dry-run');
const NOTE_PREFIX = '[2026-07-13] unit_type Safari Tent →';

const UPDATES: Array<{
  id: number;
  unit_type: 'Cabin' | 'Villa' | 'Lodge' | 'Yurt';
  note: string;
}> = [
  {
    id: 10136,
    unit_type: 'Cabin',
    note: `${NOTE_PREFIX} Cabin (site_name Cabins; hard cabin SKU).`,
  },
  {
    id: 12185,
    unit_type: 'Villa',
    note: `${NOTE_PREFIX} Villa (site_name Bedouin Villa King).`,
  },
  {
    id: 12218,
    unit_type: 'Villa',
    note: `${NOTE_PREFIX} Villa (site_name Bedouin Villa Twin).`,
  },
  {
    id: 12235,
    unit_type: 'Lodge',
    note: `${NOTE_PREFIX} Lodge (site_name Two Bedroom Lodge).`,
  },
  {
    id: 10245,
    unit_type: 'Lodge',
    note: `${NOTE_PREFIX} Lodge (site_name Luxury Glamping Lodge).`,
  },
  {
    id: 10263,
    unit_type: 'Lodge',
    note: `${NOTE_PREFIX} Lodge (site_name Luxury Glamping Lodge).`,
  },
  {
    id: 10266,
    unit_type: 'Yurt',
    note: `${NOTE_PREFIX} Yurt (site_name lists yurt products).`,
  },
];

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX) && base.includes(addition.slice(0, 48))) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or service role key');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const u of UPDATES) {
    const { data: row, error: fetchErr } = await supabase
      .from(TABLE)
      .select('id,property_name,site_name,unit_type,notes')
      .eq('id', u.id)
      .maybeSingle();
    if (fetchErr) throw new Error(`fetch id=${u.id}: ${fetchErr.message}`);
    if (!row) throw new Error(`Missing id=${u.id}`);

    const patch = {
      unit_type: u.unit_type,
      date_updated: TODAY,
      notes: appendNote(row.notes as string | null, u.note),
    };
    console.log(
      `${DRY_RUN ? 'DRY ' : ''}PATCH id=${u.id} ${row.property_name} | ${row.site_name} | ${row.unit_type} → ${u.unit_type}`
    );
    if (DRY_RUN) continue;

    const { error } = await supabase.from(TABLE).update(patch).eq('id', u.id);
    if (error) throw new Error(`update id=${u.id}: ${error.message}`);
  }

  console.log(`Done (${UPDATES.length} rows)${DRY_RUN ? ' [dry-run]' : ''}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
