#!/usr/bin/env npx tsx
/**
 * Update rates in all_glamping_properties from CSV file
 * Matches records by property_name and site_name, then updates rate fields
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

interface CSVRow {
  'Property Name': string;
  'Site Name': string;
  'Retail Daily Rate 2024': string;
  '2024 - Fall Weekday': string;
  '2024 - Fall Weekend': string;
  '2025 - Winter Weekday': string;
  '2025 - Winter Weekend': string;
  '2025 - Spring Weekday': string;
  '2025 - Spring Weekend': string;
  '2025 - Summer Weekday': string;
  '2025 - Summer Weekend': string;
}

/**
 * Clean and parse a rate value from CSV (removes $, commas, handles ranges)
 */
function parseRate(value: string | undefined | null): number | null {
  if (!value || value.trim() === '' || value.toLowerCase() === 'n/a' || value.toLowerCase() === 'unavailable') {
    return null;
  }

  // Remove $, commas, and whitespace
  let cleaned = value.replace(/[$,\s]/g, '');

  // Handle ranges like "$1,150 - $1,450" - take the first value
  if (cleaned.includes('-')) {
    cleaned = cleaned.split('-')[0].trim();
  }

  // Parse to number
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize property and site names for matching
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function updateRatesFromCSV() {
  console.log('📊 Updating rates from CSV file...\n');

  // Read CSV file
  const csvPath = '/Users/nickharsell/Downloads/Sage Database_ Glamping Sites  - Work In Progress.csv';

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }

  console.log(`📖 Reading CSV file: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV
  const records: CSVRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`✅ Parsed ${records.length} rows from CSV\n`);

  // Fetch all properties from database
  console.log('🔍 Fetching properties from database...');
  let allProperties: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('id, property_name, site_name')
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allProperties = allProperties.concat(data);
    offset += batchSize;
    hasMore = data.length === batchSize;
  }

  console.log(`✅ Fetched ${allProperties.length} properties from database\n`);

  // Create a lookup map: normalized property_name + site_name -> property record
  const propertyMap = new Map<string, any[]>();
  for (const prop of allProperties) {
    const key = `${normalizeName(prop.property_name)}|${normalizeName(prop.site_name)}`;
    if (!propertyMap.has(key)) {
      propertyMap.set(key, []);
    }
    propertyMap.get(key)!.push(prop);
  }

  // Process CSV records and match to database
  let matchedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const updates: Array<{
    id: number;
    property_name: string | null;
    site_name: string | null;
    rates: any;
  }> = [];

  console.log('🔄 Processing CSV records and matching to database...\n');

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const csvPropertyName = normalizeName(row['Property Name']);
    const csvSiteName = normalizeName(row['Site Name']);

    if (!csvPropertyName) {
      continue; // Skip rows without property name
    }

    // Try to find matching property
    const key = `${csvPropertyName}|${csvSiteName}`;
    const matchingProps = propertyMap.get(key) || [];

    // If no exact match, try property name only (in case site_name is empty in CSV or DB)
    let propsToUpdate = matchingProps;
    if (propsToUpdate.length === 0 && !csvSiteName) {
      // Try matching by property name only when CSV site name is empty
      for (const [mapKey, props] of propertyMap.entries()) {
        const [mapPropName] = mapKey.split('|');
        if (mapPropName === csvPropertyName) {
          propsToUpdate = props;
          break;
        }
      }
    }

    if (propsToUpdate.length === 0) {
      // Try fuzzy matching - property name only
      for (const [mapKey, props] of propertyMap.entries()) {
        const [mapPropName] = mapKey.split('|');
        if (mapPropName === csvPropertyName || csvPropertyName.includes(mapPropName) || mapPropName.includes(csvPropertyName)) {
          propsToUpdate = props;
          break;
        }
      }
    }

    if (propsToUpdate.length === 0) {
      if (i < 20) {
        console.log(`  ⚠️  No match found: "${row['Property Name']}" / "${row['Site Name'] || '(empty)'}"`);
      }
      continue;
    }

    matchedCount += propsToUpdate.length;

    // Parse rates from CSV
    const rates: any = {};
    const avgRate = parseRate(row['Retail Daily Rate 2024']);
    if (avgRate !== null) {
      rates.avg_retail_daily_rate = avgRate;
    }

    const fallWeekday = parseRate(row['2024 - Fall Weekday']);
    if (fallWeekday !== null) rates.fall_weekday = fallWeekday;

    const fallWeekend = parseRate(row['2024 - Fall Weekend']);
    if (fallWeekend !== null) rates.fall_weekend = fallWeekend;

    const winterWeekday = parseRate(row['2025 - Winter Weekday']);
    if (winterWeekday !== null) rates.winter_weekday = winterWeekday;

    const winterWeekend = parseRate(row['2025 - Winter Weekend']);
    if (winterWeekend !== null) rates.winter_weekend = winterWeekend;

    const springWeekday = parseRate(row['2025 - Spring Weekday']);
    if (springWeekday !== null) rates.spring_weekday = springWeekday;

    const springWeekend = parseRate(row['2025 - Spring Weekend']);
    if (springWeekend !== null) rates.spring_weekend = springWeekend;

    const summerWeekday = parseRate(row['2025 - Summer Weekday']);
    if (summerWeekday !== null) rates.summer_weekday = summerWeekday;

    const summerWeekend = parseRate(row['2025 - Summer Weekend']);
    if (summerWeekend !== null) rates.summer_weekend = summerWeekend;

    // Skip if no rates to update
    if (Object.keys(rates).length === 0) {
      continue;
    }

    // Update all matching properties
    for (const prop of propsToUpdate) {
      const { error: updateError } = await supabase
        .from('all_glamping_properties')
        .update(rates)
        .eq('id', prop.id);

      if (updateError) {
        console.log(`  ❌ Error updating ID ${prop.id} (${prop.property_name}): ${updateError.message}`);
        errorCount++;
      } else {
        updatedCount++;
        updates.push({
          id: prop.id,
          property_name: prop.property_name,
          site_name: prop.site_name,
          rates,
        });

        if (updatedCount <= 20) {
          const rateStr = Object.entries(rates)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          console.log(`  ✓ Updated ID ${prop.id}: "${prop.property_name}" / "${prop.site_name || '(empty)'}" - ${rateStr}`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('RATE UPDATE SUMMARY');
  console.log('='.repeat(70));
  console.log(`CSV rows processed: ${records.length}`);
  console.log(`Properties matched: ${matchedCount}`);
  console.log(`Records updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('='.repeat(70));

  if (updates.length > 0) {
    console.log('\n📋 Sample updates (first 10):');
    updates.slice(0, 10).forEach((update) => {
      console.log(`  - ID ${update.id}: ${update.property_name} / ${update.site_name || '(empty)'}`);
      Object.entries(update.rates).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
    });
  }

  console.log('\n✅ Rate update complete!');
}

// Run the script
updateRatesFromCSV()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
