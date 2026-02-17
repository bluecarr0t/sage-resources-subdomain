/**
 * Combine RoverPass Campground Data + Site Data + Occupancy Data CSVs and upload to all_roverpass_data
 *
 * Usage:
 *   npx tsx scripts/combine-roverpass-and-upload.ts <campground-csv> <site-csv> [occupancy-csv] [options]
 *
 * Examples:
 *   npx tsx scripts/combine-roverpass-and-upload.ts ~/Downloads/"RoverPass Data - Campground Data (1).csv" ~/Downloads/"RoverPass Data - Site Data (1).csv" ~/Downloads/"RoverPass Data - Occupancy data (1).csv"
 *   npx tsx scripts/combine-roverpass-and-upload.ts ./campground.csv ./site.csv --output-csv ./roverpass-combined.csv --no-upload
 *
 * Options:
 *   --output-csv <path>   Write combined CSV to file
 *   --no-upload           Skip Supabase upload (combine and optionally output CSV only)
 *   --append              Upsert instead of replace (default: replace)
 *
 * Occupancy: Pass the Occupancy CSV as the 3rd argument to populate roverpass_occupancy_rate and roverpass_occupancy_year.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const TABLE_NAME = 'all_roverpass_data';

interface CSVRow {
  [key: string]: string | number | null;
}

interface CampgroundRow {
  id: string;
  city_name: string;
  state_name: string;
  zip: string;
  amenities: string;
  activities: string;
  lifestyle: string;
}

interface SiteRow {
  id: string;
  campground_id: string;
  site_type: string;
  weekly: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
}

interface OccupancyRow {
  campground_id: string;
  year: string;
  booked_nights: string;
  bookable_nights: string;
}

// RoverPass amenity string -> all_roverpass_data column
const AMENITY_MAP: Record<string, string> = {
  'Community Restrooms': 'toilet',
  Toilet: 'toilet',
  'Community Showers': 'shower',
  Shower: 'shower',
  'Water Hookups': 'water',
  'Drinking Water': 'water',
  'Community Water Fountain': 'water',
  'Trash Service': 'trash',
  'BBQ/Grill': 'charcoal_grill',
  'Fire Ring / Grill': 'charcoal_grill',
  'Community BBQ/Grill': 'charcoal_grill',
  'Community Fire Pit': 'campfires',
  'Picnic Table': 'picnic_table',
  'Picnic Area': 'picnic_table',
  WiFi: 'wifi',
  'Laundry Facilities': 'laundry',
  'Fire Pit': 'campfires',
  Playground: 'playground',
  'Hot Tub': 'hot_tub_or_sauna',
  Waterfront: 'waterfront',
  'Pet Friendly': 'pets',
  'Pets Allowed': 'pets',
  'Sewer Hookups': 'sewer_hook_up',
  'Dump Station': 'sewer_hook_up',
  'Fitness Room': 'fitness_room',
  'Propane Refilling Station': 'propane_refilling_station',
  '20 Amps': 'electrical_hook_up',
  '30 Amps': 'electrical_hook_up',
  '50 Amps': 'electrical_hook_up',
  '100 Amps': 'electrical_hook_up',
  'Water Hookups': 'water_hookup',
  'General Store': 'general_store',
  Clubhouse: 'clubhouse',
  Restaurant: 'restaurant',
  'Cable Hookups': 'cable',
};

// RoverPass activity string -> all_roverpass_data column
const ACTIVITY_MAP: Record<string, string> = {
  Fishing: 'fishing',
  Hiking: 'hiking',
  Boating: 'boating',
  'Swimming Outdoors': 'swimming',
  Biking: 'biking',
  'Horseback Riding': 'horseback_riding',
  Kayaking: 'canoeing_kayaking',
  Canoeing: 'canoeing_kayaking',
  'Kayaking & Canoeing': 'canoeing_kayaking',
  'Off-Roading/ATV': 'off_roading_ohv',
  'Wildlife Viewing': 'wildlife_watching',
  Hunting: 'hunting',
  Golf: 'golf',
  Backpacking: 'backpacking',
  'Historic Sightseeing': 'historic_sightseeing',
  'Scenic Drives': 'scenic_drives',
  Stargazing: 'stargazing',
};

// RoverPass lifestyle string -> all_roverpass_data column
const LIFESTYLE_MAP: Record<string, string> = {
  'Extended Stay': 'extended_stay',
  'Family Friendly': 'family_friendly',
  'Remote Work Friendly': 'remote_work_friendly',
};

const GLAMPING_SITE_TYPES = ['cabin', 'glamping', 'tiny_home', 'rental', 'lodge'];

function parseCSV<T = CSVRow>(filePath: string): T[] {
  const fileContent = readFileSync(filePath, 'utf-8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    cast: false,
  }) as T[];
}

function parseNum(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(String(val).trim());
  return isNaN(n) || !isFinite(n) ? null : n;
}

function parseAmenities(amenitiesRaw: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!amenitiesRaw || !amenitiesRaw.trim()) return result;
  const items = amenitiesRaw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const item of items) {
    const col = AMENITY_MAP[item];
    if (col) result[col] = 'Yes';
  }
  return result;
}

function parseActivities(activitiesRaw: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!activitiesRaw || !activitiesRaw.trim()) return result;
  const items = activitiesRaw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const item of items) {
    const col = ACTIVITY_MAP[item];
    if (col) result[col] = 'Yes';
  }
  return result;
}

function parseLifestyle(lifestyleRaw: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!lifestyleRaw || !lifestyleRaw.trim()) return result;
  const items = lifestyleRaw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const item of items) {
    const col = LIFESTYLE_MAP[item];
    if (col) result[col] = 'Yes';
  }
  return result;
}

function isGlampingSite(siteType: string): boolean {
  const lower = siteType.toLowerCase();
  return GLAMPING_SITE_TYPES.some((t) => lower.includes(t));
}

function deriveCountry(stateName: string): string {
  if (!stateName) return 'USA';
  const s = stateName.trim();
  if (s === 'Baja California' || s.startsWith('Baja')) return 'Mexico';
  const canadianProvinces = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland',
    'Nova Scotia', 'Ontario', 'Quebec', 'Saskatchewan', 'Prince Edward Island',
  ];
  if (canadianProvinces.some((p) => s.includes(p))) return 'Canada';
  return 'USA';
}

const NUMERIC_COLUMNS = new Set([
  'id', 'quantity_of_units', 'unit_sq_ft', 'property_total_sites', 'number_of_locations',
  'avg_retail_daily_rate', 'winter_weekday', 'winter_weekend', 'spring_weekday', 'spring_weekend',
  'summer_weekday', 'summer_weekend', 'fall_weekday', 'fall_weekend', 'quality_score',
  'lat', 'lon', 'roverpass_campground_id', 'roverpass_occupancy_rate', 'roverpass_occupancy_year',
]);

function sanitizeRowsForUpload(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(r)) {
      if (NUMERIC_COLUMNS.has(key)) {
        if (val === '' || val === null || val === undefined) {
          out[key] = null;
        } else {
          const n = Number(val);
          out[key] = isNaN(n) || !isFinite(n) ? null : n;
        }
      } else if (val === '') {
        out[key] = null;
      } else {
        out[key] = val;
      }
    }
    return out;
  });
}

function getRateCategory(rate: number | null): string | null {
  if (rate === null || rate === undefined || isNaN(rate) || !isFinite(rate)) return null;
  if (rate <= 149) return '≤$149';
  if (rate >= 150 && rate <= 249) return '$150-$249';
  if (rate >= 250 && rate <= 399) return '$250-$399';
  if (rate >= 400 && rate <= 549) return '$400-$549';
  if (rate >= 550) return '$550+';
  return null;
}

function combineData(
  campgroundPath: string,
  sitePath: string,
  occupancyPath?: string
): Record<string, unknown>[] {
  console.log('📖 Reading Campground Data...');
  const campgrounds = parseCSV<CampgroundRow>(campgroundPath);
  const campgroundById = new Map<string, CampgroundRow>();
  for (const c of campgrounds) {
    campgroundById.set(String(c.id).trim(), c);
  }
  console.log(`   Found ${campgrounds.length} campgrounds`);

  console.log('📖 Reading Site Data...');
  const sites = parseCSV<SiteRow>(sitePath);
  console.log(`   Found ${sites.length} sites`);

  // Build occupancy lookup: campground_id -> { rate, year } (prefer latest year, e.g. 2025)
  const occupancyByCampground = new Map<string, { rate: number; year: number }>();
  if (occupancyPath) {
    console.log('📖 Reading Occupancy Data...');
    const occupancy = parseCSV<OccupancyRow>(occupancyPath);
    for (const row of occupancy) {
      const cgId = String(row.campground_id).trim();
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
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows: Record<string, unknown>[] = [];
  let skippedNoCampground = 0;

  for (const site of sites) {
    const campgroundId = String(site.campground_id).trim();
    const campground = campgroundById.get(campgroundId);

    const city = campground?.city_name?.trim() ?? '';
    const state = campground?.state_name?.trim() ?? '';
    const zip = campground?.zip?.trim() ?? '';

    const propertyName = `Campground ${campgroundId} - ${city || 'Unknown'}, ${state || 'Unknown'}`;

    // Rates from mon-sun
    const mon = parseNum(site.mon);
    const tue = parseNum(site.tue);
    const wed = parseNum(site.wed);
    const thu = parseNum(site.thu);
    const fri = parseNum(site.fri);
    const sat = parseNum(site.sat);
    const sun = parseNum(site.sun);

    const dayRates = [mon, tue, wed, thu, fri, sat, sun].filter(
      (r): r is number => r !== null && r > 0
    );
    const avgDaily = dayRates.length > 0
      ? dayRates.reduce((a, b) => a + b, 0) / dayRates.length
      : null;

    const weekdayRates = [mon, tue, wed, thu].filter(
      (r): r is number => r !== null && r > 0
    );
    const weekendRates = [fri, sat, sun].filter(
      (r): r is number => r !== null && r > 0
    );
    const weekdayAvg = weekdayRates.length > 0
      ? weekdayRates.reduce((a, b) => a + b, 0) / weekdayRates.length
      : avgDaily;
    const weekendAvg = weekendRates.length > 0
      ? weekendRates.reduce((a, b) => a + b, 0) / weekendRates.length
      : avgDaily;

    const amenitiesRaw = campground?.amenities ?? '';
    const activitiesRaw = campground?.activities ?? '';
    const lifestyleRaw = campground?.lifestyle ?? '';

    const amenityCols = parseAmenities(amenitiesRaw);
    const activityCols = parseActivities(activitiesRaw);
    const lifestyleCols = parseLifestyle(lifestyleRaw);

    const siteType = (site.site_type ?? '').trim();
    const isGlamping = isGlampingSite(siteType);
    const country = deriveCountry(state);

    const occupancy = occupancyByCampground.get(campgroundId);

    const row: Record<string, unknown> = {
      id: parseNum(site.id) ?? parseInt(site.id, 10),
      research_status: 'new',
      is_glamping_property: isGlamping ? 'Yes' : 'No',
      is_closed: 'No',
      property_name: propertyName,
      property_type: null,
      site_name: null,
      unit_type: siteType || null,
      source: 'RoverPass',
      discovery_source: 'RoverPass',
      date_added: today,
      date_updated: today,
      address: null,
      city: city || null,
      state: state || null,
      zip_code: zip || null,
      country,
      lat: null,
      lon: null,
      property_total_sites: null,
      quantity_of_units: 1,
      unit_capacity: null,
      unit_sq_ft: null,
      year_site_opened: null,
      operating_season_months: null,
      number_of_locations: null,
      avg_retail_daily_rate: avgDaily,
      winter_weekday: weekdayAvg,
      winter_weekend: weekendAvg,
      spring_weekday: weekdayAvg,
      spring_weekend: weekendAvg,
      summer_weekday: weekdayAvg,
      summer_weekend: weekendAvg,
      fall_weekday: weekdayAvg,
      fall_weekend: weekendAvg,
      rate_category: getRateCategory(avgDaily),
      unit_rates_by_year: null,
      url: null,
      phone_number: null,
      description: null,
      getting_there: null,
      minimum_nights: null,
      toilet: amenityCols.toilet ?? null,
      shower: amenityCols.shower ?? null,
      water: amenityCols.water ?? null,
      trash: amenityCols.trash ?? null,
      cooking_equipment: null,
      picnic_table: amenityCols.picnic_table ?? null,
      wifi: amenityCols.wifi ?? null,
      laundry: amenityCols.laundry ?? null,
      campfires: amenityCols.campfires ?? null,
      playground: amenityCols.playground ?? null,
      pool: null,
      pets: amenityCols.pets ?? null,
      private_bathroom: null,
      kitchen: null,
      patio: null,
      electricity: null,
      hot_tub_or_sauna: amenityCols.hot_tub_or_sauna ?? null,
      unit_hot_tub: null,
      unit_sauna: null,
      property_hot_tub: null,
      property_sauna: null,
      food_on_site: null,
      restaurant: amenityCols.restaurant ?? null,
      dog_park: null,
      clubhouse: amenityCols.clubhouse ?? null,
      alcohol_available: null,
      golf_cart_rental: null,
      waterpark: null,
      general_store: amenityCols.general_store ?? null,
      cable: amenityCols.cable ?? null,
      charcoal_grill: amenityCols.charcoal_grill ?? null,
      waterfront: amenityCols.waterfront ?? null,
      rv_vehicle_length: null,
      rv_parking: null,
      rv_accommodates_slideout: null,
      rv_surface_type: null,
      rv_surface_level: null,
      rv_vehicles_fifth_wheels: null,
      rv_vehicles_class_a_rvs: null,
      rv_vehicles_class_b_rvs: null,
      rv_vehicles_class_c_rvs: null,
      rv_vehicles_toy_hauler: null,
      sewer_hook_up: amenityCols.sewer_hook_up ?? null,
      electrical_hook_up: amenityCols.electrical_hook_up ?? null,
      generators_allowed: null,
      water_hookup: amenityCols.water_hookup ?? null,
      fishing: activityCols.fishing ?? null,
      surfing: null,
      horseback_riding: activityCols.horseback_riding ?? null,
      paddling: null,
      climbing: null,
      off_roading_ohv: activityCols.off_roading_ohv ?? null,
      boating: activityCols.boating ?? null,
      swimming: activityCols.swimming ?? null,
      wind_sports: null,
      snow_sports: null,
      whitewater_paddling: null,
      fall_fun: null,
      hiking: activityCols.hiking ?? null,
      wildlife_watching: activityCols.wildlife_watching ?? null,
      biking: activityCols.biking ?? null,
      canoeing_kayaking: activityCols.canoeing_kayaking ?? null,
      hunting: activityCols.hunting ?? null,
      golf: activityCols.golf ?? null,
      backpacking: activityCols.backpacking ?? null,
      historic_sightseeing: activityCols.historic_sightseeing ?? null,
      scenic_drives: activityCols.scenic_drives ?? null,
      stargazing: activityCols.stargazing ?? null,
      ranch: null,
      beach: null,
      coastal: null,
      suburban: null,
      forest: null,
      field: null,
      wetlands: null,
      hot_spring: null,
      desert: null,
      canyon: null,
      waterfall: null,
      swimming_hole: null,
      lake: null,
      cave: null,
      redwoods: null,
      farm: null,
      river_stream_or_creek: null,
      mountainous: null,
      quality_score: null,
      roverpass_campground_id: parseNum(campgroundId) ?? parseInt(campgroundId, 10),
      roverpass_occupancy_rate: occupancy?.rate ?? null,
      roverpass_occupancy_year: occupancy?.year ?? null,
      amenities_raw: amenitiesRaw || null,
      activities_raw: activitiesRaw || null,
      lifestyle_raw: lifestyleRaw || null,
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

    rows.push(row);
  }

  console.log(`\n✅ Combined ${rows.length} rows`);
  return rows;
}

async function uploadToSupabase(
  data: Record<string, unknown>[],
  append: boolean
): Promise<void> {
  if (!supabaseUrl || !secretKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
    throw new Error('Missing environment variables');
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: tableError } = await supabase.from(TABLE_NAME).select('id').limit(0);
  if (tableError) {
    if (tableError.code === 'PGRST116' || tableError.message.includes('does not exist')) {
      throw new Error(`Table '${TABLE_NAME}' does not exist. Run scripts/create-all-roverpass-data-table.sql first.`);
    }
    throw tableError;
  }
  console.log(`✅ Table '${TABLE_NAME}' exists`);

  if (!append) {
    console.log(`\n🗑️  Clearing existing data from '${TABLE_NAME}'...`);
    const { error: deleteError } = await supabase.from(TABLE_NAME).delete().neq('id', 0);
    if (deleteError) {
      console.warn(`   ⚠️  Could not clear table: ${deleteError.message}`);
    } else {
      console.log('   ✅ Table cleared');
    }
  }

  const BATCH_SIZE = 500;
  let uploaded = 0;
  let errors = 0;

  console.log(`\n📤 Uploading ${data.length} rows...`);

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);

    const { error } = await supabase.from(TABLE_NAME).upsert(batch, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`   ❌ Batch ${batchNum}/${totalBatches}: ${error.message}`);
      errors += batch.length;
    } else {
      uploaded += batch.length;
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        console.log(`   📦 Batch ${batchNum}/${totalBatches} (${uploaded} rows uploaded)`);
      }
    }
  }

  console.log(`\n📊 Upload complete: ${uploaded} rows, ${errors} errors`);
  if (errors > 0) throw new Error(`Failed to upload ${errors} rows`);

  // Verify data is in the table
  const { count, error: countError } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true });
  if (countError) {
    console.warn(`   ⚠️  Could not verify row count: ${countError.message}`);
  } else {
    console.log(`\n✅ Verified: ${count} rows in '${TABLE_NAME}'`);
    if (count === 0) {
      console.warn('\n   ⚠️  Table appears empty. Check:');
      console.warn('   - Are you viewing the correct Supabase project in the dashboard?');
      console.warn('   - Is RLS enabled? Add a policy or use the service role key.');
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const uploadOnlyCsv = args.includes('--upload-only') ? args[args.indexOf('--upload-only') + 1] : null;
  const positionalArgs = args.filter((a) => !a.startsWith('--') && a !== uploadOnlyCsv);
  const campgroundPath = positionalArgs[0];
  const sitePath = positionalArgs[1];
  const occupancyPath = positionalArgs[2]; // Optional 3rd arg
  const outputCsvIdx = args.indexOf('--output-csv');
  const outputCsvPath = outputCsvIdx >= 0 ? args[outputCsvIdx + 1] : null;
  const noUpload = args.includes('--no-upload');
  const append = args.includes('--append');

  let rows: Record<string, unknown>[];

  if (uploadOnlyCsv) {
    // Upload from pre-generated CSV only
    console.log(`📖 Reading CSV: ${uploadOnlyCsv}`);
    const parsed = parseCSV(uploadOnlyCsv);
    rows = sanitizeRowsForUpload(parsed);
    console.log(`   Loaded ${rows.length} rows`);
  } else if (!campgroundPath || !sitePath) {
    console.error('Usage: npx tsx scripts/combine-roverpass-and-upload.ts <campground-csv> <site-csv> [occupancy-csv] [options]');
    console.error('   Or:  npx tsx scripts/combine-roverpass-and-upload.ts --upload-only <combined-csv> [--append]');
    console.error('');
    console.error('Options: --output-csv <path>  --no-upload  --append  --upload-only <csv>');
    console.error('Pass occupancy-csv as 3rd arg to populate roverpass_occupancy_rate and roverpass_occupancy_year.');
    process.exit(1);
  } else {
    rows = combineData(campgroundPath, sitePath, occupancyPath);
  }

  if (outputCsvPath) {
    const csv = stringify(rows, { header: true });
    writeFileSync(outputCsvPath, csv, 'utf-8');
    console.log(`\n📄 Wrote CSV to ${outputCsvPath}`);
  }

  if (!noUpload) {
    await uploadToSupabase(sanitizeRowsForUpload(rows), append);
    console.log('\n🎉 Done.');
  } else {
    console.log('\n✅ Combine complete (upload skipped).');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
