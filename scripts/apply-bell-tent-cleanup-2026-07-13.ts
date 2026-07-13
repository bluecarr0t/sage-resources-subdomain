#!/usr/bin/env npx tsx
/**
 * Bell Tent cleanup (2026-07-13):
 * 1. Clear mislabels → Yurt / Tipi
 * 2. Generic tent site_names parked as Bell Tent → Canvas Tent (holding until structural research)
 * 3. Adirondack Safari duplicate qty (3×15 → keep one row at 15)
 *
 * Usage:
 *   npx tsx scripts/apply-bell-tent-cleanup-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-bell-tent-cleanup-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const TODAY = '2026-07-13';
const DRY_RUN = process.argv.includes('--dry-run');
const NOTE_PREFIX = '[2026-07-13] Bell Tent cleanup';
const RESEARCH_TAG = 'bell_tent_cleanup_2026_07_13';

type Patch = {
  id: number;
  unit_type?: string;
  quantity_of_units?: string | null;
  note: string;
};

const MISLABELS: Patch[] = [
  {
    id: 10782,
    unit_type: 'Yurt',
    note: `${NOTE_PREFIX}: Bell Tent → Yurt (site_name Yurts; ${RESEARCH_TAG}).`,
  },
  {
    id: 10582,
    unit_type: 'Tipi',
    note: `${NOTE_PREFIX}: Bell Tent → Tipi (site_name Dreamcatcher Tipi Glampsite; ${RESEARCH_TAG}).`,
  },
  {
    id: 10586,
    unit_type: 'Tipi',
    note: `${NOTE_PREFIX}: Bell Tent → Tipi (property Sleepy Teepee; canvas teepees; ${RESEARCH_TAG}).`,
  },
];

/** Generic tent site_names with no bell evidence → Canvas Tent holding label. */
const GENERIC_TO_CANVAS: Patch[] = [
  {
    id: 10612,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (generic site_name Glamping Tent, no bell evidence; ${RESEARCH_TAG}).`,
  },
  {
    id: 10608,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (generic site_name Glamping Tent, no bell evidence; ${RESEARCH_TAG}).`,
  },
  {
    id: 10581,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (generic site_name Glamping Tents, no bell evidence; ${RESEARCH_TAG}).`,
  },
  {
    id: 10606,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (generic site_name Tent, no bell evidence; ${RESEARCH_TAG}).`,
  },
  {
    id: 9613,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (generic site_name Glamping Tent, no bell evidence; ${RESEARCH_TAG}).`,
  },
  {
    id: 10787,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (generic site_name Luxury Tent, no bell evidence; ${RESEARCH_TAG}).`,
  },
  {
    id: 10785,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (generic site_name Glamping Tents, no bell evidence; ${RESEARCH_TAG}).`,
  },
  {
    id: 10625,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (generic site_name Standard Glamping Tent, no bell evidence; ${RESEARCH_TAG}).`,
  },
  {
    id: 10614,
    unit_type: 'Canvas Tent',
    note: `${NOTE_PREFIX}: Bell Tent → Canvas Tent (site_name Traditional Tent, no bell evidence; ${RESEARCH_TAG}).`,
  },
];

/** Keep 10601 qty=15; null qty on duplicate SKU rows (property closed; type stays Bell Tent). */
const ADIRONDACK_QTY: Patch[] = [
  {
    id: 10601,
    note: `${NOTE_PREFIX}: Adirondack Safari primary Bell Tent inventory row (qty=15); duplicates 10602/10603 qty nulled (${RESEARCH_TAG}).`,
  },
  {
    id: 10602,
    quantity_of_units: null,
    note: `${NOTE_PREFIX}: Adirondack Safari duplicate qty nulled (inventory counted on id=10601; ${RESEARCH_TAG}).`,
  },
  {
    id: 10603,
    quantity_of_units: null,
    note: `${NOTE_PREFIX}: Adirondack Safari duplicate qty nulled (inventory counted on id=10601; ${RESEARCH_TAG}).`,
  },
];

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX) && base.includes(addition.slice(0, 48))) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

async function applyPatch(
  supabase: ReturnType<typeof createClient>,
  patch: Patch
): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from(TABLE)
    .select('id,property_name,site_name,unit_type,quantity_of_units,notes')
    .eq('id', patch.id)
    .maybeSingle();
  if (fetchErr) throw new Error(`fetch id=${patch.id}: ${fetchErr.message}`);
  if (!row) throw new Error(`Missing id=${patch.id}`);

  const update: Record<string, unknown> = {
    date_updated: TODAY,
    notes: appendNote(row.notes as string | null, patch.note),
  };
  if (patch.unit_type !== undefined) update.unit_type = patch.unit_type;
  if (patch.quantity_of_units !== undefined) update.quantity_of_units = patch.quantity_of_units;

  const fromType = row.unit_type;
  const toType = patch.unit_type ?? fromType;
  const qtyMsg =
    patch.quantity_of_units !== undefined
      ? ` qty ${row.quantity_of_units} → ${patch.quantity_of_units}`
      : '';
  console.log(
    `${DRY_RUN ? 'DRY ' : ''}PATCH id=${patch.id} ${row.property_name} | ${row.site_name} | ${fromType} → ${toType}${qtyMsg}`
  );

  if (DRY_RUN) return;
  const { error } = await supabase.from(TABLE).update(update).eq('id', patch.id);
  if (error) throw new Error(`update id=${patch.id}: ${error.message}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or service role key');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('\n=== Clear mislabels ===');
  for (const p of MISLABELS) await applyPatch(supabase, p);

  console.log('\n=== Generic Bell Tent → Canvas Tent ===');
  for (const p of GENERIC_TO_CANVAS) await applyPatch(supabase, p);

  console.log('\n=== Adirondack Safari qty dedupe ===');
  for (const p of ADIRONDACK_QTY) await applyPatch(supabase, p);

  if (DRY_RUN) console.log('\nDry run only — no DB writes.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
