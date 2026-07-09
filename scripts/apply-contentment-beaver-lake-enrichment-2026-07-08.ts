#!/usr/bin/env npx tsx
/**
 * Enrich Contentment on Beaver Lake (all_sage_data) with Benton County approved
 * site plan details: acreage, unit mix, amenities, and management.
 *
 * Usage:
 *   npx tsx scripts/apply-contentment-beaver-lake-enrichment-2026-07-08.ts
 *   npx tsx scripts/apply-contentment-beaver-lake-enrichment-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const PROPERTY_NAME = 'Contentment on Beaver Lake';
const RESEARCH_TAG = 'contentment_beaver_lake_site_plan_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DESCRIPTION = `Contentment on Beaver Lake is a planned luxury glamping resort on roughly 209 acres along the north shore of Beaver Lake in Benton County, Arkansas—about 8.5 miles southeast of Rogers and less than two miles across the water from Hickory Creek Park. Benton County Planning Board unanimously approved the engineered site plan (case 24-036, March 2024) for 12200 Shockley Place Road. Planned accommodations include 40 luxury glamping tents and 12 custom covered wagons (52 guest units total). Wellness and recreation amenities include a swimming pool, dedicated spa, two pickleball courts with viewing area, kayak rental and storage, and a heavy timber-frame pavilion built from reclaimed barn wood. The "Base Camp" hub will house a general shop, fitness room, staff offices, and an indoor activity room. Slated to be managed by AOS, a premier national resort management firm. Subject to fire-marshal sign-off; local litigation and neighbor opposition reported in 2024–2025—verify construction progress and opening before publishing rates.`;

const ADDRESS =
  '12200 Shockley Place Road, north shore Beaver Lake, Benton County, AR (209 acres; ~8.5 mi SE of Rogers)';

const AMENITIES_RAW =
  'Approved site plan (Benton County 24-036): 209-acre north-shore Beaver Lake parcel; 40 luxury glamping tents + 12 custom covered wagons; swimming pool; spa; 2 pickleball courts w/ viewing area; Base Camp (general shop, fitness room, staff offices, indoor activity room); kayak rental/storage; reclaimed-barn-wood timber pavilion; AOS resort management.';

const SHARED_AMENITY_PATCH = {
  property_pool: 'Yes',
  property_sauna: 'Yes',
  property_pickball_courts: 'Yes',
  property_general_store: 'Yes',
  property_fitness_room: 'Yes',
  property_waterfront: 'Yes',
  property_has_rentals: 'Yes',
  activities_swimming: 'Yes',
  activities_canoeing_kayaking: 'Yes',
  activities_hiking: 'Yes',
  activities_boating: 'Yes',
  activities_fishing: 'Yes',
  setting_lake: 'Yes',
  setting_forest: 'Yes',
  amenities_raw: AMENITIES_RAW,
};

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  const marker = addition.slice(0, 48);
  if (base.includes(marker)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

async function main(): Promise<void> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id,property_name,site_name,unit_type,quantity_of_units,property_total_sites,notes,property_id,slug')
    .eq('property_name', PROPERTY_NAME)
    .order('id');

  if (error) throw new Error(error.message);
  if (!rows?.length) throw new Error(`No rows found for ${PROPERTY_NAME}`);

  const anchor = rows[0]!;
  const propertyId = anchor.property_id;
  const slug = anchor.slug ?? 'contentment-on-beaver-lake-rogers-ar';
  const researchNote = `${RESEARCH_TAG}: Benton County approved site plan — 209 acres, 40 luxury glamping tents + 12 covered wagons, pool/spa/pickleball/Base Camp/kayak pavilion; AOS management.`;

  const tentRow = rows.find((r) => r.unit_type === 'Safari Tent') ?? anchor;
  const wagonRow = rows.find((r) => r.unit_type === 'Covered Wagon');

  const tentPatch = {
    ...SHARED_AMENITY_PATCH,
    site_name: 'Luxury glamping tent',
    property_type: 'Glamping Resort',
    address: ADDRESS,
    url: 'https://beaverlakeglamping.com/',
    description: DESCRIPTION,
    quantity_of_units: '40',
    property_total_sites: '52',
    date_updated: TODAY,
    notes: appendNote(tentRow.notes, researchNote),
  };

  console.log(`PATCH Safari Tent row id=${tentRow.id}`, JSON.stringify(tentPatch, null, 2));
  if (!DRY_RUN) {
    const { error: tentError } = await supabase
      .from(TABLE)
      .update(tentPatch)
      .eq('id', tentRow.id);
    if (tentError) throw new Error(`Tent row update: ${tentError.message}`);
  }

  if (wagonRow) {
    const wagonPatch = {
      ...SHARED_AMENITY_PATCH,
      site_name: 'Custom covered wagon',
      property_type: 'Glamping Resort',
      address: ADDRESS,
      url: 'https://beaverlakeglamping.com/',
      description: DESCRIPTION,
      quantity_of_units: '12',
      property_total_sites: '52',
      date_updated: TODAY,
      notes: appendNote(wagonRow.notes, researchNote),
    };
    console.log(`PATCH Covered Wagon row id=${wagonRow.id}`, JSON.stringify(wagonPatch, null, 2));
    if (!DRY_RUN) {
      const { error: wagonError } = await supabase
        .from(TABLE)
        .update(wagonPatch)
        .eq('id', wagonRow.id);
      if (wagonError) throw new Error(`Wagon row update: ${wagonError.message}`);
    }
  } else {
    const insertRow = {
      research_status: 'in_progress',
      is_glamping_property: 'Yes',
      is_open: 'Proposed Development',
      property_name: PROPERTY_NAME,
      site_name: 'Custom covered wagon',
      slug,
      property_id: propertyId,
      property_type: 'Glamping Resort',
      unit_type: normalizeGlampingUnitTypeForStorage('Covered Wagon'),
      source: 'Sage',
      discovery_source: RESEARCH_TAG,
      country: 'United States',
      state: 'AR',
      city: 'Rogers',
      address: ADDRESS,
      lat: 36.331,
      lon: -94.119,
      url: 'https://beaverlakeglamping.com/',
      description: DESCRIPTION,
      quantity_of_units: '12',
      property_total_sites: '52',
      date_added: TODAY,
      date_updated: TODAY,
      land_operator_category: 'private_commercial',
      notes: researchNote,
      ...SHARED_AMENITY_PATCH,
    };
    console.log('INSERT Covered Wagon sibling row', JSON.stringify(insertRow, null, 2));
    if (!DRY_RUN) {
      const { error: insertError } = await supabase.from(TABLE).insert(insertRow);
      if (insertError) throw new Error(`Wagon row insert: ${insertError.message}`);
    }
  }

  // Align any other sibling rows with shared property-level fields.
  const siblingIds = rows
    .map((r) => r.id)
    .filter((id) => id !== tentRow.id && id !== wagonRow?.id);
  if (siblingIds.length > 0) {
    const siblingPatch = {
      address: ADDRESS,
      url: 'https://beaverlakeglamping.com/',
      description: DESCRIPTION,
      property_total_sites: '52',
      date_updated: TODAY,
      ...SHARED_AMENITY_PATCH,
    };
    console.log(`PATCH ${siblingIds.length} other sibling row(s)`, siblingIds);
    if (!DRY_RUN) {
      const { error: siblingError } = await supabase
        .from(TABLE)
        .update(siblingPatch)
        .in('id', siblingIds);
      if (siblingError) throw new Error(`Sibling update: ${siblingError.message}`);
    }
  }

  console.log(DRY_RUN ? '\nDry run complete.' : '\nContentment on Beaver Lake enrichment applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
