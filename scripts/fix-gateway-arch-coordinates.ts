/**
 * Script to fix Gateway Arch National Park coordinates
 * 
 * Problem: Gateway Arch has incorrect Alaska coordinates (67.78, -153.3)
 * Solution: Update to correct St. Louis, Missouri coordinates (38.6247, -90.1848)
 * 
 * Usage:
 *   npx tsx scripts/fix-gateway-arch-coordinates.ts
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

const TABLE_NAME = 'national-parks';

/**
 * Main function to fix Gateway Arch coordinates
 */
async function main() {
  try {
    console.log('🔧 Fixing Gateway Arch National Park Coordinates\n');

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // First, check current data
    console.log('📊 Checking current Gateway Arch data...');
    const { data: currentData, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('name', 'Gateway Arch')
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.error('❌ Gateway Arch not found in database');
        process.exit(1);
      }
      throw fetchError;
    }

    if (!currentData) {
      console.error('❌ Gateway Arch not found in database');
      process.exit(1);
    }

    console.log('\nCurrent data:');
    console.log(`  Name: ${currentData.name}`);
    console.log(`  State: ${currentData.state}`);
    console.log(`  Latitude: ${currentData.latitude}`);
    console.log(`  Longitude: ${currentData.longitude}`);

    // Correct coordinates for Gateway Arch National Park, St. Louis, Missouri
    const correctLatitude = 38.6247;
    const correctLongitude = -90.1848;
    const correctState = 'MO';

    console.log('\n✅ Correct data:');
    console.log(`  State: ${correctState}`);
    console.log(`  Latitude: ${correctLatitude}`);
    console.log(`  Longitude: ${correctLongitude}`);

    // Update the record
    console.log('\n🔄 Updating database...');
    const { data: updatedData, error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({
        latitude: correctLatitude,
        longitude: correctLongitude,
        state: correctState,
        updated_at: new Date().toISOString(),
      })
      .eq('name', 'Gateway Arch')
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating database:', updateError.message);
      process.exit(1);
    }

    console.log('\n✅ Successfully updated Gateway Arch coordinates!');
    console.log('\nUpdated data:');
    console.log(`  Name: ${updatedData.name}`);
    console.log(`  State: ${updatedData.state}`);
    console.log(`  Latitude: ${updatedData.latitude}`);
    console.log(`  Longitude: ${updatedData.longitude}`);
    console.log('\n🎉 Fix complete! Gateway Arch will now appear correctly on the map.\n');
  } catch (error) {
    console.error('\n❌ Fix failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
