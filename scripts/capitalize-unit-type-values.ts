#!/usr/bin/env npx tsx
/**
 * Capitalize unit_type values in all_glamping_properties table
 * This script ensures all unit_type values are properly capitalized
 * Example: "tents" → "Tents", "TENTS" → "Tents", "tents, cabins" → "Tents, Cabins"
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

/**
 * Capitalize the first letter of each word
 * Similar to PostgreSQL's INITCAP function
 */
function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => {
      // Handle empty strings
      if (!word) return word;
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

async function capitalizeUnitTypes() {
  console.log('🔄 Capitalizing unit_type values in all_glamping_properties...\n');

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

    let updatesCount = 0;
    const updates: Array<{
      id: number;
      property_name: string | null;
      old_value: string;
      new_value: string;
    }> = [];

    // Process each record
    for (const record of allData) {
      const unitType = record.unit_type;
      
      if (!unitType || unitType.trim() === '') {
        continue; // Skip NULL or empty values
      }

      const capitalized = capitalizeWords(unitType);

      // Only update if different
      if (unitType !== capitalized) {
        const { error: updateError } = await supabase
          .from('all_glamping_properties')
          .update({ unit_type: capitalized })
          .eq('id', record.id);

        if (updateError) {
          console.log(`  ❌ Error updating ID ${record.id} (${record.property_name || 'N/A'}): ${updateError.message}`);
        } else {
          updatesCount++;
          updates.push({
            id: record.id,
            property_name: record.property_name,
            old_value: unitType,
            new_value: capitalized,
          });

          if (updatesCount <= 20) {
            console.log(`  ✓ ID ${record.id}: "${unitType}" → "${capitalized}" (${record.property_name || 'N/A'})`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('CAPITALIZATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total records processed: ${allData.length}`);
    console.log(`Records updated: ${updatesCount}`);

    if (updatesCount > 20) {
      console.log(`\n  (Showing first 20 updates above, ${updatesCount - 20} more updates were made)`);
    }

    // Verify final state
    console.log('\n📊 Verifying final state...');
    const unitTypeCounts: Record<string, number> = {};

    for (const record of allData) {
      const unitType = record.unit_type;
      if (!unitType) {
        unitTypeCounts['NULL'] = (unitTypeCounts['NULL'] || 0) + 1;
        continue;
      }
      // Use the capitalized version for counting
      const capitalized = capitalizeWords(unitType);
      unitTypeCounts[capitalized] = (unitTypeCounts[capitalized] || 0) + 1;
    }

    console.log('\nUnit type distribution after capitalization:');
    Object.entries(unitTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([value, count]) => {
        console.log(`  ${value || 'NULL'}: ${count} records`);
      });

    // Check for any remaining lowercase values
    const remainingIssues: any[] = [];
    for (const record of allData) {
      const unitType = record.unit_type;
      if (unitType && unitType !== capitalizeWords(unitType)) {
        remainingIssues.push(record);
      }
    }

    if (remainingIssues.length > 0) {
      console.log(`\n⚠️  Warning: ${remainingIssues.length} records still have capitalization issues:`);
      remainingIssues.slice(0, 10).forEach((item) => {
        console.log(`  ID ${item.id}: "${item.unit_type}" (${item.property_name || 'N/A'})`);
      });
    } else {
      console.log('\n✅ All unit_type values are now properly capitalized!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

capitalizeUnitTypes();
