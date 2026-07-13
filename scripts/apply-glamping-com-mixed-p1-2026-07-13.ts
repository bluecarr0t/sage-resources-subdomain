#!/usr/bin/env npx tsx
/**
 * P1: Glamping.com Mixed stubs (discovery_source=glamping_com_north_america_2026_05).
 *
 * - High-confidence name / researched remaps → single structural unit_type
 * - Clear non-glamping → reject (is_glamping=No, research_status=rejected, unit_type null or Hotel/RV)
 * - Otherwise → unit_type null + research queue note (split into siblings later)
 *
 * Usage:
 *   npx tsx scripts/apply-glamping-com-mixed-p1-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-glamping-com-mixed-p1-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const SOURCE = 'glamping_com_north_america_2026_05';
const TODAY = '2026-07-13';
const NOTE_PREFIX = `[${TODAY}] Glamping.com Mixed P1`;
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

function canon(label: string): string {
  return normalizeGlampingUnitTypeForStorage(label) ?? label;
}

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

type Action =
  | {
      kind: 'remap';
      unit_type: string;
      quantity_of_units?: string;
      note: string;
    }
  | {
      kind: 'reject';
      unit_type: string | null;
      property_type?: string;
      note: string;
    }
  | {
      kind: 'null_research';
      note: string;
    };

/** High-confidence remaps (name-encoded or verified single product). */
const REMAPS: Record<number, Action> = {
  12313: {
    kind: 'remap',
    unit_type: canon('Tipi'),
    quantity_of_units: '1',
    note: `${NOTE_PREFIX}: Remap Mixed→Tipi (property_name "Beach Canyon Authentic Tipi").`,
  },
  12346: {
    kind: 'remap',
    unit_type: canon('Cottage'),
    note: `${NOTE_PREFIX}: Remap Mixed→Cottage (property_name "Camp Lucy Cottages"). Multi-cottage inventory likely — split siblings if qty confirmed.`,
  },
  12333: {
    kind: 'remap',
    unit_type: canon('Cabin'),
    note: `${NOTE_PREFIX}: Remap Mixed→Cabin (property_name "Americana Island Cabin…").`,
  },
  12342: {
    kind: 'remap',
    unit_type: canon('Cabin'),
    note: `${NOTE_PREFIX}: Remap Mixed→Cabin (property_name "Hintercabin").`,
  },
  12334: {
    kind: 'remap',
    unit_type: canon('Cabin'),
    note: `${NOTE_PREFIX}: Remap Mixed→Cabin (property_name "Nantahala Cabins Inc"). Multi-cabin — split siblings if qty confirmed.`,
  },
  12314: {
    kind: 'remap',
    unit_type: canon('Safari Tent'),
    quantity_of_units: '1',
    note: `${NOTE_PREFIX}: Remap Mixed→Safari Tent (Safari Sunset Eco Ranch — African safari tent listing on Glamping.com/Hipcamp).`,
  },
  12306: {
    kind: 'remap',
    unit_type: canon('Lodge'),
    note: `${NOTE_PREFIX}: Remap Mixed→Lodge (property_name "Sierra Mountain Lodge").`,
  },
  12321: {
    kind: 'remap',
    unit_type: canon('Lodge'),
    note: `${NOTE_PREFIX}: Remap Mixed→Lodge (property_name "The Lodge on Little St. Simons Island").`,
  },
  12323: {
    kind: 'remap',
    unit_type: canon('Treehouse'),
    note: `${NOTE_PREFIX}: Remap Mixed→Treehouse (property_name "Treehouse Ketchum").`,
  },
  12319: {
    kind: 'remap',
    unit_type: canon('Airstream'),
    note: `${NOTE_PREFIX}: Remap Mixed→Airstream (Aluminum Cabana / My Cabana Club — Airstream coaches at Santa Rosa Waterfront RV Resort).`,
  },
  12331: {
    kind: 'remap',
    unit_type: canon('Tiny Home'),
    quantity_of_units: '1',
    note: `${NOTE_PREFIX}: Remap Mixed→Tiny Home (The Glass House Marlboro NY — ESCAPE Vista glass tiny house).`,
  },

  // Clear non-glamping / not a destination lodging property
  12318: {
    kind: 'reject',
    unit_type: null,
    note: `${NOTE_PREFIX}: Reject — Blue Ocean Yacht Charters is vessel charter, not glamping lodging.`,
  },
  12312: {
    kind: 'reject',
    unit_type: null,
    note: `${NOTE_PREFIX}: Reject — Chill RV is a mobile Mercedes Sprinter rental delivery company (Studio City), not a destination glamping property.`,
  },
  12307: {
    kind: 'reject',
    unit_type: null,
    note: `${NOTE_PREFIX}: Reject — Luxe RV Chatsworth is RV rental inventory mislisted on Glamping.com, not a fixed glamping property.`,
  },
  12344: {
    kind: 'reject',
    unit_type: canon('Hotel Room'),
    property_type: 'Hotel',
    note: `${NOTE_PREFIX}: Reject as glamping — Lone Star Court is a boutique hotel (motor-court rooms); "glamping" is marketing package only.`,
  },
  12336: {
    kind: 'reject',
    unit_type: canon('Hotel Room'),
    property_type: 'Hotel',
    note: `${NOTE_PREFIX}: Reject as glamping — Selina Puerto Escondido is hostel/hotel inventory, not glamping structures.`,
  },
  12340: {
    kind: 'reject',
    unit_type: canon('RV Site'),
    property_type: 'RV Resort',
    note: `${NOTE_PREFIX}: Reject as glamping — Oceanside Beachfront RV Resort; remap Mixed→RV Site, is_glamping=No.`,
  },
  12352: {
    kind: 'reject',
    unit_type: canon('RV Site'),
    property_type: 'RV Resort',
    note: `${NOTE_PREFIX}: Reject as glamping — Silver Cove RV Resort; remap Mixed→RV Site, is_glamping=No.`,
  },
  12343: {
    kind: 'reject',
    unit_type: canon('Campsite'),
    property_type: 'Campground',
    note: `${NOTE_PREFIX}: Reject as glamping — Cane Bay Campground (St. Croix); remap Mixed→Campsite, is_glamping=No.`,
  },
};

