/**
 * Update roverpass_occupancy_rate and roverpass_occupancy_year on existing all_roverpass_data rows
 * using the Occupancy CSV. No re-import needed.
 *
 * Usage:
 *   npx tsx scripts/update-roverpass-occupancy.ts <occupancy-csv>
 *
 * Example:
 *   npx tsx scripts/update-roverpass-occupancy.ts ~/Downloads/"RoverPass Data - Occupancy data (1).csv"
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

interface OccupancyRow {
  campground_id: string;
  year: string;
  booked_nights: string;
  bookable_nights: string;
}

function parseNum(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(String(val).trim());
  return isNaN(n) || !isFinite(n) ? null : n;
}

async function main(): Promise<void> {
  const occupancyPath = process.argv[2];
  if (!occupancyPath) {
    console.error('Usage: npx tsx scripts/update-roverpass-occupancy.ts <occupancy-csv>');
    process.exit(1);
  }

  console.log(`📖 Reading Occupancy Data: ${occupancyPath}`);
  const occupancy = parse(readFileSync(occupancyPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as OccupancyRow[];

  // Build lookup: campground_id -> { rate, year } (prefer latest year)
  const occupancyByCampground = new Map<number, { rate: number; year: number }>();
  for (const row of occupancy) {
    const cgId = parseNum(row.campground_id) ?? parseInt(row.campground_id, 10);
    const year = parseNum(row.year) ?? 0;
    const booked = parseNum(row.booked_nights) ?? 0;
    const bookable = parseNum(row.bookable_nights) ?? 0;
    if (bookable > 0 && year > 0) {
      const rate = booked / bookable;
      const existing = occupancyByCampground.get(cgId);
      if (!existing || year > existing.year) {
        occupancyByCampground.set(cgId, { rate, year });
      }
    }
  }
  console.log(`   Found occupancy for ${occupancyByCampground.size} campgrounds`);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const [campgroundId, { rate, year }] of occupancyByCampground) {
    const { error } = await supabase
      .from('all_roverpass_data')
      .update({ roverpass_occupancy_rate: rate, roverpass_occupancy_year: year })
      .eq('roverpass_campground_id', campgroundId);

    if (error) {
      console.error(`   ❌ campground_id ${campgroundId}: ${error.message}`);
    }
  }

  const { count } = await supabase
    .from('all_roverpass_data')
    .select('*', { count: 'exact', head: true })
    .not('roverpass_occupancy_rate', 'is', null);
  console.log(`\n✅ Updated occupancy. ${count ?? 0} rows now have roverpass_occupancy_rate.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
