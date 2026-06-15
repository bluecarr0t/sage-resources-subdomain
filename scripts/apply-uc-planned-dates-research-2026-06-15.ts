#!/usr/bin/env npx tsx
/**
 * Backfill planned_open_date for Under Construction US glamping properties
 * from web/operator research (2026-06-15).
 *
 * Usage:
 *   npx tsx scripts/apply-uc-planned-dates-research-2026-06-15.ts
 *   npx tsx scripts/apply-uc-planned-dates-research-2026-06-15.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const RESEARCH_TAG = 'uc_planned_dates_research_2026_06_15';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type PlannedDateSpec = {
  property_name: string;
  planned_open_date: string;
  /** Optional state filter when property_name is ambiguous. */
  state?: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
};

/** Operator-confirmed or press with a specific calendar date. */
const HIGH_CONFIDENCE: PlannedDateSpec[] = [
  {
    property_name: 'Pilot Mountain Glamping Resort',
    planned_open_date: '2026-06-01',
    state: 'NC',
    source: 'pilotmountainglamping.com — opening June 1, 2026',
    confidence: 'high',
  },
  {
    property_name: 'Under Canvas White Mountains',
    planned_open_date: '2026-06-04',
    state: 'NH',
    source:
      'undercanvas.com + Islands.com — inaugural season opens June 4, 2026',
    confidence: 'high',
  },
  {
    property_name: 'Highwood Retreat',
    planned_open_date: '2026-05-15',
    state: 'VT',
    source: 'highwoodretreat.com — South Camp coming May 2026',
    confidence: 'high',
  },
  {
    property_name: 'Camp Ferncrest - Bryson City',
    planned_open_date: '2026-08-01',
    state: 'NC',
    source:
      'founders.findingpromisedland.com — target August 2026 launch (FDD/onboarding)',
    confidence: 'high',
  },
  {
    property_name: 'Luxe Den Resorts',
    planned_open_date: '2027-07-01',
    state: 'ID',
    source: 'luxedenresorts.com — Coming Summer 2027',
    confidence: 'high',
  },
];

/** Month/quarter targets from operator marketing or trade press. */
const MEDIUM_CONFIDENCE: PlannedDateSpec[] = [
  {
    property_name: 'AutoCamp Hill Country',
    planned_open_date: '2026-06-30',
    state: 'TX',
    source: 'autocamp.com + Hilton trade press — target opening Q2 2026',
    confidence: 'medium',
  },
  {
    property_name: 'Camp Ferncrest - Ocoee',
    planned_open_date: '2026-07-01',
    state: 'TN',
    source: 'founders.findingpromisedland.com/ocoee — Opening Summer 2026',
    confidence: 'medium',
  },
  {
    property_name: 'Camp Ferncrest - Elkhorn River',
    planned_open_date: '2026-07-01',
    state: 'NE',
    source: 'tallgrassretreat.com / Ferncrest founders — Summer 2026',
    confidence: 'medium',
  },
  {
    property_name: 'Terranova Nirvana',
    planned_open_date: '2026-07-01',
    state: 'AZ',
    source: 'terranovanirvana.com — Opening 2026 (Page, AZ)',
    confidence: 'medium',
  },
  {
    property_name: 'Treasure Bay Resort',
    planned_open_date: '2026-09-15',
    state: 'OR',
    source:
      'exploretreasurebay.com social — Coming 2026; late-summer/early-fall positioning',
    confidence: 'medium',
  },
];

/** Entitlement-only, phased builds, or missed prior targets — quarter-end proxy. */
const LOW_CONFIDENCE: PlannedDateSpec[] = [
  {
    property_name: 'Echo Valley Micro-Resort',
    planned_open_date: '2026-09-30',
    state: 'VA',
    source:
      'echovalleymicroresort.com phased rollout; spring 2026 press target slipped — Q3 2026 proxy',
    confidence: 'low',
  },
  {
    property_name: 'Riverbend Glamping Getaway',
    planned_open_date: '2026-09-30',
    state: 'MT',
    source:
      'riverbendglamping.com — “work in progress”; Gallatin County permit in hand — Q3 2026 proxy',
    confidence: 'low',
  },
  {
    property_name: 'Eastwind Lushna Nature Retreat',
    planned_open_date: '2026-06-30',
    state: 'NY',
    source:
      'Eastwind / OTA booking window Jun 2026 for Lushna inventory — verify property vs Oliverea/Windham',
    confidence: 'low',
  },
  {
    property_name: 'Del Rio Ranch',
    planned_open_date: '2027-06-01',
    state: 'CA',
    source:
      'Atascadero council approved Jan 2025; civil/construction permits pending — H1 2027 proxy',
    confidence: 'low',
  },
  {
    property_name: 'Entrada Moab',
    planned_open_date: '2027-06-01',
    state: 'UT',
    source:
      'Grand County OAO approved Jan 2024; no operator opening date — H1 2027 proxy',
    confidence: 'low',
  },
  {
    property_name: 'Talaz',
    planned_open_date: '2027-09-01',
    state: 'NV',
    source:
      'TRPA tree-removal approved Sep 2025; forest easements/conditions remain — Q3 2027 proxy',
    confidence: 'low',
  },
];

