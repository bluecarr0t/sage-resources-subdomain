#!/usr/bin/env npx tsx
/**
 * Test database insert to verify connection and schema
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

async function testInsert() {
  console.log('Testing database insert...\n');

  const testCampsite = {
    ridb_campsite_id: 'TEST_' + Date.now(),
    name: 'Test Campsite',
    campsite_type: 'STANDARD NONELECTRIC',
    campsite_use_type: 'Overnight',
    latitude: 45.0,
    longitude: -120.0,
    facility_id: 'TEST_FACILITY',
    facility_name: 'Test Facility',
    facility_state: 'OR',
    last_synced_at: new Date().toISOString(),
    data_completeness_score: 50.0,
  };

  console.log('Attempting to insert test campsite:', testCampsite.ridb_campsite_id);

  const { data, error } = await supabase
    .from('ridb_campsites')
    .upsert([testCampsite], { onConflict: 'ridb_campsite_id' })
    .select('ridb_campsite_id');

  if (error) {
    console.error('❌ Error:', error);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
    return;
  }

  console.log('✅ Insert successful!');
  console.log('   Returned data:', data);

  // Verify it was saved
  const { data: verify, error: verifyError } = await supabase
    .from('ridb_campsites')
    .select('ridb_campsite_id, name')
    .eq('ridb_campsite_id', testCampsite.ridb_campsite_id)
    .single();

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError);
  } else {
    console.log('✅ Verification successful:', verify);
  }

  // Clean up
  await supabase
    .from('ridb_campsites')
    .delete()
    .eq('ridb_campsite_id', testCampsite.ridb_campsite_id);
  console.log('🧹 Test record cleaned up');
}

testInsert().catch(console.error);

