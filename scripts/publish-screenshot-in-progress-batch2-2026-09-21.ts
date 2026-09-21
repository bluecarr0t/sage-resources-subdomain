#!/usr/bin/env npx tsx
/**
 * Website-verified site rows for the second 21 Sep 2026 in-progress screenshot.
 * Unpublished estimated rates are cleared. Proposed projects keep is_open
 * Cancelled or Proposed Development when that is what the record supports.
 *
 * Usage:
 *   npx tsx scripts/publish-screenshot-in-progress-batch2-2026-09-21.ts --dry-run
 *   npx tsx scripts/publish-screenshot-in-progress-batch2-2026-09-21.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '../lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATED = '2026-09-21';
const SOURCE = 'web_research_screenshot_publish_2026_09_21_batch2';

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
  rate_basis_notes:
    'No fixed nightly rate was published. Earlier figures were removed because they were not on the operator site or the project record.',
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
    console.log(`sibling exists: ${siteName}`);
    await patchRow(existing[0]!.id as number, patch);
    return;
  }

  const { data, error } = await supabase
    .from(ALL_SAGE_DATA_TABLE)
    .select('*')
    .eq('id', sourceId)
    .single();
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
  console.log(`${DRY_RUN ? 'would insert' : 'insert'} ${siteName}`);
  if (DRY_RUN) return;
  const { error: insertError } = await supabase.from(ALL_SAGE_DATA_TABLE).insert(row);
  if (insertError) throw new Error(`insert ${siteName}: ${insertError.message}`);
}

async function main(): Promise<void> {
  await patchRow(13120, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Two Room Bubble',
    unit_type: unit('Bubble Tent'),
    quantity_of_units: 5,
    property_total_sites: null,
    address: '411 Fulcher Rd',
    zip_code: '79852',
    city: 'Study Butte',
    state: 'TX',
    url: 'https://basecampterlingua.com/bubble-terlingua/',
    is_open: 'Yes',
    unit_capacity: '4',
    unit_private_bathroom: 'Yes',
    unit_wifi: 'Yes',
    unit_air_conditioning: 'Yes',
    unit_mini_fridge: 'Yes',
    unit_hot_tub: 'Yes',
    property_pool: 'Yes',
    unit_description:
      'The FAQ on basecampterlingua.com says Bubble Terlingua has five bubbles, each with a private hot tub, sharing a communal pool. The lodging page describes a two-room bubble with a queen bed, pull-out sofa, private bath, minisplit heat and air conditioning, Wi-Fi, coffee, mini-fridge, BBQ, fire pit, and outdoor shower. Other pages on the same site still say nine bubbles or describe Basecamp Terlingua’s separate bubbles, so this count is the FAQ figure for this property only. Rates are date-based; the site does not publish a fixed nightly rate (campsite and Casa Luna Nova starting rates are other properties). Pets are not allowed.',
  });
  await insertSibling(13120, 'Pequena Casita', {
    property_name: 'Bubble Terlingua',
    site_name: 'Pequena Casita',
    unit_type: unit('Casita'),
    quantity_of_units: 1,
    unit_capacity: '4',
    unit_private_bathroom: 'Yes',
    unit_wifi: 'Yes',
    unit_air_conditioning: 'Yes',
    unit_mini_fridge: 'Yes',
    unit_hot_tub: null,
    property_pool: 'Yes',
    is_open: 'Yes',
    url: 'https://basecampterlingua.com/bubbles/',
    address: '411 Fulcher Rd',
    city: 'Study Butte',
    state: 'TX',
    zip_code: '79852',
    unit_description:
      'The bubbles inventory page says there is 1 Pequena Casita at Bubble Terlingua. The property page says more casitas are planned. A casita has a queen bed, pull-out sofa, private bath, minisplit, Wi-Fi, coffee, mini-fridge, BBQ, fire pit, outdoor shower, and access to the communal pool. A private hot tub is described for the bubbles, not the casita.',
  });

  await patchRow(38, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Cedar Creek Treehouse',
    unit_type: unit('Treehouse'),
    quantity_of_units: 1,
    unit_capacity: '2',
    url: null,
    is_open: 'Closed',
    address: '4565 Mosquito Lake Rd',
    zip_code: '98304',
    description:
      'Closed. cedarcreektreehouse.com no longer belongs to this property. Historical coverage (Portland Monthly, 2016) says one guest treehouse was available, built about 50 feet up for two adults, with an on-site observatory used for tours. A 2016 Seattle Weekly piece also describes a floating treehouse on the compound. The stored count of five rentable treehouses was not supported. Cedar Loft Cabin is a separate Ashford property.',
    unit_description:
      'One guest treehouse. Sleeps two. No current operator page and no current nightly rate.',
  });

  await patchRow(12999, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Proposed safari tent — not built',
    unit_type: unit('Safari Tent'),
    quantity_of_units: null,
    is_open: 'Cancelled',
    url: 'https://www.moabtimes.com/articles/termination-of-the-under-canvas-lease-announced/',
    unit_description:
      'Not built. Under Canvas held a Utah Trust Lands lease on about 480 acres near Castleton. The Moab Times reported the lease was terminated. No county plan fixed a unit count. The previous count of 55 was taken from other Under Canvas camps, not from this project, and was removed.',
  });

  await patchRow(13002, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Tiny cabin',
    unit_type: unit('Cabin'),
    quantity_of_units: 65,
    is_open: 'Cancelled',
    url: 'https://ecori.org/camping-proposal-for-former-boy-scout-site-in-burrillville-withdrawn/',
    unit_description:
      'Not built. Getaway proposed 65 remote cabins on the former Cub World Boy Scout camp in Burrillville. The company withdrew during zoning review in April 2023. Rhode Island DEM later acquired the broader scout land for conservation.',
  });

  await patchRow(12935, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Proposed glamping site — not built',
    unit_type: null,
    quantity_of_units: 32,
    is_open: 'Cancelled',
    url: 'https://moderncampground.com/usa/michigan/evergreen-resorts-10m-glamping-hotel-development-project-faces-opposition/',
    unit_description:
      'Not built. Stage 1 of the Evergreen expansion was 32 full-hookup luxury glamping sites with a bathhouse and pavilion along 41 Road near Cadillac. Clam Lake Township denied the rezoning in July 2022. The source does not name a structure type, so the safari-tent label was removed. A later hotel stage was also proposed and was not built.',
  });

  await patchRow(12990, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Cabin',
    unit_type: unit('Cabin'),
    quantity_of_units: 12,
    is_open: 'Cancelled',
    url: 'https://moderncampground.com/usa/maine/glamping-project-halted-as-developers-revoke-permits-on-deer-isle/',
    unit_description:
      'Not built. Fox Hollow Partners proposed 12 cabins, five tent sites, and a bathhouse on 48 acres at Crockett Cove, Deer Isle. Developers revoked the permits in February 2025. Tent sites are not inventoried as glamping units.',
  });

  const dreamAway =
    'Not built. Hit the Road RV LLC proposed a 100-site mix of tents and cabins on 48 acres off County Road in Becket, next to Dream Away Lodge. The developer withdrew the special permit in June 2022. The earlier split of 50 safari tents and 50 cabins was not in the hearing record, so those counts were cleared and the total of 100 is kept on one row.';
  await patchRow(12991, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Proposed tents and cabins — not built',
    unit_type: null,
    quantity_of_units: 100,
    is_open: 'Cancelled',
    description: dreamAway,
    unit_description: dreamAway,
  });
  await patchRow(13003, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Proposed tents and cabins — not built',
    unit_type: null,
    quantity_of_units: null,
    is_open: 'Cancelled',
    description: dreamAway,
    unit_description: dreamAway,
  });

  await patchRow(12996, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Seasonal luxury tent',
    unit_type: null,
    quantity_of_units: 25,
    unit_capacity: '6',
    is_open: 'Cancelled',
    url: 'https://oregoncoastalliance.org/documents_14/bayocean_spit/Bayocean_Park_Design_Proposal_Mar14.pdf',
    unit_description:
      'Not built. The March 2014 design proposal was 25 seasonal luxury tents on temporary wood decks, sized for a family of six, plus three separate research tents at a proposed lab. Tillamook County denied the resort in January 2015. The stored count of 50 was replaced with the proposal’s 25 guest tents.',
  });

  await patchRow(12993, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Mirrored cabin',
    unit_type: unit('Mirror Cabin'),
    quantity_of_units: 30,
    is_open: 'Cancelled',
    url: 'https://hungryhorsenews.com/news/2025/sep/03/teakettle-suit-formally-dropped/',
    unit_description:
      'Not built. Glass View Glacier LLC proposed about 30 mirrored glass cabins on roughly 80 acres east of Teakettle Mountain. Neighbors sued in 2025; the owner chose to sell rather than build, and the suit was dismissed in September 2025.',
  });

  await patchRow(12940, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Proposed yurts and teepees — not built',
    unit_type: null,
    quantity_of_units: 75,
    is_open: 'Cancelled',
    url: 'https://moderncampground.com/usa/california/san-bernardino-county-planning-commission-denies-proposed-75-site-glamping-project/',
    unit_description:
      'Not built. RoBott Land Company proposed 75 sites of yurts and teepee-style tents, plus a restaurant, bar, art barn, pool, and yoga deck, on Rural Living land along Highway 247. San Bernardino County Planning Commission denied the application in March 2023. The single unit type of Yurt was removed because the proposal was a mix.',
  });

  await patchRow(12989, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Safari tent',
    unit_type: unit('Safari Tent'),
    quantity_of_units: 75,
    is_open: 'Cancelled',
    url: 'https://www.dailyfreeman.com/2023/02/08/terramor-withdraws-controversial-saugerties-glamping-plan/',
    unit_description:
      'Not built. Terramor (KOA) proposed 75 luxury tents on 77 acres along Route 212 at the Saugerties–Woodstock line, with a restaurant and events building, pool, and wellness center. Terramor withdrew the applications in February 2023. This is not the operating Terramor resort in Bar Harbor, Maine.',
  });

  await patchRow(12997, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Proposed safari tent — not built',
    unit_type: unit('Safari Tent'),
    quantity_of_units: null,
    is_open: 'Cancelled',
    url: 'https://www.redrocknews.com/2019/11/20/glamping-site-cancels-plans-after-opposition-from-neighbors/',
    unit_description:
      'Not built. Under Canvas applied for a safari-tent resort on about 80 acres off Bill Grey Road northwest of Sedona and withdrew the application in November 2019. Early filings were described as about 100 or more units. That was not a final unit mix, so the exact count of 100 was removed.',
  });

  await patchRow(12937, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Geodesic dome',
    unit_type: unit('Dome'),
    quantity_of_units: 11,
    is_open: 'Proposed Development',
    url: 'https://wcyb.com/news/local/carter-county-planning-commission-rejects-plan-for-glamping-retreat',
    unit_description:
      'Not operating. Bastian and Marisol Yotta proposed 11 themed geodesic domes for a couples retreat in Poga. Carter County Planning Commission unanimously rejected the preliminary plan on 22 April 2025 for missing stormwater documents and site constraints. Staff said the plan can be reconsidered if those items are filed. An earlier social post said 10 domes; 11 is the count in the plan that was voted down. Status stays Proposed Development because the rejection was of a preliminary plan, not a recorded cancellation of the project.',
  });

  const autocampNote =
    'Not built. AutoCamp’s letter of intent for an 18.73-acre site off Forest Road 152E proposed 100 nightly sites: 65 signature Airstreams, 10 Basecamps (Airstream plus tent), 10 Mini Basecamps, 5 ADA park models, 5 X-Suite park models, and 5 standalone tents. A clubhouse and pool were included. AutoCamp withdrew the county application in February 2021. Airstream, Basecamp, Mini Basecamp, and park-model sites were described with a queen bed, kitchenette, and private bath. The five tents used clubhouse bathrooms.';
  await patchRow(13000, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Signature Airstream',
    unit_type: unit('Airstream'),
    quantity_of_units: 65,
    property_total_sites: 100,
    unit_capacity: '2',
    unit_private_bathroom: 'Yes',
    unit_kitchenette: 'Yes',
    property_pool: 'Yes',
    is_open: 'Cancelled',
    url: 'https://keepsedonabeautiful.org/wp-content/uploads/2020/09/Appendix-A-AutoCamp-Letter-of-Intent-Yavapai-Development-Preliminary-Code-Review.pdf',
    description: autocampNote,
    unit_description: autocampNote,
  });
  const autocampSites: Array<{ name: string; type: string; qty: number; bath: string }> = [
    { name: 'Basecamp', type: 'Airstream', qty: 10, bath: 'Yes' },
    { name: 'Mini Basecamp', type: 'Airstream', qty: 10, bath: 'Yes' },
    { name: 'ADA Park Model', type: 'Park Model', qty: 5, bath: 'Yes' },
    { name: 'X-Suite', type: 'Park Model', qty: 5, bath: 'Yes' },
    { name: 'Standalone Tent', type: 'Tent', qty: 5, bath: 'No' },
  ];
  for (const site of autocampSites) {
    await insertSibling(13000, site.name, {
      property_name: 'AutoCamp Sedona',
      site_name: site.name,
      unit_type: unit(site.type),
      quantity_of_units: site.qty,
      property_total_sites: 100,
      unit_capacity: '2',
      unit_private_bathroom: site.bath,
      unit_kitchenette: site.bath === 'Yes' ? 'Yes' : null,
      property_pool: 'Yes',
      is_open: 'Cancelled',
      url: 'https://keepsedonabeautiful.org/wp-content/uploads/2020/09/Appendix-A-AutoCamp-Letter-of-Intent-Yavapai-Development-Preliminary-Code-Review.pdf',
      description: autocampNote,
      unit_description: autocampNote,
    });
  }

  await patchRow(12998, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Safari tent',
    unit_type: unit('Safari Tent'),
    quantity_of_units: 90,
    is_open: 'Cancelled',
    url: 'https://www.tetonvalleynews.net/news/local_government/p-z-rejects-under-canvas-sales-pitch/article_07db68e3-a3f9-5c13-8770-f6d2f8639bc6.html',
    unit_description:
      'Not built. Under Canvas proposed 90 safari tents on a 92-acre parcel at Old Jackson Highway and Moose Creek Road, Driggs. Teton County P&Z recommended denial in February 2020, and Under Canvas withdrew the application the next day.',
  });

  await patchRow(12941, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Guest dome',
    unit_type: unit('Dome'),
    quantity_of_units: 90,
    is_open: 'Cancelled',
    url: 'https://themainemonitor.org/lamoine-bans-glampgrounds/',
    unit_description:
      'Not built. CPEX LLC (Clear Sky Resorts) applied in 2023 for Clear Sky Acadia on about 230 acres at Partridge Cove, Lamoine. The town quarterly and Maine Monitor describe 90 guest domes, from about 425 to 845 square feet, plus a restaurant, spa, pool, and activity domes. Bangor Daily News reported 103 domed cabins. The applicant withdrew after a moratorium. Lamoine voters then banned glampgrounds, and Frenchman Bay Conservancy bought part of the parcel.',
  });

  await patchRow(12992, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Completed dome',
    unit_type: unit('Dome'),
    quantity_of_units: 1,
    is_open: 'Cancelled',
    url: 'https://moderncampground.com/usa/washington/crowdfunded-glamping-venture-near-mount-baker-closes-leaving-backers-uncertain/',
    unit_description:
      'Not a resort. The Indiegogo plan was 35 geodesic domes with skylights, saunas, and fire pits on 2.16 acres along Old Mount Baker Highway, Glacier. Only one dome was finished, and it briefly hosted guests in 2024. The founder shut the project down in 2025 and listed the property. The count stored here is the one dome that was built, not the 35 that were planned.',
  });

  console.log(DRY_RUN ? 'dry run complete' : 'writes complete');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
