#!/usr/bin/env npx tsx
/**
 * Website-verified site rows for the third 21 Sep 2026 in-progress screenshot.
 *
 * Usage:
 *   npx tsx scripts/publish-screenshot-in-progress-batch3-2026-09-21.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '../lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATED = '2026-09-21';
const SOURCE = 'web_research_screenshot_publish_2026_09_21_batch3';

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
    'No fixed US dollar nightly rate was published. Earlier figures were removed because they were not on the operator site.',
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
  console.log(`${DRY_RUN ? 'would insert' : 'insert'} ${siteName}`);
  if (DRY_RUN) return;
  const { error: insertError } = await supabase.from(ALL_SAGE_DATA_TABLE).insert(row);
  if (insertError) throw new Error(`insert ${siteName}: ${insertError.message}`);
}

async function main(): Promise<void> {
  const nicholas =
    'Not operating. Benton County Planning Board approved a revised site plan 7–0 in March 2024 after denying an earlier plan. The approved plan is 40 glamping tents and 12 covered wagons, plus a lodge, pavilion, and spa, on about 21 acres near Beaver Lake (Arkansas Democrat-Gazette). The structure of the tents was not specified.';
  await patchRow(12995, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Glamping tent',
    unit_type: null,
    quantity_of_units: 40,
    is_open: 'Proposed Development',
    url: 'https://www.arkansasonline.com/news/2024/mar/21/benton-county-planning-board-gives-green-light-to/',
    description: nicholas,
    unit_description: nicholas,
  });
  await insertSibling(12995, 'Covered wagon', {
    property_name: 'Nicholas Beaver Lake Glamping Resort',
    site_name: 'Covered wagon',
    unit_type: unit('Covered Wagon'),
    quantity_of_units: 12,
    is_open: 'Proposed Development',
    city: 'Rogers',
    state: 'AR',
    url: 'https://www.arkansasonline.com/news/2024/mar/21/benton-county-planning-board-gives-green-light-to/',
    description: nicholas,
    unit_description: '12 covered wagons in the March 2024 approved site plan. Not built.',
  });

  await patchRow(12978, {
    ...NO_RATE,
    research_status: 'rejected',
    quantity_of_units: null,
    property_total_sites: null,
    unit_type: null,
    is_open: 'Cancelled',
    site_name: null,
    description:
      'Rejected 2026-09-21 as a duplicate of The Grange Campground. Both rows describe the AutoCamp proposal on the 12.5-acre Silverado Trail parcel in Napa that the City Council denied in 2025. The Grange record is the published one. This row’s count of 100 Airstreams was not the council record, which described up to 100 mixed yurts, teepees, and trailers.',
  });

  const cooper =
    'Not built. Coconino County case ZC-21-013 was a request to rezone 581 Cooper Ranch Road, Williams, from General to Resort Commercial for a 150-unit park with a clubhouse and pool. Flagstaff Business News described up to 150 custom Airstreams, with as many as 30 sites also having an upscale tent. Another account described Airstreams, small cabins, and canvas tents. The county continued the case. AutoCamp later walked away, and an April 2026 AutoCamp Reviews note says the Cooper Ranch project died on the vine. The stored count of 80 Airstreams was removed.';
  await patchRow(13001, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Proposed campsites — not built',
    unit_type: null,
    quantity_of_units: 150,
    is_open: 'Cancelled',
    address: '581 Cooper Ranch Road',
    url: 'https://www.flagstaffbusinessnews.com/autocamp-proposing-boutique-airstream-campground-near-williams/',
    description: cooper,
    unit_description: cooper,
  });

  const wonder =
    'Not built. The Wonder Inn project description (November 2021) is a hotel of 106 prefabricated guestrooms: 96 rooms and 10 suites, plus a remodeled restaurant in the existing building, a pool, and a spa, at 78201 Amboy Road, Wonder Valley. Z107.7 reported the appeal was withdrawn and the resort plan declared dead. These are hotel rooms, not cabins.';
  await patchRow(12994, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Hotel guestroom — not built',
    unit_type: null,
    quantity_of_units: 106,
    is_open: 'Cancelled',
    address: '78201 Amboy Road',
    url: 'https://stopwonderinn.org/wp-content/uploads/2022/03/11-19-21-The-Wonder-Inn-Project-Description_NMDA-fill-in-002.pdf',
    description: wonder,
    unit_description: wonder,
  });

  await patchRow(13114, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Treetop Oasis',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_private_bathroom: 'No',
    unit_wifi: null,
    is_open: 'Yes',
    url: 'https://www.hipcamp.com/en-US/land/illinois-willenborg-woods-y0zhqem8',
    unit_description:
      'One A-frame on a ridge. Queen bed, compost toilet, solar power for phone charging, private deck, outdoor kitchen, and fire pit. Outdoor hot shower. Pets allowed. 149 acres and about eight miles of trails on the Embarrass River. No street address is published. The host also lists Wooded Bliss, a bell tent, and a teardrop trailer.',
  });
  await insertSibling(13114, 'Wooded Bliss', {
    property_name: 'Willenborg Woods',
    site_name: 'Wooded Bliss',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_private_bathroom: 'No',
    is_open: 'Yes',
    city: 'Charleston',
    state: 'IL',
    url: 'https://www.hipcamp.com/en-US/land/illinois-willenborg-woods-y0zhqem8',
    unit_description:
      'One A-frame on a wooded ravine. Queen bed, picnic table, fire pit, and grill. Outdoor shower and a porta potty nearby. No toilet in the cabin. Pets allowed.',
  });
  await insertSibling(13114, 'Bell Canvas Tent Under the Stars', {
    property_name: 'Willenborg Woods',
    site_name: 'Bell Canvas Tent Under the Stars',
    unit_type: unit('Bell Tent'),
    quantity_of_units: 1,
    unit_capacity: '6',
    unit_sq_ft: null,
    unit_private_bathroom: 'No',
    is_open: 'Yes',
    city: 'Charleston',
    state: 'IL',
    url: 'https://www.hipcamp.com/en-US/land/illinois-willenborg-woods-y0zhqem8',
    unit_description:
      'One 13-by-13-foot bell tent on a wooden platform. Sleeps 6. Fire pit, grill, bench, and picnic table. Outdoor shower and a porta potty. Pets allowed.',
  });

  await patchRow(13121, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Bubble Dome',
    unit_type: unit('Bubble Tent'),
    quantity_of_units: 1,
    unit_private_bathroom: 'No',
    is_open: 'Temporarily closed',
    url: 'https://www.hipcamp.com/en-US/land/california-oceanview-mountaintop-bubble-dome-dw9h9m88',
    zip_code: '90275',
    unit_description:
      'Hipcamp says this Rancho Palos Verdes site is not currently accepting bookings. The bubble dome is a setup the host can provide; guests may also bring their own gear. Indoor bathroom and shower, ocean swing, lounge, and a projector. The street address is given after booking. No nightly rate is listed while bookings are paused.',
  });

  await patchRow(13109, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'A-frame in the meadow',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_private_bathroom: 'No',
    is_open: 'Yes',
    url: 'https://www.hipcamp.com/en-US/land/georgia-the-ridge-at-stanley-gap-9mxhzddj',
    unit_description:
      'One wood-and-metal A-frame in the meadow. The host says it comfortably sleeps 2 on two cots. Guests bring mats and linens. Locked access, a shelf, a window, and a deck. Shared barn bathroom and two outdoor showers. Pets must be leashed. Tent platforms on the same land are priced at $40; that price is not the A-frame rate. No street address is published.',
  });

  await patchRow(13101, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Lucky 1',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_sq_ft: 120,
    unit_private_bathroom: 'No',
    unit_air_conditioning: 'Yes',
    unit_electricity: 'Yes',
    is_open: 'Yes',
    address: '8658 Spanker Creek Rd',
    zip_code: '72712',
    url: 'https://www.hipcamp.com/en-US/land/arkansas-bentonville-bike-camp-pw1h1v65',
    unit_description:
      'One of three 10-by-12-foot mini A-frames (Lucky 1, The StingRay, The Penny Farthing). Sleeps 2. Electricity, air conditioning or a space heater, and bedding. Shared indoor bathrooms and hot showers, plus a bike wash, on 10 acres at 8658 Spanker Creek Rd. Dogs welcome. No fixed nightly rate on the host listing.',
  });
  for (const name of ['The StingRay', 'The Penny Farthing'] as const) {
    await insertSibling(13101, name, {
      property_name: 'Bentonville Bike Camp',
      site_name: name,
      unit_type: unit('A-Frame'),
      quantity_of_units: 1,
      unit_capacity: '2',
      unit_sq_ft: 120,
      unit_private_bathroom: 'No',
      unit_air_conditioning: 'Yes',
      unit_electricity: 'Yes',
      is_open: 'Yes',
      address: '8658 Spanker Creek Rd',
      city: 'Bentonville',
      state: 'AR',
      zip_code: '72712',
      url: 'https://www.hipcamp.com/en-US/land/arkansas-bentonville-bike-camp-pw1h1v65',
      unit_description:
        '10-by-12-foot mini A-frame. Sleeps 2. Electricity, air conditioning or a space heater, and bedding. Shared bathrooms and hot showers. Dogs welcome.',
    });
  }

  await patchRow(13110, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Hidden A-frame',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_private_bathroom: 'No',
    is_open: 'Yes',
    url: 'https://www.hipcamp.com/en-US/land/indiana-hones-pointe-3pw1hmxd',
    unit_description:
      'One A-frame in the woods. Queen foam mattress. Outhouse and shower nearby. Off-grid solar homestead of about 30 acres near Marengo. Pets are not allowed in the camping cabin; the A-frame listing does not add a separate pet rule. The host also offers a camping cabin and a cottage, which were not given enough detail to inventory here. No street address or nightly rate is published on the listing.',
  });

  await patchRow(13100, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Cabin 1',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '4',
    unit_private_bathroom: 'No',
    unit_air_conditioning: 'No',
    unit_wifi: 'No',
    is_open: 'Yes',
    city: 'Groveland',
    phone_number: '+358 10 384 5000',
    url: 'https://nollacabins.com/destinations/yosemite',
    unit_description:
      'One of three off-grid Nolla A-frames on Highway 120 near Groveland, about 15 minutes from the Yosemite gate. Beds convert between two twins and a king and sleep up to 4. Linens, Rumpl blankets, solar charging, and a fan. No lock and no air conditioning. Cabin 1 has a nearby toilet and is the easiest to reach. Hot showers and flush toilets are across the road at a sister property. Booked through Hipcamp. No fixed nightly rate on nollacabins.com.',
  });
  await insertSibling(13100, 'Cabin 2', {
    property_name: 'Nolla A-Frames Near Yosemite',
    site_name: 'Cabin 2',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '4',
    unit_private_bathroom: 'No',
    unit_air_conditioning: 'No',
    unit_wifi: 'No',
    is_open: 'Yes',
    city: 'Groveland',
    state: 'CA',
    phone_number: '+358 10 384 5000',
    url: 'https://nollacabins.com/destinations/yosemite',
    unit_description:
      'Off-grid Nolla A-frame. Sleeps up to 4. Shares a composting toilet with Cabin 3. AWD or 4x4 recommended when the road is wet. Solar charging, linens, no lock, no air conditioning.',
  });
  await insertSibling(13100, 'Cabin 3', {
    property_name: 'Nolla A-Frames Near Yosemite',
    site_name: 'Cabin 3',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '4',
    unit_private_bathroom: 'No',
    unit_air_conditioning: 'No',
    unit_wifi: 'No',
    is_open: 'Yes',
    city: 'Groveland',
    state: 'CA',
    phone_number: '+358 10 384 5000',
    url: 'https://nollacabins.com/destinations/yosemite',
    unit_description:
      'Off-grid Nolla A-frame. Sleeps up to 4. Shares a composting toilet with Cabin 2. AWD or 4x4 recommended when the road is wet. Solar charging, linens, no lock, no air conditioning.',
  });

  await patchRow(13112, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Aspen',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_private_bathroom: 'No',
    unit_wifi: 'No',
    unit_air_conditioning: 'No',
    is_open: 'Yes',
    url: 'https://www.hipcamp.com/en-US/land/montana-good-creek-meadows-2ejhzmq1',
    unit_description:
      'One of two A-frames (Aspen and Cedar) on 350 acres near Olney, about an hour from Glacier National Park. Two single beds that can be joined. Sleeps 2. Deck, hammock, and cafe table. Shared composting toilet and camp kitchen for both cabins and one campsite. No shower. Off grid, with spotty cell service. No street address or nightly rate is published.',
  });
  await insertSibling(13112, 'Cedar', {
    property_name: 'Good Creek Meadows',
    site_name: 'Cedar',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_private_bathroom: 'No',
    unit_wifi: 'No',
    unit_air_conditioning: 'No',
    is_open: 'Yes',
    city: 'Olney',
    state: 'MT',
    url: 'https://www.hipcamp.com/en-US/land/montana-good-creek-meadows-2ejhzmq1',
    unit_description:
      'A-frame closest to Good Creek. Two single beds that can be joined. Sleeps 2. Deck and hammock. Shares the composting toilet and camp kitchen. No shower. Off grid.',
  });

  await patchRow(13103, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Moose Haven',
    unit_type: unit('Cabin'),
    quantity_of_units: 1,
    unit_capacity: '5',
    unit_private_bathroom: 'No',
    unit_wifi: 'No',
    is_open: 'Yes',
    address: '6119 County Road 22',
    zip_code: '80480',
    phone_number: '970-217-5372',
    url: 'https://22west.net/en/moose-haven-cabin-22-west',
    unit_description:
      'Dry cabin at about 9,000 feet. Sleeps 5: a full bed and a twin downstairs, and a queen sofa bed upstairs. Composting toilet 20 feet away and a shared shower house. Wood stove, solar lights, well water provided, Blackstone grill, and a fire pit. Pets welcome. The booking page displayed a daily price in euros, so it was not stored as a US dollar rate. The same operator also lists Wapiti Retreat at this address.',
  });
  await insertSibling(13103, 'Wapiti Retreat', {
    property_name: '22 West Cabins & Recreation',
    site_name: 'Wapiti Retreat',
    unit_type: unit('Cabin'),
    quantity_of_units: 1,
    unit_capacity: '16',
    unit_private_bathroom: 'Yes',
    unit_full_kitchen: 'Yes',
    unit_wifi: 'Yes',
    is_open: 'Yes',
    address: '6119 County Road 22',
    city: 'Walden',
    state: 'CO',
    zip_code: '80480',
    phone_number: '970-217-5372',
    url: 'https://22west.net/en/the-wapiti-retreat-22-west',
    unit_description:
      'Seven-bedroom log home, built 1983–84. Sleeps 16. Six twins, three queens, one king, and a queen sleeper. Three and a half baths, full kitchen, fireplace, and Wi-Fi. Pets welcome. The booking page displayed a daily price in euros, so it was not stored as a US dollar rate. The homepage also names Red-tail Roundhouse; that listing did not return unit details, so it was not added.',
  });

  await patchRow(13106, {
    research_status: 'published',
    site_name: 'XL A-Frame, Site 1',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '4',
    unit_private_bathroom: 'No',
    unit_air_conditioning: 'Yes',
    unit_mini_fridge: 'Yes',
    unit_wifi: 'Yes',
    is_open: 'Yes',
    address: '348 Averett Rd',
    zip_code: '31058',
    phone_number: '(478) 227-6006',
    url: 'https://pineyhillscampground.com/services/a-frames/xl-a-frame-site-1-150292838',
    rate_avg_retail_daily_rate: 109,
    rate_summer_weekday: null,
    rate_summer_weekend: null,
    rate_fall_weekday: null,
    rate_fall_weekend: null,
    rate_winter_weekday: null,
    rate_winter_weekend: null,
    rate_spring_weekday: null,
    rate_spring_weekend: null,
    rate_basis: 'room_only',
    rate_basis_notes:
      'Operator site lists $109 per night for XL A-Frame Site 1. A separate note offers 10% off any site Sunday through Thursday. Seasonal splits were not published.',
    unit_description:
      'Extra-large A-frame with a loft. Queen bed and a lofted twin, both memory foam. Sleeps 4. Air conditioning, mini-fridge, and microwave. Picnic table, fire ring, and camp grill. Shared bathhouse with hot showers. Free Wi-Fi on the property. Published rate $109 per night.',
  });
  await insertSibling(13106, 'Small A-Frame, Site 2', {
    property_name: 'Piney Hills Campground',
    site_name: 'Small A-Frame, Site 2',
    unit_type: unit('A-Frame'),
    quantity_of_units: 1,
    unit_capacity: '2',
    unit_private_bathroom: 'No',
    unit_air_conditioning: 'Yes',
    unit_wifi: 'Yes',
    unit_mini_fridge: null,
    is_open: 'Yes',
    address: '348 Averett Rd',
    city: 'Mauk',
    state: 'GA',
    zip_code: '31058',
    phone_number: '(478) 227-6006',
    url: 'https://pineyhillscampground.com/services/a-frames/xl-a-frame-site-1-150292838',
    rate_avg_retail_daily_rate: 99,
    rate_basis: 'room_only',
    rate_basis_notes:
      'Operator site lists $99 per night for Small A-Frame Site 2. A separate note offers 10% off any site Sunday through Thursday.',
    unit_description:
      'Smaller A-frame closest to the bathhouse. Queen memory-foam bed. Sleeps 2. Air conditioning, rocking chairs, picnic table, fire ring, and camp grill. Shared bathhouse. Published rate $99 per night.',
  });

  await patchRow(10870, {
    ...NO_RATE,
    research_status: 'published',
    site_name: 'Yurt',
    unit_type: unit('Yurt'),
    quantity_of_units: 1,
    unit_wifi: 'Yes',
    unit_hot_tub: 'Yes',
    is_open: 'Yes',
    address: '135 Fred Houghton Rd',
    zip_code: '05346',
    phone_number: '+1 415-271-8462',
    url: 'https://www.thevermontretreat.com/',
    unit_description:
      'One yurt on a family homestead at 135 Fred Houghton Rd, Putney, hosted by Kathleen and Hans. Guest accounts describe a wood stove, Wi-Fi, a private deck and fire pit, and a wood-fired outdoor tub open roughly May through mid-October. thevermontretreat.com did not load on 21 Sep 2026, so the stored $155 rate was removed rather than treated as current. The previous Closed status was replaced because current listings and guest stays describe it as bookable.',
  });

  console.log(DRY_RUN ? 'dry run complete' : 'writes complete');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
