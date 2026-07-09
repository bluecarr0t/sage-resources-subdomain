#!/usr/bin/env npx tsx
/**
 * Round 2 Safari Tent unit-mix corrections (Jul 2026 audit):
 * Collective Governors Island legacy SKU cleanup, Zmar reclassify,
 * UC Lake Powell duplicate removal, UC Columbia/North Yellowstone counts,
 * null stub deletes.
 *
 * Usage:
 *   npx tsx scripts/apply-safari-tent-unit-mix-corrections-round2-2026-07-08.ts
 *   npx tsx scripts/apply-safari-tent-unit-mix-corrections-round2-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const RESEARCH_TAG = 'safari_tent_unit_mix_corrections_round2_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type AnchorRow = {
  id: number;
  property_name: string;
  property_id: string | null;
  slug: string | null;
  state: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  is_open: string | null;
  research_status: string | null;
  address: string | null;
  url: string | null;
  description: string | null;
  property_type: string | null;
  notes: string | null;
  country?: string | null;
};

const RESEARCH_NOTE = `${RESEARCH_TAG}: Jul 2026 safari tent unit-mix audit round 2.`;

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  const marker = addition.slice(0, 48);
  if (base.includes(marker)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

async function patchById(
  client: SupabaseClient,
  id: number,
  patch: Record<string, unknown>,
  label: string
): Promise<void> {
  console.log(`PATCH ${label} id=${id}`, JSON.stringify(patch, null, 2));
  if (DRY_RUN) return;
  const { error } = await client.from(TABLE).update(patch).eq('id', id);
  if (error) throw new Error(`${label} id=${id}: ${error.message}`);
}

async function deleteByIds(client: SupabaseClient, ids: number[], label: string): Promise<void> {
  console.log(`DELETE ${label} ids=${ids.join(',')}`);
  if (DRY_RUN) return;
  const { error } = await client.from(TABLE).delete().in('id', ids);
  if (error) throw new Error(`${label} delete: ${error.message}`);
}

async function patchPropertyRows(
  client: SupabaseClient,
  propertyName: string,
  patch: Record<string, unknown>
): Promise<void> {
  console.log(`PATCH all rows ${propertyName}`, JSON.stringify(patch, null, 2));
  if (DRY_RUN) return;
  const { error } = await client.from(TABLE).update(patch).eq('property_name', propertyName);
  if (error) throw new Error(`${propertyName} bulk patch: ${error.message}`);
}

async function getAnchor(client: SupabaseClient, propertyName: string): Promise<AnchorRow> {
  const { data, error } = await client
    .from(TABLE)
    .select(
      'id,property_name,property_id,slug,state,city,lat,lon,is_open,research_status,address,url,description,property_type,notes,country'
    )
    .eq('property_name', propertyName)
    .order('id')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`${propertyName}: ${error.message}`);
  if (!data) throw new Error(`No rows for ${propertyName}`);
  return data as AnchorRow;
}

async function insertSibling(
  client: SupabaseClient,
  anchor: AnchorRow,
  spec: {
    site_name: string;
    unit_type: string;
    quantity_of_units: number;
    property_total_sites?: number;
  },
  label: string
): Promise<void> {
  const unitType = normalizeGlampingUnitTypeForStorage(spec.unit_type);
  const row = {
    research_status: anchor.research_status ?? 'published',
    is_glamping_property: 'Yes',
    is_open: anchor.is_open,
    property_name: anchor.property_name,
    site_name: spec.site_name,
    slug: anchor.slug,
    property_id: anchor.property_id,
    property_type: anchor.property_type ?? 'Glamping Resort',
    unit_type: unitType,
    source: 'Sage',
    discovery_source: RESEARCH_TAG,
    country: anchor.country ?? 'United States',
    state: anchor.state,
    city: anchor.city,
    address: anchor.address,
    lat: anchor.lat,
    lon: anchor.lon,
    url: anchor.url,
    description: anchor.description,
    quantity_of_units: String(spec.quantity_of_units),
    property_total_sites: String(spec.property_total_sites ?? spec.quantity_of_units),
    date_added: TODAY,
    date_updated: TODAY,
    land_operator_category: 'private_commercial',
    notes: RESEARCH_NOTE,
  };

  console.log(`INSERT ${label}`, JSON.stringify(row, null, 2));
  if (DRY_RUN) return;
  const { error } = await client.from(TABLE).insert(row);
  if (error) throw new Error(`${label} insert: ${error.message}`);
}

async function main(): Promise<void> {
  // 1. Collective Retreats Governors Island — 29 units (2025 season product mix)
  const collectiveAnchor = await getAnchor(supabase, 'Collective Retreats Governors Island');
  const collectiveDeleteIds = [9508, 9509, 10017, 10201, 10202];
  await deleteByIds(supabase, collectiveDeleteIds, 'Collective Governors Island legacy rows');

  const collectiveDescription =
    'Collective Governors Island is a seasonal glamping retreat on Governors Island, NY—29 immersive accommodations (Journey, Voyager, and Basecamp product tiers) an eight-minute ferry from Manhattan. Distinct from legacy Collective inventory rows removed in Jul 2026 unit-mix audit.';

  const collectiveBase = { ...collectiveAnchor, description: collectiveDescription };

  await insertSibling(
    supabase,
    { ...collectiveBase },
    { site_name: 'Journey Tent', unit_type: 'Safari Tent', quantity_of_units: 15, property_total_sites: 29 },
    'Collective Journey Tent'
  );
  await insertSibling(
    supabase,
    { ...collectiveBase },
    { site_name: 'Voyager Tent', unit_type: 'Safari Tent', quantity_of_units: 10, property_total_sites: 29 },
    'Collective Voyager Tent'
  );
  await insertSibling(
    supabase,
    { ...collectiveBase },
    { site_name: 'Basecamp Cabin', unit_type: 'Cabin', quantity_of_units: 4, property_total_sites: 29 },
    'Collective Basecamp Cabin'
  );

  // 2. Zmar Eco Experience — eco-camping resort, not safari tent inventory
  const { data: zmar } = await supabase.from(TABLE).select('notes').eq('id', 11164).single();
  await patchById(
    supabase,
    11164,
    {
      site_name: 'Wooden bungalow (portfolio)',
      unit_type: 'Cabin',
      quantity_of_units: null,
      property_total_sites: '81',
      is_glamping_property: 'No',
      property_type: 'Campground',
      research_status: 'in_progress',
      description:
        'Zmar Eco Experience is an 81-hectare eco-camping resort in Odemira, Alentejo, Portugal—wooden bungalows, villas, and tent pitches near Zambujeira do Mar, not a luxury safari-tent glamping lodge. Distinct from canvas safari inventory; per-SKU bungalow counts TBD.',
      notes: appendNote(
        zmar?.notes,
        `${RESEARCH_NOTE} Reclassified Safari Tent × 50 → Campground / wooden bungalow portfolio (not safari tent supply).`
      ),
      date_updated: TODAY,
    },
    'Zmar Eco Experience'
  );

  // 3. Under Canvas Lake Powell duplicate + canonical rename
  await deleteByIds(supabase, [12972], 'Under Canvas Lake Powell – Grand Staircase duplicate');

  await patchPropertyRows(supabase, 'Under Canvas Lake Powell', {
    property_name: 'Under Canvas Lake Powell – Grand Staircase',
    slug: 'under-canvas-lake-powell-grand-staircase',
    property_total_sites: '51',
    date_updated: TODAY,
  });

  // 4. Under Canvas Columbia River Gorge — 35 → 50 (UC 2026 fact sheet)
  const crgQty: Record<number, number> = {
    10628: 7, // Mount Hood Suite
    10629: 7,
    10630: 7,
    10631: 7,
    10632: 7,
    10633: 7,
    10634: 8, // Deluxe tent
  };
  for (const [id, qty] of Object.entries(crgQty)) {
    await patchById(
      supabase,
      Number(id),
      { quantity_of_units: String(qty), property_total_sites: '50', date_updated: TODAY },
      'UC Columbia River Gorge SKU'
    );
  }

  // 5. Under Canvas North Yellowstone — 49 → 60 (UC 2026 fact sheet)
  const nyQty: Record<number, number> = {
    10587: 10, // Yellowstone River Suite (premium)
    10588: 8,
    10589: 8,
    10590: 9,
    10591: 8,
    10592: 9,
    10593: 8,
  };
  for (const [id, qty] of Object.entries(nyQty)) {
    await patchById(
      supabase,
      Number(id),
      { quantity_of_units: String(qty), property_total_sites: '60', date_updated: TODAY },
      'UC North Yellowstone SKU'
    );
  }

  // 6. Delete null-qty safari stubs (SUM unchanged; removes MAX-dedupe noise)
  await deleteByIds(supabase, [9553, 9737, 9736], 'null safari stub rows');

  console.log(DRY_RUN ? '\nDry run complete.' : '\nSafari tent unit-mix corrections round 2 applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
