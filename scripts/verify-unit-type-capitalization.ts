#!/usr/bin/env npx tsx
/**
 * Verify that all unit_type values are properly capitalized
 * Checks for any lowercase-only values (like "tents" instead of "Tents")
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function verifyCapitalization() {
  console.log('🔍 Verifying unit_type capitalization...\n');

  try {
    const { data, error } = await supabase
      .from('sage-glamping-data')
      .select('id, property_name, unit_type')
      .not('unit_type', 'is', null);

    if (error) throw error;
    if (!data) {
      console.log('No data found');
      return;
    }

    // Find values that start with lowercase letter (indicating they weren't capitalized)
    const lowercaseIssues = data.filter((record) => {
      const unitType = record.unit_type;
      if (!unitType) return false;
      const firstChar = unitType.charAt(0);
      // Only flag if first character is a lowercase letter (not numbers or special chars)
      return /[a-z]/.test(firstChar);
    });

    if (lowercaseIssues.length === 0) {
      console.log('✅ All unit_type values are properly capitalized!');
      console.log(`   Checked ${data.length} records with unit_type values.`);
    } else {
      console.log(`❌ Found ${lowercaseIssues.length} records with lowercase unit_type values:\n`);
      lowercaseIssues.forEach((record) => {
        console.log(`  ID ${record.id}: "${record.unit_type}" (${record.property_name || 'N/A'})`);
      });
    }

    // Also check for the specific case mentioned by the user (exact lowercase "tents")
    const tentsLowercase = data.filter((r) => r.unit_type === 'tents');
    if (tentsLowercase.length > 0) {
      console.log(`\n⚠️  Found ${tentsLowercase.length} records with lowercase "tents":`);
      tentsLowercase.forEach((record) => {
        console.log(`  ID ${record.id}: "${record.unit_type}" (${record.property_name || 'N/A'})`);
      });
    } else {
      console.log('\n✅ No lowercase "tents" values found - all have been capitalized to "Tents"!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCapitalization();
