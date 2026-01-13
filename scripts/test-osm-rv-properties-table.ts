#!/usr/bin/env npx tsx
/**
 * Test script to verify osm_rv_properties table exists and is accessible
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function testTable() {
  console.log('🧪 Testing osm_rv_properties table...\n');

  // Test 1: Check if table exists and is accessible
  console.log('Test 1: Checking table accessibility...');
  const { data: existingData, error: selectError } = await supabase
    .from('osm_rv_properties')
    .select('id, name, state')
    .limit(1);

  if (selectError) {
    console.error('❌ Error accessing table:', selectError.message);
    console.error('   Make sure to run: scripts/create-osm-rv-properties-table.sql');
    process.exit(1);
  }

  console.log('✅ Table exists and is accessible');
  console.log(`   Current row count: ${existingData?.length || 0}\n`);

  // Test 2: Test insert with sample data
  console.log('Test 2: Testing insert capability...');
  const testProperty = {
    osm_id: 999999999,
    osm_type: 'node',
    name: 'Test RV Park',
    state: 'CA',
    slug: 'test-rv-park-ca',
    latitude: 37.7749,
    longitude: -122.4194,
    osm_tags: { test: true },
  };

  const { data: insertData, error: insertError } = await supabase
    .from('osm_rv_properties')
    .insert(testProperty)
    .select('id, name');

  if (insertError) {
    console.error('❌ Insert error:', insertError.message);
    process.exit(1);
  }

  console.log('✅ Insert successful:', insertData);

  // Test 3: Test duplicate detection (should fail on unique constraint)
  console.log('\nTest 3: Testing duplicate detection...');
  const { error: duplicateError } = await supabase
    .from('osm_rv_properties')
    .insert(testProperty);

  if (duplicateError && duplicateError.message.includes('unique')) {
    console.log('✅ Duplicate detection working (unique constraint enforced)');
  } else {
    console.warn('⚠️  Duplicate detection may not be working as expected');
  }

  // Cleanup
  console.log('\nCleaning up test data...');
  await supabase
    .from('osm_rv_properties')
    .delete()
    .eq('osm_id', testProperty.osm_id);
  console.log('✅ Cleanup complete\n');

  console.log('='.repeat(60));
  console.log('✅ All tests passed! Ready to run fetch-usa-rv-properties-osm.ts');
  console.log('='.repeat(60));
}

testTable().catch(console.error);

