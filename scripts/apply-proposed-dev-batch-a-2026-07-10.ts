#!/usr/bin/env npx tsx
/**
 * Batch A — US proposed-development remediation (high confidence), 2026-07-10.
 *
 * Promotes verified operating properties, closes/cancels dead pipeline rows, rejects phantoms/duplicates.
 *
 * Usage:
 *   npx tsx scripts/apply-proposed-dev-batch-a-2026-07-10.ts
 *   npx tsx scripts/apply-proposed-dev-batch-a-2026-07-10.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { CancelledProjectReason } from '@/lib/cancelled-project-reason';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const TAG = 'proposed_dev_batch_a_2026_07_10';
const TODAY = '2026-07-10';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function appendNote(existing: string | null | undefined, line: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(TAG)) return base;
  return base ? `${base}\n\n[${TODAY}] ${TAG}: ${line}` : `[${TODAY}] ${TAG}: ${line}`;
}

type RowPatch = Record<string, unknown> & { id: number };

const OPERATING: RowPatch[] = [
  {
    id: 12947,
    property_name: 'Hinata Mountainside Resort',
    is_open: 'Yes',
    research_status: 'published',
    property_type: 'Glamping',
    url: 'https://www.hinataretreat.com/',
    year_site_opened: '2025',
    planned_open_date: null,
    cancelled_reason: null,
    cancelled_reason_notes: null,
    cancelled_year: null,
    note: 'Operating since Oct 2025 (Hinata Retreat); Charlemont MA glamping cabins on former Warfield House site.',
  },
  {
    id: 12964,
    property_name: 'Olde Florida Motorcoach Resort',
    is_open: 'Yes',
    research_status: 'published',
    property_type: 'RV Resort',
    url: 'https://oldefloridamotorcoachresort.com/',
    year_site_opened: '2025',
    planned_open_date: null,
    cancelled_reason: null,
    cancelled_reason_notes: null,
    cancelled_year: null,
    note: 'Opened Jan 1 2025; luxury Class A motorcoach resort in LaBelle FL.',
  },
  {
    id: 12966,
    property_name: 'Peace River Oaks',
    is_open: 'Yes',
    research_status: 'published',
    property_type: 'RV Resort',
    url: 'https://www.peaceriveroaks.com/',
    year_site_opened: '2025',
    planned_open_date: null,
    cancelled_reason: null,
    cancelled_reason_notes: null,
    cancelled_year: null,
    note: 'Opened 2025; 43 RV sites + 10 glamping tents on Peace River near Bowling Green FL.',
  },
  {
    id: 12969,
    property_name: 'Roaming Trails Burleson',
    is_open: 'Yes',
    research_status: 'published',
    property_type: 'RV Resort',
    url: 'https://roamingtrailsrv.com/burleson/',
    year_site_opened: '2025',
    planned_open_date: null,
    cancelled_reason: null,
    cancelled_reason_notes: null,
    cancelled_year: null,
    note: 'Opened Nov 1 2025; Provident/Blue Water long-term RV retreat Burleson TX.',
  },
  {
    id: 12986,
    property_name: 'Peacock Properties RV Park & Rentals',
    is_open: 'Yes',
    research_status: 'published',
    property_type: 'RV Park',
    url: 'https://rvparkandrentals.weebly.com/',
    year_site_opened: null,
    planned_open_date: null,
    cancelled_reason: null,
    cancelled_reason_notes: null,
    cancelled_year: null,
    note: 'Renamed from Broadalbin RV Park; operating Peacock Properties at 626 Union Mills Rd Broadalbin NY.',
  },
  {
    id: 12968,
    property_name: 'Pit Stop Caddo Mills RV Park',
    is_open: 'Yes',
    research_status: 'published',
    property_type: 'RV Park',
    url: 'https://yrcbuilders.com/pit-stop-caddo-mills',
    year_site_opened: null,
    planned_open_date: null,
    cancelled_reason: null,
    cancelled_reason_notes: null,
    cancelled_year: null,
    note: 'Renamed from A New RV Park in Caddo Mills; YRC Phase I 150-pad luxury RV park operating Caddo Mills TX.',
  },
];

const CLOSED: RowPatch[] = [
  {
    id: 12965,
    property_name: 'Panama City Beach KOA Holiday',
    is_open: 'Closed',
    research_status: 'in_progress',
    property_type: 'Campground',
    url: 'https://koa.com/campgrounds/panama-city-beach/',
    year_site_opened: '2024',
    planned_open_date: null,
    cancelled_reason: 'site_disposition',
    cancelled_reason_notes:
      'Permanently closed July 15 2025 after FDOT eminent-domain acquisition for US-98 widening / stormwater pond.',
    cancelled_year: '2025',
    note: 'Closed Jul 15 2025; FDOT acquired site for Hwy 98 expansion.',
  },
];

const CANCELLED: RowPatch[] = [
  {
    id: 12941,
    property_name: 'Clear Sky Acadia',
    is_open: 'Cancelled',
    research_status: 'in_progress',
    property_type: 'Glamping',
    url: 'https://www.lamoine-me.gov/clear-sky-acadia-dome-glampground-application',
    planned_open_date: null,
    cancelled_reason: 'developer_withdrawal' satisfies CancelledProjectReason,
    cancelled_reason_notes:
      'CPEX/Clear Sky withdrew application; Lamoine banned glampgrounds Mar 2024; Frenchman Bay Conservancy purchased Partridge Cove site.',
    cancelled_year: '2024',
    note: 'Project withdrawn and site conserved; not a live proposed development.',
  },
  {
    id: 12937,
    property_name: 'Hidden Harmony',
    is_open: 'Cancelled',
    research_status: 'in_progress',
    property_type: 'Glamping',
    url: 'https://moderncampground.com/usa/tennessee/tennessee-glamping-retreat-proposal-faces-local-pushback/',
    planned_open_date: null,
    cancelled_reason: 'regulatory_denial',
    cancelled_reason_notes:
      'Carter County Planning Commission unanimously rejected preliminary plan (stormwater, steep grade, soil).',
    cancelled_year: '2025',
    note: 'Planning rejection; no active entitlement path.',
  },
];

const REJECTED: RowPatch[] = [
  {
    id: 12950,
    property_name: 'Sunset Glamping Retreat',
    is_open: 'Cancelled',
    research_status: 'rejected',
    property_type: 'Unknown',
    is_glamping_property: 'No',
    url: null,
    planned_open_date: null,
    cancelled_reason: 'other',
    cancelled_reason_notes: 'No verifiable property, permits, or URL; likely pipeline sync artifact.',
    cancelled_year: null,
    note: 'Rejected phantom row — no evidence of real Sedona glamping project by this name.',
  },
  {
    id: 12954,
    property_name: 'Lamoine Glamping Domes',
    is_open: 'Cancelled',
    research_status: 'rejected',
    property_type: 'Glamping',
    is_glamping_property: 'No',
    url: null,
    planned_open_date: null,
    cancelled_reason: 'other',
    cancelled_reason_notes: 'Duplicate of Clear Sky Acadia (same cancelled Lamoine dome resort).',
    cancelled_year: '2024',
    note: 'Rejected duplicate of Clear Sky Acadia.',
  },
];

async function applyPatch(spec: RowPatch): Promise<void> {
  const { id, note, ...fields } = spec;
  const { data: row, error: fetchError } = await supabase
    .from(TABLE)
    .select('id,property_name,notes')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new Error(`fetch id=${id}: ${fetchError.message}`);
  if (!row) {
    console.warn(`SKIP id=${id} — row not found`);
    return;
  }

  const patch = {
    ...fields,
    date_updated: TODAY,
    notes: appendNote(row.notes as string | null, note ?? 'Batch A remediation'),
  };

  console.log(`PATCH id=${id} ${row.property_name}`, JSON.stringify(patch, null, 2));
  if (DRY_RUN) return;

  const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', id);
  if (updateError) throw new Error(`update id=${id}: ${updateError.message}`);
}

async function main(): Promise<void> {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== APPLY ===');
  for (const spec of [...OPERATING, ...CLOSED, ...CANCELLED, ...REJECTED]) {
    await applyPatch(spec);
  }
  console.log(DRY_RUN ? '\nDry run complete.' : '\nBatch A applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
