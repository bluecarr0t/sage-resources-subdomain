#!/usr/bin/env npx tsx
/**
 * Restore Canvas Cabin as distinct from Cabin Tent.
 * Remap hardwall+canvas hybrids currently typed Cabin Tent → Canvas Cabin.
 *
 * Usage:
 *   npx tsx scripts/apply-restore-canvas-cabin-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-restore-canvas-cabin-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const TODAY = '2026-07-13';
const DRY_RUN = process.argv.includes('--dry-run');
const NOTE_PREFIX = '[2026-07-13] restore Canvas Cabin';
const RESEARCH_TAG = 'restore_canvas_cabin_2026_07_13';

/** High-confidence hardwall+canvas hybrids (site_name / known operators). */
const BY_ID: Array<{ id: number; reason: string }> = [
  {
    id: 10171,
    reason: 'Rock Creek Family Canvas Cabin — hardwall+canvas hybrid',
  },
  {
    id: 10172,
    reason: 'Rock Creek Classic Canvas Cabin — hardwall+canvas hybrid',
  },
  // Lakedale id 10303 intentionally Cabin Tent (soft-wall glampground; shared baths)
  // Valley Overlook id 10224 intentionally Cabin Tent (soft-wall tent-cabins; shared baths)
  {
    id: 10751,
    reason: 'Sask Landing site_name Canvas Cabin',
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

  console.log(`\n=== Cabin Tent → Canvas Cabin (${BY_ID.length} high-confidence) ===`);
  for (const u of BY_ID) {
    const { data: row, error: fetchErr } = await supabase
      .from(TABLE)
      .select('id,property_name,site_name,unit_type,notes')
      .eq('id', u.id)
      .maybeSingle();
    if (fetchErr) throw new Error(`fetch id=${u.id}: ${fetchErr.message}`);
    if (!row) throw new Error(`Missing id=${u.id}`);

    const note = `${NOTE_PREFIX}: Cabin Tent → Canvas Cabin (${u.reason}; ${RESEARCH_TAG}).`;
    console.log(
      `${DRY_RUN ? 'DRY ' : ''}PATCH id=${u.id} ${row.property_name} | ${row.site_name} | ${row.unit_type} → Canvas Cabin`
    );
    if (DRY_RUN) continue;

    const { error } = await supabase
      .from(TABLE)
      .update({
        unit_type: 'Canvas Cabin',
        date_updated: TODAY,
        notes: appendNote(row.notes as string | null, note),
      })
      .eq('id', u.id);
    if (error) throw new Error(`update id=${u.id}: ${error.message}`);
  }

  // Also catch any remaining Cabin Tent rows whose site_name is exactly Canvas Cabin / Classic|Family Canvas Cabin
  const { data: extras, error: extraErr } = await supabase
    .from(TABLE)
    .select('id,property_name,site_name,unit_type,notes')
    .eq('unit_type', 'Cabin Tent')
    .or(
      'site_name.ilike.Canvas Cabin,site_name.ilike.Classic Canvas Cabin,site_name.ilike.Family Canvas Cabin'
    );
  if (extraErr) throw new Error(`extra scan: ${extraErr.message}`);

  const known = new Set(BY_ID.map((b) => b.id));
  const more = (extras ?? []).filter((r) => !known.has(r.id as number));
  if (more.length) {
    console.log(`\n=== Extra site_name Canvas Cabin matches (${more.length}) ===`);
    for (const row of more) {
      const note = `${NOTE_PREFIX}: Cabin Tent → Canvas Cabin (site_name "${row.site_name}"; ${RESEARCH_TAG}).`;
      console.log(
        `${DRY_RUN ? 'DRY ' : ''}PATCH id=${row.id} ${row.property_name} | ${row.site_name} | ${row.unit_type} → Canvas Cabin`
      );
      if (DRY_RUN) continue;
      const { error } = await supabase
        .from(TABLE)
        .update({
          unit_type: 'Canvas Cabin',
          date_updated: TODAY,
          notes: appendNote(row.notes as string | null, note),
        })
        .eq('id', row.id);
      if (error) throw new Error(`update id=${row.id}: ${error.message}`);
    }
  }

  if (DRY_RUN) console.log('\nDry run only — no DB writes.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
