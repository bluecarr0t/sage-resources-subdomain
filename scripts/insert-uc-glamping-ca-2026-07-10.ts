#!/usr/bin/env npx tsx
/**
 * Insert newly researched Canada glamping resorts that are Under Construction
 * and not yet present in all_sage_data (2026-07-10 web research pass).
 *
 * Usage:
 *   npx tsx scripts/insert-uc-glamping-ca-2026-07-10.ts --dry-run
 *   npx tsx scripts/insert-uc-glamping-ca-2026-07-10.ts
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_uc_glamping_ca_2026_07_10';
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
    country: 'Canada',
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
    property_name: 'Bent Ridge Winery Glamping',
    site_name: 'Geodesic Dome',
    is_open: 'Under Construction',
    planned_open_date: '2026-12-01',
    city: 'Windsor Forks',
    state: 'NS',
    zip_code: 'B0N 2T0',
    address: '4499 Highway 14',
    url: 'https://bentridgewinery.ca/',
    unit_type: 'Geodesic Dome',
    quantity_of_units: 4,
    property_total_sites: 4,
    lat: 44.9542,
    lon: -64.1321,
    description:
      'Bent Ridge Winery in Windsor Forks, Nova Scotia, received West Hants municipal approval in July 2025 to add four year-round geodesic glamping domes (about 26 feet in diameter, each with a full bathroom) on its vineyard and orchard property near Ski Martock. The agri-tourism expansion complements the existing winery, El Fuego restaurant, and wedding pavilion. Construction was cleared to begin after the development agreement was finalized with no appeals.',
  },
  {
    property_name: 'Garden Bay Hideaway',
    site_name: 'Safari Tent',
    is_open: 'Under Construction',
    planned_open_date: '2026-09-01',
    city: 'Garden Bay',
    state: 'BC',
    zip_code: 'V0N 1S1',
    address: '5163 Claydon Road',
    url: 'https://glamping15.godaddysites.com/',
    unit_type: 'Safari Tent',
    quantity_of_units: 1,
    property_total_sites: 7,
    lat: 49.6228,
    lon: -124.0312,
    description:
      'Garden Bay Hideaway is a family-owned glamping and RV property on the Sunshine Coast of British Columbia in Pender Harbour. The site already offers bunkie cabins, a park-model trailer, and serviced RV pads. A new 15-by-25-foot off-grid safari tent and an additional off-grid bunkie are under construction, per the operator’s 2026 site updates.',
  },
  {
    property_name: 'Garden Bay Hideaway',
    site_name: 'Bunkie',
    is_open: 'Under Construction',
    planned_open_date: '2026-09-01',
    city: 'Garden Bay',
    state: 'BC',
    zip_code: 'V0N 1S1',
    address: '5163 Claydon Road',
    url: 'https://glamping15.godaddysites.com/',
    unit_type: 'Cabin',
    quantity_of_units: 1,
    property_total_sites: 7,
    lat: 49.6228,
    lon: -124.0312,
    description:
      'Garden Bay Hideaway is a family-owned glamping and RV property on the Sunshine Coast of British Columbia in Pender Harbour. The site already offers bunkie cabins, a park-model trailer, and serviced RV pads. A new 15-by-25-foot off-grid safari tent and an additional off-grid bunkie are under construction, per the operator’s 2026 site updates.',
  },
  {
    property_name: 'Domaine des Constellations',
    site_name: 'Mirror Dome',
    is_open: 'Under Construction',
    planned_open_date: '2026-07-01',
    city: 'Lac-aux-Sables',
    state: 'QC',
    zip_code: 'G0X 3L0',
    url: 'https://domainedc.ca/en',
    unit_type: 'Geodesic Dome',
    quantity_of_units: 6,
    property_total_sites: 16,
    lat: 46.8667,
    lon: -72.2167,
    description:
      'Domaine des Constellations is a luxury glamping village on the Batiscan River near Lac-aux-Sables, Quebec. Phase 1 (five river-view domes and four mini-chalets) opened in 2025. Phase 2 — targeted for summer 2026 — is under construction around a new artificial lake, Lac des Perséides, and will add mirror domes, micro-chalets, a communal lakeside spa zone, and a dry Scandinavian sauna.',
  },
  {
    property_name: 'Domaine des Constellations',
    site_name: 'Micro Cabin',
    is_open: 'Under Construction',
    planned_open_date: '2026-07-01',
    city: 'Lac-aux-Sables',
    state: 'QC',
    zip_code: 'G0X 3L0',
    url: 'https://domainedc.ca/en',
    unit_type: 'Cabin',
    quantity_of_units: 4,
    property_total_sites: 16,
    lat: 46.8667,
    lon: -72.2167,
    description:
      'Domaine des Constellations is a luxury glamping village on the Batiscan River near Lac-aux-Sables, Quebec. Phase 1 (five river-view domes and four mini-chalets) opened in 2025. Phase 2 — targeted for summer 2026 — is under construction around a new artificial lake, Lac des Perséides, and will add mirror domes, micro-chalets, a communal lakeside spa zone, and a dry Scandinavian sauna.',
  },
  {
    property_name: 'Les Dômes du Parc',
    site_name: 'Geodesic Dome',
    is_open: 'Under Construction',
    planned_open_date: '2026-12-01',
    city: 'Saint-Mathieu-du-Parc',
    state: 'QC',
    zip_code: 'G0X 1N0',
    address: '70 Chemin des Cyprès',
    url: 'https://www.bonjourquebec.com/en/listing/accommodation/les-domes-du-parc/3lg6',
    phone_number: '819-532-2916',
    unit_type: 'Geodesic Dome',
    quantity_of_units: 6,
    property_total_sites: 6,
    lat: 46.6389,
    lon: -72.9167,
    description:
      'Les Dômes du Parc is a luxury geodesic dome glamping project in Saint-Mathieu-du-Parc, Quebec, one minute from Parc national de la Mauricie. Vicky-Eve Gélinas and Frédéric Vaillancourt opened the first domes in 2025 and are building out six total units (23-foot and 20-foot diameters) with private hot tubs, heated floors, and shared service buildings. Phase 2 (two additional domes and a second sanitary block) is under construction in 2026, with the final two domes planned for 2027.',
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
