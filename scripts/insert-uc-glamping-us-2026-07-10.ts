#!/usr/bin/env npx tsx
/**
 * Insert newly researched US glamping resorts that are Under Construction
 * and not yet present in all_sage_data (2026-07-10 web research pass).
 *
 * Usage:
 *   npx tsx scripts/insert-uc-glamping-us-2026-07-10.ts --dry-run
 *   npx tsx scripts/insert-uc-glamping-us-2026-07-10.ts
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_uc_glamping_2026_07_10';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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

type InsertSpec = {
  property_name: string;
  site_name?: string | null;
  property_type?: string;
  is_open: string;
  planned_open_date?: string | null;
  city: string;
  state: string;
  zip_code?: string | null;
  address?: string | null;
  url?: string | null;
  phone_number?: string | null;
  unit_type?: string | null;
  quantity_of_units?: number | null;
  property_total_sites?: number | null;
  lat?: number | null;
  lon?: number | null;
  description: string;
};

function baseRow(spec: InsertSpec, propertyId: string): Record<string, unknown> {
  return {
    property_name: spec.property_name,
    site_name: spec.site_name ?? null,
    slug: slugify(spec.property_name),
    property_id: propertyId,
    property_type: spec.property_type ?? 'Glamping',
    research_status: 'in_progress',
    is_glamping_property: 'Yes',
    is_open: spec.is_open,
    planned_open_date: spec.planned_open_date ?? null,
    source: 'Sage',
    discovery_source: DISCOVERY_SOURCE,
    date_added: TODAY,
    date_updated: TODAY,
    country: 'United States',
    land_operator_category: 'private_commercial',
    address: spec.address ?? null,
    city: spec.city,
    state: spec.state,
    zip_code: spec.zip_code ?? null,
    lat: spec.lat ?? null,
    lon: spec.lon ?? null,
    url: spec.url ?? null,
    phone_number: spec.phone_number ?? null,
    description: spec.description,
    unit_type: spec.unit_type
      ? normalizeGlampingUnitTypeForStorage(spec.unit_type)
      : null,
    quantity_of_units:
      spec.quantity_of_units != null ? String(spec.quantity_of_units) : null,
    property_total_sites:
      spec.property_total_sites != null ? String(spec.property_total_sites) : null,
  };
}

const NEW_PROPERTIES: InsertSpec[] = [
  {
    property_name: 'Ponderosa Pines Resort',
    site_name: 'Cabin',
    is_open: 'Under Construction',
    planned_open_date: '2026-10-01',
    city: 'Parks',
    state: 'AZ',
    zip_code: '86018',
    address: '13358 E Old Rte 66',
    url: 'https://www.ponderosapinesresort.com/',
    unit_type: 'Cabin',
    quantity_of_units: 25,
    property_total_sites: 43,
    lat: 35.2604,
    lon: -111.7489,
    description:
      'Ponderosa Pines Resort is a wellness-focused glamping and cabin resort on 17 wooded acres in Parks, Arizona, roughly 15 minutes east of Flagstaff between I-40 and Historic Route 66. The project is under active construction for a fall 2026 opening with 43 total units: 25 cabins (each with a private hot tub), plus Airstreams and glamping tents. Amenities will include walking trails, a dog park, sauna, cold plunge, disc golf, game room, and an outdoor gym.',
  },
  {
    property_name: 'Ponderosa Pines Resort',
    site_name: 'Airstream',
    is_open: 'Under Construction',
    planned_open_date: '2026-10-01',
    city: 'Parks',
    state: 'AZ',
    zip_code: '86018',
    address: '13358 E Old Rte 66',
    url: 'https://www.ponderosapinesresort.com/',
    unit_type: 'Airstream',
    quantity_of_units: 9,
    property_total_sites: 43,
    lat: 35.2604,
    lon: -111.7489,
    description:
      'Ponderosa Pines Resort is a wellness-focused glamping and cabin resort on 17 wooded acres in Parks, Arizona, roughly 15 minutes east of Flagstaff between I-40 and Historic Route 66. The project is under active construction for a fall 2026 opening with 43 total units: 25 cabins (each with a private hot tub), plus Airstreams and glamping tents. Amenities will include walking trails, a dog park, sauna, cold plunge, disc golf, game room, and an outdoor gym.',
  },
  {
    property_name: 'Ponderosa Pines Resort',
    site_name: 'Glamping Tent',
    is_open: 'Under Construction',
    planned_open_date: '2026-10-01',
    city: 'Parks',
    state: 'AZ',
    zip_code: '86018',
    address: '13358 E Old Rte 66',
    url: 'https://www.ponderosapinesresort.com/',
    unit_type: 'Canvas Tent',
    quantity_of_units: 9,
    property_total_sites: 43,
    lat: 35.2604,
    lon: -111.7489,
    description:
      'Ponderosa Pines Resort is a wellness-focused glamping and cabin resort on 17 wooded acres in Parks, Arizona, roughly 15 minutes east of Flagstaff between I-40 and Historic Route 66. The project is under active construction for a fall 2026 opening with 43 total units: 25 cabins (each with a private hot tub), plus Airstreams and glamping tents. Amenities will include walking trails, a dog park, sauna, cold plunge, disc golf, game room, and an outdoor gym.',
  },
  {
    property_name: 'Camp Yellow Cardinal',
    site_name: 'Geodesic Dome',
    is_open: 'Under Construction',
    planned_open_date: '2026-10-01',
    city: 'Meherrin',
    state: 'VA',
    zip_code: '23947',
    url: 'https://campyellowcardinal.com/',
    unit_type: 'Geodesic Dome',
    quantity_of_units: 12,
    property_total_sites: 12,
    lat: 37.0831,
    lon: -78.4369,
    description:
      'Camp Yellow Cardinal is an adults-only luxury glamping retreat on 25 forested acres in Prince Edward County, Virginia, near Meherrin and about 20 minutes south of Farmville. Kevin and Laura Wilson received county approval in March 2025 and are building 12 geodesic domes (phase one: six units) with king beds, kitchenettes, hot tubs, and fire pits. Phase two will add a barrel sauna and observation deck. The project faced import-tariff delays on dome shipments from China; the operator now targets fall 2026.',
  },
  {
    property_name: 'Hidden Beach RV Resort',
    site_name: 'Geodesic Dome',
    property_type: 'Outdoor Resort',
    is_open: 'Under Construction',
    planned_open_date: '2026-12-01',
    city: 'Beaufort',
    state: 'NC',
    zip_code: '28516',
    url: 'https://hiddenbeachrvresort.com/',
    unit_type: 'Geodesic Dome',
    quantity_of_units: 5,
    property_total_sites: 80,
    lat: 34.718,
    lon: -76.6638,
    description:
      'Hidden Beach RV Resort is a 75-acre smart outdoor hospitality project by Maverik Asher Capital on the North Carolina coast near Beaufort. Phase one (about 80 sites) is under development for a 2026 opening and will include five furnished geodesic glamping domes, six elevated treehouses, RV pads, vintage Airstream rentals, and resort amenities such as pools, a lazy river, and a clubhouse. The concept emphasizes gigabit Wi-Fi, EV charging, and robotic camp services.',
  },
  {
    property_name: 'Hidden Beach RV Resort',
    site_name: 'Treehouse',
    property_type: 'Outdoor Resort',
    is_open: 'Under Construction',
    planned_open_date: '2026-12-01',
    city: 'Beaufort',
    state: 'NC',
    zip_code: '28516',
    url: 'https://hiddenbeachrvresort.com/',
    unit_type: 'Treehouse',
    quantity_of_units: 6,
    property_total_sites: 80,
    lat: 34.718,
    lon: -76.6638,
    description:
      'Hidden Beach RV Resort is a 75-acre smart outdoor hospitality project by Maverik Asher Capital on the North Carolina coast near Beaufort. Phase one (about 80 sites) is under development for a 2026 opening and will include five furnished geodesic glamping domes, six elevated treehouses, RV pads, vintage Airstream rentals, and resort amenities such as pools, a lazy river, and a clubhouse. The concept emphasizes gigabit Wi-Fi, EV charging, and robotic camp services.',
  },
];

async function propertyExists(name: string): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .limit(1);
  return Boolean(data?.length);
}

async function insertNewProperties(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}\n`);

  const grouped = new Map<string, InsertSpec[]>();
  for (const spec of NEW_PROPERTIES) {
    const list = grouped.get(spec.property_name) ?? [];
    list.push(spec);
    grouped.set(spec.property_name, list);
  }

  let insertedProperties = 0;
  let insertedRows = 0;

  for (const [name, specs] of grouped) {
    if (await propertyExists(name)) {
      console.log(`SKIP ${name} — already exists in ${TABLE}`);
      continue;
    }

    const propertyId = randomUUID();
    const rows = specs.map((spec) => baseRow(spec, propertyId));

    console.log(`INSERT ${name} (${rows.length} row(s))`);
    insertedProperties += 1;
    insertedRows += rows.length;

    if (DRY_RUN) {
      console.log(JSON.stringify(rows, null, 2));
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(rows);
    if (error) throw new Error(`Insert ${name}: ${error.message}`);
  }

  console.log(
    `\nSummary: ${insertedProperties} propert(ies), ${insertedRows} row(s) ${
      DRY_RUN ? 'would be' : 'were'
    } inserted.`
  );
}

insertNewProperties().catch((err) => {
  console.error(err);
  process.exit(1);
});