const DEFAULT_RESEARCH_NOTE = `${NOTE_PREFIX}: Cleared Mixed→null. Property-level Glamping.com stub — research operator site, then set a single unit_type or split sibling rows (type + qty + ADR).`;

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no writes\n' : 'LIVE update\n');

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, property_name, unit_type, notes, is_glamping_property, research_status, property_type')
    .eq('unit_type', 'Mixed')
    .eq('discovery_source', SOURCE)
    .order('property_name');

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log('No Mixed Glamping.com rows found.');
    return;
  }

  let remapped = 0;
  let rejected = 0;
  let nulled = 0;

  for (const row of rows) {
    const id = Number(row.id);
    const action: Action = REMAPS[id] ?? {
      kind: 'null_research',
      note: DEFAULT_RESEARCH_NOTE,
    };

    let patch: Record<string, unknown>;
    if (action.kind === 'remap') {
      patch = {
        unit_type: action.unit_type,
        ...(action.quantity_of_units != null
          ? { quantity_of_units: action.quantity_of_units }
          : {}),
        notes: appendNote(row.notes as string | null, action.note),
      };
      remapped++;
      console.log(`REMAP  #${id} ${row.property_name} → ${action.unit_type}`);
    } else if (action.kind === 'reject') {
      patch = {
        unit_type: action.unit_type,
        is_glamping_property: 'No',
        research_status: 'rejected',
        ...(action.property_type ? { property_type: action.property_type } : {}),
        notes: appendNote(row.notes as string | null, action.note),
      };
      rejected++;
      console.log(
        `REJECT #${id} ${row.property_name} → ${action.unit_type ?? 'null'} (is_glamping=No)`
      );
    } else {
      patch = {
        unit_type: null,
        notes: appendNote(row.notes as string | null, action.note),
      };
      nulled++;
      console.log(`NULL   #${id} ${row.property_name} → research queue`);
    }

    if (DRY_RUN) continue;

    const { error: upErr } = await supabase.from(TABLE).update(patch).eq('id', id);
    if (upErr) {
      console.error(`Update ${id} failed:`, upErr.message);
      process.exit(1);
    }
  }

  console.log(
    `\nDone: remapped=${remapped} rejected=${rejected} null_research=${nulled} total=${rows.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
