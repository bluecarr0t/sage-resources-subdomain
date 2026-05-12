#!/usr/bin/env npx tsx
/**
 * Insert AutoCamp properties from autocamp.com that are missing in `all_glamping_properties`.
 *
 * Researched May 2026: official locations index (autocamp.com/locations) includes
 * AutoCamp Sonoma (Guerneville, CA) as distinct from AutoCamp Russian River in the same town.
 * Address and phone from autocamp.com/sonoma/.
 *
 * Unit rows mirror AutoCamp Russian River patterns (Airstream, premium cabin, safari tent, Happier Camper).
 *
 * Usage:
 *   npx tsx scripts/add-autocamp-missing-locations.ts
 *   npx tsx scripts/add-autocamp-missing-locations.ts --dry-run
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

/** Aligns with other AutoCamp rows in Sage (brand-wide location count). */
const BRAND_LOCATIONS = 6;

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
  {
    site_name: 'Classic Airstream Suite',
    unit_type: 'Airstream',
    quantity_of_units: 18,
    unit_capacity: '4',
  },
  {
    site_name: 'Premium Accessible Cabin',
    unit_type: 'Tiny Home',
    quantity_of_units: 2,
    unit_capacity: '4',
  },
  {
    site_name: 'Luxury Tent',
    unit_type: 'Safari Tent',
    quantity_of_units: 10,
    unit_capacity: '4',
  },
  {
    site_name: 'Happier Camper',
    unit_type: 'Vintage Trailer',
    quantity_of_units: 1,
    unit_capacity: '2',
  },
] as const;

type Loc = {
  property_name: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
  phone_number: string;
  year_site_opened: number | null;
  description: string;
};

const LOCATIONS: Loc[] = [
  {
    property_name: 'AutoCamp Sonoma',
    city: 'Guerneville',
    state: 'CA',
    zip_code: '95446',
    country: 'USA',
    /** Approx. for 14120 Old Cazadero Rd — redwood corridor west of Guerneville */
    lat: 38.4582,
    lon: -122.9955,
    url: 'https://autocamp.com/sonoma/',
    phone_number: '+1 855-942-0792',
    year_site_opened: null,
    description:
      'AutoCamp Sonoma is a luxury glamping retreat in the Russian River Valley at 14120 Old Cazadero Rd, Guerneville— ' +
      'redwoods, Sonoma wine country, Armstrong Redwoods, and the Russian River. ' +
      'Stays include Airstream suites, premium accessible cabins, adventure tents, and a Happier Camper unit, ' +
      'plus clubhouse, WiFi, EV charging, and seasonal programming (see autocamp.com/sonoma).',
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
      console.log(`Skip — exists: ${loc.property_name} (id=${existing[0].id})`);
      continue;
    }

    const rows = UNIT_LINES.map((u) => ({
      property_name: loc.property_name,
      site_name: u.site_name,
      slug: `${slugify(loc.property_name)}-${slugify(u.site_name)}`,
      property_type: 'Glamping',
      unit_type: u.unit_type,
      is_glamping_property: 'Yes',
      is_open: 'Yes',
      research_status: 'published',
      source: 'Sage',
      discovery_source: 'Manual Research',
      date_added: TODAY,
      date_updated: TODAY,
      address: '14120 Old Cazadero Rd',
      city: loc.city,
      state: loc.state,
      zip_code: loc.zip_code,
      country: loc.country,
      lat: loc.lat,
      lon: loc.lon,
      url: loc.url,
      phone_number: loc.phone_number,
      description: loc.description,
      quantity_of_units: u.quantity_of_units,
      unit_capacity: u.unit_capacity,
      number_of_locations: BRAND_LOCATIONS,
      year_site_opened: loc.year_site_opened,
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
