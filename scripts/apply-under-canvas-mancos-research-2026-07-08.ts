#!/usr/bin/env npx tsx
/**
 * Reconcile Under Canvas Mancos with Jul 2026 research: proposed pipeline with
 * P&Z denial recommendation (not marked Cancelled unless BOCC/upstream confirms).
 *
 * Usage:
 *   npx tsx scripts/apply-under-canvas-mancos-research-2026-07-08.ts
 *   npx tsx scripts/apply-under-canvas-mancos-research-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const ROW_ID = 12001;
const UNDER_CANVAS_BRAND_ID = '2a78831f-3c15-4b52-b5a3-6c249f6a86a3';
const RESEARCH_TAG = 'under_canvas_mancos_research_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DESCRIPTION = `Under Canvas Mancos is a proposed large-scale luxury glamping resort north of Mancos, Colorado, positioned to serve travelers visiting Mesa Verde National Park—not an operating property. Under Canvas Inc. (agent for Windy Ridge Ranch, LLC) applied for high-impact/special-use and planned unit development permits on ag-residential land at 12695 Road 40, using roughly 141 acres of a 346-acre parcel north of Highway 184 west of Road 40. Plans describe an upscale outdoor hospitality site with on the order of 75 luxury tent units (individual bathrooms, housekeeping/laundry, restaurant, developed roads)—critics characterize it as a full commercial resort on residential-zoned land outside developed towns. After standing-room-only opposition (Protect Mancos petition, dark-sky, water, fire, and traffic concerns), Montezuma County Planning & Zoning voted 3–2 in March 2025 to recommend denial to the Board of County Commissioners; P&Z action is advisory and final authority rests with the three-member BOCC. Per available research summaries, Under Canvas has not publicly characterized the Mancos filing as permanently withdrawn, though the project faces major regulatory headwinds. Distinct from operating Under Canvas locations and from Under Canvas withdrawals elsewhere (e.g., Sedona AZ, Castle Valley near Moab UT, Teton Valley ID).`;

const NOTES = `${RESEARCH_TAG}: P&Z recommended denial Mar 2025 (3–2); ~75 tents on 141/346 ac ag-residential parcel near Mesa Verde. BOCC has final say. Sources: Durango Herald, The Journal, Modern Campground. Conflicting record: Montezuma County BOCC minutes (May 13, 2025) list applicant withdrawal May 1, 2025—verify live county status before publishing as open pipeline vs cancelled. REVIEW before publishing.`;

function appendNote(existing: string | null | undefined): string {
  const base = (existing ?? '').trim();
  if (base.includes(RESEARCH_TAG.slice(0, 32))) return base;
  return base ? `${base}\n\n${NOTES}` : NOTES;
}

async function main(): Promise<void> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .select('id,property_name,notes')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error(`Under Canvas Mancos id=${ROW_ID} not found`);

  const patch = {
    property_name: 'Under Canvas Mancos',
    brand_id: UNDER_CANVAS_BRAND_ID,
    research_status: 'in_progress',
    is_open: 'Proposed Development',
    property_type: 'Glamping Resort',
    address:
      '12695 Road 40, Mancos, CO (141 acres of 346-acre Windy Ridge Ranch parcel north of Hwy 184; ag-residential zoning)',
    city: 'Mancos',
    state: 'CO',
    country: 'United States',
    url: 'https://www.durangoherald.com/articles/planning-and-zoning-denies-application-for-glamping-development-outside-mancos/',
    description: DESCRIPTION,
    notes: appendNote(row.notes),
    quantity_of_units: '75',
    property_total_sites: '75',
    cancelled_year: null,
    cancelled_reason: null,
    cancelled_reason_notes: null,
    rate_avg_retail_daily_rate: null,
    planned_open_date: null,
    year_site_opened: null,
    date_updated: TODAY,
  };

  console.log(`PATCH Under Canvas Mancos id=${ROW_ID}`, JSON.stringify(patch, null, 2));

  if (!DRY_RUN) {
    const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', ROW_ID);
    if (updateError) throw new Error(updateError.message);
  }

  console.log(DRY_RUN ? '\nDry run complete.' : '\nUnder Canvas Mancos updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
