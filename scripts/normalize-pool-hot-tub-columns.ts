#!/usr/bin/env npx tsx
/**
 * Normalize pool and hot_tub___sauna columns to only contain 'yes', 'no', or NULL
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
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeValue(value: any): 'yes' | 'no' | null {
  if (!value || value === null || value === '') {
    return null;
  }

  const str = value.toString().trim().toLowerCase();

  // Check for 'yes' values
  if (str === 'yes' || str === 'y' || str === 'true' || str === '1') {
    return 'yes';
  }

  // Check for 'no' values
  if (str === 'no' || str === 'n' || str === 'false' || str === '0') {
    return 'no';
  }

  // If it contains 'yes' (like "yes, pool available")
  if (str.includes('yes')) {
    return 'yes';
  }

  // If it contains 'no' (like "no pool")
  if (str.includes('no') && !str.includes('now') && !str.includes('note')) {
    return 'no';
  }

  // URLs, descriptions, or other text should be set to NULL
  // (these are clearly data errors)
  return null;
}

async function normalizeColumns() {
  console.log('🔄 Normalizing pool and hot_tub___sauna columns...\n');

  try {
    // Fetch all records
    let allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('all_glamping_properties')
        .select('id, property_name, pool, hot_tub___sauna')
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    }

    console.log(`✅ Fetched ${allData.length} records\n`);

    let poolUpdates = 0;
    let hotTubUpdates = 0;
    const updates: Array<{
      id: number;
      property_name: string | null;
      pool_old: any;
      pool_new: string | null;
      hot_tub_old: any;
      hot_tub_new: string | null;
    }> = [];

    // Process each record
    for (const record of allData) {
      const poolNormalized = normalizeValue(record.pool);
      const hotTubNormalized = normalizeValue(record.hot_tub___sauna);

      const needsPoolUpdate = poolNormalized !== record.pool;
      const needsHotTubUpdate = hotTubNormalized !== record.hot_tub___sauna;

      if (needsPoolUpdate || needsHotTubUpdate) {
        const updateData: any = {};
        if (needsPoolUpdate) {
          updateData.pool = poolNormalized;
          poolUpdates++;
        }
        if (needsHotTubUpdate) {
          updateData.hot_tub___sauna = hotTubNormalized;
          hotTubUpdates++;
        }

        // Update the record
        const { error: updateError } = await supabase
          .from('all_glamping_properties')
          .update(updateData)
          .eq('id', record.id);

        if (updateError) {
          console.log(`  ❌ Error updating ${record.property_name} (ID: ${record.id}): ${updateError.message}`);
        } else {
          updates.push({
            id: record.id,
            property_name: record.property_name,
            pool_old: record.pool,
            pool_new: poolNormalized,
            hot_tub_old: record.hot_tub___sauna,
            hot_tub_new: hotTubNormalized,
          });

          if (needsPoolUpdate) {
            console.log(`  ✓ ${record.property_name}: pool "${record.pool}" → ${poolNormalized || 'NULL'}`);
          }
          if (needsHotTubUpdate) {
            console.log(`  ✓ ${record.property_name}: hot_tub___sauna "${record.hot_tub___sauna}" → ${hotTubNormalized || 'NULL'}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('NORMALIZATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Pool column: ${poolUpdates} records updated`);
    console.log(`Hot tub sauna column: ${hotTubUpdates} records updated`);
    console.log(`Total records processed: ${allData.length}`);
    console.log('\n✅ Normalization complete!');

    // Verify final state
    console.log('\n📊 Verifying final state...');
    const poolCounts: Record<string, number> = {};
    const hotTubCounts: Record<string, number> = {};

    for (const record of allData) {
      const pool = normalizeValue(record.pool) || 'NULL';
      const hotTub = normalizeValue(record.hot_tub___sauna) || 'NULL';
      poolCounts[pool] = (poolCounts[pool] || 0) + 1;
      hotTubCounts[hotTub] = (hotTubCounts[hotTub] || 0) + 1;
    }

    console.log('\nPool column final distribution:');
    Object.entries(poolCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([value, count]) => {
        console.log(`  ${value}: ${count} records`);
      });

    console.log('\nHot tub sauna column final distribution:');
    Object.entries(hotTubCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([value, count]) => {
        console.log(`  ${value}: ${count} records`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

normalizeColumns();
