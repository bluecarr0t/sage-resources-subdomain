#!/usr/bin/env npx tsx
/**
 * Analyze unit_type values in all_glamping_properties table
 * This script shows the current distribution of unit_type values
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function analyzeUnitTypes() {
  console.log('🔍 Analyzing unit_type values in all_glamping_properties...\n');

  try {
    // Fetch all records with unit_type
    let allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('all_glamping_properties')
        .select('id, property_name, unit_type')
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    }

    console.log(`✅ Fetched ${allData.length} records\n`);

    // Count unit_type values
    const unitTypeCounts: Record<string, number> = {};
    const needsCapitalization: Array<{ id: number; property_name: string | null; current: string; should_be: string }> = [];

    for (const record of allData) {
      const unitType = record.unit_type;
      
      if (!unitType) {
        unitTypeCounts['NULL'] = (unitTypeCounts['NULL'] || 0) + 1;
        continue;
      }

      // Count current values
      unitTypeCounts[unitType] = (unitTypeCounts[unitType] || 0) + 1;

      // Check if capitalization is needed
      const capitalized = unitType.charAt(0).toUpperCase() + unitType.slice(1).toLowerCase();
      if (unitType !== capitalized) {
        needsCapitalization.push({
          id: record.id,
          property_name: record.property_name,
          current: unitType,
          should_be: capitalized,
        });
      }
    }

    console.log('='.repeat(70));
    console.log('UNIT_TYPE VALUE DISTRIBUTION');
    console.log('='.repeat(70));
    Object.entries(unitTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([value, count]) => {
        console.log(`  ${value || 'NULL'}: ${count} records`);
      });

    console.log('\n' + '='.repeat(70));
    console.log('CAPITALIZATION ANALYSIS');
    console.log('='.repeat(70));
    console.log(`Total records: ${allData.length}`);
    console.log(`Records with unit_type: ${allData.length - (unitTypeCounts['NULL'] || 0)}`);
    console.log(`Records needing capitalization: ${needsCapitalization.length}`);

    if (needsCapitalization.length > 0) {
      console.log('\n📋 Sample records that need capitalization (first 20):');
      needsCapitalization.slice(0, 20).forEach((item) => {
        console.log(`  ID ${item.id}: "${item.current}" → "${item.should_be}" (${item.property_name || 'N/A'})`);
      });

      if (needsCapitalization.length > 20) {
        console.log(`  ... and ${needsCapitalization.length - 20} more`);
      }

      // Group by current value to show what will be changed
      const groupedByCurrent: Record<string, number> = {};
      needsCapitalization.forEach((item) => {
        groupedByCurrent[item.current] = (groupedByCurrent[item.current] || 0) + 1;
      });

      console.log('\n📊 Breakdown by current value:');
      Object.entries(groupedByCurrent)
        .sort((a, b) => b[1] - a[1])
        .forEach(([current, count]) => {
          const shouldBe = current.charAt(0).toUpperCase() + current.slice(1).toLowerCase();
          console.log(`  "${current}" → "${shouldBe}": ${count} records`);
        });
    } else {
      console.log('\n✅ All unit_type values are already properly capitalized!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeUnitTypes();
