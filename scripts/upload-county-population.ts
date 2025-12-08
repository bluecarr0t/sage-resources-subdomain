/**
 * Script to upload County Population CSV files to Supabase table 'county-population'
 * 
 * Usage:
 *   npx tsx scripts/upload-county-population.ts
 * 
 * The script will automatically use:
 *   - csv/population/2010-censes-by-county.csv
 *   - csv/population/2020-census-by-county.csv
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'county-population';
const CSV_2010_PATH = resolve(process.cwd(), 'csv/population/2010-censes-by-county.csv');
const CSV_2020_PATH = resolve(process.cwd(), 'csv/population/2020-census-by-county.csv');

interface CSVRow {
  [key: string]: string;
}

interface CountyData {
  geo_id: string;
  name: string;
  population_2010: number | null;
  population_2020: number | null;
  change: number | null;
}

/**
 * Parse CSV file and return array of objects
 */
function parseCSV(filePath: string): CSVRow[] {
  try {
    console.log(`📖 Reading CSV file: ${filePath}`);
    let fileContent = readFileSync(filePath, 'utf-8');
    
    // Remove UTF-8 BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    const records = parse(fileContent, {
      columns: true, // Use first line as column names
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      cast: false,
      bom: true, // Handle BOM automatically
    }) as CSVRow[];
    
    console.log(`✅ Parsed ${records.length} rows from CSV`);
    return records;
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Parse a single row for 2020 census data
 */
function parse2020Row(row: CSVRow): { geoId: string; name: string; population: number | null } | null {
  const geoId = row.GEO_ID?.trim();
  const name = row.NAME?.trim();
  const populationStr = row.P1_001N?.trim(); // Total population column for 2020

  if (!geoId || !name || name === 'Geography' || name === 'Geographic Area Name') {
    return null; // Skip header rows
  }

  const population = populationStr ? parseInt(populationStr, 10) : null;
  if (population !== null && isNaN(population)) {
    return null;
  }

  return { geoId, name, population };
}

/**
 * Parse a single row for 2010 census data
 */
function parse2010Row(row: CSVRow): { geoId: string; name: string; population: number | null } | null {
  const geoId = row.GEO_ID?.trim();
  const name = row.NAME?.trim();
  const populationStr = row.P001001?.trim(); // Total population column for 2010

  if (!geoId || !name || name === 'Geography' || name === 'Geographic Area Name') {
    return null; // Skip header rows
  }

  const population = populationStr ? parseInt(populationStr, 10) : null;
  if (population !== null && isNaN(population)) {
    return null;
  }

  return { geoId, name, population };
}

/**
 * Calculate percentage change from 2010 to 2020
 */
function calculateChange(pop2010: number | null, pop2020: number | null): number | null {
  if (pop2010 === null || pop2020 === null || pop2010 <= 0) {
    return null;
  }
  
  return parseFloat(((pop2020 - pop2010) / pop2010 * 100).toFixed(2));
}

/**
 * Combine 2010 and 2020 data by GEO_ID
 */
function combineCountyData(data2010: CSVRow[], data2020: CSVRow[]): Map<string, CountyData> {
  const combined = new Map<string, CountyData>();

  // Process 2020 data first
  for (const row of data2020) {
    const parsed = parse2020Row(row);
    if (parsed) {
      combined.set(parsed.geoId, {
        geo_id: parsed.geoId,
        name: parsed.name,
        population_2010: null,
        population_2020: parsed.population,
        change: null,
      });
    }
  }

  // Process 2010 data and merge
  for (const row of data2010) {
    const parsed = parse2010Row(row);
    if (parsed) {
      const existing = combined.get(parsed.geoId);
      if (existing) {
        // Update existing entry with 2010 data
        existing.population_2010 = parsed.population;
        // Calculate change percentage
        existing.change = calculateChange(existing.population_2010, existing.population_2020);
        // Use 2020 name if available, otherwise use 2010 name
        if (!existing.name || existing.name === '') {
          existing.name = parsed.name;
        }
      } else {
        // Add new entry for 2010-only counties
        combined.set(parsed.geoId, {
          geo_id: parsed.geoId,
          name: parsed.name,
          population_2010: parsed.population,
          population_2020: null,
          change: null,
        });
      }
    }
  }

  // Calculate change for any entries that might have been missed
  for (const county of combined.values()) {
    if (county.change === null && county.population_2010 !== null && county.population_2020 !== null) {
      county.change = calculateChange(county.population_2010, county.population_2020);
    }
  }

  return combined;
}

/**
 * Check if table exists
 */
async function ensureTableExists(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .limit(0);
  
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
      console.log('\n⚠️  Table does not exist. Please create it in Supabase first.');
      console.log('\n📝 Run the SQL script: scripts/create-county-population-table.sql');
      console.log('   Or go to Supabase Dashboard → SQL Editor and run the SQL from that file.\n');
      throw new Error('Table does not exist. Please create it first using scripts/create-county-population-table.sql');
    } else {
      throw error;
    }
  } else {
    console.log(`✅ Table '${TABLE_NAME}' exists`);
  }
}

/**
 * Upload data to Supabase in batches
 */
async function uploadToSupabase(supabase: ReturnType<typeof createClient>, data: CountyData[]): Promise<void> {
  const BATCH_SIZE = 1000;
  let uploaded = 0;
  let errors = 0;

  console.log(`\n📤 Uploading ${data.length} counties to Supabase...`);

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    try {
      // Use upsert to handle existing records
      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(batch, {
          onConflict: 'geo_id',
        });

      if (error) {
        console.error(`❌ Error uploading batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        errors += batch.length;
      } else {
        uploaded += batch.length;
        console.log(`✅ Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)} (${uploaded}/${data.length} counties)`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, err);
      errors += batch.length;
    }
  }

  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Successfully uploaded: ${uploaded} counties`);
  if (errors > 0) {
    console.log(`   ❌ Errors: ${errors} counties`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting County Population Data Upload\n');

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, secretKey);

    // Check if table exists
    await ensureTableExists(supabase);

    // Parse CSV files
    console.log('\n📖 Parsing CSV files...');
    const data2010 = parseCSV(CSV_2010_PATH);
    const data2020 = parseCSV(CSV_2020_PATH);

    // Combine data
    console.log('\n🔄 Combining 2010 and 2020 data...');
    const combinedData = combineCountyData(data2010, data2020);
    const countyArray = Array.from(combinedData.values());

    console.log(`✅ Combined data: ${countyArray.length} unique counties`);
    
    // Count counties with data for each year
    const with2010 = countyArray.filter(c => c.population_2010 !== null).length;
    const with2020 = countyArray.filter(c => c.population_2020 !== null).length;
    const withBoth = countyArray.filter(c => c.population_2010 !== null && c.population_2020 !== null).length;
    
    console.log(`   - Counties with 2010 data: ${with2010}`);
    console.log(`   - Counties with 2020 data: ${with2020}`);
    console.log(`   - Counties with both years: ${withBoth}`);

    // Upload to Supabase
    await uploadToSupabase(supabase, countyArray);

    console.log('\n🎉 Upload complete!');
  } catch (error) {
    console.error('\n❌ Upload failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
main();
