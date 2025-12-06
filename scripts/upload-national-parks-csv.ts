/**
 * Script to upload National Parks CSV file to Supabase table 'national-parks'
 * 
 * Usage:
 *   npx tsx scripts/upload-national-parks-csv.ts
 * 
 * The script will automatically use: csv/national-parks/national_parks.csv
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

const TABLE_NAME = 'national-parks';
const CSV_PATH = resolve(process.cwd(), 'csv/national-parks/national_parks.csv');

interface CSVRow {
  [key: string]: string | number | null;
}

/**
 * Parse CSV file and return array of objects
 */
function parseCSV(filePath: string): CSVRow[] {
  try {
    console.log(`📖 Reading CSV file: ${filePath}`);
    const fileContent = readFileSync(filePath, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true, // Use first line as column names
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow inconsistent column counts
      cast: false, // Don't auto-cast - we'll handle it manually
    }) as CSVRow[];
    
    console.log(`✅ Parsed ${records.length} rows from CSV`);
    return records;
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
      console.log('\n📝 Run the SQL script: scripts/create-national-parks-table.sql');
      console.log('   Or go to Supabase Dashboard → SQL Editor and run the SQL from that file.\n');
      throw new Error('Table does not exist. Please create it first using scripts/create-national-parks-table.sql');
    } else {
      throw error;
    }
  } else {
    console.log(`✅ Table '${TABLE_NAME}' exists`);
  }
}

/**
 * Filter and clean national park data
 */
function cleanParkData(data: CSVRow[]): CSVRow[] {
  const cleaned: CSVRow[] = [];
  
  for (const row of data) {
    // Map CSV column names to table column names
    const cleanedRow: CSVRow = {
      name: row.Name || row.name || null,
      date_established: row['Date established'] || row.date_established || null,
      area_2021: row['Area (2021)[13]'] || row['Area (2021)'] || row.area_2021 || null,
      recreation_visitors_2021: row['Recreation visitors 2021'] || row.recreation_visitors_2021 || null,
      description: row.Description || row.description || null,
      park_code: row['Park Code'] || row.park_code || null,
      state: row.State || row.state || null,
      acres: null,
      latitude: null,
      longitude: null,
    };
    
    // Convert acres to numeric
    const acresValue = row.Acres || row.acres;
    if (acresValue !== null && acresValue !== undefined && acresValue !== '') {
      const acresNum = typeof acresValue === 'number' ? acresValue : parseFloat(String(acresValue));
      if (!isNaN(acresNum) && isFinite(acresNum)) {
        cleanedRow.acres = acresNum;
      }
    }
    
    // Convert latitude to numeric
    const latValue = row.Latitude || row.latitude;
    if (latValue !== null && latValue !== undefined && latValue !== '') {
      const latNum = typeof latValue === 'number' ? latValue : parseFloat(String(latValue));
      if (!isNaN(latNum) && isFinite(latNum) && latNum >= -90 && latNum <= 90) {
        cleanedRow.latitude = latNum;
      }
    }
    
    // Convert longitude to numeric
    const lonValue = row.Longitude || row.longitude;
    if (lonValue !== null && lonValue !== undefined && lonValue !== '') {
      const lonNum = typeof lonValue === 'number' ? lonValue : parseFloat(String(lonValue));
      if (!isNaN(lonNum) && isFinite(lonNum) && lonNum >= -180 && lonNum <= 180) {
        cleanedRow.longitude = lonNum;
      }
    }
    
    // Clean string values - convert empty strings to null
    Object.keys(cleanedRow).forEach(key => {
      if (typeof cleanedRow[key] === 'string' && cleanedRow[key] === '') {
        cleanedRow[key] = null;
      }
    });
    
    // Only include parks with valid coordinates
    if (cleanedRow.latitude !== null && cleanedRow.longitude !== null) {
      cleaned.push(cleanedRow);
    } else {
      console.log(`⚠️  Skipping park "${cleanedRow.name}" - missing coordinates`);
    }
  }
  
  return cleaned;
}

/**
 * Upload data to Supabase in batches
 */
async function uploadData(
  supabase: ReturnType<typeof createClient>,
  data: CSVRow[]
): Promise<void> {
  const BATCH_SIZE = 100; // Smaller batches for safety
  
  console.log(`\n📤 Uploading ${data.length} parks to '${TABLE_NAME}' table...`);
  
  let uploaded = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);
    
    console.log(`  📦 Uploading batch ${batchNumber}/${totalBatches} (${batch.length} parks)...`);
    
    const { error, count } = await supabase
      .from(TABLE_NAME)
      .insert(batch);
    
    if (error) {
      console.error(`  ❌ Error uploading batch ${batchNumber}: ${error.message}`);
      console.error(`     Error code: ${error.code}`);
      if (error.message.includes('invalid input syntax')) {
        console.error(`     This usually means a non-numeric value was sent to a NUMERIC column.`);
        console.error(`     Sample row from batch:`, JSON.stringify(batch[0], null, 2));
      }
      errors += batch.length;
    } else {
      uploaded += batch.length;
      console.log(`  ✅ Batch ${batchNumber} uploaded successfully`);
    }
  }
  
  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Successfully uploaded: ${uploaded} parks`);
  if (errors > 0) {
    console.log(`   ❌ Failed: ${errors} parks`);
  }
  
  if (errors > 0) {
    throw new Error(`Failed to upload ${errors} parks`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse CSV
    const csvData = parseCSV(CSV_PATH);
    
    if (csvData.length === 0) {
      console.error('❌ CSV file is empty or has no data rows');
      process.exit(1);
    }
    
    // Get column names from first row
    const columns = Object.keys(csvData[0]);
    console.log(`\n📋 Detected columns: ${columns.join(', ')}`);
    
    // Clean and filter data
    console.log('\n🧹 Cleaning and filtering park data...');
    const cleanedData = cleanParkData(csvData);
    console.log(`✅ ${cleanedData.length} parks with valid coordinates (filtered from ${csvData.length} total)`);
    
    // Create Supabase client
    console.log('\n🔌 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Check if table exists
    await ensureTableExists(supabase);
    
    // Clear existing data first
    console.log(`\n🗑️  Clearing existing data from '${TABLE_NAME}' table...`);
    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .neq('id', 0); // Delete all rows (id is always > 0)
    
    if (deleteError) {
      console.warn(`  ⚠️  Warning: Could not clear table: ${deleteError.message}`);
      console.warn(`  Continuing with upload (may result in duplicates)...`);
    } else {
      console.log(`  ✅ Table cleared`);
    }
    
    // Upload data
    await uploadData(supabase, cleanedData);
    
    console.log('\n🎉 Upload completed successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Verify the data in Supabase Dashboard → Table Editor → ${TABLE_NAME}`);
    console.log(`  2. Check that parks appear on the /map page`);
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
