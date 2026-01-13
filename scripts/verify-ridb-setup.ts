#!/usr/bin/env npx tsx
/**
 * Verify RIDB collection setup
 * Checks that all prerequisites are met before running the collection script
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createRIDBClient } from '../lib/ridb-api';

// Load environment variables
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

  // Check environment variables
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

  // Check database tables
  if (supabaseUrl && secretKey) {
    console.log('📊 Checking Database Tables...');
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Check ridb_campsites table
    const { error: campsitesError } = await supabase
      .from('ridb_campsites')
      .select('id')
      .limit(1);

    if (campsitesError) {
      console.log('   ❌ ridb_campsites table does not exist or is not accessible');
      console.log(`      Error: ${campsitesError.message}`);
      allChecksPassed = false;
    } else {
      console.log('   ✅ ridb_campsites table exists');
    }

    // Check ridb_collection_progress table
    const { error: progressError } = await supabase
      .from('ridb_collection_progress')
      .select('id')
      .limit(1);

    if (progressError) {
      console.log('   ❌ ridb_collection_progress table does not exist or is not accessible');
      console.log(`      Error: ${progressError.message}`);
      allChecksPassed = false;
    } else {
      console.log('   ✅ ridb_collection_progress table exists');
    }
    console.log('');
  }

  // Check RIDB API connection
  if (ridbApiKey) {
    console.log('🌐 Checking RIDB API Connection...');
    try {
      const ridbClient = createRIDBClient();
      // Try to fetch a single facility to test the connection (using a known facility ID)
      // We'll use a simple request to test authentication
      const testFacility = await ridbClient.getFacility('1101'); // Example facility ID
      if (testFacility || testFacility === null) {
        // API responded (even if facility not found, that's OK - means API is working)
        console.log('   ✅ RIDB API connection successful');
      }
    } catch (error) {
      console.log('   ❌ RIDB API connection failed');
      console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);
      allChecksPassed = false;
    }
    console.log('');
  }

  // Summary
  console.log('='.repeat(70));
  if (allChecksPassed) {
    console.log('✅ All checks passed! Ready to run collection script.');
    console.log('');
    console.log('Next step:');
    console.log('   npx tsx scripts/collect-ridb-campsites.ts');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above before running the collection script.');
    process.exit(1);
  }
  console.log('='.repeat(70));
}

// Run the verification
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

