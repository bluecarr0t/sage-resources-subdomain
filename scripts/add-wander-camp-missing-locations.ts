#!/usr/bin/env npx tsx
/**
 * Insert Wander Camp properties that appear on thewandercamp.com but were missing
 * from `all_glamping_properties` (researched Feb 2026 from official site + WP index).
 *
 * Adds: Bear Lake (Garden City, UT), Smoky Mountains (Gatlinburg, TN).
 * Four unit-type rows each (King / Twin / Triple / Family Bell Tent), matching other
 * Wander Camp resorts in Sage.
 *
 * Usage:
 *   npx tsx scripts/add-wander-camp-missing-locations.ts
 *   npx tsx scripts/add-wander-camp-missing-locations.ts --dry-run
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

const PHONE = '+1 801-200-3918';
const BRAND_LOCATIONS = 10;

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

/** Unit mix aligned with other Wander Camp resorts (e.g. Grand Canyon). */
const UNIT_LINES = [
  { site_name: 'King Tent', quantity_of_units: 17 },
  { site_name: 'Twin Tent', quantity_of_units: 14 },
  { site_name: 'Triple Tent', quantity_of_units: 8 },
  { site_name: 'Family Tent', quantity_of_units: 9 },
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
  year_site_opened: number;
  description: string;
};

const LOCATIONS: LocationDef[] = [
  {
    property_name: 'Wander Camp Bear Lake',
    city: 'Garden City',
    state: 'UT',
    zip_code: '84028',
    country: 'USA',
    lat: 41.9453,
    lon: -111.3956,
    url: 'https://thewandercamp.com/glamping/utah/bear-lake',
    year_site_opened: 2021,
    description:
      'Wander Camp Bear Lake is a seasonal glamping tent camp in Garden City, Utah, ' +
      "straddling the Utah–Idaho line near Bear Lake. Guests stay in large waterproof canvas bell tents " +
      '(King, Twin, Triple, and Family layouts) with quality linens, rustic furnishings, solar lanterns ' +
      'and fans, and shared bathroom facilities with showers and flushing toilets—an off-grid, ' +
      'concierge-supported outdoor stay (opening pattern published on thewandercamp.com).',
  },
  {
    property_name: 'Wander Camp Smoky Mountains',
    city: 'Gatlinburg',
    state: 'TN',
    zip_code: '37738',
    country: 'USA',
    lat: 35.7143,
    lon: -83.5102,
    url: 'https://thewandercamp.com/glamping/tennessee/smoky-mountains',
    year_site_opened: 2022,
    description:
      'Wander Camp Smoky Mountains is a rustic glamping accommodation just outside Gatlinburg, Tennessee, ' +
      'minutes from Great Smoky Mountains National Park (Sugarlands Visitor Center and the Blue Ridge Parkway). ' +
      'Spacious canvas bell tents with king, twin, triple, and family sleeping layouts, shared bath facilities, ' +
      'campfire areas, and off-grid comforts consistent with other Wander Camp locations.',
  },
];

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no inserts\n' : 'LIVE insert\n');

  for (const loc of LOCATIONS) {
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id')
      .eq('property_name', loc.property_name)
      .limit(1);

    if (existing?.length) {
      console.log(`Skip — already present: ${loc.property_name} (id=${existing[0].id})`);
      continue;
    }

    const rows = UNIT_LINES.map((u) => ({
      property_name: loc.property_name,
      site_name: u.site_name,
      slug: `${slugify(loc.property_name)}-${slugify(u.site_name)}`,
      property_type: 'Glamping',
      unit_type: 'Bell Tent',
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
      phone_number: PHONE,
      description: loc.description,
      quantity_of_units: u.quantity_of_units,
      number_of_locations: BRAND_LOCATIONS,
      year_site_opened: loc.year_site_opened,
      unit_capacity: u.site_name.startsWith('Family') ? '5' : u.site_name.startsWith('Triple') ? '3' : '2',
    }));

    if (DRY_RUN) {
      console.log(JSON.stringify(rows, null, 2));
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(rows);
    if (error) {
      console.error(`Failed ${loc.property_name}: ${error.message}`);
      process.exit(1);
    }
    console.log(`Inserted ${rows.length} rows — ${loc.property_name}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
