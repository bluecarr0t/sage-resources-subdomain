#!/usr/bin/env npx tsx
/**
 * Correct inflated Safari Tent unit counts from Jul 2026 audit:
 * reclassify wrong types, split mixed-inventory pipeline rows, clean Huttopia
 * stub SKUs, and mark Under Canvas Mancos cancelled.
 *
 * Usage:
 *   npx tsx scripts/apply-safari-tent-unit-mix-corrections-2026-07-08.ts
 *   npx tsx scripts/apply-safari-tent-unit-mix-corrections-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const RESEARCH_TAG = 'safari_tent_unit_mix_corrections_2026_07_08';
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
};

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  const marker = addition.slice(0, 48);
  if (base.includes(marker)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

const RESEARCH_NOTE =
  `${RESEARCH_TAG}: Split/reclassify safari tent inventory per Jul 2026 unit-mix audit (mixed pipeline rows, Huttopia SKU cleanup).`;

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

async function getAnchor(
  client: SupabaseClient,
  propertyName: string
): Promise<AnchorRow> {
  const { data, error } = await client
    .from(TABLE)
    .select(
      'id,property_name,property_id,slug,state,city,lat,lon,is_open,research_status,address,url,description,property_type,notes'
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
    country: 'United States',
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

async function insertSiblingIfMissing(
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
  const { data: existing } = await client
    .from(TABLE)
    .select('id')
    .eq('property_name', anchor.property_name)
    .eq('unit_type', unitType)
    .eq('site_name', spec.site_name)
    .maybeSingle();

  if (existing) {
    console.log(`SKIP ${label} — sibling already exists id=${existing.id}`);
    return;
  }

  await insertSibling(client, anchor, spec, label);
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

async function main(): Promise<void> {
  // 1. Ofland Twentynine Palms — cabin project mislabeled Safari Tent; drop Yonder duplicate
  await patchById(
    supabase,
    11469,
    {
      unit_type: 'Cabin',
      quantity_of_units: '100',
      property_total_sites: '100',
      notes: appendNote(
        (await supabase.from(TABLE).select('notes').eq('id', 11469).single()).data?.notes,
        `${RESEARCH_NOTE} Reclassified Safari Tent → Cabin (100-cabin Ofland/Yonder pipeline).`
      ),
      date_updated: TODAY,
    },
    'Ofland Twentynine Palms'
  );
  await deleteByIds(supabase, [12942], 'Yonder Twentynine Palms duplicate');

  // 2. Dream Away Lodge — 50 safari + 50 cabin
  await patchById(
    supabase,
    12991,
    {
      unit_type: 'Safari Tent',
      quantity_of_units: '50',
      property_total_sites: '100',
      notes: appendNote(
        (await supabase.from(TABLE).select('notes').eq('id', 12991).single()).data?.notes,
        `${RESEARCH_NOTE} Split 100-site cancelled proposal → 50 Safari Tent + 50 Cabin.`
      ),
      date_updated: TODAY,
    },
    'Dream Away Lodge safari row'
  );
  const dreamAway = await getAnchor(supabase, 'Dream Away Lodge Glamping Resort');
  await insertSiblingIfMissing(
    supabase,
    dreamAway,
    { site_name: 'Standalone cabin', unit_type: 'Cabin', quantity_of_units: 50, property_total_sites: 100 },
    'Dream Away Lodge cabin row'
  );

  // 3. The Grange Campground — 40 safari + 60 Airstream
  await patchById(
    supabase,
    12131,
    {
      unit_type: 'Safari Tent',
      quantity_of_units: '40',
      property_total_sites: '100',
      notes: appendNote(
        (await supabase.from(TABLE).select('notes').eq('id', 12131).single()).data?.notes,
        `${RESEARCH_NOTE} Split AutoCamp Napa / Grange plan → 40 Safari Tent + 60 Airstream.`
      ),
      date_updated: TODAY,
    },
    'The Grange Campground safari row'
  );
  const grange = await getAnchor(supabase, 'The Grange Campground');
  await insertSiblingIfMissing(
    supabase,
    grange,
    { site_name: 'Custom Airstream', unit_type: 'Airstream', quantity_of_units: 60, property_total_sites: 100 },
    'The Grange Campground airstream row'
  );

  // 4. Del Rio Ranch — 30 safari cabana + 25 cabin + 15 Airstream
  await patchById(
    supabase,
    9549,
    {
      quantity_of_units: '30',
      notes: appendNote(
        (await supabase.from(TABLE).select('notes').eq('id', 9549).single()).data?.notes,
        `${RESEARCH_NOTE} Safari cabana count corrected from 70 → 30 (master plan mix).`
      ),
      date_updated: TODAY,
    },
    'Del Rio Ranch safari cabana'
  );
  await patchById(
    supabase,
    9550,
    {
      quantity_of_units: '25',
      research_status: 'published',
      notes: RESEARCH_NOTE,
      date_updated: TODAY,
    },
    'Del Rio Ranch cabin'
  );
  await patchById(
    supabase,
    12988,
    {
      quantity_of_units: '15',
      research_status: 'published',
      notes: RESEARCH_NOTE,
      date_updated: TODAY,
    },
    'Del Rio Ranch airstream'
  );

  // 5. Riverbend Glamping Getaway — 20 safari + 20 wagon + 18 tiny home
  await patchById(
    supabase,
    12944,
    {
      unit_type: 'Safari Tent',
      quantity_of_units: '20',
      property_total_sites: '58',
      notes: appendNote(
        (await supabase.from(TABLE).select('notes').eq('id', 12944).single()).data?.notes,
        `${RESEARCH_NOTE} Split ~58-site plan → 20 Safari Tent + 20 Covered Wagon + 18 Tiny Home.`
      ),
      date_updated: TODAY,
    },
    'Riverbend safari row'
  );
  const riverbend = await getAnchor(supabase, 'Riverbend Glamping Getaway');
  await insertSiblingIfMissing(
    supabase,
    riverbend,
    { site_name: 'Conestoga wagon', unit_type: 'Covered Wagon', quantity_of_units: 20, property_total_sites: 58 },
    'Riverbend covered wagon row'
  );
  await insertSiblingIfMissing(
    supabase,
    riverbend,
    { site_name: 'Tiny home', unit_type: 'Tiny Home', quantity_of_units: 18, property_total_sites: 58 },
    'Riverbend tiny home row'
  );

  // 6. Terramor Wilmington — hard-sided tents → Cabin
  await patchById(
    supabase,
    12939,
    {
      unit_type: 'Cabin',
      quantity_of_units: '80',
      property_total_sites: '80',
      notes: appendNote(
        (await supabase.from(TABLE).select('notes').eq('id', 12939).single()).data?.notes,
        `${RESEARCH_NOTE} Reclassified ~80 hard-sided luxury tents Safari Tent → Cabin.`
      ),
      date_updated: TODAY,
    },
    'Terramor Outdoor Resort - Wilmington'
  );

  // 7. Wildhaven Lake Berryessa — keep 60 safari; add 40 cabins
  await patchById(
    supabase,
    11799,
    {
      quantity_of_units: '60',
      property_total_sites: '100',
      notes: appendNote(
        (await supabase.from(TABLE).select('notes').eq('id', 11799).single()).data?.notes,
        `${RESEARCH_NOTE} Master plan 60 glamping tents + 40 cabins (100 total).`
      ),
      date_updated: TODAY,
    },
    'Wildhaven Lake Berryessa safari row'
  );
  const wildhaven = await getAnchor(supabase, 'Wildhaven Lake Berryessa');
  await insertSiblingIfMissing(
    supabase,
    wildhaven,
    { site_name: 'Insulated cabin', unit_type: 'Cabin', quantity_of_units: 40, property_total_sites: 100 },
    'Wildhaven Lake Berryessa cabin row'
  );

  // 8. Under Canvas Mancos — withdrawn May 2025
  await patchById(
    supabase,
    12001,
    {
      is_open: 'Cancelled',
      cancelled_year: 2025,
      cancelled_reason: 'developer_withdrawal',
      cancelled_reason_notes:
        'Under Canvas Inc. withdrew its Montezuma County high-impact/special-use and planned unit development application on May 1, 2025 before a BOCC hearing, after Planning & Zoning recommended denial (March 13, 2025, 3–2) amid Protect Mancos opposition. Proposed ~75 luxury tent units on ag-residential land north of Mancos—application withdrawn, project abandoned.',
      description:
        'Under Canvas Mancos was a proposed seasonal luxury glamping resort on a 346-acre ag-residential parcel north of Highway 184 near Mancos, Colorado—not an operating property. Under Canvas sought permits for concentrated tent operations (~75 units). Montezuma County Planning & Zoning recommended denial in March 2025; Under Canvas withdrew the application May 1, 2025—the project will not proceed. Distinct from operating Under Canvas locations.',
      url: 'https://moderncampground.com/usa/colorado/under-canvas-faces-setback-in-bid-for-luxury-camping-development-in-mancos/',
      notes: appendNote(
        (await supabase.from(TABLE).select('notes').eq('id', 12001).single()).data?.notes,
        `${RESEARCH_TAG}: Marked Cancelled — application withdrawn May 1, 2025.`
      ),
      date_updated: TODAY,
    },
    'Under Canvas Mancos'
  );

  // 9. Huttopia Adirondacks — delete combo stubs; Trappeur 76 → 109 total canvas tents
  await deleteByIds(supabase, [10213, 10214], 'Huttopia Adirondacks combo stubs');
  await patchById(supabase, 10216, { quantity_of_units: '76', property_total_sites: '109', date_updated: TODAY }, 'Huttopia Adirondacks Trappeur');
  await patchPropertyRows(supabase, 'Huttopia Adirondacks', { property_total_sites: '109', date_updated: TODAY });

  // 10. Huttopia Southern Maine — delete stubs; consolidate Vista to 24
  await deleteByIds(supabase, [9968, 10145, 10146, 10147], 'Huttopia Southern Maine stubs');
  await patchById(supabase, 9969, { site_name: 'Vista Tiny House', quantity_of_units: '24', property_total_sites: '108', date_updated: TODAY }, 'Huttopia Southern Maine Vista');
  await patchPropertyRows(supabase, 'Huttopia Southern Maine', { property_total_sites: '108', date_updated: TODAY });

  // 11. Huttopia White Mountains — Vista is Tiny Home (hard-sided SKUs already in trapper/canadienne counts)
  await patchById(
    supabase,
    10494,
    { unit_type: 'Tiny Home', site_name: 'Vista Tiny House', date_updated: TODAY },
    'Huttopia White Mountains Vista'
  );

  console.log(DRY_RUN ? '\nDry run complete.' : '\nSafari tent unit-mix corrections applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
