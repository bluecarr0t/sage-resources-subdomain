#!/usr/bin/env npx tsx
/**
 * Apply pipeline research follow-ups (2026-06-15):
 * - Insert 4 missing USA glamping properties
 * - Reclassify PA Timberline state-park rows to Under Construction (spring 2026)
 * - Remove duplicate Hinata Retreat; enrich Hinata Mountainside Resort
 *
 * Usage:
 *   npx tsx scripts/apply-pipeline-research-2026-06-15.ts
 *   npx tsx scripts/apply-pipeline-research-2026-06-15.ts --dry-run
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'pipeline_research_2026_06_15';
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
  property_id?: string;
};

function baseRow(spec: InsertSpec, propertyId: string): Record<string, unknown> {
  return {
    property_name: spec.property_name,
    site_name: spec.site_name ?? null,
    slug: slugify(spec.property_name),
    property_id: propertyId,
    property_type: spec.property_type ?? 'Glamping Resort',
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
    property_name: 'Arbor Camp',
    site_name: 'Treehouse',
    is_open: 'Yes',
    city: 'Ellsworth',
    state: 'ME',
    zip_code: '04605',
    url: 'https://arborcamp.com/',
    unit_type: 'Treehouse',
    quantity_of_units: 9,
    property_total_sites: 11,
    lat: 44.4937,
    lon: -68.4466,
    description:
      'Arbor Camp is a collection of architect-designed treehouses and riverside cabins on 30 private acres along the Union River near Ellsworth, Maine, roughly 30 minutes from Acadia National Park. Eleven dwellings are bookable today (nine treehouses and two cabins), with a master plan of 17 units. Each stay includes private hot tubs, kitchens, and forest trails.',
  },
  {
    property_name: 'Arbor Camp',
    site_name: 'Cabin',
    is_open: 'Yes',
    city: 'Ellsworth',
    state: 'ME',
    zip_code: '04605',
    url: 'https://arborcamp.com/',
    unit_type: 'Cabin',
    quantity_of_units: 2,
    property_total_sites: 11,
    lat: 44.4937,
    lon: -68.4466,
    description:
      'Arbor Camp is a collection of architect-designed treehouses and riverside cabins on 30 private acres along the Union River near Ellsworth, Maine, roughly 30 minutes from Acadia National Park. Eleven dwellings are bookable today (nine treehouses and two cabins), with a master plan of 17 units. Each stay includes private hot tubs, kitchens, and forest trails.',
  },
  {
    property_name: 'The Ridge Outdoor Resort',
    site_name: 'Canvas Tent',
    is_open: 'Yes',
    city: 'Sevierville',
    state: 'TN',
    zip_code: '37862',
    address: '1250 Middle Creek Road',
    url: 'https://theridgeoutdoorresort.com/luxury-tent-glamping/',
    phone_number: '865-505-3111',
    unit_type: 'Safari Tent',
    quantity_of_units: 8,
    lat: 35.8384,
    lon: -83.5088,
    description:
      'The Ridge Outdoor Resort is an upscale outdoor resort in Sevierville, Tennessee, about three miles from Dollywood and the Great Smoky Mountains gateway. It operates eight luxury canvas glamping tents with private bathrooms, kitchenettes, and resort amenities, alongside tiny-home glamping cabins and premium RV sites. The operator has teased additional glamping inventory opening in April 2026.',
  },
  {
    property_name: 'Grass Valley RV Resort',
    site_name: 'Glamping',
    is_open: 'Proposed Development',
    city: 'Grass Valley',
    state: 'CA',
    zip_code: '95945',
    url: 'https://gvrvresort.com/',
    unit_type: 'Cabin',
    quantity_of_units: 15,
    property_total_sites: 162,
    lat: 39.2191,
    lon: -121.061,
    description:
      'Grass Valley RV Resort is a new luxury RV resort in Grass Valley, California, with 148 paved full-hookup sites and resort amenities including a heated pool, hot tub, and clubhouse. A municipal annexation and planning package also proposes 15 on-site glamping accommodations as part of the phased outdoor-hospitality buildout.',
  },
  {
    property_name: 'Afton Glamping Site',
    is_open: 'Proposed Development',
    city: 'Afton',
    state: 'NY',
    zip_code: '13730',
    unit_type: 'Safari Tent',
    quantity_of_units: 3,
    lat: 42.2281,
    lon: -75.5252,
    description:
      'A small-scale glamping proposal in the Town of Afton, Chenango County, New York, led by developer Bushra Umbreen. The scaled-back plan calls for no more than three sites operating at once, enforced quiet hours, no on-site events, and local contractor hiring. The project was under planning review in 2025 with town supervisor support.',
  },
];

const TIMBERLINE_PA_UPDATES: { property_name: string; planned_open_date: string }[] = [
  { property_name: 'Timberline Glamping at French Creek', planned_open_date: '2026-03-06' },
  { property_name: 'Timberline Glamping at Codorus', planned_open_date: '2026-04-10' },
  { property_name: 'Timberline Glamping at Hickory Run', planned_open_date: '2026-04-10' },
  { property_name: 'Timberline Glamping at Laurel Hill', planned_open_date: '2026-04-10' },
  { property_name: 'Timberline Glamping at Pymatuning', planned_open_date: '2026-04-10' },
  { property_name: 'Timberline Glamping at Hills Creek', planned_open_date: '2026-05-01' },
  { property_name: 'Timberline Glamping at Promised Land', planned_open_date: '2026-05-01' },
];

const HINATA_RETREAT_DUPLICATE_ID = 12886;
const HINATA_MOUNTAINSIDE_ID = 12947;

async function propertyExists(name: string): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .limit(1);
  return Boolean(data?.length);
}

async function insertNewProperties(): Promise<void> {
  console.log('\n=== Insert new properties ===');

  const grouped = new Map<string, InsertSpec[]>();
  for (const spec of NEW_PROPERTIES) {
    const list = grouped.get(spec.property_name) ?? [];
    list.push(spec);
    grouped.set(spec.property_name, list);
  }

  for (const [name, specs] of grouped) {
    if (await propertyExists(name)) {
      console.log(`SKIP ${name} — already exists`);
      continue;
    }

    const propertyId = randomUUID();
    const rows = specs.map((spec) => baseRow(spec, propertyId));

    console.log(`INSERT ${name} (${rows.length} row(s))`);
    if (DRY_RUN) {
      console.log(JSON.stringify(rows, null, 2));
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(rows);
    if (error) throw new Error(`Insert ${name}: ${error.message}`);
  }
}

async function updateTimberlinePa(): Promise<void> {
  console.log('\n=== Update Timberline PA state-park rows ===');

  for (const { property_name, planned_open_date } of TIMBERLINE_PA_UPDATES) {
    const patch = {
      is_open: 'Under Construction',
      planned_open_date,
      date_updated: TODAY,
    };

    const { data: existing } = await supabase
      .from(TABLE)
      .select('id,is_open,planned_open_date')
      .eq('property_name', property_name)
      .eq('state', 'PA');

    if (!existing?.length) {
      console.warn(`  WARN: no rows found for ${property_name}`);
      continue;
    }

    const alreadySet = existing.every(
      (row) =>
        row.is_open === 'Under Construction' &&
        row.planned_open_date === planned_open_date
    );
    if (alreadySet) {
      console.log(`SKIP ${property_name} — already Under Construction (${planned_open_date})`);
      continue;
    }

    console.log(`PATCH ${property_name} → Under Construction (${planned_open_date})`);
    if (DRY_RUN) continue;

    const { error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('property_name', property_name)
      .eq('state', 'PA');

    if (error) throw new Error(`Update ${property_name}: ${error.message}`);
  }
}

async function fixHinataDuplicates(): Promise<void> {
  console.log('\n=== Hinata duplicate audit ===');

  const hinataPatch = {
    property_name: 'Hinata Mountainside Resort',
    is_open: 'Proposed Development',
    address: '133 Warfield Road',
    city: 'Charlemont',
    state: 'MA',
    zip_code: '01339',
    url: 'https://charlemont-ma.us/files/Final_Application_Hinata_at_Warfield.pdf',
    unit_type: normalizeGlampingUnitTypeForStorage('Cabin'),
    quantity_of_units: '32',
    property_total_sites: '32',
    description:
      'Hinata Mountainside Resort is a proposed transformation of the Warfield House Inn on 473 acres in Charlemont, Massachusetts, near Berkshire East and the Mohawk Trail. Developers Jeffrey and Jennifer Neilsen plan 32 deluxe glamping cabins (~500 sq ft) on roughly 31 developed acres, plus a scaled restaurant and resort amenities. The project has been before the Charlemont Planning Board with community debate over traffic, lighting, and sewer capacity.',
    date_updated: TODAY,
    discovery_source: DISCOVERY_SOURCE,
  };

  console.log(`UPDATE id=${HINATA_MOUNTAINSIDE_ID} Hinata Mountainside Resort`);
  if (!DRY_RUN) {
    const { error } = await supabase
      .from(TABLE)
      .update(hinataPatch)
      .eq('id', HINATA_MOUNTAINSIDE_ID);
    if (error) throw new Error(`Update Hinata Mountainside: ${error.message}`);
  } else {
    console.log(JSON.stringify(hinataPatch, null, 2));
  }

  console.log(`DELETE id=${HINATA_RETREAT_DUPLICATE_ID} Hinata Retreat (duplicate)`);
  if (!DRY_RUN) {
    const { error } = await supabase.from(TABLE).delete().eq('id', HINATA_RETREAT_DUPLICATE_ID);
    if (error) throw new Error(`Delete Hinata Retreat: ${error.message}`);
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  await insertNewProperties();
  await updateTimberlinePa();
  await fixHinataDuplicates();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
