/**
 * Script to upload USA GDP CSV file to Supabase table 'usa-gdp'
 * 
 * Usage:
 *   npx tsx scripts/upload-usa-gdp.ts
 * 
 * The script will automatically use:
 *   - csv/gdp/lagdp1224.csv
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { normalizeCountyName } from '../lib/population/parse-population-csv';

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

const TABLE_NAME = 'usa-gdp';
const CSV_PATH = resolve(process.cwd(), 'csv/gdp/lagdp1224.csv');

interface GDPData {
  county_name: string;
  state_name: string;
  gdp_2020: number | null;
  gdp_2021: number | null;
  gdp_2022: number | null;
  gdp_2023: number | null;
  change_2021: number | null;
  change_2022: number | null;
  change_2023: number | null;
  rank_2023: number | null;
  rank_change_2023: number | null;
  fips_code: string | null;
}

/**
 * Parse a numeric value from CSV (handles commas and quotes)
 */
function parseNumeric(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value === '--' || value === 'N/A') {
    return null;
  }
  
  // Remove commas and quotes
  const cleaned = value.replace(/[,"]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse an integer value from CSV
 */
function parseIntValue(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value === '--' || value === 'N/A') {
    return null;
  }
  
  const cleaned = value.replace(/[,"]/g, '');
  const parsed = parseInt(cleaned, 10);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Get FIPS code from county-population table by matching county name and state
 */
async function getFIPSCode(
  supabase: ReturnType<typeof createClient>,
  countyName: string,
  stateName: string
): Promise<string | null> {
  try {
    // Try to find matching county in population table
    // The name format in population table is typically "County Name, State"
    const searchName = `${countyName} County, ${stateName}`;
    const normalizedSearchName = normalizeCountyName(searchName);
    
    const { data, error } = await supabase
      .from('county-population')
      .select('geo_id, name')
      .limit(1000); // Get all counties to search locally
    
    if (error || !data) {
      return null;
    }
    
    // Search for matching county
    for (const row of data) {
      const normalizedRowName = normalizeCountyName(row.name);
      if (normalizedRowName === normalizedSearchName) {
        // Extract FIPS from geo_id (format: "0500000US01001" -> "01001")
        const match = row.geo_id.match(/US(\d+)$/);
        return match ? match[1] : null;
      }
    }
    
    // Try without "County" suffix
    const searchName2 = `${countyName}, ${stateName}`;
    const normalizedSearchName2 = normalizeCountyName(searchName2);
    
    for (const row of data) {
      const normalizedRowName = normalizeCountyName(row.name);
      if (normalizedRowName === normalizedSearchName2) {
        const match = row.geo_id.match(/US(\d+)$/);
        return match ? match[1] : null;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error looking up FIPS for ${countyName}, ${stateName}:`, error);
    return null;
  }
}

/**
 * Parse CSV file and extract GDP data
 */
function parseGDPCSV(filePath: string): GDPData[] {
  try {
    console.log(`📖 Reading CSV file: ${filePath}`);
    let fileContent = readFileSync(filePath, 'utf-8');
    
    // Remove UTF-8 BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    
    // Parse CSV - we'll parse it line by line since the structure is complex
    const lines = fileContent.split('\n');
    const gdpData: GDPData[] = [];
    let currentState: string | null = null;
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Skip header rows (lines 1-4)
      if (lineNumber <= 4) continue;
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Parse the line as CSV
      const records = parse(line, {
        columns: false,
        skip_empty_lines: false,
        relax_column_count: true,
        trim: true,
      }) as string[][];
      
      if (records.length === 0 || records[0].length === 0) continue;
      
      const row = records[0];
      const firstColumn = row[0]?.trim() || '';
      
      // Skip United States total
      if (firstColumn === 'United States') continue;
      
      // Skip footer/notes
      if (firstColumn.startsWith('U.S. Bureau') || firstColumn.startsWith('1.') || firstColumn === '') {
        continue;
      }
      
      // Check if this is a state name (states typically have GDP values in the billions)
      // States don't have rank values (they have '--')
      const rankValue = row[5]?.trim();
      const isStateRow = rankValue === '--' && firstColumn && 
                        !firstColumn.includes('County') && 
                        !firstColumn.includes('Borough') &&
                        !firstColumn.includes('Census Area') &&
                        !firstColumn.includes('Municipality') &&
                        !firstColumn.includes('Parish') &&
                        !firstColumn.includes('City');
      
      if (isStateRow) {
        currentState = firstColumn;
        console.log(`📍 Found state: ${currentState}`);
        continue;
      }
      
      // This should be a county row
      if (!currentState) {
        // Skip if we haven't found a state yet
        continue;
      }
      
      const countyName = firstColumn;
      
      // Skip if county name is empty
      if (!countyName) continue;
      
      // Parse GDP values (columns 1-4, but CSV parser uses 0-based indexing)
      // Row format: [county, gdp2020, gdp2021, gdp2022, gdp2023, rank2023, change2021, change2022, change2023, rankChange2023]
      const gdp_2020 = parseNumeric(row[1]);
      const gdp_2021 = parseNumeric(row[2]);
      const gdp_2022 = parseNumeric(row[3]);
      const gdp_2023 = parseNumeric(row[4]);
      const rank_2023 = parseIntValue(row[5]);
      const change_2021 = parseNumeric(row[6]);
      const change_2022 = parseNumeric(row[7]);
      const change_2023 = parseNumeric(row[8]);
      const rank_change_2023 = parseIntValue(row[9]);
      
      // Only add if we have at least some GDP data
      if (gdp_2020 !== null || gdp_2021 !== null || gdp_2022 !== null || gdp_2023 !== null) {
        gdpData.push({
          county_name: countyName,
          state_name: currentState,
          gdp_2020,
          gdp_2021,
          gdp_2022,
          gdp_2023,
          change_2021,
          change_2022,
          change_2023,
          rank_2023,
          rank_change_2023,
          fips_code: null, // Will be populated later
        });
      }
    }
    
    console.log(`✅ Parsed ${gdpData.length} counties from CSV`);
    return gdpData;
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
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
      console.log('\n📝 Run the SQL script: scripts/create-usa-gdp-table.sql');
      console.log('   Or go to Supabase Dashboard → SQL Editor and run the SQL from that file.\n');
      throw new Error('Table does not exist. Please create it first using scripts/create-usa-gdp-table.sql');
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
async function uploadToSupabase(supabase: ReturnType<typeof createClient>, data: GDPData[]): Promise<void> {
  const BATCH_SIZE = 1000;
  let uploaded = 0;
  let errors = 0;

  console.log(`\n📤 Uploading ${data.length} counties to Supabase...`);

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    
    // Remove duplicates within the batch (keep the last occurrence)
    const uniqueBatch = Array.from(
      new Map(
        batch.map(item => [`${item.county_name}|${item.state_name}`, item])
      ).values()
    );
    
    if (uniqueBatch.length < batch.length) {
      console.log(`   ⚠️  Removed ${batch.length - uniqueBatch.length} duplicate(s) from batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }
    
    try {
      // Use upsert with composite primary key
      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(uniqueBatch, {
          onConflict: 'county_name,state_name',
        });

      if (error) {
        console.error(`❌ Error uploading batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        // If batch fails, try uploading one by one
        console.log(`   🔄 Retrying batch ${Math.floor(i / BATCH_SIZE) + 1} one record at a time...`);
        let batchUploaded = 0;
        let batchErrors = 0;
        for (const item of uniqueBatch) {
          const { error: singleError } = await supabase
            .from(TABLE_NAME)
            .upsert([item], {
              onConflict: 'county_name,state_name',
            });
          if (singleError) {
            console.error(`   ❌ Failed to upload ${item.county_name}, ${item.state_name}:`, singleError.message);
            batchErrors++;
          } else {
            batchUploaded++;
          }
        }
        uploaded += batchUploaded;
        errors += batchErrors;
        if (batchUploaded > 0) {
          console.log(`   ✅ Retry successful: ${batchUploaded}/${uniqueBatch.length} records uploaded`);
        }
      } else {
        uploaded += uniqueBatch.length;
        console.log(`✅ Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)} (${uploaded}/${data.length} counties)`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, err);
      errors += uniqueBatch.length;
    }
  }

  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Successfully uploaded: ${uploaded} counties`);
  if (errors > 0) {
    console.log(`   ❌ Errors: ${errors} counties`);
  }
}

/**
 * Update FIPS codes for all records
 */
async function updateFIPSCodes(supabase: ReturnType<typeof createClient>): Promise<void> {
  console.log('\n🔍 Looking up FIPS codes for counties...');
  
  // Get all GDP records without FIPS codes
  const { data: gdpRecords, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('county_name, state_name, fips_code')
    .is('fips_code', null);
  
  if (fetchError) {
    console.error('❌ Error fetching GDP records:', fetchError);
    return;
  }
  
  if (!gdpRecords || gdpRecords.length === 0) {
    console.log('✅ All counties already have FIPS codes');
    return;
  }
  
  console.log(`   Found ${gdpRecords.length} counties without FIPS codes`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const record of gdpRecords) {
    const fipsCode = await getFIPSCode(supabase, record.county_name, record.state_name);
    
    if (fipsCode) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ fips_code: fipsCode })
        .eq('county_name', record.county_name)
        .eq('state_name', record.state_name);
      
      if (error) {
        console.error(`❌ Error updating FIPS for ${record.county_name}, ${record.state_name}:`, error);
      } else {
        updated++;
        if (updated % 100 === 0) {
          console.log(`   Updated ${updated}/${gdpRecords.length} FIPS codes...`);
        }
      }
    } else {
      notFound++;
      if (notFound <= 10) {
        console.warn(`   ⚠️  Could not find FIPS for: ${record.county_name}, ${record.state_name}`);
      }
    }
  }
  
  console.log(`\n📊 FIPS Code Update Summary:`);
  console.log(`   ✅ Updated: ${updated} counties`);
  if (notFound > 0) {
    console.log(`   ⚠️  Not found: ${notFound} counties`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting USA GDP Data Upload\n');

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, secretKey);

    // Check if table exists
    await ensureTableExists(supabase);

    // Parse CSV file
    console.log('\n📖 Parsing CSV file...');
    const gdpData = parseGDPCSV(CSV_PATH);

    // Upload to Supabase
    await uploadToSupabase(supabase, gdpData);

    // Update FIPS codes
    await updateFIPSCodes(supabase);

    console.log('\n🎉 Upload complete!');
  } catch (error) {
    console.error('\n❌ Upload failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
main();
