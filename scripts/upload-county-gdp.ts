/**
 * Script to upload County GDP CSV files to Supabase table 'county-gdp'
 * 
 * Usage:
 *   npx tsx scripts/upload-county-gdp.ts
 * 
 * The script will automatically:
 *   - Read all CSV files in csv/gdp/
 *   - Extract year from filename or column header
 *   - Merge data by GeoFips code
 *   - Upload to Supabase
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, readdirSync } from 'fs';
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

const TABLE_NAME = 'county-gdp';
const GDP_DIR = resolve(process.cwd(), 'csv/gdp');

interface CSVRow {
  [key: string]: string;
}

interface CountyGDPData {
  geofips: string;
  geoname: string;
  [key: string]: string | number | null; // Dynamic year columns: gdp_2001, gdp_2002, etc.
}

/**
 * Extract year from filename
 * Examples: "2001.csv" -> 2001, "2023-gdp-arts-entertainment-recreation-accommadations-foodservices.csv" -> 2023
 */
function extractYearFromFilename(filename: string): number | null {
  // Try to match year at the start of filename
  const match = filename.match(/^(\d{4})/);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year >= 2000 && year <= 2030) {
      return year;
    }
  }
  return null;
}

/**
 * Parse a numeric GDP value from CSV
 * Handles: numbers, "(D)" for suppressed data, empty strings, commas
 */
