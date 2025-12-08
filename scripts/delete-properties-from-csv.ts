/**
 * Script to delete properties from sage-glamping-data table based on a CSV file
 * 
 * Usage:
 *   npx tsx scripts/delete-properties-from-csv.ts <path-to-csv-file>
 * 
 * Example:
 *   npx tsx scripts/delete-properties-from-csv.ts csv/missing-properties.csv
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

const TABLE_NAME = 'sage-glamping-data';

interface CSVRow {
  [key: string]: string;
}

/**
 * Parse CSV file and return array of property names
 */
function parseCSV(filePath: string): string[] {
  try {
    console.log(`📖 Reading CSV file: ${filePath}`);
    const fileContent = readFileSync(filePath, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true, // Use first line as column names
      skip_empty_lines: true,
      trim: true,
    }) as CSVRow[];
    
    // Extract unique property names
    const propertyNames = new Set<string>();
    records.forEach((record) => {
      const propertyName = record['Property Name'] || record['property_name'];
      if (propertyName && propertyName.trim()) {
        propertyNames.add(propertyName.trim());
      }
    });
    
    const uniqueNames = Array.from(propertyNames);
    console.log(`✅ Found ${uniqueNames.length} unique property names in CSV`);
    return uniqueNames;
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function deleteProperties(propertyNames: string[]) {
  console.log(`\n🔌 Connecting to Supabase...`);
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let totalDeleted = 0;
  let totalFound = 0;

  for (const propertyName of propertyNames) {
    console.log(`\n🔍 Searching for property: "${propertyName}"...`);
    
    // First, check how many records exist for this property
    const { data: existingRecords, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('id, property_name, site_name')
      .eq('property_name', propertyName);

    if (fetchError) {
      console.error(`❌ Error fetching records for "${propertyName}": ${fetchError.message}`);
      continue;
    }

    if (!existingRecords || existingRecords.length === 0) {
      console.log(`⚠️  No records found for property: "${propertyName}"`);
      continue;
    }

    console.log(`📊 Found ${existingRecords.length} record(s) for "${propertyName}"`);

    totalFound += existingRecords.length;

    // Delete all records for this property
    console.log(`🗑️  Deleting all records for "${propertyName}"...`);
    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('property_name', propertyName);

    if (deleteError) {
      console.error(`❌ Error deleting records for "${propertyName}": ${deleteError.message}`);
      continue;
    }

    console.log(`✅ Successfully deleted ${existingRecords.length} record(s) for "${propertyName}"`);
    totalDeleted += existingRecords.length;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total properties processed: ${propertyNames.length}`);
  console.log(`   Total records found: ${totalFound}`);
  console.log(`   Total records deleted: ${totalDeleted}`);
  console.log(`\n🎉 Property removal completed!`);
}

// Main function
async function main() {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.error('❌ Please provide a CSV file path');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/delete-properties-from-csv.ts <path-to-csv-file>');
    console.error('\nExample:');
    console.error('  npx tsx scripts/delete-properties-from-csv.ts csv/missing-properties.csv');
    process.exit(1);
  }
  
  try {
    const propertyNames = parseCSV(csvPath);
    
    if (propertyNames.length === 0) {
      console.error('❌ No property names found in CSV file');
      process.exit(1);
    }
    
    console.log(`\n📋 Properties to delete: ${propertyNames.join(', ')}`);
    
    await deleteProperties(propertyNames);
  } catch (error) {
    console.error('\n❌ Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
