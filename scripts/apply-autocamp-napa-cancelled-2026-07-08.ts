#!/usr/bin/env npx tsx
/**
 * Mark AutoCamp Napa / The Grange (Napa) as permanently cancelled with council-denial context.
 *
 * Usage:
 *   npx tsx scripts/apply-autocamp-napa-cancelled-2026-07-08.ts
 *   npx tsx scripts/apply-autocamp-napa-cancelled-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const RESEARCH_TAG = 'autocamp_napa_cancelled_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DESCRIPTION = `AutoCamp Napa (development name "The Grange") was a proposed 12.5-acre luxury glamping resort along the Silverado Trail in Napa, California—not an operating property. After more than a decade of review, the Napa City Council officially denied the project following sustained resident opposition over fire evacuation routes, heavy tourist traffic, and flood-zone risks along the Milliken Creek watershed. Planned inventory included up to 100 high-end glamping units (custom Airstreams, luxury tents, and permanent clubhouse facilities). AutoCamp subsequently abandoned the development and the undeveloped parcel was listed for sale on the commercial market. For bookable AutoCamp glamping in Northern California wine country, use AutoCamp Sonoma (formerly AutoCamp Russian River) in Guerneville.`;

const ADDRESS =
  'Silverado Trail, Napa, CA (12.5-acre "The Grange" parcel; project denied; parcel listed for sale)';

const NOTES = `${RESEARCH_TAG}: Napa City Council denied The Grange / AutoCamp Napa after 10+ year entitlement battle (fire egress, traffic, watershed). AutoCamp walked away; land for sale. Operating alternative: AutoCamp Sonoma (Guerneville).`;

const SHARED_PATCH = {
  is_open: 'Cancelled',
  address: ADDRESS,
  description: DESCRIPTION,
  property_type: 'Glamping Resort',
  quantity_of_units: '100',
  property_total_sites: '100',
  url: 'https://autocamp.com/',
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
  date_updated: TODAY,
  notes: NOTES,
};

const TARGETS = [
  { property_name: 'AutoCamp Napa' },
  { property_name: 'The Grange Campground' },
];

function appendNote(existing: string | null | undefined): string {
  const base = (existing ?? '').trim();
  if (base.includes(RESEARCH_TAG.slice(0, 32))) return base;
  return base ? `${base}\n\n${NOTES}` : NOTES;
}

async function main(): Promise<void> {
  for (const target of TARGETS) {
    const { data: rows, error } = await supabase
      .from(TABLE)
      .select('id,property_name,notes')
      .eq('property_name', target.property_name)
      .order('id');

    if (error) throw new Error(`${target.property_name}: ${error.message}`);
    if (!rows?.length) {
      console.log(`SKIP ${target.property_name} — no rows`);
      continue;
    }

    for (const row of rows) {
      const patch = {
        ...SHARED_PATCH,
        notes: appendNote(row.notes),
      };
      console.log(`PATCH ${target.property_name} id=${row.id}`, JSON.stringify(patch, null, 2));
      if (!DRY_RUN) {
        const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
        if (updateError) throw new Error(`Update id=${row.id}: ${updateError.message}`);
      }
    }
  }

  console.log(DRY_RUN ? '\nDry run complete.' : '\nAutoCamp Napa cancellation applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
