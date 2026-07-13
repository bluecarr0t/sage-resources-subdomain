#!/usr/bin/env npx tsx
/**
 * Insert verified USA Jupe properties into all_sage_data.
 * research_status = in_progress.
 *
 * Usage:
 *   npx tsx scripts/insert-jupe-us-2026-07-13.ts --dry-run
 *   npx tsx scripts/insert-jupe-us-2026-07-13.ts
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const DISCOVERY_SOURCE = 'web_research_jupe_us_2026_07_13';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-jupe-review');
const CANONICAL = normalizeGlampingUnitTypeForStorage('Jupe') ?? 'Jupe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
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
    throw new Error(`${spec.property_name}: url required`);
  }
  if (!city) throw new Error(`${spec.property_name}: city required`);
  if (!/^[A-Z]{2}$/.test(state)) {
    throw new Error(`${spec.property_name}: 2-letter state required`);
  }
  return { ...spec, url, city, state };
}

function baseRow(spec: InsertSpec, propertyId: string): Record<string, unknown> {
  const gated = assertRequired(spec);
  return {
    property_name: gated.property_name,
    site_name: gated.site_name ?? 'Jupe',
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
    unit_type: normalizeGlampingUnitTypeForStorage(
      gated.unit_type ?? CANONICAL
    ),
    quantity_of_units:
      gated.quantity_of_units != null ? String(gated.quantity_of_units) : null,
    property_total_sites:
      gated.property_total_sites != null
        ? String(gated.property_total_sites)
        : null,
    notes:
      gated.notes ??
      `[${TODAY}] Jupe US discovery: verify rates and coordinates before publishing.`,
  };
}

/** Verified USA Jupe partner properties (web research 2026-07-13). */
const NEW_PROPERTIES: InsertSpec[] = [
  {
    property_name: 'Highland Ranch',
    site_name: 'Jupe Tent',
    city: 'Kalispell',
    state: 'MT',
    zip_code: '59901',
    address: '2753 Helena Flats Rd',
    url: 'https://www.highlandranch.com/accommodations/jupe-tent',
    unit_type: 'Jupe',
    quantity_of_units: 10,
    property_total_sites: 10,
    description:
      'Design-forward glamping retreat on 80 acres in Montana’s Flathead Valley near Glacier National Park / Kalispell. Signature solar-powered Jupe tents (on-grid and off-grid) with queen beds, heating/AC, and private decks; also offers mirrored ÖÖD cabins and other unique structures. Jupe case study cites 10 units and strong first-season occupancy.',
    notes:
      '[2026-07-13] Verified Jupe product on highlandranch.com + jupe.com case study (10 units). Confirm Whitefish vs Kalispell marketing pin before publishing.',
  },
  {
    property_name: 'Indian Flat Campground',
    site_name: 'Jupe Tent',
    city: 'El Portal',
    state: 'CA',
    zip_code: '95318',
    address: '9988 State Highway 140',
    phone_number: '(209) 379-2339',
    url: 'https://yosemiteresorts.com/indian-flat/',
    unit_type: 'Jupe',
    quantity_of_units: 6,
    property_total_sites: 6,
    description:
      'Closest private campground to Yosemite’s Arch Rock / Hwy 140 entrance (El Portal). Offers branded Jupe tents with 12-ft ceilings, queen beds, A/C, solar USB charging, and LED lighting, plus RV/tent sites and tent cabins. Booked via yosemiteresorts.com and Hipcamp (multiple Jupe site IDs).',
    notes:
      '[2026-07-13] Verified Jupe tents on yosemiteresorts.com + Hipcamp (J-3–J-8). Confirm exact live count before publishing.',
  },
  {
    property_name: 'Grand Lake Lodge',
    site_name: 'Jupe',
    city: 'Grand Lake',
    state: 'CO',
    zip_code: '80447',
    address: '15500 U.S. 34',
    url: 'https://www.grandlakelodge.com/',
    unit_type: 'Jupe',
    quantity_of_units: 4,
    property_total_sites: 4,
    description:
      'Historic lodge at Grand Lake, CO near Rocky Mountain National Park’s west entrance. In addition to Sears Roebuck cabins, the lodge offers modern lake-view Jupe glamping units with queen mattresses, solar/USB charging, and cantilevered porches. Covered by Colorado Expression and Condé Nast Traveler park guides.',
    notes:
      '[2026-07-13] Verified Jupe product via Colorado Expression + Condé Nast / Booking reviews. Confirm current seasonal availability and exact count on grandlakelodge.com before publishing.',
  },
];

async function propertyExists(
  name: string,
  city: string,
  state: string
): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .eq('city', city)
    .eq('state', state)
    .limit(1);
  return Boolean(data?.length);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}\n`);

  const sqlLines: string[] = [
    `-- USA Jupe curated inserts (${TODAY})`,
    `-- discovery_source: ${DISCOVERY_SOURCE}`,
    `-- Applied via scripts/insert-jupe-us-2026-07-13.ts`,
    '',
  ];

  let inserted = 0;
  let skipped = 0;

  for (const spec of NEW_PROPERTIES) {
    const gated = assertRequired(spec);
    if (await propertyExists(gated.property_name, gated.city, gated.state)) {
      console.log(
        `SKIP ${gated.property_name} (${gated.city}, ${gated.state}) — already exists`
      );
      skipped += 1;
      continue;
    }
    const propertyId = randomUUID();
    const row = baseRow(gated, propertyId);
    console.log(
      `INSERT ${gated.property_name} (${gated.city}, ${gated.state}) qty=${gated.quantity_of_units ?? '?'}`
    );
    sqlLines.push(
      `-- INSERT ${gated.property_name} (${gated.city}, ${gated.state}) property_id=${propertyId}`
    );
    inserted += 1;
    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
    } else {
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) throw new Error(`Insert ${gated.property_name}: ${error.message}`);
    }
  }

  const sqlPath = join(OUT_DIR, `insert-jupe-us-${TODAY}.sql`);
  writeFileSync(sqlPath, sqlLines.join('\n') + '\n', 'utf-8');
  const migrationPath = resolve(
    process.cwd(),
    `scripts/migrations/insert-jupe-us-${TODAY}.sql`
  );
  writeFileSync(
    migrationPath,
    [
      `-- USA Jupe curated inserts (${TODAY})`,
      `-- discovery_source: ${DISCOVERY_SOURCE}`,
      `-- Rows applied via TypeScript insert script.`,
      `-- Net-new properties in script: ${NEW_PROPERTIES.length}`,
      '',
      ...sqlLines,
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(
    `\nSummary: inserted=${inserted}, skipped=${skipped} (${DRY_RUN ? 'would be' : 'were'} applied)`
  );
  console.log(`SQL log: ${sqlPath}`);
  console.log(`Migration: ${migrationPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
