#!/usr/bin/env npx tsx
/**
 * Combine all European country glamping property CSV files into a single file
 * 
 * This script:
 * - Reads all 9 European country CSV files
 * - Removes Google columns (moved to separate table)
 * - Adds missing schema columns with defaults
 * - Ensures column order matches database schema
 * - Combines all properties into a single CSV file
 * 
 * Usage:
 *   npx tsx scripts/combine-europe-glamping-csv.ts
 */

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { resolve } from 'path';

// Define all country CSV files
const COUNTRY_CSV_FILES = [
  { path: 'csv/glamping-properties/europe/france-glamping-resorts.csv', country: 'France' },
  { path: 'csv/glamping-properties/europe/italy-glamping-resorts.csv', country: 'Italy' },
  { path: 'csv/glamping-properties/europe/spain-glamping-resorts.csv', country: 'Spain' },
  { path: 'csv/glamping-properties/europe/uk-glamping-resorts.csv', country: 'UK' },
  { path: 'csv/glamping-properties/europe/germany-glamping-resorts.csv', country: 'Germany' },
  { path: 'csv/glamping-properties/europe/portugal-glamping-resorts.csv', country: 'Portugal' },
  { path: 'csv/glamping-properties/europe/netherlands-glamping-resorts.csv', country: 'Netherlands' },
  { path: 'csv/glamping-properties/europe/belgium-glamping-resorts.csv', country: 'Belgium' },
  { path: 'csv/glamping-properties/europe/switzerland-glamping-resorts.csv', country: 'Switzerland' },
];

const OUTPUT_FILE = 'csv/glamping-properties/europe/all-europe-glamping-properties.csv';

// Define column order matching database schema (excluding auto-generated columns)
const SCHEMA_COLUMNS = [
  'duplicatenote',
  'source',
  'date_added',
  'date_updated',
  'property_name',
  'site_name',
  'unit_type',
  'property_type',
  'property__total_sites',
  'quantity_of_units',
  'unit_capacity',
  'year_site_opened',
  'operating_season__months_',
  '__of_locations',
  'address',
  'city',
  'state',
  'zip_code',
  'country',
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
  'avg__rate__next_12_months_',
  'high_rate__next_12_months_',
  'low_rate__next_12_months_',
  'winter_weekday',
  'winter_weekend',
  'spring_weekday',
  'spring_weekend',
  'summer_weekday',
  'summer_weekend',
  'fall_weekday',
  'fall_weekend',
  'url',
  'description',
  'minimum_nights',
  'getting_there',
  'lon',
  'lat',
  'toilet',
  'hot_tub___sauna',
  'pool',
  'pets',
  'water',
  'shower',
  'trash',
  'cooking_equipment',
  'picnic_table',
  'wifi',
  'laundry',
  'campfires',
  'playground',
  'rv___vehicle_length',
  'rv___parking',
  'rv___accommodates_slideout',
  'rv___surface_type',
  'rv___surface_level',
  'rv___vehicles__fifth_wheels',
  'rv___vehicles__class_a_rvs',
  'rv___vehicles__class_b_rvs',
  'rv___vehicles__class_c_rvs',
  'rv___vehicles__toy_hauler',
  'fishing',
  'surfing',
  'horseback_riding',
  'paddling',
  'climbing',
  'off_roading__ohv_',
  'boating',
  'swimming',
  'wind_sports',
  'snow_sports',
  'whitewater_paddling',
  'fall_fun',
  'hiking',
  'wildlife_watching',
  'biking',
  'ranch',
  'beach',
  'coastal',
  'suburban',
  'forest',
  'field',
  'wetlands',
  'hot_spring',
  'desert',
  'canyon',
  'waterfall',
  'swimming_hole',
  'lake',
  'cave',
  'redwoods',
  'farm',
  'river__stream__or_creek',
  'mountainous',
  'sage___p__amenity__food_on_site',
  'waterfront',
  'restaurant',
  'dog_park',
  'clubhouse',
  'canoeing___kayaking',
  'alcohol_available',
  'golf_cart_rental',
  'private_bathroom',
  'waterpark',
  'kitchen',
  'patio',
  'electricity',
  'general_store',
  'cable',
  'charcoal_grill',
  'sewer_hook_up',
  'electrical_hook_up',
  'generators_allowed',
  'water_hookup',
  'rate_category',
  'phone_number',
  'quality_score',
  'is_glamping_property',
  'is_closed',
  'unit_hot_tub',
  'unit_suana',
  'property_hot_tub',
  'property_suana',
  'discovery_source',
  'u_source',
  'data_date',
];

/**
 * Read a CSV file and return parsed rows
 */
