#!/usr/bin/env npx tsx
/**
 * Website-verified site rows for the fourth 21 Sep 2026 in-progress screenshot.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '../lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATED = '2026-09-21';
const SOURCE = 'web_research_screenshot_publish_2026_09_21_batch4';

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
    'No single nightly rate is published. Earlier figures were removed because they were not on the operator site.',
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
    research_status: patch.research_status ?? 'published',
  };
  console.log(`${DRY_RUN ? 'would insert' : 'insert'} ${String(patch.property_name)} / ${siteName}`);
  if (DRY_RUN) return;
  const { error: insertError } = await supabase.from(ALL_SAGE_DATA_TABLE).insert(row);
  if (insertError) throw new Error(`insert ${siteName}: ${insertError.message}`);
}

async function main(): Promise<void> {
  await patchRow(13197, {
    ...NO_RATE,
    research_status: 'rejected',
    quantity_of_units: null,
    unit_type: null,
    city: null,
    address: null,
    url: null,
    description:
      'Rejected 2026-09-21. This row had city "optional", address "optional", and URL "optional official site", with an unsourced count of 10 safari tents. No Under Canvas camp by this name was found.',
  });

  await patchRow(13131, {
    ...NO_RATE,
    research_status: 'rejected',
    quantity_of_units: null,
    unit_type: null,
    description:
      'Rejected 2026-09-21. No operator site or planning record was found for a Whispering Pines Glamping Resort in Asheville. The count of 12 safari tents was not sourced.',
  });

  await patchRow(13128, {
    ...NO_RATE,
    research_status: 'rejected',
    quantity_of_units: null,
    unit_type: null,
    description:
      'Rejected 2026-09-21. No operator site was found. The stored description reads like a land-financing pitch, and the count of 4 domes was not sourced.',
  });

  await patchRow(13178, {
    ...NO_RATE,
    research_status: 'rejected',
    quantity_of_units: null,
    unit_type: null,
    is_open: 'Yes',
    url: 'https://www.ashevilleglamping.com/stay',
    description:
      'Rejected 2026-09-21 as a duplicate of published Asheville Glamping in Alexander, NC. That camp has one Mountain View Dome (queen, sleeps 2, air conditioning, private rustic bath). This row’s count of 8 domes under construction was not a separate project.',
  });

  await patchRow(13366, {
    ...NO_RATE,
    research_status: 'rejected',
    quantity_of_units: null,
    description:
      'Rejected 2026-09-21 as a duplicate of Historic Two Guns Resort. The county rejected that project in May 2021. This row’s count of 4 units did not match the plan.',
  });

  const twoGuns =
    'Not built. Coconino County rejected the zoning change in May 2021 (Route 66 News). The plan, reported by AP and the Arizona Daily Sun, was 787 lodging units: 395 RV sites, 78 tipis, 98 cabins, 19 yurts, 43 wagons, and a 13-room cliffside hotel, on about 247 acres at the Two Guns interchange. The stored label of 78 safari tents was the tipi count.';
  await patchRow(13025, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Tipi',
    unit_type: unit('Tipi'),
    quantity_of_units: 78,
    is_open: 'Cancelled',
    url: 'https://www.route66news.com/2021/05/13/county-board-rejects-zoning-change-for-massive-2-guns-resort-project/',
    description: twoGuns,
    unit_description: twoGuns,
  });
  const twoGunsSites: Array<{ name: string; type: string | null; qty: number }> = [
    { name: 'Cabin', type: 'Cabin', qty: 98 },
    { name: 'Yurt', type: 'Yurt', qty: 19 },
    { name: 'Wagon', type: 'Covered Wagon', qty: 43 },
    { name: 'Cliffside hotel', type: null, qty: 13 },
    { name: 'RV site', type: 'RV Site', qty: 395 },
  ];
  for (const site of twoGunsSites) {
    await insertSibling(13025, site.name, {
      property_name: 'Historic Two Guns Resort',
      site_name: site.name,
      unit_type: site.type ? unit(site.type) : null,
      quantity_of_units: site.qty,
      is_open: 'Cancelled',
      city: 'Two Guns',
      state: 'AZ',
      url: 'https://apnews.com/general-news-4845ee68dfbfba3225484fe17659b3cb',
      description: twoGuns,
      unit_description: `${site.qty} ${site.name.toLowerCase()} units in the rejected Two Guns plan.`,
    });
  }

  await patchRow(13089, {
    research_status: 'published',
    site_name: "ÖÖD Texas Mirror House",
    unit_type: unit('Mirror Cabin'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_private_bathroom: 'Yes',
    unit_air_conditioning: 'Yes',
    unit_wifi: 'Yes',
    unit_hot_tub: 'Yes',
    unit_kitchenette: 'Yes',
    unit_mini_fridge: 'Yes',
    property_sauna: 'Yes',
    is_open: 'Yes',
    address: '360 England Ln',
    zip_code: '77331',
    phone_number: '936-223-3717',
    url: 'https://cameronranchglamping.com/listing/ood-texas-mirror-house-houston/',
    rate_avg_retail_daily_rate: 299,
    rate_summer_weekday: null,
    rate_summer_weekend: null,
    rate_fall_weekday: null,
    rate_fall_weekend: null,
    rate_winter_weekday: null,
    rate_winter_weekend: null,
    rate_spring_weekday: null,
    rate_spring_weekend: null,
    rate_basis: 'room_only',
    rate_basis_notes: 'Operator site: dynamic pricing starts at $299 per night and is higher on weekends. Two-night minimum on weekends.',
    unit_description:
      'One mirrored cabin on 11 acres above Huffman’s Creek. Queen bed, private bath, air conditioning, Starlink Wi-Fi, kitchenette, wood-fired hot tub, plunge pool, outdoor soaking tub, dry sauna, and fire pit. Sleeps 2. Pets allowed for a fee. The same Coldspring collection also lists the Wonderland geo dome.',
  });
  await insertSibling(13089, 'Wonderland Geo Dome', {
    property_name: 'Cameron Ranch Glamping - Coldspring',
    site_name: 'Wonderland Geo Dome',
    unit_type: unit('Dome'),
    quantity_of_units: 1,
    unit_capacity: '3',
    unit_private_bathroom: 'Yes',
    unit_hot_tub: null,
    unit_wifi: null,
    unit_air_conditioning: null,
    unit_kitchenette: null,
    unit_mini_fridge: null,
    property_sauna: null,
    is_open: 'Yes',
    address: '360 England Ln',
    city: 'Coldspring',
    state: 'TX',
    zip_code: '77331',
    phone_number: '936-223-3717',
    url: 'https://cameronranchglamping.com/',
    rate_avg_retail_daily_rate: null,
    rate_basis: null,
    rate_basis_notes: 'No fixed rate was on the collection page for this dome.',
    unit_description:
      'Geo dome on the Coldspring / Houston collection. Sleeps 3, one bedroom, one bath. The brand FAQ says this is the unit that is not pet friendly. A nightly rate was not on the collection page.',
  });

  await patchRow(13092, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Balsam Fir',
    unit_type: unit('Mirror Cabin'),
    quantity_of_units: 1,
    is_open: 'Yes',
    address: '43 Ridge Road',
    zip_code: '03598',
    phone_number: '+1 (603) 801-1943',
    url: 'https://www.farawaypond.com/',
    unit_description:
      'ÖÖD mirror house at FarAway Pond, 43 Ridge Road, Dalton. The site also lists Birch, plus Sun House, Tranquil Cottage, and Lux Private Island. Those cottage pages mix hot tub, sauna, and kitchen details, so only the two named mirror houses were given rows. Dog friendly. Private pond, trails, and kayaks. No single nightly rate on the homepage.',
  });
  await insertSibling(13092, 'Birch', {
    property_name: 'FarAway Pond',
    site_name: 'Birch',
    unit_type: unit('Mirror Cabin'),
    quantity_of_units: 1,
    is_open: 'Yes',
    address: '43 Ridge Road',
    city: 'Dalton',
    state: 'NH',
    zip_code: '03598',
    phone_number: '+1 (603) 801-1943',
    url: 'https://www.farawaypond.com/',
    unit_description: 'ÖÖD mirror house named on farawaypond.com. Bed count and a fixed rate were not separated from the cottage copy on the homepage.',
  });

  const lookUrl = 'https://lookrvresort.com/cabins-glamping/';
  const lookNote =
    'Open. lookrvresort.com lists 12 family glamping cabins and 6 studio cabins at 1512 N Grayson Pkwy, Blanding, plus 6 tent sites. The San Juan Record construction story (November 2024) described 90 RV hookups (53 pull-through, 37 back-in), a pool, and an outdoor hot tub. Family cabins: queen in a private room, bunks, kitchen, bathroom, and air conditioning. Studios: king bed, full kitchen, bathroom, and air conditioning. Opening rates are discounted and not a fixed number.';
  await patchRow(13241, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Family cabin',
    unit_type: unit('Cabin'),
    quantity_of_units: 12,
    unit_private_bathroom: 'Yes',
    unit_full_kitchen: 'Yes',
    unit_air_conditioning: 'Yes',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    is_open: 'Yes',
    address: '1512 N Grayson Pkwy',
    zip_code: '84511',
    phone_number: '(435) 270-4063',
    url: lookUrl,
    description: lookNote,
    unit_description: lookNote,
  });
  await insertSibling(13241, 'Studio cabin', {
    property_name: 'The Look RV Resort',
    site_name: 'Studio cabin',
    unit_type: unit('Cabin'),
    quantity_of_units: 6,
    unit_capacity: '2',
    unit_private_bathroom: 'Yes',
    unit_full_kitchen: 'Yes',
    unit_air_conditioning: 'Yes',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    is_open: 'Yes',
    address: '1512 N Grayson Pkwy',
    city: 'Blanding',
    state: 'UT',
    zip_code: '84511',
    phone_number: '(435) 270-4063',
    url: lookUrl,
    description: lookNote,
    unit_description: 'Six king studio cabins. Full kitchen, private bath, heat and air conditioning.',
  });
  await insertSibling(13241, 'Tent site', {
    property_name: 'The Look RV Resort',
    site_name: 'Tent site',
    unit_type: null,
    quantity_of_units: 6,
    unit_private_bathroom: null,
    unit_full_kitchen: null,
    unit_air_conditioning: null,
    unit_hot_tub: null,
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    is_open: 'Yes',
    address: '1512 N Grayson Pkwy',
    city: 'Blanding',
    state: 'UT',
    zip_code: '84511',
    phone_number: '(435) 270-4063',
    url: 'https://lookrvresort.com/',
    description: lookNote,
    unit_description:
      'Six tent sites with picnic tables, power, and a water spigot, from the live resort homepage. These are camp sites, not the glamping cabins.',
  });
  await patchRow(12982, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: 90,
    is_open: 'Yes',
    address: '1512 N Grayson Pkwy',
    zip_code: '84511',
    phone_number: '(435) 270-4063',
    url: 'https://lookrvresort.com/',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    description: lookNote,
    unit_description:
      '90 RV hookups in the November 2024 project description (53 pull-through, 37 back-in). The resort is now open. The live site confirms full hookups and does not restate the 90.',
  });

  await patchRow(13206, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Elevated invisible cabin',
    unit_type: unit('Mirror Cabin'),
    quantity_of_units: 3,
    unit_capacity: '6',
    unit_sq_ft: null,
    unit_private_bathroom: 'Yes',
    unit_full_kitchen: 'Yes',
    unit_hot_tub: 'Yes',
    unit_wifi: 'Yes',
    is_open: 'Yes',
    city: 'Marshall',
    address: '108 Howell Rd',
    zip_code: '28753',
    url: 'https://tomsfinds.visitmirrorhotel.com/',
    unit_description:
      'Three elevated mirror cabins, about 1,500 sq ft including decks, 3 bedrooms, sleep 6, with a full kitchen, hot tub, and fire pit. A 2025 sale listing for 108 Howell Rd, Marshall, says six cabins are built (three elevated, three grounded completed in 2024), with rights for 12 more. The brand page still says 18. The count stored here is the six that were built. About 24 minutes north of Asheville.',
  });
  await insertSibling(13206, 'Grounded invisible cabin', {
    property_name: 'Mirror Hotels',
    site_name: 'Grounded invisible cabin',
    unit_type: unit('Mirror Cabin'),
    quantity_of_units: 3,
    unit_capacity: '4',
    unit_sq_ft: 600,
    unit_private_bathroom: 'Yes',
    unit_hot_tub: 'Yes',
    unit_wifi: 'Yes',
    is_open: 'Yes',
    city: 'Marshall',
    state: 'NC',
    address: '108 Howell Rd',
    zip_code: '28753',
    url: 'https://tomsfinds.visitmirrorhotel.com/',
    unit_description:
      'Three grounded mirror cabins, about 600 sq ft, two queen beds, sleep 4, with a hot tub. Completed in 2024 per the sale listing.',
  });

  const thumbBase = {
    property_name: "Devil's Thumb Ranch Resort & Spa",
    is_open: 'Yes',
    address: '3530 County Road 83',
    city: 'Tabernash',
    state: 'CO',
    zip_code: '80478',
    phone_number: '(970) 726-7000',
    url: 'https://www.devilsthumbranch.com/stay/',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    property_restaurant: 'Yes',
    unit_private_bathroom: 'Yes',
    unit_wifi: 'Yes',
  };
  await patchRow(11647, {
    ...NO_RATE,
    ...thumbBase,
    research_status: 'published',
    site_name: 'Main Lodge room',
    unit_type: unit('Lodge'),
    quantity_of_units: null,
    unit_description:
      'Main Lodge room types on the stay page, without a published count of each: Continental Divide king, king suite, and double queen; Meadow king, king suite, king with fireplace, double queen, and two queens with fireplace. Heated floors, robes, and Wi-Fi are resort-wide. Rachel’s geothermal pool and hot tub are open year-round. Restaurants include Ranch House and Heck’s Tavern. No single nightly rate is published. The previous $106 figure was removed.',
  });
  await insertSibling(11647, 'High Lonesome Lodge room', {
    ...thumbBase,
    site_name: 'High Lonesome Lodge room',
    unit_type: unit('Lodge'),
    quantity_of_units: null,
    unit_description:
      'High Lonesome Lodge room types, without a published count: king suite, king with fireplace, lofted king suite, and double queen. Each has a patio and Continental Divide views.',
  });

  const thumbCabins: Array<{ name: string; beds: string; sq: number; note: string }> = [
    { name: 'Blue Sky', beds: '', sq: 2200, note: 'Four-bedroom cabin, 2,200 sq ft, for families or small groups. A sleep count was not on the page.' },
    { name: 'Caroga', beds: '', sq: 2200, note: 'Four-bedroom cabin, 2,200 sq ft, full kitchen, dining for 8 or more. A sleep count was not on the page.' },
    { name: 'Ranch Creek', beds: '4', sq: 1050, note: 'Two-bedroom cabin, 1,050 sq ft, sleeps 4, two king beds, one convertible to twins.' },
    { name: "Trapper's", beds: '4', sq: 1050, note: 'Two-bedroom cabin, 1,050 sq ft, sleeps 4, two king beds, one convertible to twins.' },
    { name: 'Coyote', beds: '4', sq: 1050, note: 'Two-bedroom cabin, 1,050 sq ft, sleeps 4, two king beds, one convertible to twins.' },
    { name: 'Nordic', beds: '4', sq: 1050, note: 'Two-bedroom cabin, 1,050 sq ft, sleeps 4, two king beds, two walk-in showers, wood-burning fireplace.' },
    { name: 'Cabin Creek', beds: '4', sq: 1050, note: 'Two-bedroom cabin, 1,050 sq ft, sleeps 4, two king beds, modified kitchen, two walk-in showers, wood-burning fireplace.' },
    { name: 'Manitou', beds: '4', sq: 1050, note: 'Two-bedroom cabin, 1,050 sq ft, sleeps 4, two king beds, modified kitchen, walk-in shower, wood-burning fireplace.' },
    { name: "Traveler's Rest", beds: '4', sq: 1050, note: 'Two-bedroom cabin, 1,050 sq ft, sleeps 4, two king beds, modified kitchen, walk-in shower, wood-burning fireplace.' },
    { name: 'Ouray', beds: '2', sq: 675, note: 'One-bedroom cabin, 675 sq ft, sleeps 2, butler kitchen.' },
    { name: 'Willow', beds: '2', sq: 675, note: 'One-bedroom cabin, 675 sq ft, sleeps 2, butler kitchen.' },
    { name: 'Byers', beds: '2', sq: 675, note: 'One-bedroom cabin, 675 sq ft, sleeps 2, butler kitchen.' },
    { name: 'Red Quill', beds: '2', sq: 675, note: 'One-bedroom cabin, 675 sq ft, sleeps 2, butler kitchen.' },
    { name: 'Settler', beds: '2', sq: 675, note: 'One-bedroom cabin, 675 sq ft, sleeps 2, butler kitchen.' },
    { name: 'Wrangler', beds: '2', sq: 675, note: 'One-bedroom cabin, 675 sq ft, sleeps 2, butler kitchen.' },
  ];
  for (const cabin of thumbCabins) {
    await insertSibling(11647, cabin.name, {
      ...thumbBase,
      site_name: cabin.name,
      unit_type: unit('Cabin'),
      quantity_of_units: 1,
      unit_capacity: cabin.beds || null,
      unit_sq_ft: cabin.sq,
      unit_description: cabin.note,
    });
  }

  await patchRow(11757, {
    research_status: 'published',
    is_glamping_property: 'No',
    site_name: 'Tent site',
    unit_type: null,
    quantity_of_units: 221,
    is_open: 'Yes',
    address: '155 Blackwoods Dr',
    zip_code: '04609',
    phone_number: '207-288-3338',
    url: 'https://www.nps.gov/acad/planyourvisit/blackwoods-campground.htm',
    rate_avg_retail_daily_rate: 30,
    rate_summer_weekday: null,
    rate_summer_weekend: null,
    rate_fall_weekday: null,
    rate_fall_weekend: null,
    rate_winter_weekday: null,
    rate_winter_weekend: null,
    rate_spring_weekday: null,
    rate_spring_weekend: null,
    rate_basis: 'room_only',
    rate_basis_notes: 'NPS fee for an individual tent, camper, or motor-home site. Park entrance fees are separate. The campground is seasonal, typically early May through mid-October.',
    unit_description:
      'National Park Service campground, not a glamping resort. 281 sites: 221 tent-only, 60 RV, and 4 group sites. No electric hookups. Individual sites are $30 a night and group sites are $60, paid on Recreation.gov. The previous $125 figure was removed.',
  });
  await insertSibling(11757, 'RV site', {
    property_name: 'Acadia National Park (Blackwoods Campground)',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: 60,
    is_glamping_property: 'No',
    is_open: 'Yes',
    address: '155 Blackwoods Dr',
    city: 'Bar Harbor',
    state: 'ME',
    zip_code: '04609',
    phone_number: '207-288-3338',
    url: 'https://www.nps.gov/acad/planyourvisit/blackwoods-campground.htm',
    rate_avg_retail_daily_rate: 30,
    rate_basis: 'room_only',
    rate_basis_notes: 'NPS fee for an RV site without electric hookups.',
    unit_description: '60 RV sites. No electric hookups. $30 per night.',
  });
  await insertSibling(11757, 'Group tent site', {
    property_name: 'Acadia National Park (Blackwoods Campground)',
    site_name: 'Group tent site',
    unit_type: null,
    quantity_of_units: 4,
    is_glamping_property: 'No',
    is_open: 'Yes',
    address: '155 Blackwoods Dr',
    city: 'Bar Harbor',
    state: 'ME',
    zip_code: '04609',
    phone_number: '207-288-3338',
    url: 'https://www.nps.gov/acad/planyourvisit/blackwoods-campground.htm',
    rate_avg_retail_daily_rate: 60,
    rate_basis: 'room_only',
    rate_basis_notes: 'NPS fee for a group tent site.',
    unit_description: '4 group tent sites. $60 per night.',
  });

  await patchRow(11336, {
    ...NO_RATE,
    research_status: 'published',
    quantity_of_units: null,
    unit_type: null,
    is_open: 'Closed',
    url: 'https://www.chilhoweemountainretreat.com',
    description:
      'Permanently closed. MapQuest lists Chilhowee Mountain Retreat at 5110 Little Doubles Rd, Maryville, as permanently closed, and the website did not load on 21 Sep 2026. This is not the Chilhowee Cabin at Welcome Valley Village on the Ocoee River. The previous $256 rate was removed.',
  });

  await patchRow(12302, {
    ...NO_RATE,
    research_status: 'published',
    quantity_of_units: null,
    unit_type: null,
    is_open: 'Closed',
    url: 'https://www.collectiveretreats.com/retreat/collective-hudson-valley/',
    description:
      'Closed. The Collective Hudson Valley URL now shows the brand’s Governors Island retreat and does not list a Ghent or Liberty Farms camp. No unit count or rate was on that page.',
  });

  await patchRow(9596, {
    ...NO_RATE,
    research_status: 'published',
    is_open: 'Closed',
    unit_type: null,
    address: '188 Cougar Loop',
    zip_code: '83811',
    phone_number: '+1 208-266-0155',
    url: 'http://www.huckleberrytentandbreakfast.com/',
    quantity_of_units: null,
    unit_description:
      'Kept Closed. huckleberrytentandbreakfast.com redirects to a lander and does not list tents or rates. Guest descriptions from when it operated mention canvas tents, an outdoor shower, a kitchen cabin, and breakfast. The previous $141 rate was removed. A directory lists 180 Thunderbolt Dr; the stored address is 188 Cougar Loop.',
  });

  await patchRow(9541, {
    ...NO_RATE,
    research_status: 'published',
    is_open: 'Closed',
    unit_type: null,
    address: '45000 W US Highway 50',
    zip_code: '81212',
    phone_number: '+1 866-341-7875',
    quantity_of_units: null,
    unit_description:
      'Kept Closed, matching the existing record. A Cañon City tourism page dated April 2026 still describes canvas wall tents and one- and two-bedroom cabins at 45044 W US Highway 50. That page does not give counts or rates, so none were added. The previous $141 rate was removed.',
  });

  await patchRow(12960, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: null,
    is_open: 'Yes',
    url: 'https://gvrvresort.com/',
    unit_description:
      'Operating luxury RV resort. The live site advertises nightly stays starting at $84 and does not list the 15 glamping cabins that were in an earlier planning note, so that count was removed. A site total was not on the homepage.',
  });

  await patchRow(13027, {
    ...NO_RATE,
    research_status: 'published',
    quantity_of_units: null,
    unit_type: null,
    is_open: 'Proposed Development',
    unit_description:
      'No current operator page was found for a Terra Vi lodge in Groveland. The stored count of 4 lodges was not sourced and was removed.',
  });

  await patchRow(12961, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Glamping site',
    unit_type: null,
    quantity_of_units: 3,
    is_open: 'No',
    unit_description:
      'Not operating. The stored note says the scaled-back Afton plan was no more than three sites at a time. The safari-tent label was removed because a structure type was not in that note. No operator website was found.',
  });

  console.log(DRY_RUN ? 'dry run complete' : 'writes complete');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
