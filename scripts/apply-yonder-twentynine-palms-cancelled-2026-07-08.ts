#!/usr/bin/env npx tsx
/**
 * Mark Yonder / Ofland Twentynine Palms as permanently cancelled after developer withdrawal.
 *
 * Usage:
 *   npx tsx scripts/apply-yonder-twentynine-palms-cancelled-2026-07-08.ts
 *   npx tsx scripts/apply-yonder-twentynine-palms-cancelled-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const RESEARCH_TAG = 'yonder_twentynine_palms_cancelled_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DESCRIPTION = `Yonder Twentynine Palms (later rebranded Ofland Twentynine Palms) was a proposed high-desert cabin resort in the Indian Cove area of Twentynine Palms, California—not an operating property. Yonder Hospitality rebranded to Ofland Hotels in early 2024 and scaled the plan from 130 solar-equipped cabins to a 100-cabin eco-resort on roughly 152 acres near Joshua Tree National Park, with lodges, pools, food service, employee housing, and stargazing amenities. After years of community backlash—including opposition from the Save Our Deserts campaign and Indian Cove neighbors—the Twentynine Palms City Council approved the project's land entitlements following intense public hearings. Despite that approval, Ofland Hotels' Head of Development issued a press release formally halting and canceling the project, citing softening market conditions and stating the required capital investment could no longer be justified. The resort will not proceed. Distinct from operating Yonder Escalante (UT) and other Ofland portfolio projects—verify status before publishing rates.`;

const ADDRESS =
  'Indian Cove neighborhood, Twentynine Palms, CA (~152 acres near Joshua Tree National Park; project canceled)';

const NOTES = `${RESEARCH_TAG}: Ofland Hotels canceled Twentynine Palms after city entitlement approval (Save Our Deserts / Indian Cove opposition; developer cited market conditions). Rebrand from Yonder (130 cabins) to Ofland (100 cabins) in 2024.`;

const SHARED_PATCH = {
  is_open: 'Cancelled',
  address: ADDRESS,
  description: DESCRIPTION,
  property_type: 'Glamping Resort',
  quantity_of_units: '100',
  property_total_sites: '100',
  url: 'https://www.ofland29palmsresort.com/',
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
};

const TARGETS = ['Yonder Twentynine Palms', 'Ofland Twentynine Palms'];

function appendNote(existing: string | null | undefined): string {
  const base = (existing ?? '').trim();
  if (base.includes(RESEARCH_TAG.slice(0, 32))) return base;
  return base ? `${base}\n\n${NOTES}` : NOTES;
}

async function main(): Promise<void> {
  for (const property_name of TARGETS) {
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
    DRY_RUN ? '\nDry run complete.' : '\nYonder / Ofland Twentynine Palms cancellation applied.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
