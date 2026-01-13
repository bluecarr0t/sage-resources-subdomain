#!/usr/bin/env npx tsx
/**
 * Verify that rate and booking URL fields exist in the database
 * and check if any existing records have these fields populated
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function verifyFields() {
  console.log('='.repeat(70));
  console.log('Verifying Rate and Booking URL Fields');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Try to query the new fields
    const { data, error } = await supabase
      .from('ridb_campsites')
      .select('ridb_campsite_id, name, campsite_reservable, campsite_booking_url, facility_use_fee_description, facility_website_url')
      .limit(5);

    if (error) {
      // Check if error is due to missing columns
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ New columns not found in database.');
        console.log('\n📝 Please run the migration SQL in Supabase SQL Editor:');
        console.log('   File: scripts/add-rate-booking-fields.sql\n');
        console.log('Steps:');
        console.log('  1. Go to your Supabase Dashboard');
        console.log('  2. Navigate to SQL Editor');
        console.log('  3. Copy and paste the contents of scripts/add-rate-booking-fields.sql');
        console.log('  4. Run the SQL\n');
        return;
      }
      throw error;
    }

    console.log('✅ New columns exist in database!\n');

    // Check if any records have these fields populated
    const { data: allData, error: countError } = await supabase
      .from('ridb_campsites')
      .select('campsite_reservable, campsite_booking_url, facility_use_fee_description, facility_website_url')
      .limit(100);

    if (countError) {
      throw countError;
    }

    if (!allData || allData.length === 0) {
      console.log('📊 No campsites found in database.');
      console.log('   Run the collection script to populate data.\n');
      return;
    }

    const withReservable = allData.filter(r => r.campsite_reservable !== null).length;
    const withBookingUrl = allData.filter(r => r.campsite_booking_url !== null).length;
    const withFeeDescription = allData.filter(r => r.facility_use_fee_description !== null).length;
    const withWebsiteUrl = allData.filter(r => r.facility_website_url !== null).length;

    console.log('📊 Field Population Status (sample of 100 records):');
    console.log(`   campsite_reservable: ${withReservable}/${allData.length} (${Math.round(withReservable/allData.length*100)}%)`);
    console.log(`   campsite_booking_url: ${withBookingUrl}/${allData.length} (${Math.round(withBookingUrl/allData.length*100)}%)`);
    console.log(`   facility_use_fee_description: ${withFeeDescription}/${allData.length} (${Math.round(withFeeDescription/allData.length*100)}%)`);
    console.log(`   facility_website_url: ${withWebsiteUrl}/${allData.length} (${Math.round(withWebsiteUrl/allData.length*100)}%)\n`);

    // Show sample records
    if (data && data.length > 0) {
      console.log('Sample records with new fields:');
      data.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.name}`);
        console.log(`   ID: ${c.ridb_campsite_id}`);
        console.log(`   Reservable: ${c.campsite_reservable ?? 'N/A'}`);
        console.log(`   Booking URL: ${c.campsite_booking_url || 'N/A'}`);
        if (c.facility_use_fee_description) {
          const cleanFee = c.facility_use_fee_description.replace(/<[^>]*>/g, '').substring(0, 60);
          console.log(`   Rate: ${cleanFee}${c.facility_use_fee_description.length > 60 ? '...' : ''}`);
        } else {
          console.log(`   Rate: N/A`);
        }
        console.log(`   Website: ${c.facility_website_url || 'N/A'}`);
      });
    }

    console.log('\n✅ Verification complete!');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

verifyFields().catch(console.error);

