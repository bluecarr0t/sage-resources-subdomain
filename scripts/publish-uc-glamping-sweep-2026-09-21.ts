#!/usr/bin/env npx tsx
/**
 * Triage of proposed U.S. glamping rows and the Dune Glamping follow-up.
 * New inserts are limited to projects with a primary source. None of the
 * new or corrected rows are marked Under Construction except the Dune note.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '../lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATED = '2026-09-21';
const SOURCE = 'web_research_uc_glamping_sweep_2026_09_21';

const NO_RATE = {
  rate_avg_retail_daily_rate: null,
  rate_summer_weekday: null,
  rate_summer_weekend: null,
  rate_fall_weekday: null,
  rate_fall_weekend: null,
  rate_winter_weekday: null,
  rate_winter_weekend: null,
  rate_spring_weekday: null,
  rate_spring_weekend: null,
  rate_basis: null,
  rate_basis_notes: null,
} as const;

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Patch = Record<string, unknown>;

function unit(raw: string | null): string | null {
  return normalizeGlampingUnitTypeForStorage(raw);
}

async function patchRow(id: number, patch: Patch): Promise<void> {
  const payload = { ...patch, date_updated: UPDATED, discovery_source: SOURCE };
  console.log(`${DRY_RUN ? 'would update' : 'update'} id ${id}`);
  if (DRY_RUN) return;
  const { error } = await supabase.from(ALL_SAGE_DATA_TABLE).update(payload).eq('id', id);
  if (error) throw new Error(`update ${id}: ${error.message}`);
}

async function insertSibling(sourceId: number, siteName: string, patch: Patch): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from(ALL_SAGE_DATA_TABLE)
    .select('id')
    .eq('property_name', patch.property_name as string)
    .eq('site_name', siteName)
    .limit(1);
  if (existingError) throw new Error(existingError.message);
  if (existing && existing.length > 0) {
    await patchRow(existing[0]!.id as number, patch);
    return;
  }
  const { data, error } = await supabase.from(ALL_SAGE_DATA_TABLE).select('*').eq('id', sourceId).single();
  if (error || !data) throw new Error(`load ${sourceId}: ${error?.message ?? 'missing'}`);
  const { id: _id, ...rest } = data as Patch & { id: number };
  const row = {
    ...rest,
    ...NO_RATE,
    ...patch,
    site_name: siteName,
    date_updated: UPDATED,
    date_added: UPDATED,
    discovery_source: SOURCE,
    research_status: 'published',
  };
  console.log(`${DRY_RUN ? 'would insert' : 'insert'} ${String(patch.property_name)} / ${siteName}`);
  if (DRY_RUN) return;
  const { error: insertError } = await supabase.from(ALL_SAGE_DATA_TABLE).insert(row);
  if (insertError) throw new Error(`insert ${siteName}: ${insertError.message}`);
}

const REJECTS: Array<{ id: number; reason: string }> = [
  {
    id: 13365,
    reason:
      'Rejected 2026-09-21. No project named Above Zion with 2,000 units was found. The count was unsourced.',
  },
  {
    id: 13368,
    reason:
      'Rejected 2026-09-21 as a duplicate of the cancelled AutoCamp Grand Canyon / Cooper Ranch proposal. A 2023 rumor of a second Williams site near Canyon Coaster never reached a permit, and autocamp.com/locations/williams/ is not an operating camp. The stored 150 safari tents were the old Cooper Ranch figure.',
  },
  {
    id: 13376,
    reason:
      'Rejected 2026-09-21. No operator or planning record was found for a Cannon Creek glamping project in Tennessee. The count of 15 stays was unsourced.',
  },
  {
    id: 13143,
    reason:
      'Rejected 2026-09-21. No 48-unit Caterpillar Hill resort was found. A Hipcamp listing at the foot of Caterpillar Hill in Sedgwick is two off-grid cottages, which is a different and smaller stay.',
  },
  {
    id: 13373,
    reason:
      'Rejected 2026-09-21. Clapper’s Maple Ridge Ranch in Oneonta, NY, is a pumpkin patch. The site does not list seven cabins or a campground.',
  },
  {
    id: 13207,
    reason:
      'Rejected 2026-09-21. No source was found for Desert Flower Camping Resort in New Mexico, or for the count of 24 units.',
  },
  {
    id: 13204,
    reason:
      'Rejected 2026-09-21. No operator or planning record was found for a Jones Farm Glamping Resort in Coopertown, Tennessee.',
  },
  {
    id: 13208,
    reason:
      'Rejected 2026-09-21. No source was found for Journey Southwest Resort in Farmington, New Mexico.',
  },
  {
    id: 13363,
    reason:
      'Rejected 2026-09-21. No planning record was found for a 12-dome Lost Horizon retreat in Columbia County, Georgia.',
  },
  {
    id: 13367,
    reason:
      'Rejected 2026-09-21. No project named Maclaine Meadows Arcana Resort was found in Arizona. The count of 150 cabins was unsourced.',
  },
  {
    id: 13205,
    reason: 'Rejected 2026-09-21. No source was found for Rancho Diana in Florida, or for a count of 4 units.',
  },
  {
    id: 13137,
    reason:
      'Rejected 2026-09-21. No source was found for a Sands Township glamping resort in Michigan, or for a count of 12 units.',
  },
  {
    id: 13364,
    reason:
      'Rejected 2026-09-21. No source was found for a Starwood Capital glamping facility in Hawaii, or for a count of 50 units.',
  },
  {
    id: 13362,
    reason:
      'Rejected 2026-09-21 as a duplicate of published Eden Reserve in Williamstown, Kentucky. That resort is open: 22 cabins and 8 tents. It broke ground in summer 2023 and took its first guests a year later.',
  },
  {
    id: 13139,
    reason:
      'Rejected 2026-09-21. No operator or planning record was found for a Medieval Encampment glamping resort in Oak Ridge, New Jersey.',
  },
  {
    id: 13371,
    reason:
      'Rejected 2026-09-21. Under Canvas does not list a Catalina Island camp. The 2019 announcement did not become a project with a current permit or construction record. The count of 8 tents was unsourced.',
  },
  {
    id: 13374,
    reason:
      'Rejected 2026-09-21. Under Canvas does not operate a Hudson Valley camp in Hunter, NY. The stored page and the count of 60 safari tents were not a current project.',
  },
  {
    id: 13370,
    reason:
      'Rejected 2026-09-21. Under Canvas does not list a Joshua Tree camp. The 2019 announcement did not become a current construction project. The count of 8 tents was unsourced.',
  },
  {
    id: 13369,
    reason:
      'Rejected 2026-09-21. Under Canvas does not operate a Sonoma camp. The stored URL is not a current camp, and the count of 50 safari tents was not a project under construction.',
  },
  {
    id: 13193,
    reason:
      'Rejected 2026-09-21. timberlineglamping.com/amelia-island returned 404. No current Amelia Island camp or count of 7 units was found.',
  },
];

async function main(): Promise<void> {
  for (const row of REJECTS) {
    await patchRow(row.id, {
      ...NO_RATE,
      research_status: 'rejected',
      quantity_of_units: null,
      unit_type: null,
      description: row.reason,
    });
  }

  await patchRow(13372, {
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Under Construction',
    description:
      'Dome resort still unfinished. On 25 Mar 2026 Alamosa County extended special-use permit 22-003 only through 4 Jul 2026. The owner said plumbing was in for dome sites and the domes were still in Denver waiting on foundations. No later permit renewal or dome opening was found. A separate Hipcamp listing, Dune Camp hosted by Dune Glamping, was taking tent and small-RV guests in August 2026 (6 tent sites, 2 group sites, and 1 pull-through). Those are camp sites, not the domes, so they were not added as glamping units.',
  });

  await patchRow(11850, {
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Under Construction',
    quantity_of_units: 5,
    url: 'https://cardinalnews.org/2026/01/21/micro-resort-will-bring-glamping-to-a-quiet-corner-of-pittsylvania-county/',
    description:
      'Echo Valley, Dry Fork, Pittsylvania County. Cardinal News, 21 Jan 2026: the county had approved the rezoning, the site was being cleared, and the project was in permitting. Phase 1 is five geodesic domes. Five more are planned in each of phase 2 and phase 3. The stored count of 15 was the full plan, not phase 1. The owner hoped to open in May or June 2026. No opening notice was found after that date. Quoted future rates of $160 to $225 were not stored.',
  });

  await patchRow(9679, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    site_name: 'Luxury Cabin',
    unit_type: unit('Cabin'),
    quantity_of_units: 22,
    unit_private_bathroom: 'Yes',
    address: '500 Mercedes Drive',
    zip_code: '41097',
    phone_number: '(859) 350-6328',
    url: 'https://stayedenreserve.com/about/',
    description:
      'Open. Broke ground in summer 2023 and welcomed the first guests a year later. 22 cabins, each with two bedrooms and two full bathrooms, plus 8 tents that share a four-room bathhouse. 500 Mercedes Drive, Williamstown, about 2.5 miles from the Ark Encounter.',
    unit_description: '22 cabins. Two bedrooms and two full bathrooms in each cabin.',
  });

  await patchRow(9680, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    site_name: 'Glamping Tent',
    unit_type: null,
    quantity_of_units: 8,
    unit_private_bathroom: 'No',
    address: '500 Mercedes Drive',
    zip_code: '41097',
    phone_number: '(859) 350-6328',
    url: 'https://stayedenreserve.com/about/',
    unit_description:
      '8 tents. Guests use a dedicated four-room bathhouse uphill from the tents. The site calls them safari-inspired and does not specify the tent structure, so the unit type was left blank.',
  });

  await patchRow(13360, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Proposed Development',
    site_name: 'Architectural dome',
    unit_type: unit('Dome'),
    quantity_of_units: 13,
    unit_sq_ft: 750,
    unit_air_conditioning: 'Yes',
    unit_wifi: 'Yes',
    city: 'Thompsonville',
    state: 'MI',
    url: 'https://staystargazing.staystargazing.com/',
    description:
      'Proposed, not under construction. The operator site describes 13 climate-controlled 750 sq ft domes on 24 acres next to Crystal Mountain, with two king beds, a lounge, and Wi-Fi. It does not give a construction start or an opening date.',
    unit_description:
      '13 architectural domes, 750 sq ft, climate controlled, two king beds, lounge, dining for 4 to 6, Wi-Fi. A seasonal pool is described as part of the plan.',
  });

  await patchRow(13361, {
    ...NO_RATE,
    research_status: 'published',
    property_name: 'The Outpost at Yellowstone',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Proposed Development',
    site_name: 'Modern cabin',
    unit_type: unit('Cabin'),
    quantity_of_units: 10,
    city: 'West Yellowstone',
    state: 'MT',
    url: 'https://everwildhospitality.com/our-projects',
    description:
      'Pre-construction on the operator site, with an opening once planned for 2026. 10 modern cabins, 10 luxury yurts, 20 RV sites, and a clubhouse with a pool. No building permit or construction start was found, so this stays proposed.',
    unit_description: '10 custom modern cabins in the pre-construction plan.',
  });
  await insertSibling(13361, 'Luxury yurt', {
    property_name: 'The Outpost at Yellowstone',
    site_name: 'Luxury yurt',
    unit_type: unit('Yurt'),
    quantity_of_units: 10,
    is_open: 'Proposed Development',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    city: 'West Yellowstone',
    state: 'MT',
    url: 'https://everwildhospitality.com/our-projects',
    unit_description: '10 luxury yurts in the pre-construction plan.',
  });

  await patchRow(12887, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Proposed Development',
    unit_type: null,
    quantity_of_units: null,
    description:
      'Still a proposal. Timberland LLC took a revised phased plan to Clallam County after an earlier denial: phase 1 primitive tent sites, phase 2 studio cabins after water and septic, phase 3 a later conversion. No construction start was found. The canvas-tent label and any implied unit count were removed.',
  });

  await patchRow(12949, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Proposed Development',
    unit_type: unit('Dome'),
    description:
      'Proposed, not under construction. Clear Sky / Hal Feinberg proposal for George Eco Luxury Hotel Resort on SR-211 near La Sal: 82 wood-and-glass eco-domes, plus a restaurant, spa, pool, and employee housing. A county conditional-use permit was reported as approved. No construction start was found in this sweep.',
  });

  await patchRow(13140, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    is_open: 'Yes',
    quantity_of_units: null,
    unit_type: null,
    city: 'Bellemont',
    url: 'https://villagecamp.com/resorts/flagstaff/',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    description:
      'Open. Village Camp Flagstaff is operating in Bellemont, about 7 to 10 miles west of Flagstaff. The live site offers cabins and RV sites, a seasonal pool, and a year-round hot tub. The stored count of 48 was not on the current site. This is an RV and cabin resort, not a glamping-only project under construction.',
  });

  await patchRow(11997, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Proposed Development',
    site_name: 'Platform tent',
    unit_type: unit('Safari Tent'),
    quantity_of_units: 50,
    address: '775 Williamstown Road',
    city: 'Lanesborough',
    state: 'MA',
    url: 'https://www.berkshireeagle.com/business/lanesborough-glamping-resort-gets-two-oks/article_502641d9-9018-4874-8111-0adc438aee74.html',
    description:
      'Approved, not yet under construction. In January 2026 the Lanesborough Conservation Commission and Zoning Board approved Under Canvas at the former Donnybrook Country Club, 775 Williamstown Road. The approval covers 94 seasonal platform tents. Phase 1 is 50 tents, with later tents depending on demand. The Berkshire Eagle said more municipal hurdles remained. No construction start was found.',
    unit_description:
      'Phase 1 is 50 seasonal platform tents. The full approval is 94. Nightly rates were discussed in a range of about $400 to $600 and were not stored as a published rack rate.',
  });

  console.log(DRY_RUN ? 'dry run complete' : 'writes complete');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