function readCSVFile(filePath: string): Record<string, string>[] {
  const fullPath = resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return [];
  }

  try {
    const csvContent = fs.readFileSync(fullPath, 'utf-8');
    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    
    return rows;
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error);
    return [];
  }
}

/**
 * Filter out Google columns from a row
 */
function removeGoogleColumns(row: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(row)) {
    if (!key.startsWith('google_')) {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

/**
 * Normalize a row to match schema columns
 */
function normalizeRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  
  // Initialize all schema columns with empty strings
  for (const col of SCHEMA_COLUMNS) {
    normalized[col] = '';
  }
  
  // Copy values from source row (case-insensitive matching)
  const sourceKeys = Object.keys(row);
  const sourceLowerMap = new Map<string, string>();
  for (const key of sourceKeys) {
    sourceLowerMap.set(key.toLowerCase(), key);
  }
  
  for (const col of SCHEMA_COLUMNS) {
    const sourceKey = sourceLowerMap.get(col.toLowerCase());
    if (sourceKey && row[sourceKey] !== undefined && row[sourceKey] !== null) {
      normalized[col] = String(row[sourceKey]).trim();
    }
  }
  
  // Set defaults
  if (!normalized.is_glamping_property) {
    normalized.is_glamping_property = 'Yes';
  }
  if (!normalized.is_closed) {
    normalized.is_closed = 'No';
  }
  
  return normalized;
}

/**
 * Deduplicate rows based on property_name + country
 */
function deduplicateRows(rows: Record<string, string>[]): Record<string, string>[] {
  const seen = new Set<string>();
  const unique: Record<string, string>[] = [];
  let duplicates = 0;
  
  for (const row of rows) {
    const key = `${(row.property_name || '').toLowerCase().trim()}|${(row.country || '').toLowerCase().trim()}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    } else {
      duplicates++;
    }
  }
  
  if (duplicates > 0) {
    console.log(`  ⚠️  Removed ${duplicates} duplicate properties`);
  }
  
  return unique;
}

/**
 * Main function
 */
function main() {
  console.log('='.repeat(70));
  console.log('Combine Europe Glamping Properties CSV Files');
  console.log('='.repeat(70));
  console.log();

  const allRows: Record<string, string>[] = [];
  const stats: Record<string, number> = {};

  // Read all country CSV files
  console.log('📖 Reading country CSV files...\n');
  
  for (const { path, country } of COUNTRY_CSV_FILES) {
    const rows = readCSVFile(path);
    
    if (rows.length === 0) {
      console.log(`  ⚠️  ${country}: File not found or empty`);
      stats[country] = 0;
      continue;
    }

    // Remove Google columns and normalize
    const processed = rows.map(row => {
      const filtered = removeGoogleColumns(row);
      return normalizeRow(filtered);
    });

    allRows.push(...processed);
    stats[country] = processed.length;
    console.log(`  ✓ ${country}: ${processed.length} properties`);
  }

  console.log();
  console.log(`📊 Total properties read: ${allRows.length}`);
  console.log();

  if (allRows.length === 0) {
    console.log('❌ No properties found in any CSV files. Exiting.');
    return;
  }

  // Deduplicate
  console.log('🔍 Checking for duplicates...');
  const uniqueRows = deduplicateRows(allRows);
  console.log(`  ✓ ${uniqueRows.length} unique properties after deduplication`);
  console.log();

  // Ensure output directory exists
  const outputDir = resolve(process.cwd(), OUTPUT_FILE.substring(0, OUTPUT_FILE.lastIndexOf('/')));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write combined CSV
  console.log(`📝 Writing combined CSV to: ${OUTPUT_FILE}`);
  const csvContent = stringify(uniqueRows, {
    header: true,
    columns: SCHEMA_COLUMNS,
  });

  const outputPath = resolve(process.cwd(), OUTPUT_FILE);
  fs.writeFileSync(outputPath, csvContent, 'utf-8');

  console.log(`  ✓ Successfully wrote ${uniqueRows.length} properties`);
  console.log(`  ✓ Total columns: ${SCHEMA_COLUMNS.length}`);
  console.log();

  // Print summary statistics
  console.log('='.repeat(70));
  console.log('Summary Statistics');
  console.log('='.repeat(70));
  console.log();
  
  for (const [country, count] of Object.entries(stats)) {
    if (count > 0) {
      console.log(`  ${country}: ${count} properties`);
    }
  }
  
  console.log();
  console.log(`  Total: ${uniqueRows.length} unique properties`);
  console.log();
  console.log('='.repeat(70));
  console.log('✅ Complete!');
  console.log('='.repeat(70));
}

// Run the script
main();