function parseGDPValue(value: string | undefined): number | null {
  if (!value || value.trim() === '') {
    return null;
  }
  
  // Handle suppressed data markers
  if (value.trim() === '(D)' || value.trim() === 'D' || value.trim() === '--' || value.trim() === 'N/A') {
    return null;
  }
  
  // Remove commas and quotes
  const cleaned = value.replace(/[,"]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse CSV file and extract GDP data for a specific year
 */
function parseGDPCSV(filePath: string, year: number): Map<string, { geofips: string; geoname: string; gdp: number | null }> {
  try {
    console.log(`📖 Reading CSV file: ${filePath} (Year: ${year})`);
    let fileContent = readFileSync(filePath, 'utf-8');
    
    // Remove UTF-8 BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    // Split into lines
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const dataMap = new Map<string, { geofips: string; geoname: string; gdp: number | null }>();
    
    // Find the header row (contains GeoFips, GeoName, and year)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].includes('GeoFips') && lines[i].includes('GeoName')) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.warn(`⚠️  Could not find header row in ${filePath}`);
      return dataMap;
    }
    
    // Parse the header row using csv-parse to handle quoted values properly
    let headerRow: string[] = [];
    try {
      const headerRecords = parse(lines[headerRowIndex], {
        columns: false,
        skip_empty_lines: true,
        trim: true,
      }) as string[][];
      if (headerRecords.length > 0) {
        headerRow = headerRecords[0];
      }
    } catch (error) {
      // Fallback to simple split if csv-parse fails
      headerRow = lines[headerRowIndex].split(',').map(col => col.trim());
    }
    
    // Find column indices
    let geofipsIndex = -1;
    let geonameIndex = -1;
    let gdpIndex = -1;
    
    for (let i = 0; i < headerRow.length; i++) {
      const col = headerRow[i].trim();
      if (col === 'GeoFips') {
        geofipsIndex = i;
      } else if (col === 'GeoName') {
        geonameIndex = i;
      } else if (col === year.toString()) {
        gdpIndex = i;
      }
    }
    
    if (geofipsIndex === -1 || geonameIndex === -1 || gdpIndex === -1) {
      console.warn(`⚠️  Could not find required columns in ${filePath}`);
      console.warn(`   Found columns: ${headerRow.join(', ')}`);
      console.warn(`   Looking for: GeoFips, GeoName, ${year}`);
      return dataMap;
    }
    
    // Parse data rows using csv-parse
    const dataLines = lines.slice(headerRowIndex + 1);
    const dataContent = dataLines.join('\n');
    
    try {
      const records = parse(dataContent, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as string[][];
      
      for (const record of records) {
        if (record.length <= Math.max(geofipsIndex, geonameIndex, gdpIndex)) {
          continue; // Skip incomplete rows
        }
        
        const geofips = record[geofipsIndex]?.trim();
        const geoname = record[geonameIndex]?.trim().replace(/^"|"$/g, ''); // Remove quotes
        const gdpValue = record[gdpIndex]?.trim();
        
        if (!geofips || !geoname) {
          continue; // Skip rows without required data
        }
        
        const gdp = parseGDPValue(gdpValue);
        dataMap.set(geofips, { geofips, geoname, gdp });
      }
    } catch (error) {
      console.error(`⚠️  Error parsing CSV data rows: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue with empty map
    }
    
    console.log(`✅ Parsed ${dataMap.size} counties from ${filePath}`);
    return dataMap;
  } catch (error) {
    console.error(`❌ Error reading CSV file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Merge all GDP data by GeoFips
 */
function mergeGDPData(allData: Map<number, Map<string, { geofips: string; geoname: string; gdp: number | null }>>): CountyGDPData[] {
  console.log('\n🔄 Merging data by GeoFips...');
  
  // Collect all unique GeoFips codes
  const allGeoFips = new Set<string>();
  for (const yearData of allData.values()) {
    for (const geofips of yearData.keys()) {
      allGeoFips.add(geofips);
    }
  }
  
  // Build merged records
  const mergedData: CountyGDPData[] = [];
  
  for (const geofips of allGeoFips) {
    // Get geoname from any year (they should all be the same)
    let geoname = '';
    for (const yearData of allData.values()) {
      const countyData = yearData.get(geofips);
      if (countyData) {
        geoname = countyData.geoname;
        break;
      }
    }
    
    if (!geoname) {
      continue; // Skip if no geoname found
    }
    
    const record: CountyGDPData = {
      geofips,
      geoname,
    };
    
    // Add GDP values for each year
    for (const [year, yearData] of allData.entries()) {
      const countyData = yearData.get(geofips);
      record[`gdp_${year}`] = countyData?.gdp ?? null;
    }
    
    mergedData.push(record);
  }
  
  console.log(`✅ Merged ${mergedData.length} counties with data from ${allData.size} years`);
  return mergedData;
}

/**
 * Upload data to Supabase
 */
async function uploadData(supabase: ReturnType<typeof createClient>, data: CountyGDPData[]): Promise<void> {
  console.log(`\n📤 Uploading ${data.length} records to Supabase...`);
  
  const BATCH_SIZE = 1000;
  let uploaded = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(batch, {
        onConflict: 'geofips',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.error(`❌ Error uploading batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      throw error;
    }
    
    uploaded += batch.length;
    console.log(`  ✅ Uploaded ${uploaded}/${data.length} records...`);
  }
  
  console.log(`\n✅ Successfully uploaded ${uploaded} records to '${TABLE_NAME}' table`);
}

/**
 * Check if table exists
 */
async function checkTableExists(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .limit(0);
  
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
      return false;
    }
    throw error;
  }
  
  return true;
}

/**
 * Main function
 */
async function main() {
  try {
    // Get all CSV files in the GDP directory
    console.log(`\n📁 Scanning directory: ${GDP_DIR}`);
    const files = readdirSync(GDP_DIR)
      .filter(file => file.endsWith('.csv'))
      .sort();
    
    if (files.length === 0) {
      console.error('❌ No CSV files found in csv/gdp/ directory');
      process.exit(1);
    }
    
    console.log(`✅ Found ${files.length} CSV files`);
    
    // Parse all CSV files
    const allData = new Map<number, Map<string, { geofips: string; geoname: string; gdp: number | null }>>();
    
    for (const file of files) {
      const year = extractYearFromFilename(file);
      if (!year) {
        console.warn(`⚠️  Could not extract year from filename: ${file}, skipping...`);
        continue;
      }
      
      const filePath = resolve(GDP_DIR, file);
      const yearData = parseGDPCSV(filePath, year);
      allData.set(year, yearData);
    }
    
    if (allData.size === 0) {
      console.error('❌ No valid data found in CSV files');
      process.exit(1);
    }
    
    // Merge data
    const mergedData = mergeGDPData(allData);
    
    // Connect to Supabase
    console.log('\n🔌 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Check if table exists
    const tableExists = await checkTableExists(supabase);
    if (!tableExists) {
      console.error('\n❌ Table does not exist!');
      console.error('Please run the SQL script first:');
      console.error('  scripts/create-county-gdp-table.sql');
      console.error('\nOr run it in your Supabase SQL Editor.');
      process.exit(1);
    }
    
    // Upload data
    await uploadData(supabase, mergedData);
    
    console.log('\n🎉 Upload completed successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Verify the data in Supabase Dashboard → Table Editor → ${TABLE_NAME}`);
    console.log(`  2. Check Row Level Security policies if you need public access`);
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
