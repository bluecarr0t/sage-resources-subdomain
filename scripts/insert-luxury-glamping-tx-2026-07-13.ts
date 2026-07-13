#!/usr/bin/env npx tsx
/**
 * Texas Luxury glamping pass (2026-07-13):
 * 1) Insert Missing Hotel (Marble Falls) as research_status = in_progress
 * 2) Manually re-tier existing TX properties to luxury
 *
 * Usage:
 *   npx tsx scripts/insert-luxury-glamping-tx-2026-07-13.ts --dry-run
 *   npx tsx scripts/insert-luxury-glamping-tx-2026-07-13.ts
 */
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_luxury_glamping_tx_2026_07_13';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');

const RETIER_NOTE =
  '[2026-07-13] Manual luxury re-tier (TX luxury research): ADR + amenity profile supports Luxury; confirm rates/amenities before relying on auto classifier.';

const RETIER_PROPERTIES = [
  'Lost Horizon',
  'Onera Fredericksburg',
  'Bespoke Outdoor Bubbles',
  'Treehouse Utopia',
] as const;

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

function baseRow(spec: InsertSpec, propertyId: string): Record<string, unknown> {
  return {
    property_name: spec.property_name,
    site_name: spec.site_name ?? null,
    slug: slugify(spec.property_name),
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
    address: spec.address ?? null,
    city: spec.city,
    state: spec.state,
    zip_code: spec.zip_code ?? null,
    lat: spec.lat ?? null,
    lon: spec.lon ?? null,
    url: spec.url,
    phone_number: spec.phone_number ?? null,
    description: spec.description,
    unit_type: spec.unit_type
      ? normalizeGlampingUnitTypeForStorage(spec.unit_type)
      : null,
    quantity_of_units:
      spec.quantity_of_units != null ? String(spec.quantity_of_units) : null,
    property_total_sites:
      spec.property_total_sites != null ? String(spec.property_total_sites) : null,
    glamping_service_tier: 'luxury',
    glamping_service_tier_source: 'manual',
    notes:
      spec.notes ??
      '[2026-07-13] Luxury TX discovery: verify rates, amenities, and exact coordinates before publishing.',
  };
}

/** Missing Hotel: 8 geodesic domes + 3 treetop villas (Michelin Guide). */
const NEW_PROPERTIES: InsertSpec[] = [
  {
    property_name: 'Missing Hotel',
    site_name: 'Geodesic Dome',
    city: 'Marble Falls',
    state: 'TX',
    zip_code: '78654',
    address: '11980 S FM 1174',
    url: 'https://www.missinghotel.com/',
    phone_number: '(512) 200-3530',
    unit_type: 'Geodesic Dome',
    quantity_of_units: 8,
    property_total_sites: 11,
    lat: 30.5782,
    lon: -98.2751,
    description:
      'MICHELIN Guide boutique glamping retreat on ~100 acres near Marble Falls in Texas Hill Country. Eleven shelters: eight geodesic / treetop domes (including Habibi, Sabi, Vagary, Morii, Luna cluster, Ukiyo) plus three modern treetop villas (Zephyr, Yoku, Rame). Units feature AC, private bathrooms, and private hot tubs or plunge pools; pet-friendly with nature trails.',
    notes:
      '[2026-07-13] Luxury TX discovery (Missing Hotel). Confirm published ARDR by unit type and amenity flags before publishing; currently in_progress for review.',
  },
  {
    property_name: 'Missing Hotel',
    site_name: 'Treetop Villa',
    city: 'Marble Falls',
    state: 'TX',
    zip_code: '78654',
    address: '11980 S FM 1174',
    url: 'https://www.missinghotel.com/',
    phone_number: '(512) 200-3530',
    unit_type: 'Cabin',
    quantity_of_units: 3,
    property_total_sites: 11,
    lat: 30.5782,
    lon: -98.2751,
    description:
      'MICHELIN Guide boutique glamping retreat on ~100 acres near Marble Falls in Texas Hill Country. Eleven shelters: eight geodesic / treetop domes (including Habibi, Sabi, Vagary, Morii, Luna cluster, Ukiyo) plus three modern treetop villas (Zephyr, Yoku, Rame). Units feature AC, private bathrooms, and private hot tubs or plunge pools; pet-friendly with nature trails.',
    notes:
      '[2026-07-13] Luxury TX discovery (Missing Hotel). Confirm published ARDR by unit type and amenity flags before publishing; currently in_progress for review.',
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

async function insertMissingHotel(): Promise<void> {
  console.log('\n=== Insert Missing Hotel ===');
  const head = NEW_PROPERTIES[0]!;
  if (await propertyExists(head.property_name, head.city, head.state)) {
    console.log(`SKIP ${head.property_name} (${head.city}, ${head.state}) — already exists`);
    return;
  }

  const propertyId = randomUUID();
  const rows = NEW_PROPERTIES.map((spec) => baseRow(spec, propertyId));
  console.log(`INSERT ${head.property_name} — ${rows.length} row(s)`);

  if (DRY_RUN) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const { error } = await supabase.from(TABLE).insert(rows);
  if (error) throw new Error(`Insert Missing Hotel: ${error.message}`);
}

async function retierExisting(): Promise<void> {
  console.log('\n=== Re-tier existing TX properties to luxury ===');

  for (const name of RETIER_PROPERTIES) {
    const { data: existing, error: selectError } = await supabase
      .from(TABLE)
      .select('id, notes, glamping_service_tier, url')
      .eq('state', 'TX')
      .eq('property_name', name);

    if (selectError) throw new Error(`Select ${name}: ${selectError.message}`);
    if (!existing?.length) {
      console.log(`SKIP ${name} — no TX rows found`);
      continue;
    }

    console.log(
      `RETIER ${name}: ${existing.length} row(s) ${existing[0]?.glamping_service_tier} → luxury (manual)`
    );

    if (DRY_RUN) continue;

    for (const row of existing) {
      const priorNotes = typeof row.notes === 'string' ? row.notes.trim() : '';
      const notes = priorNotes.includes('[2026-07-13] Manual luxury re-tier')
        ? priorNotes
        : [priorNotes, RETIER_NOTE].filter(Boolean).join('\n');

      const patch: Record<string, unknown> = {
        glamping_service_tier: 'luxury',
        glamping_service_tier_source: 'manual',
        date_updated: TODAY,
        notes,
      };

      // Fix bad secondary URL on Lost Horizon while re-tiering.
      if (name === 'Lost Horizon' && String(row.url || '').includes('travel2next')) {
        patch.url = 'https://losthorizontx.com/';
      }

      const { error } = await supabase.from(TABLE).update(patch).eq('id', row.id);
      if (error) throw new Error(`Update ${name} id=${row.id}: ${error.message}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}`);
  await insertMissingHotel();
  await retierExisting();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
