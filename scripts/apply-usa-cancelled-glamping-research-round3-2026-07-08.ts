#!/usr/bin/env npx tsx
/**
 * Web research round 3 (Jul 2026): additional USA cancelled glamping resort
 * pipeline rows as research_status = in_progress for admin review.
 *
 * Usage:
 *   npx tsx scripts/apply-usa-cancelled-glamping-research-round3-2026-07-08.ts
 *   npx tsx scripts/apply-usa-cancelled-glamping-research-round3-2026-07-08.ts --dry-run
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { CancelledProjectReason } from '../lib/cancelled-project-reason';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_2026_07_usa_cancelled_pipeline_round3';
const RESEARCH_TAG = 'usa_cancelled_glamping_research_round3_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const AUTOCAMP_BRAND_ID = 'a2a6caad-52fd-417b-bb38-8c4d690c246d';
const UNDER_CANVAS_BRAND_ID = '2a78831f-3c15-4b52-b5a3-6c249f6a86a3';
const GETAWAY_HOUSE_BRAND_ID = '68328175-ddaf-42cd-b447-743f927fab78';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type CancelledInsert = {
  property_name: string;
  slug: string;
  brand_id?: string | null;
  property_type?: string;
  city: string;
  state: string;
  address: string;
  lat: number;
  lon: number;
  url: string;
  unit_type: string;
  quantity_of_units: number;
  property_total_sites: number;
  cancelled_year: number;
  cancelled_reason: CancelledProjectReason;
  cancelled_reason_notes: string;
  description: string;
  notes: string;
};

const NEW_CANCELLED: CancelledInsert[] = [
  {
    property_name: 'Under Canvas Sedona',
    slug: 'under-canvas-sedona-az',
    brand_id: UNDER_CANVAS_BRAND_ID,
    city: 'Sedona',
    state: 'AZ',
    address:
      'Bill Grey Road, Yavapai County, AZ (~80-acre luxury camping site northwest of Sedona; CUP withdrawn)',
    lat: 34.862,
    lon: -111.928,
    url: 'https://www.redrocknews.com/2019/11/20/glamping-site-cancels-plans-after-opposition-from-neighbors/',
    unit_type: 'Safari Tent',
    quantity_of_units: 100,
    property_total_sites: 100,
    cancelled_year: 2019,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'Under Canvas withdrew its Yavapai County conditional use permit application in November 2019 after fierce neighbor opposition on remote Bill Grey Road (originally ~125 luxury tents, later scaled back ~20%). Residents cited residential character, road impacts, and motel-like intensity in a low-density area; Supervisor Randy Garrison said developers failed to make the neighborhood “happy.” CDO Dan McBrearty cited focus on other U.S. camp openings—project did not advance.',
    description:
      'Under Canvas Sedona was a proposed luxury safari-tent glamping resort on roughly 80 acres off Bill Grey Road northwest of Sedona, Arizona—not an operating property. Under Canvas sought a conditional use permit for a high-amenity tent lodge overlooking Sedona red-rock country and Sycamore Canyon Wilderness (~100+ units in early filings). After an on-site neighbor meeting (Aug 2019) and organized Sycamore Pass opposition, Under Canvas pulled its county application in November 2019. Distinct from later AutoCamp Sedona (Bear Mountain) and operating Arizona glamping inventory.',
    notes: `${RESEARCH_TAG}: CUP withdrawn Nov 2019 (Bill Grey Rd). Sources: Sedona Red Rock News, Woodall's. REVIEW before publishing.`,
  },
  {
    property_name: 'Under Canvas Teton Valley',
    slug: 'under-canvas-teton-valley-id',
    brand_id: UNDER_CANVAS_BRAND_ID,
    city: 'Driggs',
    state: 'ID',
    address:
      'Old Jackson Highway & Moose Creek Road (E 10800 S), Driggs, ID (92-acre Hare parcel; CUP withdrawn)',
    lat: 43.719,
    lon: -111.104,
    url: 'https://www.tetonvalleynews.net/news/local_government/p-z-rejects-under-canvas-sales-pitch/article_07db68e3-a3f9-5c13-8770-f6d2f8639bc6.html',
    unit_type: 'Safari Tent',
    quantity_of_units: 90,
    property_total_sites: 90,
    cancelled_year: 2020,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'Under Canvas withdrew its Teton County conditional use permit application on Feb 19, 2020 immediately after Planning & Zoning unanimously recommended denial of a 90-unit glampground on the 92-acre Hare parcel at Old Jackson Highway and Moose Creek Road. Commissioners cited wildlife habitat, traffic (~234 daily vehicle trips), and incompatibility with AG/rural-residential 2.5-acre zoning; Valley Advocates opposed cumulative Moose Creek corridor glamping. Sale contingent on CUP—project abandoned.',
    description:
      'Under Canvas Teton Valley was a proposed 90-unit safari-tent glamping resort marketed to Grand Teton National Park visitors on a 92-acre agricultural/rural-residential parcel at the mouth of Moose Creek Canyon near Driggs, Idaho—not an operating property. Under Canvas applied in November 2019; P&Z heard vocal opposition in February 2020 and voted unanimously to recommend denial over wildlife, road, and zoning-fit concerns. Under Canvas withdrew the CUP application the next day (Feb 19, 2020). Distinct from operating Moose Creek Ranch lodging and from Wyoming-side Teton glamping pipeline.',
    notes: `${RESEARCH_TAG}: CUP withdrawn Feb 2020 after unanimous P&Z denial rec. Sources: Teton Valley News, Valley Advocates. REVIEW before publishing.`,
  },
  {
    property_name: 'Under Canvas Castle Valley',
    slug: 'under-canvas-castle-valley-ut',
    brand_id: UNDER_CANVAS_BRAND_ID,
    city: 'Castle Valley',
    state: 'UT',
    address:
      'UTLA/SITLA parcel near Castleton, Grand County, UT (~480 acres south of La Sal Mountain Loop Rd; lease terminated)',
    lat: 38.628,
    lon: -109.318,
    url: 'https://www.moabtimes.com/articles/termination-of-the-under-canvas-lease-announced/',
    unit_type: 'Safari Tent',
    quantity_of_units: 55,
    property_total_sites: 55,
    cancelled_year: 2026,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'La Sal Mountain Alliance announced in early 2026 that Under Canvas’s 30-year Utah Trust Lands Administration lease on a 480-acre Castle Valley parcel was terminated before development advanced past due diligence. Opposition cited wildlife habitat, water appropriation limits in the Colorado River Basin, fire risk, and an at-capacity Castle Valley power grid; LSMA formed in 2023 specifically to fight the resort. Parcel expected to return to UTLA leasing program ~2027—no operating camp built.',
    description:
      'Under Canvas Castle Valley was a proposed luxury glamping resort on a 480-acre Utah Trust Lands Administration (formerly SITLA) parcel near Castleton and Castle Valley in the La Sal Mountains east of Moab, Utah—not an operating property. Under Canvas won the sole competitive lease bid in late 2022 (~$165k/year plus royalties) but had no finalized county development plan; community opposition (Castle Valley town letter, ranchers, La Sal Mountain Alliance) focused on water, wildfire, helicopters, and precedent on trust lands. LSMA reported lease termination in early 2026. Comparable Under Canvas/ULUM sites cite ~50–55 tent units. Distinct from operating Under Canvas Moab and ULUM Moab.',
    notes: `${RESEARCH_TAG}: UTLA lease terminated early 2026 (480 ac, no build). Sources: Moab Times-Independent, La Sal Mountain Alliance, Moab Sun News. REVIEW before publishing.`,
  },
  {
    property_name: 'AutoCamp Sedona',
    slug: 'autocamp-sedona-az',
    brand_id: AUTOCAMP_BRAND_ID,
    city: 'Sedona',
    state: 'AZ',
    address:
      'Bear Mountain area, northwest of Sedona, AZ (~18 acres off Forest Rd 152E / Boynton Pass Rd; application withdrawn)',
    lat: 34.926,
    lon: -111.842,
    url: 'https://www.azcentral.com/story/news/local/arizona-environment/2021/02/17/contentious-proposal-develop-glamping-hotspot-sedona-withdrawn/6772374002/',
    unit_type: 'Airstream',
    quantity_of_units: 100,
    property_total_sites: 100,
    cancelled_year: 2021,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'AutoCamp formally withdrew its Yavapai County Board of Adjustment application on Feb 16, 2021 (~90 minutes before a scheduled hearing) for a Bear Mountain glamping site with ~85 Airstream trailers, clubhouse, and ~100 campsites on ~18–19 acres zoned rural residential. Opposition from ~1,300 residents, environmental groups, Hopi Tribe, and Yavapai-Apache Nation cited wildfire risk, sacred sites, and petroglyphs. AutoCamp stated it may resubmit after outreach—no revised application advanced.',
    description:
      'AutoCamp Sedona was a proposed Airstream-and-tent glamping resort at the base of Bear Mountain northwest of Sedona, Arizona—not an operating property. AutoCamp sought zoning exceptions for short-term trailer lodging on private land accessed via Forest Road 152E and Boynton Pass Road (~6 miles outside Sedona city limits). Tribal nations and residents opposed fire and cultural impacts on sensitive red-rock terrain. Senior land acquisition manager Bernie Corea withdrew the county application in February 2021 while leaving open a future resubmittal. Distinct from Under Canvas Sedona (Bill Grey Road, 2019) and operating Arizona AutoCamp sites.',
    notes: `${RESEARCH_TAG}: Application withdrawn Feb 2021 (Bear Mountain). Sources: AZ Central, Sedona Red Rock News, KNAU. REVIEW before publishing.`,
  },
  {
    property_name: 'AutoCamp Grand Canyon (Cooper Ranch)',
    slug: 'autocamp-grand-canyon-cooper-ranch-az',
    brand_id: AUTOCAMP_BRAND_ID,
    city: 'Williams',
    state: 'AZ',
    address:
      '581 Cooper Ranch Road, Williams, AZ (160-acre Cooper Ranch parcel; zoning pursuit abandoned)',
    lat: 35.354,
    lon: -112.248,
    url: 'https://autocampreviews.com/take-2-autocamp-second-grand-canyon-location/',
    unit_type: 'Airstream',
    quantity_of_units: 80,
    property_total_sites: 80,
    cancelled_year: 2024,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'AutoCamp abandoned pursuit of a Grand Canyon-area site on 160 acres at 581 Cooper Ranch Road near Williams after Coconino County Planning & Zoning granted an indefinite continuance and neighbors blocked a General-to-Resort Commercial rezoning needed for ~40 acres of Airstream glamping (plus employee housing). Access via seasonal Cooper Ranch Road and well/wastewater requirements proved contentious; AutoCamp shifted attention to a second Williams parcel near Canyon Coaster Adventure Park—Cooper Ranch pipeline effectively dead.',
    description:
      'AutoCamp Grand Canyon (Cooper Ranch) was a proposed boutique Airstream glamping campground on the Cooper Ranch parcel west/north of Williams, Arizona—not an operating property. AutoCamp sought resort-commercial zoning on roughly 40 acres of a 160-acre General-zoned holding for custom Airstream suites, employee modular housing (~20 staff), and preserved open space on the balance of the parcel (~1 hour from Grand Canyon). Neighbor opposition and indefinite county continuance on access and infrastructure stalled the rezoning; trade press reports AutoCamp walked away from Cooper Ranch and pursued an alternate Williams site. Treat as cancelled first Grand Canyon pipeline attempt.',
    notes: `${RESEARCH_TAG}: Cooper Ranch zoning pursuit abandoned ~2024; shifted to second Williams site. Sources: AutoCamp Reviews, Flagstaff Business News, Coconino P&Z continuance reporting. REVIEW before publishing.`,
  },
  {
    property_name: 'Getaway House - Cub World',
    slug: 'getaway-house-cub-world-burrillville-ri',
    brand_id: GETAWAY_HOUSE_BRAND_ID,
    city: 'Burrillville',
    state: 'RI',
    address:
      'Cub World / Buck Hill Road, Burrillville, RI (~200-acre former Boy Scout camp parcel; application withdrawn)',
    lat: 41.958,
    lon: -71.684,
    url: 'https://ecori.org/camping-proposal-for-former-boy-scout-site-in-burrillville-withdrawn/',
    unit_type: 'Cabin',
    quantity_of_units: 65,
    property_total_sites: 65,
    cancelled_year: 2023,
    cancelled_reason: 'financing_failure',
    cancelled_reason_notes:
      'Getaway House withdrew its Burrillville zoning application in April 2023 for a 65-cabin tiny-house glamping site on the Narragansett Council BSA Cub World parcel off Buck Hill Road after planning board approval but before zoning board completion. SVP Scott Levit cited financial performance risks (interest rates, shallow rock, archaeological/environmental features); residents raised conservation concerns. BSA later sold ~942 acres to RI DEM for conservation (2024)—glamping will not proceed on Cub World.',
    description:
      'Getaway House - Cub World was a proposed 65-cabin tiny-house glamping outpost on the former Cub World Boy Scout camp (~200 acres) in Burrillville, Rhode Island—not an operating property. Getaway sought to lease/purchase part of the Narragansett Council’s Buck Hill holdings for its standardized remote cabin product. The planning board approved a site plan in early 2023, but Getaway withdrew during zoning review in April 2023 citing project economics and site constraints. Rhode Island DEM subsequently acquired the broader scout property for public conservation (late 2024), foreclosing the glamping plan.',
    notes: `${RESEARCH_TAG}: Withdrawn Apr 2023 (65 cabins); DEM acquired land 2024. Sources: ecoRI News, NRI NOW. REVIEW before publishing.`,
  },
];

function buildInsertRow(spec: CancelledInsert): Record<string, unknown> {
  return {
    property_name: spec.property_name,
    slug: spec.slug,
    property_id: randomUUID(),
    property_type: spec.property_type ?? 'Glamping Resort',
    research_status: 'in_progress',
    is_glamping_property: 'Yes',
    is_open: 'Cancelled',
    cancelled_year: spec.cancelled_year,
    cancelled_reason: spec.cancelled_reason,
    cancelled_reason_notes: spec.cancelled_reason_notes,
    source: 'Sage',
    discovery_source: DISCOVERY_SOURCE,
    date_added: TODAY,
    date_updated: TODAY,
    country: 'United States',
    land_operator_category: 'private_commercial',
    brand_id: spec.brand_id ?? null,
    address: spec.address,
    city: spec.city,
    state: spec.state,
    lat: spec.lat,
    lon: spec.lon,
    url: spec.url,
    description: spec.description,
    notes: spec.notes,
    unit_type: normalizeGlampingUnitTypeForStorage(spec.unit_type),
    quantity_of_units: String(spec.quantity_of_units),
    property_total_sites: String(spec.property_total_sites),
    rate_avg_retail_daily_rate: null,
    planned_open_date: null,
    year_site_opened: null,
  };
}

async function propertyExists(name: string): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .limit(1);
  return Boolean(data?.length);
}

async function insertCancelledProperties(): Promise<void> {
  console.log('\n=== Insert cancelled pipeline properties (round 3) ===');
  for (const spec of NEW_CANCELLED) {
    if (await propertyExists(spec.property_name)) {
      console.log(`SKIP ${spec.property_name} — already exists`);
      continue;
    }

    const row = buildInsertRow(spec);
    console.log(
      `INSERT ${spec.property_name} (${spec.cancelled_year}, ${spec.cancelled_reason})`
    );
    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) throw new Error(`Insert ${spec.property_name}: ${error.message}`);
  }
}

async function main(): Promise<void> {
  await insertCancelledProperties();
  console.log(
    DRY_RUN ? '\nDry run complete.' : '\nUSA cancelled glamping research round 3 applied.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
