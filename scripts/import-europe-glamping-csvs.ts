/**
 * Import European glamping CSV files into all_glamping_properties.
 *
 * Reads the 8 European CSVs (Belgium, Germany, Italy, Netherlands, Portugal,
 * Spain, Switzerland, UK), maps CSV columns to the current DB schema (rate_,
 * unit_, property_, activities_, setting_, rv_ prefixes), and INSERTs with:
 *   - research_status = 'new'
 *   - is_glamping_property = 'Yes'
 *   - is_closed = 'No'
 *
 * Does not delete existing data; appends only.
 *
 * Usage:
 *   npx tsx scripts/import-europe-glamping-csvs.ts [--dry-run]
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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const TABLE = 'all_glamping_properties';
const TODAY = new Date().toISOString().split('T')[0];

const EUROPE_CSV_PATHS = [
  'csv/glamping-properties/europe/belgium-glamping-resorts.csv',
  'csv/glamping-properties/europe/germany-glamping-resorts.csv',
  'csv/glamping-properties/europe/italy-glamping-resorts.csv',
  'csv/glamping-properties/europe/netherlands-glamping-resorts.csv',
  'csv/glamping-properties/europe/portugal-glamping-resorts.csv',
  'csv/glamping-properties/europe/spain-glamping-resorts.csv',
  'csv/glamping-properties/europe/switzerland-glamping-resorts.csv',
  'csv/glamping-properties/europe/uk-glamping-resorts.csv',
];

// CSV column name → DB column name (only where they differ)
const CSV_TO_DB: Record<string, string> = {
  property__total_sites: 'property_total_sites',
  operating_season__months_: 'operating_season_months',
  __of_locations: 'number_of_locations',
  avg__rate__next_12_months_: 'rate_avg_retail_daily_rate',
  winter_weekday: 'rate_winter_weekday',
  winter_weekend: 'rate_winter_weekend',
  spring_weekday: 'rate_spring_weekday',
  spring_weekend: 'rate_spring_weekend',
  summer_weekday: 'rate_summer_weekday',
  summer_weekend: 'rate_summer_weekend',
  fall_weekday: 'rate_fall_weekday',
  fall_weekend: 'rate_fall_weekend',
  hot_tub___sauna: 'unit_hot_tub_or_sauna',
  pool: 'property_pool',
  pets: 'unit_pets',
  water: 'unit_water',
  shower: 'unit_shower',
  picnic_table: 'unit_picnic_table',
  wifi: 'unit_wifi',
  laundry: 'property_laundry',
  campfires: 'unit_campfires',
  playground: 'property_playground',
  rv___vehicle_length: 'rv_vehicle_length',
  rv___parking: 'rv_parking',
  rv___accommodates_slideout: 'rv_accommodates_slideout',
  rv___surface_type: 'rv_surface_type',
  rv___surface_level: 'rv_surface_level',
  rv___vehicles__fifth_wheels: 'rv_vehicles_fifth_wheels',
  rv___vehicles__class_a_rvs: 'rv_vehicles_class_a_rvs',
  rv___vehicles__class_b_rvs: 'rv_vehicles_class_b_rvs',
  rv___vehicles__class_c_rvs: 'rv_vehicles_class_c_rvs',
  rv___vehicles__toy_hauler: 'rv_vehicles_toy_hauler',
  fishing: 'activities_fishing',
  surfing: 'activities_surfing',
  horseback_riding: 'activities_horseback_riding',
  paddling: 'activities_paddling',
  climbing: 'activities_climbing',
  off_roading__ohv_: 'activities_off_roading_ohv',
  boating: 'activities_boating',
  swimming: 'activities_swimming',
  wind_sports: 'activities_wind_sports',
  snow_sports: 'activities_snow_sports',
  whitewater_paddling: 'activities_whitewater_paddling',
  fall_fun: 'activities_fall_fun',
  hiking: 'activities_hiking',
  wildlife_watching: 'activities_wildlife_watching',
  biking: 'activities_biking',
  ranch: 'setting_ranch',
  beach: 'setting_beach',
  coastal: 'setting_coastal',
  suburban: 'setting_suburban',
  forest: 'setting_forest',
  field: 'setting_field',
  wetlands: 'setting_wetlands',
  hot_spring: 'setting_hot_spring',
  desert: 'setting_desert',
  canyon: 'setting_canyon',
  waterfall: 'setting_waterfall',
  swimming_hole: 'setting_swimming_hole',
  lake: 'setting_lake',
  cave: 'setting_cave',
  redwoods: 'setting_redwoods',
  farm: 'setting_farm',
  river__stream__or_creek: 'river_stream_or_creek',
  mountainous: 'setting_mountainous',
  sage___p__amenity__food_on_site: 'property_food_on_site',
  waterfront: 'property_waterfront',
  restaurant: 'property_restaurant',
  dog_park: 'property_dog_park',
  clubhouse: 'property_clubhouse',
  canoeing___kayaking: 'activities_canoeing_kayaking',
  alcohol_available: 'property_alcohol_available',
  golf_cart_rental: 'property_golf_cart_rental',
  private_bathroom: 'unit_private_bathroom',
  waterpark: 'property_waterpark',
  kitchen: 'unit_full_kitchen',
  patio: 'unit_patio',
  electricity: 'unit_electricity',
  general_store: 'property_general_store',
  cable: 'unit_cable',
  charcoal_grill: 'unit_charcoal_grill',
  sewer_hook_up: 'rv_sewer_hook_up',
  electrical_hook_up: 'rv_electrical_hook_up',
  generators_allowed: 'rv_generators_allowed',
  water_hookup: 'rv_water_hookup',
};

// Columns to skip (not in all_glamping_properties or internal)
const SKIP_COLS = new Set([
  'duplicatenote',
  'getting_there',
  'toilet',
  'trash',
  'cooking_equipment',
  'id',
  'created_at',
  'updated_at',
  'occupancy_rate_2024',
  'avg__retail_daily_rate_2024',
  'high_rate_2024',
  'low_rate_2024',
  'retail_daily_rate__fees__2024',
  'revpar_2024',
  'occupancy_rate_2025',
  'retail_daily_rate_ytd',
  'retail_daily_rate__fees__ytd',
  'high_rate_2025',
  'low_rate_2025',
  'revpar_2025',
  'high_month_2025',
  'high_avg__occupancy_2025',
  'low_month_2025',
  'low_avg__occupancy_2025',
  'operating_season__excel_format_',
  'high_rate__next_12_months_',
  'low_rate__next_12_months_',
  'google_website_uri',
  'google_dine_in',
  'google_takeout',
  'google_delivery',
  'google_serves_breakfast',
  'google_serves_lunch',
  'google_serves_dinner',
  'google_serves_brunch',
  'google_outdoor_seating',
  'google_live_music',
  'google_menu_uri',
  'google_place_types',
  'google_primary_type',
  'google_primary_type_display_name',
  'google_photos',
  'google_icon_uri',
  'google_icon_background_color',
  'google_reservable',
  'google_rating',
  'google_user_rating_total',
  'google_business_status',
  'google_opening_hours',
  'google_current_opening_hours',
  'google_parking_options',
  'google_price_level',
  'google_payment_options',
  'google_wheelchair_accessible_parking',
  'google_wheelchair_accessible_entrance',
  'google_wheelchair_accessible_restroom',
  'google_wheelchair_accessible_seating',
  'google_allows_dogs',
  'google_place_id',
  'is_glamping_property', // we set explicitly to 'Yes'
]);

const NUMERIC_COLS = new Set([
  'lat',
  'lon',
  'property_total_sites',
  'quantity_of_units',
  'unit_sq_ft',
  'year_site_opened',
  'number_of_locations',
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
  'quality_score',
]);

const SEASON_RATE_KEYS = [
  'winter_weekday',
  'winter_weekend',
  'spring_weekday',
  'spring_weekend',
  'summer_weekday',
  'summer_weekend',
  'fall_weekday',
  'fall_weekend',
] as const;

function toNumber(v: string | undefined | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/[$,\s]/g, '');
  if (s === '' || /^(n\/a|none|null)$/i.test(s)) return null;
  let cleaned = s;
  if (cleaned.includes('-') && !cleaned.startsWith('-')) {
    cleaned = cleaned.split('-')[0];
  }
  const n = Number(cleaned);
  return isNaN(n) || !isFinite(n) ? null : n;
}

function cleanText(v: string | undefined | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || /^(none|n\/a|null)$/i.test(s)) return null;
  return s;
}

function buildRateUnitRatesByYear(row: Record<string, string>): Record<string, unknown> | null {
  const ww = toNumber(row.winter_weekday);
  const wwe = toNumber(row.winter_weekend);
  const spw = toNumber(row.spring_weekday);
  const spwe = toNumber(row.spring_weekend);
  const suw = toNumber(row.summer_weekday);
  const suwe = toNumber(row.summer_weekend);
  const fw = toNumber(row.fall_weekday);
  const fwe = toNumber(row.fall_weekend);
  const hasAny = [ww, wwe, spw, spwe, suw, suwe, fw, fwe].some((v) => v !== null);
  if (!hasAny) return null;
  return {
    '2026': {
      winter: { weekday: ww, weekend: wwe },
      spring: { weekday: spw, weekend: spwe },
      summer: { weekday: suw, weekend: suwe },
      fall: { weekday: fw, weekend: fwe },
    },
  };
}

function getRateCategory(rate: number | null): string | null {
  if (rate == null || isNaN(rate) || !isFinite(rate)) return null;
  if (rate <= 149) return '≤$149';
  if (rate <= 249) return '$150-$249';
  if (rate <= 399) return '$250-$399';
  if (rate <= 549) return '$400-$549';
  return '$550+';
}

function csvRowToDbRow(csvRow: Record<string, string>): Record<string, unknown> {
  const dbRow: Record<string, unknown> = {};

  for (const [csvCol, csvVal] of Object.entries(csvRow)) {
    if (SKIP_COLS.has(csvCol)) continue;
    const dbCol = CSV_TO_DB[csvCol] ?? csvCol;

    if (NUMERIC_COLS.has(dbCol)) {
      dbRow[dbCol] = toNumber(csvVal);
    } else {
      dbRow[dbCol] = cleanText(csvVal);
    }
  }

  dbRow.research_status = 'new';
  dbRow.is_glamping_property = 'Yes';
  dbRow.is_closed = 'No';

  if (!dbRow.date_added) dbRow.date_added = TODAY;
  if (!dbRow.date_updated) dbRow.date_updated = TODAY;

  const rateRby = buildRateUnitRatesByYear(csvRow);
  dbRow.rate_unit_rates_by_year = rateRby ?? null;

  const avgRate =
    dbRow.rate_avg_retail_daily_rate != null
      ? (dbRow.rate_avg_retail_daily_rate as number)
      : toNumber(csvRow.avg__rate__next_12_months_);
  if (!dbRow.rate_category && avgRate != null) {
    dbRow.rate_category = getRateCategory(avgRate);
  }
  if (dbRow.rate_avg_retail_daily_rate == null && avgRate != null) {
    dbRow.rate_avg_retail_daily_rate = avgRate;
  }

  // Normalize operating_season_months to numeric (1-12)
  const osm = dbRow.operating_season_months;
  if (osm != null && typeof osm === 'string') {
    const s = osm.trim();
    const num = parseInt(s, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      dbRow.operating_season_months = String(num);
    } else {
      const textToMonths: Record<string, string> = {
        'year-round': '12', 'year round': '12', 'yearround': '12',
        'april-october': '7', 'april-oct': '7', 'apr-oct': '7',
        'may-september': '5', 'may-sept': '5', 'may-sep': '5',
        'may-october': '6', 'may-oct': '6',
        'seasonal': '6', '4-10': '7', '5-10': '6', '5-11': '7', '4-6': '3',
      };
      const normalized = textToMonths[s.toLowerCase()];
      if (normalized) dbRow.operating_season_months = normalized;
    }
  }

  return dbRow;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const cwd = process.cwd();

  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: checkErr } = await supabase.from(TABLE).select('id').limit(0);
  if (checkErr) {
    console.error(`Table '${TABLE}' not accessible: ${checkErr.message}`);
    process.exit(1);
  }

  const allRows: Record<string, unknown>[] = [];

  for (const relativePath of EUROPE_CSV_PATHS) {
    const csvPath = resolve(cwd, relativePath);
    console.log(`Reading ${relativePath}...`);
    let raw: string;
    try {
      raw = readFileSync(csvPath, 'utf-8');
    } catch (e) {
      console.error(`  Failed to read: ${(e as Error).message}`);
      process.exit(1);
    }
    const rows: Record<string, string>[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      cast: false,
    });
    for (const row of rows) {
      allRows.push(csvRowToDbRow(row));
    }
    console.log(`  ${rows.length} rows`);
  }

  console.log(`\nTotal rows to insert: ${allRows.length}`);

  if (dryRun) {
    console.log('\n--dry-run: No data written.');
    if (allRows.length > 0) {
      console.log('Sample row:');
      console.log(JSON.stringify(allRows[0], null, 2));
    }
    return;
  }

  const BATCH = 500;
  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const totalBatches = Math.ceil(allRows.length / BATCH);

    const { error } = await supabase.from(TABLE).insert(batch);
    if (error) {
      console.error(`Batch ${batchNum}/${totalBatches} FAILED: ${error.message}`);
      if (error.message.includes('invalid input')) {
        console.error('Sample row:', JSON.stringify(batch[0], null, 2));
      }
      errors += batch.length;
    } else {
      uploaded += batch.length;
      console.log(`Batch ${batchNum}/${totalBatches} OK (${batch.length} rows)`);
    }
  }

  console.log(`\nDone. Uploaded: ${uploaded}, Errors: ${errors}`);
  if (errors > 0) process.exit(1);

  const { count } = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
  console.log(`Total rows in table: ${count}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
