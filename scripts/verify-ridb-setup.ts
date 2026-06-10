#!/usr/bin/env npx tsx
/**
 * Verify RIDB collection setup
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createRIDBClient } from '../lib/ridb-api';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const ridbApiKey = process.env.RIDB_API_KEY;

async function main() {
  console.log('='.repeat(70));
  console.log('RIDB Collection Setup Verification');
  console.log('='.repeat(70));
  console.log('');

  let allChecksPassed = true;

  console.log('📋 Checking Environment Variables...');
  if (!supabaseUrl) {
    console.log('   ❌ NEXT_PUBLIC_SUPABASE_URL is not set');
    allChecksPassed = false;
  } else {
    console.log('   ✅ NEXT_PUBLIC_SUPABASE_URL is set');
  }

  if (!secretKey) {
    console.log('   ❌ SUPABASE_SECRET_KEY is not set');
    allChecksPassed = false;
  } else {
    console.log('   ✅ SUPABASE_SECRET_KEY is set');
  }

  if (!ridbApiKey) {
    console.log('   ❌ RIDB_API_KEY is not set');
    allChecksPassed = false;
  } else {
    console.log('   ✅ RIDB_API_KEY is set');
  }
  console.log('');

  if (supabaseUrl && secretKey) {
    console.log('📊 Checking Database Tables...');
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { count: campsiteCount, error: campsitesError } = await supabase
      .from('ridb_campsites')
      .select('id', { count: 'exact', head: true });

    if (campsitesError) {
      console.log('   ❌ ridb_campsites table is not accessible');
      console.log(`      Error: ${campsitesError.message}`);
      allChecksPassed = false;
    } else {
      console.log(`   ✅ ridb_campsites table exists (${campsiteCount ?? 0} rows)`);
    }

    const { data: progress, error: progressError } = await supabase
      .from('ridb_collection_progress')
      .select(
        'status, sync_mode, last_facility_offset, total_campsites_processed, last_incremental_sync_at'
      )
      .eq('collection_type', 'campsites')
      .maybeSingle();

    if (progressError) {
      console.log('   ❌ ridb_collection_progress table is not accessible');
      console.log(`      Error: ${progressError.message}`);
      allChecksPassed = false;
    } else if (!progress) {
      console.log('   ❌ ridb_collection_progress has no campsites row');
      allChecksPassed = false;
    } else {
      console.log('   ✅ ridb_collection_progress table exists');
      console.log(
        `      status=${progress.status} mode=${progress.sync_mode} offset=${progress.last_facility_offset} campsites=${progress.total_campsites_processed}`
      );
      if (progress.last_incremental_sync_at) {
        console.log(`      last_incremental_sync_at=${progress.last_incremental_sync_at}`);
      }
    }
    console.log('');
  }

  if (ridbApiKey) {
    console.log('🌐 Checking RIDB API Connection...');
    try {
      const ridbClient = createRIDBClient();
      const page = await ridbClient.getFacilitiesPage(0, 1);
      console.log(`   ✅ RIDB API connection successful (${page.totalCount} facilities total)`);
    } catch (error) {
      console.log('   ❌ RIDB API connection failed');
      console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
      allChecksPassed = false;
    }
    console.log('');
  }

  console.log('='.repeat(70));
  if (allChecksPassed) {
    console.log('✅ All checks passed! Ready to run collection.');
    console.log('');
    console.log('Next steps:');
    console.log('   npx tsx scripts/collect-ridb-campsites.ts --mode=full');
    console.log('   npx tsx scripts/collect-ridb-campsites.ts --mode=incremental');
  } else {
    console.log('❌ Some checks failed. Fix issues above before collecting.');
    process.exit(1);
  }
  console.log('='.repeat(70));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
