#!/usr/bin/env npx tsx
/**
 * Retire niche / non-structure unit labels and remap known rows (2026-07-13).
 *
 * - Property buyout → remove as taxonomy; Bliss venue SKU unpublished; Quilchena → Hotel Room
 * - Bothy → Cabin (Loch Ken Eco Bothies)
 * - Cliffside Room → Hotel Room (Post Ranch Inn)
 * - Lushna Cabin → A-Frame (Eastwind Lushna Nature Retreat)
 *
 * Usage:
 *   npx tsx scripts/apply-retire-niche-unit-types-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-retire-niche-unit-types-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const TODAY = '2026-07-13';
const NOTE_PREFIX = `[${TODAY}] Niche unit-type retirement`;
const DRY_RUN = process.argv.includes('--dry-run');

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
  if (base.includes(NOTE_PREFIX) && base.includes(addition.slice(0, 48))) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

type UpdateSpec = {
  id: number;
  patch: Record<string, unknown>;
  note: string;
};

const CABIN = normalizeGlampingUnitTypeForStorage('Cabin') ?? 'Cabin';
const HOTEL_ROOM = normalizeGlampingUnitTypeForStorage('Hotel Room') ?? 'Hotel Room';
const A_FRAME = normalizeGlampingUnitTypeForStorage('A-Frame') ?? 'A-Frame';

const UPDATES: UpdateSpec[] = [
  {
    id: 11747,
    patch: {
      unit_type: null,
      research_status: 'rejected',
    },
    note: `${NOTE_PREFIX}: Bliss Camps "Event Venue in Paradise" is a whole-property exclusive venue rental, not a lodging structure. Cleared unit_type Property buyout; research_status=rejected so it stays out of published market metrics.`,
  },
  {
    id: 11794,
    patch: {
      unit_type: HOTEL_ROOM,
    },
    note: `${NOTE_PREFIX}: Douglas Lake Ranch Quilchena Hotel entire-facility rental is historic hotel inventory (15 rooms), not a glamping structure. Remap Property buyout → Hotel Room (excluded from market snapshot).`,
  },
  {
    id: 11244,
    patch: {
      unit_type: CABIN,
    },
    note: `${NOTE_PREFIX}: Loch Ken Eco Bothies are eco cabin / Echo pod lodging. Remap Bothy → Cabin (Scottish bothy marketing name, not a distinct product type).`,
  },
  {
    id: 3,
    patch: {
      unit_type: HOTEL_ROOM,
    },
    note: `${NOTE_PREFIX}: Post Ranch Inn Cliff House / cliffside rooms are hotel guest rooms on a cliff, not glamping. Remap Cliffside Room → Hotel Room.`,
  },
  {
    id: 12948,
    patch: {
      unit_type: A_FRAME,
    },
    note: `${NOTE_PREFIX}: Eastwind Lushna cabins are Scandinavian Lushna A-frame structures. Remap Lushna Cabin → A-Frame.`,
  },
];

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no writes\n' : 'LIVE update\n');

  const ids = UPDATES.map((u) => u.id);
  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, property_name, site_name, unit_type, research_status, notes')
    .in('id', ids);

  if (error) {
    console.error('Fetch failed:', error.message);
    process.exit(1);
  }

  const byId = new Map((rows ?? []).map((r) => [Number(r.id), r]));

  for (const spec of UPDATES) {
    const row = byId.get(spec.id);
    if (!row) {
      console.warn(`Missing id ${spec.id} — skip`);
      continue;
    }
    const notes = appendNote(row.notes as string | null, spec.note);
    const patch = { ...spec.patch, notes };
    console.log(
      `#${spec.id} ${row.property_name} / ${row.site_name ?? '—'} | ${row.unit_type} → ${String(spec.patch.unit_type ?? 'null')}`,
    );
    if (DRY_RUN) continue;

    const { error: upErr } = await supabase.from(TABLE).update(patch).eq('id', spec.id);
    if (upErr) {
      console.error(`Update ${spec.id} failed:`, upErr.message);
      process.exit(1);
    }
  }

  console.log(DRY_RUN ? '\nDry run complete.' : '\nUpdates applied.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