const ALL_SPECS = [
  ...HIGH_CONFIDENCE,
  ...MEDIUM_CONFIDENCE,
  ...LOW_CONFIDENCE,
];

/** Site is live — flip to Open instead of planned date. */
const FLIP_TO_OPEN: { property_name: string; state?: string; source: string }[] =
  [
    {
      property_name: 'Dwell RV Resort & Casita Cabins',
      state: 'AZ',
      source: 'dwelllakehavasu.com — “Now Open!” with ResNexus booking live',
    },
  ];

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(RESEARCH_TAG)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

function noteLine(spec: PlannedDateSpec): string {
  return `${RESEARCH_TAG}: planned_open_date ${spec.planned_open_date} (${spec.confidence}) — ${spec.source}`;
}

async function applyPlannedDates(): Promise<void> {
  console.log('\n=== Set planned_open_date (Under Construction) ===');

  for (const spec of ALL_SPECS) {
    let query = supabase
      .from(TABLE)
      .select('id,planned_open_date,is_open,notes')
      .eq('property_name', spec.property_name)
      .eq('is_open', 'Under Construction');

    if (spec.state) {
      query = query.eq('state', spec.state);
    }

    const { data: rows, error: fetchError } = await query;
    if (fetchError) throw new Error(`${spec.property_name}: ${fetchError.message}`);
    if (!rows?.length) {
      console.warn(`  WARN: no UC rows for ${spec.property_name}`);
      continue;
    }

    const already = rows.every(
      (r) => r.planned_open_date === spec.planned_open_date
    );
    if (already) {
      console.log(
        `SKIP ${spec.property_name} — already ${spec.planned_open_date}`
      );
      continue;
    }

    console.log(
      `PATCH ${spec.property_name} → ${spec.planned_open_date} [${spec.confidence}] (${rows.length} row(s))`
    );
    if (DRY_RUN) continue;

    for (const row of rows) {
      const { error } = await supabase
        .from(TABLE)
        .update({
          planned_open_date: spec.planned_open_date,
          date_updated: TODAY,
          notes: appendNote(row.notes, noteLine(spec)),
        })
        .eq('id', row.id);
      if (error) throw new Error(`Update id=${row.id}: ${error.message}`);
    }
  }
}

async function flipOpenProperties(): Promise<void> {
  console.log('\n=== Flip live properties to Open ===');

  for (const spec of FLIP_TO_OPEN) {
    let query = supabase
      .from(TABLE)
      .select('id,is_open,planned_open_date,notes')
      .eq('property_name', spec.property_name)
      .eq('is_open', 'Under Construction');

    if (spec.state) {
      query = query.eq('state', spec.state);
    }

    const { data: rows, error: fetchError } = await query;
    if (fetchError) throw new Error(`${spec.property_name}: ${fetchError.message}`);
    if (!rows?.length) {
      console.log(`SKIP ${spec.property_name} — no UC rows (may already Open)`);
      continue;
    }

    console.log(
      `OPEN ${spec.property_name} — ${rows.length} row(s); ${spec.source}`
    );
    if (DRY_RUN) continue;

    const note = `${RESEARCH_TAG}: reclassified to Open — ${spec.source}`;
    for (const row of rows) {
      const { error } = await supabase
        .from(TABLE)
        .update({
          is_open: 'Yes',
          planned_open_date: null,
          date_updated: TODAY,
          notes: appendNote(row.notes, note),
        })
        .eq('id', row.id);
      if (error) throw new Error(`Open id=${row.id}: ${error.message}`);
    }
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Specs: ${ALL_SPECS.length} planned dates, ${FLIP_TO_OPEN.length} open flips`);
  await applyPlannedDates();
  await flipOpenProperties();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
