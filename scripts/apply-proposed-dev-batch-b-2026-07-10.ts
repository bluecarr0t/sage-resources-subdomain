#!/usr/bin/env npx tsx
/**
 * Batch B — Keep verified US greenfield proposed developments (2026-07-10).
 *
 * Normalizes property_type, enriches metadata, confirms is_open = Proposed Development.
 * Does not include Julandy's Isle (Batch C) or Sunny Acres (phantom — reject separately).
 *
 * Usage:
 *   npx tsx scripts/apply-proposed-dev-batch-b-2026-07-10.ts
 *   npx tsx scripts/apply-proposed-dev-batch-b-2026-07-10.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const TAG = 'proposed_dev_batch_b_2026_07_10';
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

type RowPatch = Record<string, unknown> & { id: number; note: string };

const PATCHES: RowPatch[] = [
  {
    id: 12943,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    note: 'Verified greenfield; San Bernardino County review ongoing for 6-dome Integratron-area campground.',
  },
  {
    id: 12889,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    planned_open_date: '2027-04-01',
    note: 'Verified greenfield; Dunmore ZBA approved Apr 2025; construction target spring 2027.',
  },
  {
    id: 12977,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    url: 'https://www.thetimes-tribune.com/2026/02/02/monday-update-glamping-style-campground-copacabana-still-under-development-in-scranton/',
    description:
      'Lourival and Regina Chiarentin propose Copacabana, a glamping-style campground on a 197-acre tract off Morgan Highway in northern Scranton, Pennsylvania. Zoning approval (2021) covers a scaled plan of roughly 40–60 tent platforms; land-development review continued into 2026 with no operating bookings.',
    note: 'Verified greenfield; Scranton land-dev plan still in review Jan 2026.',
  },
  {
    id: 12949,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Outdoor Resort',
    is_glamping_property: 'Yes',
    city: 'La Sal',
    state: 'UT',
    description:
      'Clear Sky Resorts (Hal Feinberg) proposed George Eco Luxury Hotel Resort on SR-211 in San Juan County, Utah, near the Indian Creek / Canyonlands corridor: 82 wood-and-glass eco-domes plus restaurant, spa, pool, and employee housing. County conditional-use permit approved; no verified ground-breaking as of Jul 2026.',
    note: 'Verified greenfield Clear Sky San Juan County dome resort; CUP approved, pre-construction.',
  },
  {
    id: 12936,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    note: 'Verified greenfield; Kane County rezoning adopted Feb 24 2026 for cabin/glamping resort.',
  },
  {
    id: 12887,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    note: 'Verified greenfield; revised 11-site phased La Push plan pending Clallam County approval.',
  },
  {
    id: 12918,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Outdoor Boutique Hotel',
    is_glamping_property: 'No',
    planned_open_date: '2027-06-01',
    note: 'Verified greenfield Topography Hospitality resort; village approved Feb 2026; target opening 2027.',
  },
  {
    id: 12919,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Outdoor Boutique Hotel',
    is_glamping_property: 'No',
    planned_open_date: '2027-06-01',
    note: 'Verified greenfield lodge inventory row within 68-key Preserve at Williams Bay.',
  },
  {
    id: 12921,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    note: 'Client feasibility scenario (Lake Geneva micro-market study); not a public Grand Geneva expansion.',
  },
  {
    id: 12922,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    note: 'Client feasibility scenario — wooded cabin phase (~22 sites).',
  },
  {
    id: 12923,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    note: 'Client feasibility scenario — optional safari tent test units.',
  },
  {
    id: 12971,
    property_name: 'Roaming Trails Killeen',
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    city: 'Killeen',
    url: 'https://roamingtrailsrv.com/killeen/',
    planned_open_date: '2026-09-01',
    description:
      'Provident and Blue Water third Roaming Trails long-term RV retreat, coming soon in Killeen, Texas (Fort Hood corridor). Follows Burleson opening Nov 2025.',
    note: 'Verified greenfield; website lists coming soon 2026.',
  },
  {
    id: 12970,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    url: 'https://roamingtrailsrv.com/san-antonio/',
    planned_open_date: '2026-09-01',
    description:
      'Provident and Blue Water Roaming Trails RV retreat in the San Antonio, Texas market — coming soon 2026 per operator website.',
    note: 'Verified greenfield; website lists coming soon 2026.',
  },
  {
    id: 12955,
    property_name: 'Studio Park RV',
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'RV Park',
    is_glamping_property: 'No',
    url: 'https://moderncampground.com/usa/wilmingtons-proposed-rv-park-moves-forward-after-development-pause/',
    planned_open_date: '2026-09-01',
    description:
      'Studio Park LLC proposes a 50-pad luxury RV park at 2231 One Tree Hill Way in Wilmington, North Carolina — first in-city RV park. Rezoned Aug 2023; site plans in technical review; target opening spring–fall 2026.',
    note: 'Verified greenfield; Wilmington NC 50-pad luxury RV park.',
  },
  {
    id: 12979,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Campground',
    is_glamping_property: 'No',
    description:
      'Proposed campground along Naked Creek in Page/Rockingham counties, Virginia (Elkton area). Applicant pursuing dual special-use permits; Rockingham review ongoing Jun 2026 with local environmental opposition.',
    note: 'Verified greenfield; dual-county SUP in progress Jun 2026.',
  },
  {
    id: 12985,
    property_name: 'Sunset Bay RV Park (Mayfield Expansion)',
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'RV Park',
    is_glamping_property: 'No',
    description:
      'Adirondack Park Agency approved expansion adding 357 RV sites to the existing 299-site Sunset Bay Vacation Resort on Great Sacandaga Lake in Mayfield, New York (Oct 2025). Town planning and utility permits still pending.',
    note: 'Renamed from Mayfield RV Park; APA-approved Sunset Bay expansion (+357 sites).',
  },
  {
    id: 12984,
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'Campground',
    is_glamping_property: 'No',
    url: 'https://www.michigan.gov/dnr/managing-resources/prd/parks/mgt-plans/rockport-recreation-area',
    description:
      'Michigan DNR draft proposal for a new modern campground at Rockport State Recreation Area (Alpena/Presque Isle counties): up to 169 sites plus dark-sky amenities. Park is day-use only today; no funding or construction timeline as of 2026.',
    note: 'Verified greenfield DNR campground proposal; not an operating state park campground.',
  },
  {
    id: 12967,
    property_name: 'Preservation Point RV Resort',
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    url: 'https://preservationpoint.com/',
    description:
      'John Eden proposes Preservation Point, a phased upscale RV resort on ~230 acres bordering Lake Tsala Apopka near Inverness, Florida. Initial construction began 2021; annexation litigation with Citrus County ongoing; partial marketing site live.',
    note: 'Verified greenfield phased RV resort; long-running Citrus County annexation dispute.',
  },
  {
    id: 12956,
    property_name: 'The Ark at Denali RV Resort Campground',
    is_open: 'Proposed Development',
    research_status: 'in_progress',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    description:
      'Proposed Ark at Denali RV resort on an 85-acre retired gravel pit in Denali State Park, Alaska: 40 RV sites, 14 duplex cabins, tent sites, convenience store, and seasonal helipad. Mat-Su Borough conditional-use permit approved Jan 2025; not yet built.',
    note: 'Verified greenfield; Mat-Su CUP approved Jan 2025.',
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
    notes: appendNote(row.notes as string | null, note),
  };

  console.log(`PATCH id=${id} ${row.property_name}`, JSON.stringify(patch, null, 2));
  if (DRY_RUN) return;

  const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', id);
  if (updateError) throw new Error(`update id=${id}: ${updateError.message}`);
}

async function main(): Promise<void> {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== APPLY ===');
  for (const spec of PATCHES) {
    await applyPatch(spec);
  }
  console.log(DRY_RUN ? '\nDry run complete.' : '\nBatch B applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
