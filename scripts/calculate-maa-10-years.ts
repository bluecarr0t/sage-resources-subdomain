/**
 * Script to calculate and populate maa-10-years for county-gdp table
 * 
 * This script:
 * - Fetches all records from county-gdp
 * - Calculates year-over-year percentage changes for 2013-2023 (10 years)
 * - Averages all the percentage changes to get the 10-year moving annual average
 * - Updates each record with the calculated value
 * 
 * Usage:
 *   npx tsx scripts/calculate-maa-10-years.ts
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

const TABLE_NAME = 'county-gdp';
const BATCH_SIZE = 100;

// Years for 10-year calculation (2013-2023)
const YEARS_10_YEAR = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];

interface CountyGDPRecord {
  geofips: string;
  geoname: string;
  gdp_2013: number | null;
  gdp_2014: number | null;
  gdp_2015: number | null;
  gdp_2016: number | null;
  gdp_2017: number | null;
  gdp_2018: number | null;
  gdp_2019: number | null;
  gdp_2020: number | null;
  gdp_2021: number | null;
  gdp_2022: number | null;
  gdp_2023: number | null;
  'maa-10-years': number | null;
}

/**
 * Calculate year-over-year percentage change
 * Returns null if either value is null or zero
 */
function calculateYoYChange(currentYear: number | null, previousYear: number | null): number | null {
  if (currentYear === null || previousYear === null) {
    return null;
  }
  
  if (previousYear === 0) {
    return null; // Cannot calculate percentage change from zero
  }
  
  const change = ((currentYear - previousYear) / previousYear) * 100;
  return change;
}

/**
 * Calculate 10-year moving annual average for a single record
 * This is the average of all year-over-year percentage changes from 2013-2023
 */
function calculateMAA10Years(record: CountyGDPRecord): number | null {
  const changes: number[] = [];
  
  // Calculate YoY changes for consecutive years (2013-2023)
  for (let i = 1; i < YEARS_10_YEAR.length; i++) {
    const currentYear = YEARS_10_YEAR[i];
    const previousYear = YEARS_10_YEAR[i - 1];
    
    // Get GDP values for these years
    const currentGDP = record[`gdp_${currentYear}` as keyof CountyGDPRecord] as number | null;
    const previousGDP = record[`gdp_${previousYear}` as keyof CountyGDPRecord] as number | null;
    
    const change = calculateYoYChange(currentGDP, previousGDP);
    if (change !== null && !isNaN(change) && isFinite(change)) {
      changes.push(change);
    }
  }
  
  // Return average of all changes, or null if no valid changes
  if (changes.length === 0) {
    return null;
  }
  
  const sum = changes.reduce((acc, val) => acc + val, 0);
  return sum / changes.length;
}

/**
 * Fetch all records from Supabase
 */
async function fetchAllRecords(supabase: ReturnType<typeof createClient>): Promise<CountyGDPRecord[]> {
  console.log('📥 Fetching all records from Supabase...');
  
  const allRecords: CountyGDPRecord[] = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('geofips, geoname, gdp_2013, gdp_2014, gdp_2015, gdp_2016, gdp_2017, gdp_2018, gdp_2019, gdp_2020, gdp_2021, gdp_2022, gdp_2023')
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) {
      console.error(`❌ Error fetching records: ${error.message}`);
      throw error;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRecords.push(...(data as CountyGDPRecord[]));
      offset += BATCH_SIZE;
      
      if (data.length < BATCH_SIZE) {
        hasMore = false;
      }
    }
    
    console.log(`  ✅ Fetched ${allRecords.length} records...`);
  }
  
  console.log(`✅ Total records fetched: ${allRecords.length}`);
  return allRecords;
}

/**
 * Update records in batches
 */
async function updateRecords(
  supabase: ReturnType<typeof createClient>,
  updates: Array<{ geofips: string; 'maa-10-years': number | null }>
): Promise<void> {
  console.log(`\n📤 Updating ${updates.length} records in Supabase...`);
  
  let updated = 0;
  let errorCount = 0;
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    // Update each record concurrently using Promise.all
    const updatePromises = batch.map(async (update) => {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ 'maa-10-years': update['maa-10-years'] })
        .eq('geofips', update.geofips);
      
      if (error) {
        console.error(`  ❌ Error updating ${update.geofips}: ${error.message}`);
        return { success: false };
      }
      return { success: true };
    });
    
    const results = await Promise.all(updatePromises);
    
    const batchSuccess = results.filter(r => r.success).length;
    updated += batchSuccess;
    errorCount += results.length - batchSuccess;
    
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= updates.length) {
      console.log(`  ✅ Updated ${updated}/${updates.length} records...`);
    }
  }
  
  console.log(`\n✅ Successfully updated ${updated} records`);
  if (errorCount > 0) {
    console.warn(`⚠️  ${errorCount} records failed to update`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Connect to Supabase
    console.log('🔌 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Fetch all records
    const records = await fetchAllRecords(supabase);
    
    if (records.length === 0) {
      console.error('❌ No records found in the table');
      process.exit(1);
    }
    
    // Calculate 10-year moving annual average for each record
    console.log('\n🧮 Calculating 10-year moving annual averages (2013-2023)...');
    const updates: Array<{ geofips: string; 'maa-10-years': number | null }> = [];
    
    let calculated = 0;
    let nullCount = 0;
    
    for (const record of records) {
      const average = calculateMAA10Years(record);
      updates.push({
        geofips: record.geofips,
        'maa-10-years': average,
      });
      
      if (average === null) {
        nullCount++;
      } else {
        calculated++;
      }
    }
    
    console.log(`✅ Calculated 10-year averages for ${records.length} records:`);
    console.log(`   - ${calculated} records with valid averages`);
    console.log(`   - ${nullCount} records with null (insufficient data)`);
    
    // Show some statistics
    const validAverages = updates
      .map(u => u['maa-10-years'])
      .filter((avg): avg is number => avg !== null);
    
    if (validAverages.length > 0) {
      const min = Math.min(...validAverages);
      const max = Math.max(...validAverages);
      const mean = validAverages.reduce((a, b) => a + b, 0) / validAverages.length;
      
      console.log(`\n📊 Statistics:`);
      console.log(`   - Minimum average: ${min.toFixed(2)}%`);
      console.log(`   - Maximum average: ${max.toFixed(2)}%`);
      console.log(`   - Mean average: ${mean.toFixed(2)}%`);
    }
    
    // Update records
    await updateRecords(supabase, updates);
    
    console.log('\n🎉 Calculation and update completed successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Verify the data in Supabase Dashboard → Table Editor → ${TABLE_NAME}`);
    console.log(`  2. Check the maa-10-years column values`);
    
  } catch (error) {
    console.error('\n❌ Calculation failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();



