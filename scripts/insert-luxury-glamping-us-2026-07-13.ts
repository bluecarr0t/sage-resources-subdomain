#!/usr/bin/env npx tsx
/**
 * Insert newly researched US Luxury glamping properties missing from all_sage_data.
 * research_status = in_progress (review/publish separately).
 *
 * Usage:
 *   npx tsx scripts/insert-luxury-glamping-us-2026-07-13.ts --dry-run
 *   npx tsx scripts/insert-luxury-glamping-us-2026-07-13.ts
 */
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_luxury_glamping_us_2026_07_13';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
  city: string;
  state: string;
  url: string;
  unit_type?: string | null;
  quantity_of_units?: number | null;
  property_total_sites?: number | null;
  address?: string | null;
  zip_code?: string | null;
  phone_number?: string | null;
  lat?: number | null;
  lon?: number | null;
  description: string;
  notes?: string | null;
};

function assertRequired(spec: InsertSpec): InsertSpec {
  const url = spec.url.trim();
  const city = spec.city.trim();
  const state = spec.state.trim().toUpperCase();
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error(`${spec.property_name}: url required (http/https)`);
  }
  if (!city) {
    throw new Error(`${spec.property_name}: city required`);
  }
  if (!/^[A-Z]{2}$/.test(state)) {
    throw new Error(`${spec.property_name}: 2-letter US state required (got ${spec.state})`);
  }
  return { ...spec, url, city, state };
}

function baseRow(spec: InsertSpec, propertyId: string): Record<string, unknown> {
  const gated = assertRequired(spec);
  return {
    property_name: gated.property_name,
    site_name: gated.site_name ?? null,
    slug: slugify(gated.property_name),
    property_id: propertyId,
    property_type: 'Glamping',
    research_status: 'in_progress',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    source: 'Sage',
    discovery_source: DISCOVERY_SOURCE,
    date_added: TODAY,
    date_updated: TODAY,
    country: 'United States',
    land_operator_category: 'private_commercial',
    address: gated.address ?? null,
    city: gated.city,
    state: gated.state,
    zip_code: gated.zip_code ?? null,
    lat: gated.lat ?? null,
    lon: gated.lon ?? null,
    url: gated.url,
    phone_number: gated.phone_number ?? null,
    description: gated.description,
    unit_type: gated.unit_type
      ? normalizeGlampingUnitTypeForStorage(gated.unit_type)
      : null,
    quantity_of_units:
      gated.quantity_of_units != null ? String(gated.quantity_of_units) : null,
    property_total_sites:
      gated.property_total_sites != null ? String(gated.property_total_sites) : null,
    glamping_service_tier: 'luxury',
    glamping_service_tier_source: 'manual',
    notes:
      gated.notes ??
      '[2026-07-13] Luxury US discovery: verify rates, amenities, and exact coordinates before publishing.',
  };
}

