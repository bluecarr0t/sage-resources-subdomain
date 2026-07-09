#!/usr/bin/env npx tsx
/**
 * Set structured cancellation reason + context notes on known cancelled pipeline projects.
 *
 * Usage:
 *   npx tsx scripts/apply-cancelled-reason-context-2026-07-08.ts
 *   npx tsx scripts/apply-cancelled-reason-context-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { CancelledProjectReason } from '../lib/cancelled-project-reason';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type CancellationPatch = {
  property_names: string[];
  cancelled_reason: CancelledProjectReason;
  cancelled_reason_notes: string;
};

const PATCHES: CancellationPatch[] = [
  {
    property_names: ['AutoCamp Napa', 'The Grange Campground'],
    cancelled_reason: 'regulatory_denial',
    cancelled_reason_notes: `Napa City Council officially denied The Grange / AutoCamp Napa after more than a decade of review—the project is permanently canceled and not open. Sustained resident opposition cited fire evacuation routes on the Silverado Trail, heavy tourist traffic, and flood-zone / watershed risks along Milliken Creek. Planned inventory: ~100 high-end glamping units (custom Airstreams, luxury tents, permanent clubhouse) on a 12.5-acre Silverado Trail parcel. AutoCamp abandoned the development; the undeveloped land was listed for sale. Operating alternative for bookable AutoCamp glamping in Northern California wine country: AutoCamp Sonoma (Guerneville, formerly Russian River).`,
  },
  {
    property_names: ['Yonder Twentynine Palms', 'Ofland Twentynine Palms'],
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes: `Ofland Hotels (Yonder Hospitality rebrand, early 2024) formally canceled the Twentynine Palms resort after city entitlement approval—the project will not proceed. Plan evolved from Yonder's 130-cabin layout to Ofland's 100-cabin eco-resort on ~152 acres in Indian Cove near Joshua Tree National Park (lodges, pools, food service, employee housing, stargazing). Years of community backlash included Save Our Deserts and Indian Cove neighbor opposition before the Twentynine Palms City Council approved entitlements following intense public hearings. Despite approval, Ofland's Head of Development issued a press release halting the project, citing softening market conditions and capital requirements that could no longer be justified. Distinct from operating Yonder Escalante (UT) and other Ofland portfolio properties.`,
  },
  {
    property_names: [
      'Flamingo Heights Glamping Resort',
      'RoBott Flamingo Heights Glamping Resort',
    ],
    cancelled_reason: 'regulatory_denial',
    cancelled_reason_notes: `San Bernardino County Planning Commission denied the Flamingo Heights 640 / RoBott 75-site glamping proposal without prejudice in March 2023—the project is no longer active and RoBott Land Company ultimately walked away. Zoning defeat: commissioners and Homestead Valley community councils agreed a 10,000 sq ft restaurant, commercial bar, art barn, and emergency heli-pad were too large and commercial for Rural Living desert zoning. Environmental flashpoints: Mojave Desert Land Trust flagged the ~26-acre site inside a critical desert wildlife corridor; development would have required relocating protected western Joshua Trees and extensive desert tortoise surveys. Highway restrictions: site adjoins Highway 247 while Caltrans reviewed Scenic Highway status. Developers did not successfully resubmit—permanently canceled pipeline.`,
  },
];

async function main(): Promise<void> {
  for (const patch of PATCHES) {
    for (const property_name of patch.property_names) {
      const { data: rows, error } = await supabase
        .from(TABLE)
        .select('id,property_name,is_open,cancelled_reason,cancelled_reason_notes')
        .eq('property_name', property_name)
        .order('id');

      if (error) throw new Error(`${property_name}: ${error.message}`);
      if (!rows?.length) {
        console.log(`SKIP ${property_name} — no rows`);
        continue;
      }

      for (const row of rows) {
        const update = {
          is_open: 'Cancelled',
          cancelled_reason: patch.cancelled_reason,
          cancelled_reason_notes: patch.cancelled_reason_notes,
          date_updated: TODAY,
        };
        console.log(
          `PATCH ${property_name} id=${row.id}`,
          `reason=${patch.cancelled_reason}`,
          `notes=${patch.cancelled_reason_notes.slice(0, 80)}…`
        );
        if (!DRY_RUN) {
          const { error: updateError } = await supabase.from(TABLE).update(update).eq('id', row.id);
          if (updateError) throw new Error(`Update id=${row.id}: ${updateError.message}`);
        }
      }
    }
  }

  console.log(DRY_RUN ? '\nDry run complete.' : '\nCancellation reason context applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
