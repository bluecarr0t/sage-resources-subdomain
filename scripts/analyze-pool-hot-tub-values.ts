#!/usr/bin/env npx tsx
/**
 * Analyze pool and hot_tub_sauna columns for non-standard values
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

async function analyzeColumns() {
  console.log('🔍 Analyzing pool and hot_tub_sauna columns...\n');

  try {
    // Fetch all records
    let allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('sage-glamping-data')
        .select('id, property_name, pool, hot_tub___sauna')
        .range(offset, offset + batchSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    }

    console.log(`✅ Fetched ${allData.length} records\n`);

    // Analyze pool column
    const poolValues = new Map<string, number>();
    const nonStandardPool: any[] = [];
    
    // Analyze hot_tub_sauna column
    const hotTubValues = new Map<string, number>();
    const nonStandardHotTub: any[] = [];

    for (const record of allData) {
      // Pool analysis
      const poolValue = record.pool?.toString().trim().toLowerCase() || 'null';
      poolValues.set(poolValue, (poolValues.get(poolValue) || 0) + 1);
      
      if (poolValue !== 'null' && poolValue !== 'yes' && poolValue !== 'no' && poolValue !== '') {
        nonStandardPool.push({
          id: record.id,
          property_name: record.property_name,
          value: record.pool,
        });
      }

      // Hot tub analysis
      const hotTubValue = record.hot_tub___sauna?.toString().trim().toLowerCase() || 'null';
      hotTubValues.set(hotTubValue, (hotTubValues.get(hotTubValue) || 0) + 1);
      
      if (hotTubValue !== 'null' && hotTubValue !== 'yes' && hotTubValue !== 'no' && hotTubValue !== '') {
        nonStandardHotTub.push({
          id: record.id,
          property_name: record.property_name,
          value: record.hot_tub___sauna,
        });
      }
    }

    console.log('='.repeat(70));
    console.log('POOL COLUMN ANALYSIS');
    console.log('='.repeat(70));
    console.log('\nAll unique values found:');
    Array.from(poolValues.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([value, count]) => {
        const isStandard = value === 'null' || value === 'yes' || value === 'no' || value === '';
        const marker = isStandard ? '✓' : '✗';
        console.log(`  ${marker} "${value}": ${count} records`);
      });

    console.log(`\n✗ Non-standard values: ${nonStandardPool.length} records`);
    if (nonStandardPool.length > 0) {
      console.log('\nSample non-standard pool values:');
      nonStandardPool.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.property_name} (ID: ${item.id}): "${item.value}"`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('HOT_TUB_SAUNA COLUMN ANALYSIS');
    console.log('='.repeat(70));
    console.log('\nAll unique values found:');
    Array.from(hotTubValues.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([value, count]) => {
        const isStandard = value === 'null' || value === 'yes' || value === 'no' || value === '';
        const marker = isStandard ? '✓' : '✗';
        console.log(`  ${marker} "${value}": ${count} records`);
      });

    console.log(`\n✗ Non-standard values: ${nonStandardHotTub.length} records`);
    if (nonStandardHotTub.length > 0) {
      console.log('\nSample non-standard hot_tub_sauna values:');
      nonStandardHotTub.slice(0, 10).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.property_name} (ID: ${item.id}): "${item.value}"`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Pool column: ${nonStandardPool.length} records need normalization`);
    console.log(`Hot tub sauna column: ${nonStandardHotTub.length} records need normalization`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeColumns();
