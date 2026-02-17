/**
 * Backfill extended_stay, family_friendly, remote_work_friendly, fitness_room, propane_refilling_station,
 * hunting, golf, backpacking, historic_sightseeing, scenic_drives, stargazing
 * from amenities_raw, lifestyle_raw, and activities_raw on existing all_roverpass_data rows.
 *
 * Usage: npx tsx scripts/backfill-roverpass-lifestyle-amenity-columns.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

function parseLifestyle(lifestyleRaw: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!lifestyleRaw?.trim()) return result;
  const map: Record<string, string> = {
    'Extended Stay': 'extended_stay',
    'Family Friendly': 'family_friendly',
    'Remote Work Friendly': 'remote_work_friendly',
  };
  for (const item of lifestyleRaw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const col = map[item];
    if (col) result[col] = 'Yes';
  }
  return result;
}

function parseAmenitiesForNewCols(amenitiesRaw: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!amenitiesRaw?.trim()) return result;
  const map: Record<string, string> = {
    'Fitness Room': 'fitness_room',
    'Propane Refilling Station': 'propane_refilling_station',
  };
  for (const item of amenitiesRaw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const col = map[item];
    if (col) result[col] = 'Yes';
  }
  return result;
}

function parseActivitiesForNewCols(activitiesRaw: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!activitiesRaw?.trim()) return result;
  const map: Record<string, string> = {
    Hunting: 'hunting',
    Golf: 'golf',
    Backpacking: 'backpacking',
    'Historic Sightseeing': 'historic_sightseeing',
    'Scenic Drives': 'scenic_drives',
    Stargazing: 'stargazing',
  };
  for (const item of activitiesRaw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const col = map[item];
    if (col) result[col] = 'Yes';
  }
  return result;
}

async function main(): Promise<void> {
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('📖 Fetching all rows...');
  const { data: rows, error: fetchError } = await supabase
    .from('all_roverpass_data')
    .select('id, amenities_raw, lifestyle_raw, activities_raw')
    .range(0, 99999);

  if (fetchError) {
    console.error('❌', fetchError.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log('No rows to update.');
    return;
  }

  console.log(`   Found ${rows.length} rows`);
  let updated = 0;

  for (const row of rows) {
    const lifestyleCols = parseLifestyle(row.lifestyle_raw);
    const amenityCols = parseAmenitiesForNewCols(row.amenities_raw);
    const activityCols = parseActivitiesForNewCols(row.activities_raw);

    const update: Record<string, string | null> = {
      extended_stay: lifestyleCols.extended_stay ?? null,
      family_friendly: lifestyleCols.family_friendly ?? null,
      remote_work_friendly: lifestyleCols.remote_work_friendly ?? null,
      fitness_room: amenityCols.fitness_room ?? null,
      propane_refilling_station: amenityCols.propane_refilling_station ?? null,
      hunting: activityCols.hunting ?? null,
      golf: activityCols.golf ?? null,
      backpacking: activityCols.backpacking ?? null,
      historic_sightseeing: activityCols.historic_sightseeing ?? null,
      scenic_drives: activityCols.scenic_drives ?? null,
      stargazing: activityCols.stargazing ?? null,
    };

    const { error } = await supabase
      .from('all_roverpass_data')
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
