#!/usr/bin/env npx tsx
/**
 * Reclass documented Safari Tent hybrids → Canvas Cabin (and Lakedale Canvas Cottage).
 * Companion SQL: scripts/migrations/canvas-cabin-hybrid-reclass-2026-07-13.sql
 *
 * Usage:
 *   npx tsx scripts/apply-canvas-cabin-hybrid-reclass-2026-07-13.ts
 *   npx tsx scripts/apply-canvas-cabin-hybrid-reclass-2026-07-13.ts --dry-run
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
  unit_type: 'Canvas Cabin' | 'Canvas Cottage';
  note: string;
}> = [
  {
    id: 9725,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Deluxe Tent Cabin).`,
  },
  {
    id: 10138,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Tent-Cabins).`,
  },
  {
    id: 10225,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Large Cabin Tent).`,
  },
  {
    id: 10226,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Small Cabin Tent).`,
  },
  {
    id: 10134,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Family Tentalow).`,
  },
  {
    id: 10135,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Standard Tentalow).`,
  },
  {
    id: 10303,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Canvas Cabin).`,
  },
  {
    id: 10139,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; documented hybrid Glamping Cabins).`,
  },
  {
    id: 10171,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Family Canvas Cabin).`,
  },
  {
    id: 10172,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Classic Canvas Cabin).`,
  },
  {
    id: 10224,
    unit_type: 'Canvas Cabin',
    note: `${NOTE_PREFIX} Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Canvas Cabin).`,
  },
  {
    id: 10302,
    unit_type: 'Canvas Cottage',
    note: `${NOTE_PREFIX} Canvas Cottage (site_name Canvas Cottage).`,
  },
];

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX) && base.includes(addition.slice(0, 40))) return base;
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
