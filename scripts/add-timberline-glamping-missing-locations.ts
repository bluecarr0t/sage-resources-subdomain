#!/usr/bin/env npx tsx
/**
 * Insert Timberline Glamping resorts listed on timberlineglamping.com/locations and
 * on *.tlglamping.com that are not yet represented in `all_glamping_properties`.
 *
 * Existing Sage rows (skipped): Amelia Island, Amicalola, Collier-Seminole (Naples),
 * Kissimmee Prairie, Pymatuning, Clarks Hill Lake (Augusta area), Hillsborough River
 * (Tampa), Lake Lanier Shady Grove (Cumming), legacy Lake Lanier (Gainesville).
 *
 * Unit rows mirror Timberline’s Safari Tent tiers (see Unicoi / Clarks Hill): Deluxe,
 * Double, Standard — quantities 1, 1, 2 (four units total per property).
 *
 * Usage:
 *   npx tsx scripts/add-timberline-glamping-missing-locations.ts
 *   npx tsx scripts/add-timberline-glamping-missing-locations.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = 'all_glamping_properties';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');

/** Matches Timberline’s published multi-location footprint (see on-property rows). */
const BRAND_LOCATIONS = 4;
/** Corporate booking / inquiries (listed on timberlineglamping.com). */
const DEFAULT_PHONE = '+1 678-672-7633';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const UNIT_LINES = [
  { site_name: 'Deluxe Safari Tent', quantity_of_units: 1, unit_capacity: '4' },
  { site_name: 'Double Safari Tent', quantity_of_units: 1, unit_capacity: '4' },
  { site_name: 'Standard Safari Tent', quantity_of_units: 2, unit_capacity: '2' },
] as const;

type LocationDef = {
  property_name: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
  year_site_opened: number | null;
  description: string;
};

/**
 * Researched from https://www.timberlineglamping.com/locations (May 2026).
 * Coordinates are approximate park/city anchors for mapping.
 */
