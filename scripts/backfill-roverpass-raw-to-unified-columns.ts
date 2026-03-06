/**
 * Backfill property_*, activities_*, setting_*, rv_*, unit_* columns in all_roverpass_data_new
 * by parsing amenities_raw, activities_raw, and lifestyle_raw.
 *
 * No new columns created. Only populates existing unified schema columns.
 *
 * Usage: npx tsx scripts/backfill-roverpass-raw-to-unified-columns.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const TABLE_NAME = 'all_roverpass_data_new';

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

// amenities_raw -> unified schema columns (expanded mappings only)
const AMENITY_MAP: Record<string, string> = {
  'Back-in RV Sites': 'rv_parking',
  'Pull-Thru RV Sites': 'rv_parking',
  'RV Hookup': 'rv_parking',
  'Big Rig Friendly': 'rv_vehicle_length',
  'Slide Outs': 'rv_accommodates_slideout',
  'Gravel Roads': 'rv_surface_type',
  'Paved Roads': 'rv_surface_type',
  'Dirt Roads': 'rv_surface_type',
  'ADA Accessible': 'unit_ada_accessibility',
  'Gasoline Nearby': 'property_gasoline_nearby',
};

// activities_raw -> unified schema columns (expanded mappings only)
const ACTIVITY_MAP: Record<string, string> = {
  Surfing: 'activities_surfing',
  'Rock Climbing': 'activities_climbing',
  Bouldering: 'activities_climbing',
  'Snow Sports': 'activities_snow_sports',
  'Stand-Up Paddleboards': 'activities_paddling',
  'White-Water Rafting': 'activities_whitewater_paddling',
  'Whitewater Rafting & Kayaking': 'activities_whitewater_paddling',
  'Swimming Indoors': 'activities_swimming',
  'Kite-Boarding': 'activities_wind_sports',
  'Beer/Wine Tasting': 'property_alcohol_available',
  'Caving/Spelunking': 'setting_cave',
  Basketball: 'property_basketball',
  Volleyball: 'property_volleyball',
  'Jet Skiing': 'property_jet_skiing',
  Tennis: 'property_tennis',
};

// lifestyle_raw -> unified schema (property_*)
const LIFESTYLE_MAP: Record<string, string> = {
  'Extended Stay': 'property_extended_stay',
  'Family Friendly': 'property_family_friendly',
  'Remote Work Friendly': 'property_remote_work_friendly',
  '55-plus': 'property_age_restricted_55_plus',
  Rentals: 'property_has_rentals',
  'LGBTIQ Friendly': 'property_lgbtiq_friendly',
  'Mobile Home Community': 'property_mobile_home_community',
};

function parseRaw(
  raw: string | null,
  map: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!raw?.trim()) return result;
  for (const item of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const col = map[item];
    if (col) result[col] = 'Yes';
  }
  return result;
}

function collectRvSurfaceType(amenitiesRaw: string | null): string | null {
  if (!amenitiesRaw?.trim()) return null;
  const items = amenitiesRaw.split(',').map((s) => s.trim());
  const surfaces: string[] = [];
  if (items.includes('Gravel Roads')) surfaces.push('Gravel');
  if (items.includes('Paved Roads')) surfaces.push('Paved');
  if (items.includes('Dirt Roads')) surfaces.push('Dirt');
  return surfaces.length > 0 ? surfaces.join(', ') : null;
}

function collectRvParking(amenitiesRaw: string | null): string | null {
  if (!amenitiesRaw?.trim()) return null;
  const items = amenitiesRaw.split(',').map((s) => s.trim());
  const types: string[] = [];
  if (items.includes('Back-in RV Sites')) types.push('Back-in');
  if (items.includes('Pull-Thru RV Sites')) types.push('Pull-Thru');
  if (items.includes('RV Hookup')) types.push('RV Hookup');
  return types.length > 0 ? types.join(', ') : null;
}

async function main(): Promise<void> {
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`📖 Fetching rows from ${TABLE_NAME}...`);
  const BATCH_SIZE = 1000;
  const rows: { id: number; amenities_raw: string | null; activities_raw: string | null; lifestyle_raw: string | null }[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('id, amenities_raw, activities_raw, lifestyle_raw')
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchError) {
      console.error('❌', fetchError.message);
      process.exit(1);
    }
    if (!batch?.length) break;
    rows.push(...batch);
    hasMore = batch.length === BATCH_SIZE;
    offset += BATCH_SIZE;
  }

  if (!rows.length) {
    console.log('No rows to update.');
    return;
  }

  console.log(`   Found ${rows.length} rows`);
  let updated = 0;

  for (const row of rows) {
    const amenityCols = parseRaw(row.amenities_raw, AMENITY_MAP);
    const activityCols = parseRaw(row.activities_raw, ACTIVITY_MAP);
    const lifestyleCols = parseRaw(row.lifestyle_raw, LIFESTYLE_MAP);

    const rvSurface = collectRvSurfaceType(row.amenities_raw);
    const rvParking = collectRvParking(row.amenities_raw);

    const update: Record<string, string> = {};
    const set = (k: string, v: string | null) => {
      if (v) update[k] = v;
    };
    set('rv_parking', rvParking ?? amenityCols.rv_parking ?? null);
    set('rv_vehicle_length', amenityCols.rv_vehicle_length ?? null);
    set('rv_accommodates_slideout', amenityCols.rv_accommodates_slideout ?? null);
    set('rv_surface_type', rvSurface ?? amenityCols.rv_surface_type ?? null);
    set('unit_ada_accessibility', amenityCols.unit_ada_accessibility ?? null);
    set('activities_surfing', activityCols.activities_surfing ?? null);
    set('activities_climbing', activityCols.activities_climbing ?? null);
    set('activities_snow_sports', activityCols.activities_snow_sports ?? null);
    set('activities_paddling', activityCols.activities_paddling ?? null);
    set(
      'activities_whitewater_paddling',
      activityCols.activities_whitewater_paddling ?? null
    );
    set('activities_swimming', activityCols.activities_swimming ?? null);
    set('activities_wind_sports', activityCols.activities_wind_sports ?? null);
    set(
      'property_alcohol_available',
      activityCols.property_alcohol_available ??
        amenityCols.property_alcohol_available ??
        null
    );
    set('setting_cave', activityCols.setting_cave ?? null);
    set('property_extended_stay', lifestyleCols.property_extended_stay ?? null);
    set('property_family_friendly', lifestyleCols.property_family_friendly ?? null);
    set(
      'property_remote_work_friendly',
      lifestyleCols.property_remote_work_friendly ?? null
    );
    set('property_age_restricted_55_plus', lifestyleCols.property_age_restricted_55_plus ?? null);
    set('property_has_rentals', lifestyleCols.property_has_rentals ?? null);
    set('property_lgbtiq_friendly', lifestyleCols.property_lgbtiq_friendly ?? null);
    set('property_mobile_home_community', lifestyleCols.property_mobile_home_community ?? null);
    set('property_gasoline_nearby', amenityCols.property_gasoline_nearby ?? null);
    set('property_basketball', activityCols.property_basketball ?? null);
    set('property_volleyball', activityCols.property_volleyball ?? null);
    set('property_jet_skiing', activityCols.property_jet_skiing ?? null);
    set('property_tennis', activityCols.property_tennis ?? null);

    if (Object.keys(update).length === 0) continue;

    const { error } = await supabase
      .from(TABLE_NAME)
      .update(update)
      .eq('id', row.id);

    if (error) {
      console.error(`   ❌ id ${row.id}:`, error.message);
    } else {
      updated++;
    }
  }

  console.log(`\n✅ Updated ${updated} rows`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
