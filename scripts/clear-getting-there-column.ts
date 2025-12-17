#!/usr/bin/env npx tsx
/**
 * Clear the 'getting_there' column for all records in all_glamping_properties table
 * Sets all values to NULL since the existing data is inaccurate
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function clearGettingThereColumn() {
  console.log('🧹 Clearing getting_there column for all records...\n');

  try {
    // First, count how many records have getting_there data
    const { count: recordsWithData, error: countError } = await supabase
      .from('all_glamping_properties')
      .select('id', { count: 'exact', head: true })
      .not('getting_there', 'is', null)
      .neq('getting_there', '');

    if (countError) {
      console.error('❌ Error counting records:', countError);
      process.exit(1);
    }

    console.log(`📊 Found ${recordsWithData || 0} records with getting_there data\n`);

    if (recordsWithData === 0) {
      console.log('✅ No records to update - getting_there column is already empty');
      return;
    }

    // Confirm before proceeding
    console.log(`⚠️  About to clear getting_there for ${recordsWithData} records`);
    console.log('   This will set all getting_there values to NULL\n');

    // Clear all getting_there values
    console.log('🔄 Clearing getting_there column...');
    const { data, error, count } = await supabase
      .from('all_glamping_properties')
      .update({ getting_there: null })
      .not('getting_there', 'is', null)
      .select('id', { count: 'exact' });

    if (error) {
      console.error('❌ Error clearing getting_there column:', error);
      process.exit(1);
    }

    console.log('\n' + '='.repeat(70));
    console.log('CLEARING SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully cleared getting_there for ${count || recordsWithData} records`);
    console.log('\n✅ All getting_there values have been set to NULL');

    // Verify the update
    const { count: remainingCount } = await supabase
      .from('all_glamping_properties')
      .select('id', { count: 'exact', head: true })
      .not('getting_there', 'is', null)
      .neq('getting_there', '');

    if (remainingCount === 0) {
      console.log('✅ Verification: All getting_there values are now NULL');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} records still have getting_there data`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearGettingThereColumn();