const LOCATIONS: LocationDef[] = [
  {
    property_name: 'Timberline Glamping at Unicoi State Park',
    city: 'Helen',
    state: 'GA',
    zip_code: '30545',
    country: 'USA',
    lat: 34.7015,
    lon: -83.7316,
    url: 'https://unicoi.tlglamping.com/',
    year_site_opened: 2023,
    description:
      'Timberline Glamping at Unicoi State Park offers furnished safari tents inside Unicoi State Park near Helen, Georgia—lake views, trails, and shared park amenities (see unicoi.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Orange Beach',
    city: 'Orange Beach',
    state: 'AL',
    zip_code: '36561',
    country: 'USA',
    lat: 30.2695,
    lon: -87.6411,
    url: 'https://orangebeach.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Orange Beach sits where Orange Beach meets Gulf State Park, steps from the Gulf and trailheads (see timberlineglamping.com/locations).',
  },
  {
    property_name: 'Timberline Glamping at Auburn',
    city: 'Auburn',
    state: 'AL',
    zip_code: '36830',
    country: 'USA',
    lat: 32.6099,
    lon: -85.4808,
    url: 'https://auburn.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Auburn is at Chewacla State Park near Auburn University—lakes, falls, hiking, and boating (see auburn.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Lake Martin',
    city: 'Alexander City',
    state: 'AL',
    zip_code: '35010',
    country: 'USA',
    lat: 32.944,
    lon: -85.9539,
    url: 'https://lakemartin.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Lake Martin is inside Wind Creek State Park on Lake Martin, Alabama (see lakemartin.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Lake Guntersville',
    city: 'Guntersville',
    state: 'AL',
    zip_code: '35976',
    country: 'USA',
    lat: 34.3587,
    lon: -86.2958,
    url: 'https://lakeguntersville.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Lake Guntersville overlooks Lake Guntersville in Lake Guntersville State Park—golf, trails, and water recreation (lakeguntersville.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Cheaha',
    city: 'Lineville',
    state: 'AL',
    zip_code: '36266',
    country: 'USA',
    lat: 33.485,
    lon: -85.7525,
    url: 'https://cheaha.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Cheaha sits in the Talladega National Forest near Alabama’s highest point at Cheaha State Park (cheaha.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Huntsville',
    city: 'Huntsville',
    state: 'AL',
    zip_code: '35802',
    country: 'USA',
    lat: 34.7239,
    lon: -86.5757,
    url: 'https://huntsville.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Huntsville is based at Monte Sano State Park—trails, views, and access to Huntsville attractions (huntsville.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Birmingham',
    city: 'Birmingham',
    state: 'AL',
    zip_code: '35242',
    country: 'USA',
    lat: 33.3287,
    lon: -86.7909,
    url: 'https://birmingham.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Birmingham offers safari-style stays near Birmingham at a Timberline partner park (birmingham.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Tuscaloosa',
    city: 'Tuscaloosa',
    state: 'AL',
    zip_code: '35404',
    country: 'USA',
    lat: 33.2098,
    lon: -87.5692,
    url: 'https://tuscaloosa.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Tuscaloosa provides glamping near Tuscaloosa and Lake Lurleen State Park (tuscaloosa.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Lake Blackshear',
    city: 'Cordele',
    state: 'GA',
    zip_code: '31015',
    country: 'USA',
    lat: 31.9605,
    lon: -83.7824,
    url: 'https://lakeblackshear.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Lake Blackshear is near Georgia Veterans State Park on Lake Blackshear (lakeblackshear.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Kingston Downs',
    city: 'Rome',
    state: 'GA',
    zip_code: '30161',
    country: 'USA',
    lat: 34.3043,
    lon: -85.2185,
    url: 'https://kingstondowns.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Kingston Downs is on a large private retreat near Rome, Georgia—woodlands, fields, and river access (kingstondowns.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Lake Lanier River Forks',
    city: 'Gainesville',
    state: 'GA',
    zip_code: '30501',
    country: 'USA',
    lat: 34.3148,
    lon: -83.8322,
    url: 'https://riverforks.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Lake Lanier River Forks is at River Forks Park on Lake Lanier near downtown Gainesville—distinct from the Shady Grove / Cumming Timberline site (riverforks.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Lula',
    city: 'Lula',
    state: 'GA',
    zip_code: '30554',
    country: 'USA',
    lat: 34.3876,
    lon: -83.6663,
    url: 'https://lula.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Lula is on private acreage north of Gainesville at the foothills of the Appalachians (lula.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Sebastian Inlet',
    city: 'Melbourne Beach',
    state: 'FL',
    zip_code: '32951',
    country: 'USA',
    lat: 28.1364,
    lon: -80.5776,
    url: 'https://sebastian.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Sebastian Inlet is on Florida’s east coast by Sebastian Inlet State Park (sebastian.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Lake Manatee',
    city: 'Bradenton',
    state: 'FL',
    zip_code: '34203',
    country: 'USA',
    lat: 27.5021,
    lon: -82.4576,
    url: 'https://lakemanatee.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Lake Manatee is at Lake Manatee State Recreation Area near Bradenton (lakemanatee.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Sarasota',
    city: 'Osprey',
    state: 'FL',
    zip_code: '34229',
    country: 'USA',
    lat: 27.1959,
    lon: -82.4854,
    url: 'https://sarasota.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Sarasota / Oscar Scherer State Park offers safari tents minutes from Sarasota (sarasota.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Jupiter',
    city: 'Jupiter',
    state: 'FL',
    zip_code: '33478',
    country: 'USA',
    lat: 26.9343,
    lon: -80.0942,
    url: 'https://jupiter.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Jupiter provides large furnished safari tents on Florida’s Atlantic coast (jupiter.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Fort Myers',
    city: 'Estero',
    state: 'FL',
    zip_code: '33928',
    country: 'USA',
    lat: 26.4312,
    lon: -81.8155,
    url: 'https://ftmyers.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Fort Myers is in Koreshan State Park with river and trail access near Fort Myers (ftmyers.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Williamsburg',
    city: 'Williamsburg',
    state: 'VA',
    zip_code: '23185',
    country: 'USA',
    lat: 37.2707,
    lon: -76.7074,
    url: 'https://williamsburg.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Williamsburg sits in Chickahominy Riverfront Park on the James River near Colonial Williamsburg (williamsburg.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Promised Land',
    city: 'Greentown',
    state: 'PA',
    zip_code: '18426',
    country: 'USA',
    lat: 41.1381,
    lon: -75.336,
    url: 'https://promisedland.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Promised Land is in Promised Land State Park, Poconos (promisedland.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Laurel Hill',
    city: 'Somerset',
    state: 'PA',
    zip_code: '15501',
    country: 'USA',
    lat: 40.0087,
    lon: -79.0776,
    url: 'https://laurelhill.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Laurel Hill is in Laurel Hill State Park in Somerset County (laurelhill.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Hills Creek',
    city: 'Wellsboro',
    state: 'PA',
    zip_code: '16901',
    country: 'USA',
    lat: 41.7206,
    lon: -77.3014,
    url: 'https://hillscreek.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Hills Creek is in Hills Creek State Park in the Pennsylvania Grand Canyon country (hillscreek.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Hickory Run',
    city: 'White Haven',
    state: 'PA',
    zip_code: '18661',
    country: 'USA',
    lat: 41.0878,
    lon: -75.7566,
    url: 'https://hickoryrun.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Hickory Run is in Hickory Run State Park, Poconos (hickoryrun.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at Codorus',
    city: 'Hanover',
    state: 'PA',
    zip_code: '17331',
    country: 'USA',
    lat: 39.8007,
    lon: -76.983,
    url: 'https://codorus.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at Codorus is at Codorus State Park south of Harrisburg (codorus.tlglamping.com).',
  },
  {
    property_name: 'Timberline Glamping at French Creek',
    city: 'Elverson',
    state: 'PA',
    zip_code: '19520',
    country: 'USA',
    lat: 40.157,
    lon: -75.8336,
    url: 'https://frenchcreek.tlglamping.com/',
    year_site_opened: null,
    description:
      'Timberline Glamping at French Creek is in French Creek State Park in southeastern Pennsylvania (frenchcreek.tlglamping.com).',
  },
];

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no inserts\n' : 'LIVE insert\n');

  let added = 0;
  let skipped = 0;

  for (const loc of LOCATIONS) {
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id')
      .eq('property_name', loc.property_name)
      .limit(1);

    if (existing?.length) {
      console.log(`Skip — exists: ${loc.property_name}`);
      skipped += 1;
      continue;
    }

    const rows = UNIT_LINES.map((u) => ({
      property_name: loc.property_name,
      site_name: u.site_name,
      slug: `${slugify(loc.property_name)}-${slugify(u.site_name)}`,
      property_type: 'Glamping',
      unit_type: 'Safari Tent',
      is_glamping_property: 'Yes',
      is_open: 'Yes',
      research_status: 'published',
      source: 'Sage',
      discovery_source: 'Manual Research',
      date_added: TODAY,
      date_updated: TODAY,
      city: loc.city,
      state: loc.state,
      zip_code: loc.zip_code,
      country: loc.country,
      lat: loc.lat,
      lon: loc.lon,
      url: loc.url,
      phone_number: DEFAULT_PHONE,
      description: loc.description,
      quantity_of_units: u.quantity_of_units,
      unit_capacity: u.unit_capacity,
      number_of_locations: BRAND_LOCATIONS,
      year_site_opened: loc.year_site_opened,
    }));

    if (DRY_RUN) {
      console.log(`Would insert ${rows.length} rows — ${loc.property_name}`);
      added += 1;
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(rows);
    if (error) {
      console.error(`Failed ${loc.property_name}: ${error.message}`);
      process.exit(1);
    }
    console.log(`Inserted ${rows.length} rows — ${loc.property_name}`);
    added += 1;
  }

  console.log(`\nDone. Added ${added} properties (${skipped} skipped as already present).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
