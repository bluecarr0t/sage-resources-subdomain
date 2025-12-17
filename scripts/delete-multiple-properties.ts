/**
 * Script to delete multiple properties from all_glamping_properties table
 * 
 * Usage:
 *   npx tsx scripts/delete-multiple-properties.ts
 * 
 * Or modify the PROPERTIES_TO_DELETE array below to delete different properties
 */

import { config } from 'dotenv';
import { resolve } from 'path';
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

const TABLE_NAME = 'all_glamping_properties';

// Properties to delete
const PROPERTIES_TO_DELETE = [
  'Silver Birch Resort',
  'Lake Eufaula State Park',
  'Grande Hot Springs'
];

async function deleteProperties(propertyNames: string[]) {
  console.log(`🔌 Connecting to Supabase...`);
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

    console.log(`📊 Found ${existingRecords.length} record(s) for "${propertyName}":`);
    existingRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}, Site: ${record.site_name || 'N/A'}`);
    });

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
  try {
    await deleteProperties(PROPERTIES_TO_DELETE);
  } catch (error) {
    console.error('\n❌ Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();

