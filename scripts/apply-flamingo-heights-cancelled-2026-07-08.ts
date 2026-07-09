#!/usr/bin/env npx tsx
/**
 * Mark Flamingo Heights Glamping Resort (RoBott Land Company) as permanently cancelled.
 *
 * Usage:
 *   npx tsx scripts/apply-flamingo-heights-cancelled-2026-07-08.ts
 *   npx tsx scripts/apply-flamingo-heights-cancelled-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { CancelledProjectReason } from '../lib/cancelled-project-reason';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const RESEARCH_TAG = 'flamingo_heights_cancelled_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DESCRIPTION = `Flamingo Heights Glamping Resort (Flamingo Heights 640 / FH 640 Glamping Proposal by RoBott Land Company) was a proposed 75-site luxury desert glamping resort in Flamingo Heights, San Bernardino County, California—not an operating property and no longer an active proposed development. RoBott sought a conditional use permit for yurts, teepee-style tents, a 10,000-square-foot restaurant, commercial bar, art barn, pool, yoga deck, fire pits, and an emergency heli-pad on Rural Living–zoned land adjacent to Highway 247 on a western Joshua Tree–rich wildlife corridor (~26 acres of a 640-acre parcel). In March 2023 the San Bernardino County Planning Commission denied the application without prejudice (commissioners cited commercial scale incompatible with rural living zoning; Homestead Valley community councils opposed traffic, noise, and incompatible amenities). Mojave Desert Land Trust intervened over critical desert wildlife corridor impacts, including relocation of protected western Joshua Trees and desert tortoise clearance requirements that inflated costs. Caltrans was concurrently reviewing Highway 247 for scenic highway status, which would have restricted building heights and visual impacts. RoBott Land Company ultimately abandoned the site amid regulatory roadblocks, environmental pushback, and local resistance—the project will not proceed.`;

const ADDRESS =
  'Highway 247, Flamingo Heights, San Bernardino County, CA (~26-acre site on 640-acre parcel; Rural Living zone; project canceled)';

const NOTES = `${RESEARCH_TAG}: SB County Planning Commission denied FH 640 without prejudice (Mar 2023); RoBott walked away. Zoning, MDLT wildlife corridor / Joshua trees, Caltrans scenic Hwy 247. Source: Modern Campground (Mar 2023).`;

const CANCELLED_REASON: CancelledProjectReason = 'regulatory_denial';

const CANCELLED_REASON_NOTES = `San Bernardino County Planning Commission denied the Flamingo Heights 640 / RoBott 75-site glamping proposal without prejudice in March 2023—the project is no longer active and RoBott Land Company ultimately walked away. Zoning defeat: commissioners and Homestead Valley community councils agreed a 10,000 sq ft restaurant, commercial bar, art barn, and emergency heli-pad were too large and commercial for Rural Living desert zoning (campgrounds allowed, not resort-scale commercial amenities). Environmental flashpoints: Mojave Desert Land Trust flagged the ~26-acre site inside a critical desert wildlife corridor; development would have required relocating thousands of protected western Joshua Trees (staff cited 43 in the application) and extensive desert tortoise surveys, heavily inflating costs. Highway restrictions: site adjoins Highway 247 while Caltrans reviewed official Scenic Highway status, which would restrict building heights and block intended resort aesthetics. Despite denial without prejudice, developers did not successfully resubmit—treat as permanently canceled pipeline.`;

const SHARED_PATCH = {
  is_open: 'Cancelled',
  address: ADDRESS,
  description: DESCRIPTION,
  property_type: 'Glamping Resort',
  quantity_of_units: '75',
  property_total_sites: '75',
  url: 'https://moderncampground.com/usa/california/san-bernardino-county-planning-commission-denies-proposed-75-site-glamping-project/',
  rate_avg_retail_daily_rate: null,
  rate_winter_weekday: null,
  rate_winter_weekend: null,
  rate_spring_weekday: null,
  rate_spring_weekend: null,
  rate_summer_weekday: null,
  rate_summer_weekend: null,
  rate_fall_weekday: null,
  rate_fall_weekend: null,
  rate_unit_rates_by_year: null,
  planned_open_date: null,
  year_site_opened: null,
  cancelled_reason: CANCELLED_REASON,
  cancelled_reason_notes: CANCELLED_REASON_NOTES,
  date_updated: TODAY,
};

const TARGET_NAMES = [
  'Flamingo Heights Glamping Resort',
  'RoBott Flamingo Heights Glamping Resort',
];

function appendNote(existing: string | null | undefined): string {
  const base = (existing ?? '').trim();
  if (base.includes(RESEARCH_TAG.slice(0, 32))) return base;
  return base ? `${base}\n\n${NOTES}` : NOTES;
}

async function main(): Promise<void> {
  for (const property_name of TARGET_NAMES) {
    const { data: rows, error } = await supabase
      .from(TABLE)
      .select('id,property_name,notes')
      .eq('property_name', property_name)
      .order('id');

    if (error) throw new Error(`${property_name}: ${error.message}`);
    if (!rows?.length) {
      console.log(`SKIP ${property_name} — no rows`);
      continue;
    }

    for (const row of rows) {
      const patch = {
        ...SHARED_PATCH,
        notes: appendNote(row.notes),
      };
      console.log(`PATCH ${property_name} id=${row.id}`, JSON.stringify(patch, null, 2));
      if (!DRY_RUN) {
        const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
        if (updateError) throw new Error(`Update id=${row.id}: ${updateError.message}`);
      }
    }
  }

  console.log(
    DRY_RUN ? '\nDry run complete.' : '\nFlamingo Heights Glamping Resort cancellation applied.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
