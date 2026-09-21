#!/usr/bin/env npx tsx
/**
 * Review of US under-construction rows still marked in_progress on 21 Sep 2026.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '../lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATED = '2026-09-21';
const SOURCE = 'web_research_uc_in_progress_2026_09_21';

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

async function main(): Promise<void> {
  await patchRow(12953, {
    ...NO_RATE,
    research_status: 'rejected',
    quantity_of_units: null,
    unit_type: null,
    is_glamping_property: 'No',
    description:
      'Rejected 2026-09-21. No operator or planning record was found for a Green Valley Campground under construction in Boulder, Colorado. The stored description and count of 80 RV sites were unsourced.',
  });

  await patchRow(13372, {
    ...NO_RATE,
    research_status: 'published',
    property_name: 'Dune Glamping',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    land_operator_category: 'private_commercial',
    site_name: 'Geodesic dome',
    unit_type: unit('Dome'),
    quantity_of_units: null,
    is_open: 'Under Construction',
    city: 'Mosca',
    state: 'CO',
    address: '15050 Lane 6 North',
    zip_code: '81146',
    phone_number: '(719) 355-6315',
    url: 'https://www.alamosacounty.org/AgendaCenter/ViewFile/Minutes/_03252026-229',
    description:
      'Harmony Domes is the dome supplier, not the resort. This row is Dune Glamping LLC at 15050 Lane 6 North, Mosca, near Great Sand Dunes. Alamosa County approved special-use permit 22-003 in November 2022 for a campground. On 25 Mar 2026 the commissioners extended the permit through 4 Jul 2026. The owner told the hearing that underground plumbing was in for dome sites, the domes were still in Denver waiting on concrete foundations, and about $700,000 had been spent. The land-use director said the current plan was about six domes. The stored count of 10 was not the plan stated at that hearing, so it was removed. No opening or later permit action was found after July 2026.',
    unit_description:
      'Geodesic domes. A finished count was not in the March 2026 hearing. Seven tent sites were a separate, earlier approval that required at least one dome before they could operate.',
  });

  await patchRow(12983, {
    ...NO_RATE,
    research_status: 'published',
    property_name: 'Bend RV Resort',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: 176,
    is_open: 'Yes',
    address: '61105 SW Silverado Springs Drive',
    zip_code: '97702',
    url: 'https://www.bendrvresort.com/',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    description:
      'Opened in November 2024. 176 full-hookup RV sites at Murphy Road and Highway 97. Heated pool, hot tub, pickleball, clubhouse, fitness center, and dog park. This is an RV resort, not a glamping property.',
    unit_description: '176 full-hookup RV sites. Woodall’s Campground Magazine, May 2025.',
  });

  await patchRow(13200, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    site_name: 'Resort lodging',
    unit_type: null,
    quantity_of_units: null,
    is_open: 'Yes',
    address: '80 KOA Way',
    zip_code: '78624',
    phone_number: '1-830-209-7606',
    url: 'https://koa.com/campgrounds/fredericksburg/',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    description:
      'Opened 1 Sep 2026 with a soft opening. Some amenities were still being finished in mid-September. Address is 80 KOA Way, not the former US-290 KOA. The live site lists deluxe cabins, Conestoga wagons, premium RV sites, and tent sites, and does not publish a count. The stored count of 50 RV sites was removed. Pool, lazy river, and hot tubs are open.',
    unit_description:
      'Deluxe cabins have full baths and partial kitchens. Covered wagons have a king bed and bunks, with a private full bathroom nearby. RV sites are full hookup. Tent sites have water, electric, and a raised platform. Counts were not published.',
  });

  await patchRow(13375, {
    ...NO_RATE,
    research_status: 'published',
    property_name: 'Jellystone Park Camp-Resort at Watts Bar Lake',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    site_name: 'Camp site',
    unit_type: null,
    quantity_of_units: 263,
    is_open: 'Yes',
    address: '10250 Corporate Park Drive',
    zip_code: '37774',
    phone_number: '865-284-9644',
    url: 'https://www.wattsbarlakejellystonepark.com/',
    property_pool: 'Yes',
    description:
      'Open family camp-resort on 74 acres, not an under-construction glamping project. The March 2024 announcement described 263 sites, mixing RV pads and cabins with kitchens and baths. The live site does not split that total, so the 263 is the announced site total. Two pools and a splash park.',
    unit_description:
      'RV sites and cabins. Cabin and RV counts were not published separately. The earlier in-progress row used the same 263-site park that was already recorded as rejected under this name; this row is now the published operating record.',
  });

  await patchRow(13182, {
    ...NO_RATE,
    research_status: 'published',
    property_name: 'Dallas NE Campground',
    property_type: 'RV Park',
    is_glamping_property: 'No',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: null,
    is_open: 'Yes',
    address: '4268 FM 36 S',
    zip_code: '75135',
    phone_number: '(903) 527-3615',
    url: 'https://openroadresorts.com/dallas-ne-campground/',
    description:
      'Operating Open Road Resorts park in Caddo Mills, listed as a Good Sam park. The stored count of 150 RV sites and the glamping description were not on the operator site.',
  });

  await patchRow(13135, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: null,
    is_open: 'Yes',
    address: '225 Mitchell Creek Road',
    zip_code: '40741',
    phone_number: '(606) 588-3276',
    url: 'https://thefarmrvresort.com/',
    description:
      'Opened in October 2024 and is open year-round, off I-75 Exit 41. Full-hookup and pull-through RV sites. The stored count of 150 was not on the operator site. Phone (606) 588-3276.',
  });

  await patchRow(13141, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    site_name: 'RV and cabin',
    unit_type: null,
    quantity_of_units: null,
    is_open: 'Yes',
    url: 'https://villagecamp.com/resorts/truckee-tahoe/',
    description:
      'Operating Village Camp resort on the former Coachland RV Park site. The 2022 launch story said the park already took RVs and was adding rental cabins. The live site offers eco cabins and luxury RV sites and does not restate the old 130-site count, so that count was removed.',
  });

  await patchRow(12981, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: null,
    is_open: 'Yes',
    address: '6500 Service Road',
    zip_code: '27055',
    phone_number: '(336) 553-9907',
    url: 'https://yadkinvalleyrvresort.com/',
    rate_basis: 'room_only',
    rate_basis_notes:
      'Operator site: back-in sites are $69 a night and pull-through sites are $74. The park says it has 80 or more sites, so a single count was not stored. Some amenities are still being finished.',
    description:
      'Open RV resort. The operator says the park is welcoming guests while some amenities are still under construction. Back-in sites are $69 and pull-through sites are $74. Address 6500 Service Road, Yadkinville.',
  });

  await patchRow(13195, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'RV Resort',
    is_glamping_property: 'No',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: null,
    is_open: 'Under Construction',
    address: '6579 Gulfway Dr',
    zip_code: '77619',
    url: 'https://ladyluckrvresort.com/',
    description:
      'Groves City Council approved the RV park in June 2022 on 5.62 acres near Texas 73 and Texas 87, with construction expected to start the following month. The operator site lists 6579 Gulfway Dr and does not publish an opening date or a site count. The stored count of 55 was removed. Planned amenities in the 2022 report included a playground, dog park, pool, laundry, and restrooms.',
  });

  await patchRow(13183, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'RV Park',
    is_glamping_property: 'No',
    site_name: 'Planned RV park',
    unit_type: unit('RV Site'),
    quantity_of_units: null,
    is_open: 'Proposed Development',
    url: 'https://www.avisonyoung.us/news-item/-/article/2025/08/07/big-bear-travel-center-breaks-ground-phase-big-bear-crossing-80-acre-mixed-use-opportunity-zone-project-strawn-tx/in/austin',
    description:
      'Big Bear Crossing is an 80-acre mixed-use project at I-20 and State Highway 16 in Strawn. Phase 1, the Big Bear Travel Center, broke ground in August 2025. The RV park is a planned 18.5-acre parcel being marketed for development, not a 20-site park already under construction. The stored count of 20 was removed.',
  });

  await patchRow(13129, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'Campground',
    is_glamping_property: 'No',
    land_operator_category: 'other_public',
    site_name: 'Group campsite',
    unit_type: null,
    quantity_of_units: 1,
    is_open: 'Under Construction',
    city: 'Paris',
    url: 'https://www.bigrapidsnews.com/news/article/white-pine-valley-recreation-area-campsite-20244325.php',
    description:
      'Mecosta County park project, not a private glamping resort. The parks commission began a single primitive group campsite for up to 160 people. A well and hand pump were going in, and occupancy waited on an EGLE inspection and a campground license. The stored count of 20 RV sites was removed. Overnight camping at the recreation area had been closed since 2021.',
    unit_description: 'One all-season group campsite, larger than 25,000 square feet, for a single group of up to 160 people.',
  });

  console.log(DRY_RUN ? 'dry run complete' : 'writes complete');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