/** Curated open US Luxury glamping missing from all_sage_data (2026-07-13 research). */
const NEW_PROPERTIES: InsertSpec[] = [
  {
    property_name: 'The Glamping Collective Chattanooga',
    site_name: 'Geodesic Dome',
    city: 'Trenton',
    state: 'GA',
    zip_code: '30752',
    address: '200 GA-301',
    url: 'https://www.theglampingcollective.com/locations/chattanooga/',
    phone_number: '(423) 888-0150',
    unit_type: 'Geodesic Dome',
    quantity_of_units: 21,
    property_total_sites: 21,
    lat: 34.824986,
    lon: -85.574303,
    description:
      'Adults-only luxury geodesic dome resort on Sand Mountain near Chattanooga (Trenton, GA). Second location from The Glamping Collective (Asheville flagship already in Sage). About 21 mountaintop domes with private decks, hot tubs, spa bathrooms, climate control, and cliff-edge infinity pool; opened spring 2026. Marketed near Chattanooga, TN; physical address is Trenton, GA.',
    notes:
      '[2026-07-13] Luxury US discovery (sibling of Clyde NC property). Confirm Ultra Luxe vs Luxe unit split, published ARDR, and amenity flags before publishing.',
  },
  {
    property_name: 'Paintrock Canyon Ranch',
    site_name: 'Safari Tent',
    city: 'Hyattville',
    state: 'WY',
    zip_code: '82428',
    address: '5332 County Road 49 1/2',
    url: 'https://ranchlands.com/pages/prcr-ranch-vacations',
    phone_number: '(719) 641-2089',
    unit_type: 'Canvas Tent',
    quantity_of_units: 14,
    property_total_sites: 14,
    lat: 44.27228546,
    lon: -107.51802826,
    description:
      'Ranchlands all-inclusive safari tent camp on ~80,000 acres near Hyattville, WY (Paintrock Creek / Bighorn Mountains). Fourteen furnished canvas sleeping tents (10 king, 4 double) with shared camp bathhouses, chef meals, and guided ranch activities. Guest hospitality opened 2023; five-night ranch vacations ~$4,150 pp all-inclusive.',
    notes:
      '[2026-07-13] Luxury US discovery (all-inclusive ADR). Shared bathhouses — confirm private-bath flags and package-rate ARDR conversion before publishing.',
  },
  {
    property_name: 'Platte Canyon Glamping at Brush Creek Ranch',
    site_name: 'Glamping Tent',
    city: 'Saratoga',
    state: 'WY',
    zip_code: '82331',
    address: '1016 Country Road 660',
    url: 'https://www.brushcreekranch.com/platte-canyon-glamping',
    phone_number: '+1 307-327-5284',
    unit_type: 'Canvas Tent',
    quantity_of_units: 2,
    property_total_sites: 3,
    lat: 41.2114233,
    lon: -106.5167326,
    description:
      'Private all-inclusive riverfront glamping camp on the North Platte River within the Brush Creek Ranch collection near Saratoga, WY. Two glamping tents plus one luxury yurt (up to 8 guests) with personal host, private chef, and ranch activities; seasonal May–mid-October. Launched 2025; published package rates around $4,500/night. Distinct from French Creek and the main Lodge & Spa rows already in Sage.',
    notes:
      '[2026-07-13] Luxury US discovery (Brush Creek product). Confirm whether coordinates should differ from French Creek campus pin; verify package ARDR before publishing.',
  },
  {
    property_name: 'Platte Canyon Glamping at Brush Creek Ranch',
    site_name: 'Yurt',
    city: 'Saratoga',
    state: 'WY',
    zip_code: '82331',
    address: '1016 Country Road 660',
    url: 'https://www.brushcreekranch.com/platte-canyon-glamping',
    phone_number: '+1 307-327-5284',
    unit_type: 'Yurt',
    quantity_of_units: 1,
    property_total_sites: 3,
    lat: 41.2114233,
    lon: -106.5167326,
    description:
      'Private all-inclusive riverfront glamping camp on the North Platte River within the Brush Creek Ranch collection near Saratoga, WY. Two glamping tents plus one luxury yurt (up to 8 guests) with personal host, private chef, and ranch activities; seasonal May–mid-October. Launched 2025; published package rates around $4,500/night. Distinct from French Creek and the main Lodge & Spa rows already in Sage.',
    notes:
      '[2026-07-13] Luxury US discovery (Brush Creek product). Confirm whether coordinates should differ from French Creek campus pin; verify package ARDR before publishing.',
  },
];

async function propertyExists(name: string, city: string, state: string): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .eq('city', city)
    .eq('state', state)
    .limit(1);
  return Boolean(data?.length);
}

async function insertNewProperties(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}\n`);

  const grouped = new Map<string, InsertSpec[]>();
  for (const spec of NEW_PROPERTIES) {
    const key = `${spec.property_name}||${spec.city}||${spec.state}`;
    const list = grouped.get(key) ?? [];
    list.push(spec);
    grouped.set(key, list);
  }

  let insertedProperties = 0;
  let insertedRows = 0;

  for (const [, specs] of grouped) {
    const head = specs[0]!;
    if (await propertyExists(head.property_name, head.city, head.state)) {
      console.log(
        `SKIP ${head.property_name} (${head.city}, ${head.state}) — already exists in ${TABLE}`
      );
      continue;
    }

    const propertyId = randomUUID();
    const rows = specs.map((spec) => baseRow(spec, propertyId));

    console.log(
      `INSERT ${head.property_name} (${head.city}, ${head.state}) — ${rows.length} row(s)`
    );
    insertedProperties += 1;
    insertedRows += rows.length;

    if (DRY_RUN) {
      console.log(JSON.stringify(rows, null, 2));
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(rows);
    if (error) throw new Error(`Insert ${head.property_name}: ${error.message}`);
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
