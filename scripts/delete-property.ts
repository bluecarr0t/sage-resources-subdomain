/**
 * Script to delete a specific property from sage-glamping-data table
 * 
 * Usage:
 *   npx tsx scripts/delete-property.ts <property-name>
 * 
 * Example:
 *   npx tsx scripts/delete-property.ts "Lawson Adventure Park"
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

const TABLE_NAME = 'sage-glamping-data';

async function deleteProperty(propertyName: string) {
  console.log(`🔌 Connecting to Supabase...`);
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(`\n🔍 Searching for property: "${propertyName}"...`);
  
  // First, check how many records exist for this property
  const { data: existingRecords, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id, property_name, site_name')
    .eq('property_name', propertyName);

  if (fetchError) {
    console.error(`❌ Error fetching records: ${fetchError.message}`);
    process.exit(1);
  }

  if (!existingRecords || existingRecords.length === 0) {
    console.log(`⚠️  No records found for property: "${propertyName}"`);
    console.log(`   The property may not exist or may have already been deleted.`);
    process.exit(0);
  }

  console.log(`\n📊 Found ${existingRecords.length} record(s) for "${propertyName}":`);
  existingRecords.forEach((record, index) => {
    console.log(`   ${index + 1}. ID: ${record.id}, Site: ${record.site_name || 'N/A'}`);
  });

  // Delete all records for this property
  console.log(`\n🗑️  Deleting all records for "${propertyName}"...`);
  const { error: deleteError, count } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('property_name', propertyName);

  if (deleteError) {
    console.error(`❌ Error deleting records: ${deleteError.message}`);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${existingRecords.length} record(s) for "${propertyName}"`);
  console.log(`\n🎉 Property removal completed successfully!`);
}

// Main function
async function main() {
  const propertyName = process.argv[2];
  
  if (!propertyName) {
    console.error('❌ Please provide a property name');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/delete-property.ts <property-name>');
    console.error('\nExample:');
    console.error('  npx tsx scripts/delete-property.ts "Lawson Adventure Park"');
    process.exit(1);
  }
  
  try {
    await deleteProperty(propertyName);
  } catch (error) {
    console.error('\n❌ Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();

