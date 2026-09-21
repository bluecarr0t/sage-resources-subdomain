#!/usr/bin/env npx tsx
/**
 * Apply website-verified site rows for the 21 Sep 2026 in-progress screenshot,
 * then set research_status to published. Rates that were not on the operator
 * site are cleared. Stargazing Resort is rejected as a duplicate of the
 * already-published Clear Sky Resorts - Grand Canyon row.
 *
 * Usage:
 *   npx tsx scripts/publish-screenshot-in-progress-2026-09-21.ts --dry-run
 *   npx tsx scripts/publish-screenshot-in-progress-2026-09-21.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '../lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATED = '2026-09-21';
const SOURCE = 'web_research_screenshot_publish_2026_09_21';

const RATE_CLEARED = {
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
    'No fixed nightly rate is published on the operator site as of 2026-09-21. Earlier seasonal figures were removed because they were not sourced from the website.',
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
  console.log(`${DRY_RUN ? 'would update' : 'update'} id ${id}`, Object.keys(payload).join(', '));
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
    console.log(`sibling exists: ${siteName} (id ${existing[0]?.id})`);
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
    ...RATE_CLEARED,
    ...patch,
    site_name: siteName,
    date_updated: UPDATED,
    date_added: UPDATED,
    discovery_source: SOURCE,
    research_status: 'published',
  };
  console.log(`${DRY_RUN ? 'would insert' : 'insert'} sibling ${siteName} from id ${sourceId}`);
  if (DRY_RUN) return;
  const { error: insertError } = await supabase.from(ALL_SAGE_DATA_TABLE).insert(row);
  if (insertError) throw new Error(`insert ${siteName}: ${insertError.message}`);
}

async function main(): Promise<void> {
  await patchRow(13190, {
    ...RATE_CLEARED,
    research_status: 'published',
    property_name: 'Clear Sky Resorts Bryce Canyon',
    site_name: 'Sky Dome',
    unit_type: unit('Dome'),
    quantity_of_units: 62,
    property_total_sites: 62,
    city: 'Cannonville',
    state: 'UT',
    address: '855 UT-12',
    zip_code: '84718',
    country: 'United States',
    phone_number: '1-888-704-4445',
    url: 'https://brycecanyon.clearskyresorts.com/',
    is_open: 'Yes',
    unit_capacity: '2-8',
    unit_sq_ft: null,
    unit_private_bathroom: 'Yes',
    unit_wifi: 'Yes',
    unit_air_conditioning: 'Yes',
    unit_mini_fridge: 'Yes',
    unit_kitchenette: 'Yes',
    unit_patio: 'Yes',
    property_restaurant: 'Yes',
    property_food_on_site: 'Yes',
    unit_description:
      '62 glass Sky Domes on an 80-acre canyon (operator opening announcement, April 2024; still the published accommodation count). Named configurations, without a per-type count on the site: Lil Dipper (sleeps 2, 438 sq ft, king), Lil Dipper with deck and firepit, Lil Dipper enclave with firepit, Big Dipper (sleeps 2, 610 sq ft, king), Stardust, Nova, Gemini (sleeps 4, 610 sq ft, two queens), Milky Way (sleeps 4, 790 sq ft, loft), Supernova, Andromeda (sleeps 8, 1,200 sq ft, kitchenette, two baths). Every dome has climate control, a private designer bath with rainfall shower, mini-fridge, microwave, and in-dome coffee. On-site restaurant is Sky Nova.',
  });

  await patchRow(12908, {
    ...RATE_CLEARED,
    research_status: 'rejected',
    is_open: 'Yes',
    quantity_of_units: null,
    property_total_sites: null,
    url: 'https://grandcanyon.clearskyresorts.com/',
    description:
      'Rejected 2026-09-21 as a duplicate of published Clear Sky Resorts - Grand Canyon (Williams, AZ). This row had no URL, city text "Near Grand Canyon National Park", and 45 domes. Clear Sky Grand Canyon’s site states forty-five guest Sky Domes at 629 E. High Grove Rd, Williams, AZ 86046. The Bryce Canyon resort is a separate property in Cannonville, UT, with 62 domes.',
  });

  await patchRow(9648, {
    quantity_of_units: 45,
    property_total_sites: 45,
    city: 'Williams',
    state: 'AZ',
    address: '629 E. High Grove Rd',
    zip_code: '86046',
    phone_number: '1-888-704-4445',
    url: 'https://grandcanyon.clearskyresorts.com/',
    unit_type: unit('Dome'),
    unit_private_bathroom: 'Yes',
    unit_wifi: 'Yes',
    unit_air_conditioning: 'Yes',
    unit_description:
      'Forty-five guest Sky Domes, stated on grandcanyon.clearskyresorts.com. Named configurations without a per-type count: Stairway To The Stars and Grand Canyon (sleep 2, 438 sq ft), Snow Globe (sleeps 2, 440 sq ft), Grand Canyon XL, Pink Unicorn, 80’s Video Game, and Secret Agent (sleep 5, 790 sq ft), Space Galaxy (sleeps 7, 790 sq ft). Private bath, rainfall shower, patio. Restaurant and dining on site. Duplicate in-progress row "Stargazing Resort" was rejected.',
  });

  await patchRow(13094, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'Awake',
    unit_type: unit('Mirror Cabin'),
    quantity_of_units: 1,
    property_total_sites: 4,
    address: '49741 South Fork Drive',
    zip_code: '93271',
    phone_number: '917-325-3572',
    url: 'http://paradiseranch.me/',
    is_open: 'Yes',
    unit_capacity: '2',
    unit_private_bathroom: 'Yes',
    unit_hot_tub: 'Yes',
    unit_kitchenette: 'Yes',
    property_sauna: 'Yes',
    unit_description:
      'One of four ÖÖD mirror houses at Paradise Ranch Inn (Awake, Infinite, Limitless, Stellar), confirmed on ÖÖD’s destination pages. 50-acre riverfront ranch near Sequoia. Operator site lists the ranch as open year-round. Houses include a private bath, kitchenette, and hot tub; sauna is part of the ranch stay. No fixed nightly rate on paradiseranch.me.',
  });
  for (const name of ['Infinite', 'Limitless', 'Stellar'] as const) {
    await insertSibling(13094, name, {
      property_name: 'Paradise Ranch Inn',
      site_name: name,
      unit_type: unit('Mirror Cabin'),
      quantity_of_units: 1,
      property_total_sites: 4,
      unit_capacity: '2',
      unit_private_bathroom: 'Yes',
      unit_hot_tub: 'Yes',
      unit_kitchenette: 'Yes',
      property_sauna: 'Yes',
      is_open: 'Yes',
      research_status: 'published',
      url: 'http://paradiseranch.me/',
      phone_number: '917-325-3572',
      address: '49741 South Fork Drive',
      city: 'Three Rivers',
      state: 'CA',
      zip_code: '93271',
    });
  }

  await patchRow(13099, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'A-Frame',
    unit_type: unit('A-Frame'),
    quantity_of_units: null,
    url: 'https://www.punkinhollow.net/',
    phone_number: '801-753-5123',
    is_open: 'Yes',
    unit_private_bathroom: 'No',
    unit_description:
      'punkinhollow.net (Stanton, KY, Red River Gorge) lists Lookout cabins, creek-side A-frames, Hobbitville, and glamping, with treehouses described as coming next. The site does not publish unit counts or nightly rates. Shared-amenity glamping is how the A-frames were previously listed; private baths are not offered on the current site copy.',
  });

  await patchRow(13117, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'Lake View Jupe',
    unit_type: unit('Jupe'),
    quantity_of_units: 4,
    url: 'https://www.grandlakelodge.com/room/lake-view-jupe/',
    phone_number: '(970) 627-3967',
    address: '15500 US-34',
    zip_code: '80447',
    is_open: 'Yes',
    unit_sq_ft: null,
    unit_capacity: '2',
    unit_wifi: 'Yes',
    unit_air_conditioning: 'No',
    unit_private_bathroom: 'No',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    property_restaurant: 'Yes',
    property_food_on_site: 'Yes',
    unit_description:
      'Four lake-view Jupe tents, in addition to the lodge’s historic cabins (Colorado Expression lodge profile; the room page describes the product). Each Jupe is 100+ sq ft with a queen Nectar mattress, solar power, Wi-Fi, outlets, and a cantilevered porch. No heat or air-conditioning. Shared restrooms and showers. Pets are not permitted in the Jupes. The lodge has a pool, jacuzzi, and Huntington House Tavern. No fixed Jupe rate on the lodge site.',
  });

  await patchRow(13102, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'A-Frame Cabin',
    unit_type: unit('A-Frame'),
    quantity_of_units: null,
    url: 'https://bearwoodsresort.com/',
    address: '9061 13 Mile Road',
    zip_code: '49614',
    is_open: 'Yes',
    unit_capacity: '4',
    unit_private_bathroom: 'No',
    unit_air_conditioning: 'Yes',
    unit_kitchenette: 'Yes',
    unit_description:
      'Single-room A-frame cabins on 65 acres. The operator site does not publish how many A-frames there are, so the previous count of 4 was cleared. Hipcamp listings show at least cabins 7 and 8: each sleeps 4 with a king and a pullout, a kitchenette, air conditioning, and a fire ring. Baths are in the shared grain-bin bathhouse (three private shower suites). Website footer prints ZIP 48196; 49614 is the Bear Lake ZIP and is kept. Other lodging on the site, counts not published: glamping tents, a rustic log cabin with hot tub, a two-bedroom farmhouse, full-hookup RV sites, and rustic tent sites.',
  });
  await insertSibling(13102, 'Mirrored Dome', {
    property_name: 'Bear Woods Resort and Campground',
    site_name: 'Mirrored Dome',
    unit_type: unit('Dome'),
    quantity_of_units: 1,
    unit_sq_ft: 183,
    unit_capacity: '3',
    unit_private_bathroom: 'No',
    unit_wifi: 'Yes',
    unit_air_conditioning: 'Yes',
    unit_kitchenette: 'Yes',
    unit_mini_fridge: 'Yes',
    is_open: 'Yes',
    url: 'https://bearwoodsresort.com/lodge/mirrored-dome/',
    address: '9061 13 Mile Road',
    city: 'Bear Lake',
    state: 'MI',
    zip_code: '49614',
    unit_description:
      'One 183 sq ft mirrored geodesic dome. Queen bed plus a twin trundle (2 adults and 1 child). Kitchenette with mini-fridge and Keurig, air conditioning, Wi-Fi, Roku TV, private patio and fire pit. Bathhouse access, not an in-unit bath. Dogs welcome.',
  });

  await patchRow(13091, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'Andromeda',
    unit_type: unit('Mirror Cabin'),
    quantity_of_units: 1,
    url: 'https://theretreatatfredericksburg.com/',
    phone_number: '(830) 992-0494',
    address: '259 Constellation Dr',
    zip_code: '78624',
    is_open: 'Yes',
    unit_capacity: '2',
    unit_private_bathroom: 'Yes',
    unit_hot_tub: 'Yes',
    unit_wifi: 'Yes',
    unit_kitchenette: 'Yes',
    property_pool: 'Yes',
    property_hot_tub: 'Yes',
    property_sauna: 'Yes',
    unit_description:
      'ÖÖD mirror house. King bed, kitchenette, dining table, TV, Wi-Fi, private deck, hot tub, and fire pit. Closest of the four mirror houses to the vineyard. The property also has four named domes and a 12-bedroom villa with a saltwater pool, hot tub, and gym. No fixed nightly rate on the site.',
  });
  const retreatMirrors: Array<{ name: string; beds: string; extra: string }> = [
    {
      name: 'Perseus',
      beds: '2',
      extra: 'King bed, kitchenette, hot tub, fire pit, sauna, and outdoor shower.',
    },
    {
      name: 'Ursa Minor',
      beds: '2',
      extra: 'Queen bed, kitchenette, hot tub, fire pit, hammock, and a propane grill.',
    },
    {
      name: 'Ursa Major',
      beds: '2',
      extra: 'Queen bed, kitchenette, hot tub, fire pit, hammock, and lounge chairs.',
    },
  ];
  for (const house of retreatMirrors) {
    await insertSibling(13091, house.name, {
      property_name: 'The Retreat at Fredericksburg',
      site_name: house.name,
      unit_type: unit('Mirror Cabin'),
      quantity_of_units: 1,
      unit_capacity: house.beds,
      unit_private_bathroom: 'Yes',
      unit_hot_tub: 'Yes',
      unit_wifi: 'Yes',
      unit_kitchenette: 'Yes',
      property_pool: 'Yes',
      property_hot_tub: 'Yes',
      property_sauna: 'Yes',
      is_open: 'Yes',
      url: 'https://theretreatatfredericksburg.com/',
      phone_number: '(830) 992-0494',
      address: '259 Constellation Dr',
      city: 'Fredericksburg',
      state: 'TX',
      zip_code: '78624',
      unit_description: `ÖÖD mirror house. ${house.extra}`,
    });
  }
  for (const dome of ['Cassiopeia', 'Draco', 'Cepheus', 'Lyra'] as const) {
    await insertSibling(13091, dome, {
      property_name: 'The Retreat at Fredericksburg',
      site_name: dome,
      unit_type: unit('Dome'),
      quantity_of_units: 1,
      unit_capacity: dome === 'Lyra' ? '3' : null,
      unit_private_bathroom: null,
      unit_hot_tub: null,
      unit_wifi: null,
      unit_kitchenette: null,
      is_open: 'Yes',
      url: 'https://theretreatatfredericksburg.com/',
      phone_number: '(830) 992-0494',
      address: '259 Constellation Dr',
      city: 'Fredericksburg',
      state: 'TX',
      zip_code: '78624',
      property_pool: 'Yes',
      property_hot_tub: 'Yes',
      unit_description:
        'One of four named domes in the villa-and-domes buyout (Cassiopeia, Draco, Cepheus, Lyra). The site names each dome but does not publish square footage, bed counts for every dome, or a nightly rate. Lyra is described as sleeping up to three.',
    });
  }

  await patchRow(13098, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'A-Frame Cabin',
    unit_type: unit('A-Frame'),
    quantity_of_units: 7,
    address: '700 Witt Road',
    zip_code: '78010',
    url: 'https://www.thecharmadillo.com/lodging',
    is_open: 'Yes',
    unit_sq_ft: 180,
    unit_capacity: '2',
    unit_private_bathroom: 'No',
    unit_air_conditioning: 'Yes',
    unit_mini_fridge: 'Yes',
    unit_wifi: 'No',
    property_sauna: 'Yes',
    unit_description:
      'Seven A-frame cabins, stated on thecharmadillo.com/about and the lodging page. Each is 180 sq ft, temperature controlled, with a queen bed, mini-fridge, kettle, and coffee. No in-unit bath: shared two-stall hillside bathroom and a shower house with four private stalls. Shared sauna with outdoor shower, stock-tank pools, kitchen, den, and hammock grove. Wi-Fi is in the den, not described as in-cabin.',
  });
  await insertSibling(13098, 'Clark', {
    property_name: 'The Charmadillo',
    site_name: 'Clark',
    unit_type: unit('Camper Van'),
    quantity_of_units: 1,
    unit_sq_ft: null,
    unit_capacity: null,
    unit_private_bathroom: 'No',
    unit_air_conditioning: null,
    unit_mini_fridge: null,
    unit_wifi: null,
    property_sauna: 'Yes',
    is_open: 'Yes',
    address: '700 Witt Road',
    city: 'Center Point',
    state: 'TX',
    zip_code: '78010',
    url: 'https://www.thecharmadillo.com/lodging',
    unit_description:
      '1978 Ford Econoline named Clark. Original interior. Parked in the valley among the shared amenity spaces. Shared bath, sauna, and stock-tank pools.',
  });
  await insertSibling(13098, 'Canvas Bell Tent', {
    property_name: 'The Charmadillo',
    site_name: 'Canvas Bell Tent',
    unit_type: unit('Bell Tent'),
    quantity_of_units: 1,
    unit_sq_ft: null,
    unit_capacity: '4',
    unit_private_bathroom: 'No',
    unit_air_conditioning: null,
    unit_mini_fridge: null,
    unit_wifi: null,
    property_sauna: 'Yes',
    is_open: 'Yes',
    address: '700 Witt Road',
    city: 'Center Point',
    state: 'TX',
    zip_code: '78010',
    url: 'https://www.thecharmadillo.com/lodging',
    unit_description:
      'One canvas bell tent in a meadow. Sleeps 4 on two queen beds. Shared bath, sauna, and stock-tank pools. The property also offers a 50-amp RV hookup with water and dispersed tent sites; those are not inventoried as glamping units.',
  });

  await patchRow(13115, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'Jupe Tent',
    unit_type: unit('Jupe'),
    quantity_of_units: 10,
    url: 'https://www.highlandranch.com/accommodations/jupe-tent',
    phone_number: '406-730-7998',
    address: '2753 Helena Flats Rd',
    zip_code: '59901',
    is_open: 'Yes',
    unit_capacity: '2',
    unit_air_conditioning: 'Yes',
    unit_wifi: 'Yes',
    unit_description:
      'Ten Jupe tents on 80 acres, from Jupe’s first-season account of this ranch. The ranch accommodations page describes queen beds, solar power, heating, air conditioning, and private decks. It also offers mirrored ÖÖD cabins, one restored silo, and one tiny home; those counts beyond the silo and tiny home (each described as a single stay) are not numbered on the site. Jupe’s case study reported a first-season ADR of $232; that figure is not a current rack rate on highlandranch.com, so it is not stored as the rate. Lounge Wi-Fi, camp store, fire pits, and pet-friendly stays (fee).',
  });
  await insertSibling(13115, 'Silo', {
    property_name: 'Highland Ranch',
    site_name: 'Silo',
    unit_type: unit('Silo'),
    quantity_of_units: 1,
    unit_capacity: null,
    unit_wifi: null,
    unit_air_conditioning: null,
    is_open: 'Yes',
    url: 'https://www.highlandranch.com/accommodations/',
    phone_number: '406-730-7998',
    address: '2753 Helena Flats Rd',
    city: 'Kalispell',
    state: 'MT',
    zip_code: '59901',
    unit_description: 'One restored grain silo, described as a single one-of-a-kind stay.',
  });
  await insertSibling(13115, 'Tiny Home', {
    property_name: 'Highland Ranch',
    site_name: 'Tiny Home',
    unit_type: unit('Tiny Home'),
    quantity_of_units: 1,
    unit_capacity: null,
    unit_wifi: null,
    unit_air_conditioning: null,
    is_open: 'Yes',
    url: 'https://www.highlandranch.com/accommodations/tiny-home',
    phone_number: '406-730-7998',
    address: '2753 Helena Flats Rd',
    city: 'Kalispell',
    state: 'MT',
    zip_code: '59901',
    unit_description: 'One XL Boho tiny home. The accommodations page does not publish a rate or square footage.',
  });

  await patchRow(13097, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'A-Frame',
    unit_type: unit('A-Frame'),
    quantity_of_units: 11,
    url: 'https://callicoonhills.com/stay/',
    phone_number: '(845) 482-2420',
    address: '1 Hills Resort Rd',
    zip_code: '12724',
    is_open: 'Yes',
    unit_capacity: '2',
    property_pool: 'Yes',
    property_sauna: 'Yes',
    property_restaurant: 'Yes',
    property_food_on_site: 'Yes',
    unit_description:
      'Eleven A-frame cabins, stated on callicoonhills.com/stay. Each sleeps 2 on a queen bed, with a sleeping loft and a porch. The stay page also lists a boarding house, pool house, and ridge rooms (62 rooms across the property) plus one creekside cabin. Those hotel rooms are not inventoried as glamping units. On-site: King Pool, barrel saunas, Conover Club restaurant, pool bar, and gym. No fixed nightly rate on the site. The previous count of 6 was replaced.',
  });
  await insertSibling(13097, 'Creekside Cabin', {
    property_name: 'Callicoon Hills',
    site_name: 'Creekside Cabin',
    unit_type: unit('Cabin'),
    quantity_of_units: 1,
    unit_capacity: '4',
    unit_full_kitchen: 'Yes',
    property_pool: 'Yes',
    property_sauna: 'Yes',
    property_restaurant: 'Yes',
    property_food_on_site: 'Yes',
    is_open: 'Yes',
    url: 'https://callicoonhills.com/stay/',
    phone_number: '(845) 482-2420',
    address: '1 Hills Resort Rd',
    city: 'Callicoon Center',
    state: 'NY',
    zip_code: '12724',
    unit_description: 'One private creekside cabin. Sleeps 4. Full kitchen and a wood stove.',
  });

  const grangeNote =
    'Not built. Napa City Council denied The Grange in February 2025 and reaffirmed that vote the following month (Napa Valley Register). The proposal, with AutoCamp as operator, was up to 100 movable units (yurts, teepees, and stationary trailers) plus up to five permanent buildings on 12.5 acres off Silverado Trail. The Press Democrat reported in October 2025 that the parcel was listed for sale. Earlier rows that split this into 40 safari tents and 60 Airstreams were not supported by the council record, so those counts and rates were cleared.';
  await patchRow(12131, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'Proposed mix — not built',
    unit_type: null,
    quantity_of_units: null,
    property_total_sites: null,
    is_open: 'Cancelled',
    url: 'https://napavalleyregister.com/news/napa-city-council-rage-project-glamping-autozone-deny/article_53c0155e-0464-11f0-8d53-a3af5ec936ee.html',
    description: grangeNote,
    unit_description: grangeNote,
  });
  await patchRow(13004, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'Proposed mix — not built',
    unit_type: null,
    quantity_of_units: null,
    property_total_sites: null,
    is_open: 'Cancelled',
    url: 'https://napavalleyregister.com/news/napa-city-council-rage-project-glamping-autozone-deny/article_53c0155e-0464-11f0-8d53-a3af5ec936ee.html',
    description: grangeNote,
    unit_description: grangeNote,
  });

  const wanderNote =
    'Closed. thewandercamp.com no longer lists Canyonlands as a bookable camp. Brand-wide tent types on the current site and terms page are King (1 king, 2 adults), Twin (2 twins, 2 adults), Family (1 king and 1 twin, 3 adults), and Triple (3 twins, 3 adults). Tents are 200+ sq ft canvas bell tents, off-grid, no electricity or Wi-Fi, shared bathrooms, solar lanterns. Stored unit counts (8 king, 7 twin, 5 family, 5 triple = 25) match an older listing total of 25 accommodations and were kept. Nightly rates were cleared because the operator site does not publish current Canyonlands rates.';
  const wanderIds = [10620, 10621, 10622, 10623] as const;
  for (const id of wanderIds) {
    await patchRow(id, {
      ...RATE_CLEARED,
      research_status: 'published',
      is_open: 'Closed',
      url: 'https://thewandercamp.com',
      phone_number: '+1 801-200-3918',
      unit_type: unit('Bell Tent'),
      unit_sq_ft: 200,
      unit_private_bathroom: 'No',
      unit_wifi: 'No',
      unit_electricity: 'No',
      property_restaurant: 'No',
      description: wanderNote,
    });
  }

  await patchRow(12001, {
    ...RATE_CLEARED,
    research_status: 'published',
    site_name: 'Proposed safari tent',
    unit_type: unit('Safari Tent'),
    quantity_of_units: 75,
    is_open: 'Proposed Development',
    url: 'https://www.the-journal.com/articles/planning-and-zoning-denies-application-for-glamping-development-outside-mancos/',
    address: '12695 Road 40',
    unit_capacity: '4',
    unit_description:
      'Not operating. Under Canvas applied for a guest-ranch glamping development of 75 sleeping units for families of four on about 346 acres at 12695 Road 40, Mancos (Windy Ridge Ranch). Montezuma County Planning and Zoning recommended denial on 13 March 2025 (3–2). Planning staff said the application does not automatically move to the county commissioners unless Under Canvas petitions for a hearing. No Board of County Commissioners approval was found, and there is no camp page on undercanvas.com. The previous Cancelled status overstated a final denial, so status is Proposed Development. No rates exist because the camp was never built.',
  });

  console.log(DRY_RUN ? 'dry run complete' : 'writes complete');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
