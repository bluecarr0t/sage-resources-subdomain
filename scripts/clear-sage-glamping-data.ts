/**
 * Script to clear all records from sage-glamping-data table
 * 
 * Usage:
 *   npx tsx scripts/clear-sage-glamping-data.ts
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

async function clearTable() {
  console.log(`🔌 Connecting to Supabase...`);
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // First, count how many records exist
  console.log(`\n📊 Checking current record count...`);
  const { data: allRecords, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id');

  if (fetchError) {
    console.error(`❌ Error fetching records: ${fetchError.message}`);
    process.exit(1);
  }

  const recordCount = allRecords?.length || 0;
  console.log(`   Found ${recordCount} record(s) in the table`);

  if (recordCount === 0) {
    console.log(`\n✅ Table is already empty - nothing to delete`);
    return;
  }

  // Delete all records
  console.log(`\n🗑️  Deleting all records from '${TABLE_NAME}' table...`);
  const { error: deleteError, count: deleteCount } = await supabase
    .from(TABLE_NAME)
    .delete()
    .neq('id', 0); // Delete all rows (id is always > 0)

  if (deleteError) {
    console.error(`❌ Error deleting records: ${deleteError.message}`);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${deleteCount || recordCount} record(s)`);
  console.log(`\n🎉 Table cleared successfully!`);
}

// Main function
async function main() {
  try {
    await clearTable();
  } catch (error) {
    console.error('\n❌ Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();








