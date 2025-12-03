/**
 * Script to delete all properties with "state park" in the name from sage-glamping-data table
 * 
 * Usage:
 *   npx tsx scripts/delete-state-parks.ts
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

async function deleteStateParks() {
  console.log(`🔌 Connecting to Supabase...`);
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(`\n🔍 Searching for properties with "state park" in the name...`);
  
  // Find all properties with "state park" in the name (case-insensitive)
  const { data: stateParkRecords, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id, property_name, site_name, city, state')
    .ilike('property_name', '%state park%');

  if (fetchError) {
    console.error(`❌ Error fetching records: ${fetchError.message}`);
    process.exit(1);
  }

  if (!stateParkRecords || stateParkRecords.length === 0) {
    console.log(`✅ No properties with "state park" in the name found.`);
    return;
  }

  // Group by property_name to show unique properties
  const uniqueProperties = new Map<string, any[]>();
  stateParkRecords.forEach((record) => {
    const propName = record.property_name;
    if (!uniqueProperties.has(propName)) {
      uniqueProperties.set(propName, []);
    }
    uniqueProperties.get(propName)!.push(record);
  });

  console.log(`\n📊 Found ${stateParkRecords.length} record(s) across ${uniqueProperties.size} unique property(ies):\n`);
  
  uniqueProperties.forEach((records, propertyName) => {
    console.log(`   "${propertyName}" (${records.length} record(s)):`);
    records.forEach((record, index) => {
      console.log(`      ${index + 1}. ID: ${record.id}, Site: ${record.site_name || 'N/A'}, Location: ${record.city || 'N/A'}, ${record.state || 'N/A'}`);
    });
    console.log('');
  });

  // Confirm deletion
  console.log(`\n🗑️  Deleting all ${stateParkRecords.length} record(s) for state park properties...`);
  
  // Delete all records with "state park" in the name
  const { error: deleteError } = await supabase
    .from(TABLE_NAME)
    .delete()
    .ilike('property_name', '%state park%');

  if (deleteError) {
    console.error(`❌ Error deleting records: ${deleteError.message}`);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${stateParkRecords.length} record(s) for ${uniqueProperties.size} state park property(ies)`);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Unique properties deleted: ${uniqueProperties.size}`);
  console.log(`   Total records deleted: ${stateParkRecords.length}`);
  console.log(`\n🎉 State park removal completed!`);
}

// Main function
async function main() {
  try {
    await deleteStateParks();
  } catch (error) {
    console.error('\n❌ Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();

