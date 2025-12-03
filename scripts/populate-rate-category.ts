import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Populate rate_category column in sage-glamping-data table
 * This script calculates the rate category for each property based on avg__rate__next_12_months_
 * and groups by property_name to assign a single category per property
 */

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Categorize a rate into one of the 5 standard categories
 */
function getRateCategory(rate: number | null): string | null {
  if (rate === null || rate === undefined || isNaN(rate) || !isFinite(rate)) return null;
  
  if (rate <= 149) return '≤$149';
  if (rate >= 150 && rate <= 249) return '$150-$249';
  if (rate >= 250 && rate <= 399) return '$250-$399';
  if (rate >= 400 && rate <= 549) return '$400-$549';
  if (rate >= 550) return '$550+';
  
  return null;
}

async function populateRateCategory() {
  console.log('📊 Starting rate category population...\n');

  try {
    // Fetch all records with property_name and seasonal rates
    console.log('Fetching data from sage-glamping-data...');
    const { data: allRecords, error: fetchError } = await supabase
      .from('sage-glamping-data')
      .select('id, property_name, avg__rate__next_12_months_, winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, fall_weekday, fall_weekend')
      .limit(10000);

    if (fetchError) {
      throw fetchError;
    }

    if (!allRecords || allRecords.length === 0) {
      console.log('No records found in sage-glamping-data table.');
      return;
    }

    console.log(`Found ${allRecords.length} records\n`);

    // Group by property_name and calculate average rate per property
    const propertyRates = new Map<string, number[]>();
    
    allRecords.forEach((record: any) => {
      const propertyName = record.property_name;
      if (!propertyName) {
        return;
      }

      // First try avg__rate__next_12_months_ if it exists
      let rate = record.avg__rate__next_12_months_;
      
      // If not available, calculate average from seasonal rates
      if (rate == null || isNaN(Number(rate)) || !isFinite(Number(rate))) {
        const seasonalRates: number[] = [];
        
        // Collect all valid seasonal rates
        ['winter_weekday', 'winter_weekend', 'spring_weekday', 'spring_weekend', 
         'summer_weekday', 'summer_weekend', 'fall_weekday', 'fall_weekend'].forEach((field) => {
          const value = record[field];
          if (value != null && !isNaN(Number(value)) && isFinite(Number(value)) && Number(value) > 0) {
            seasonalRates.push(Number(value));
          }
        });
        
        // Calculate average if we have seasonal rates
        if (seasonalRates.length > 0) {
          rate = seasonalRates.reduce((sum, r) => sum + r, 0) / seasonalRates.length;
        }
      }
      
      if (rate != null && !isNaN(Number(rate)) && isFinite(Number(rate)) && Number(rate) > 0) {
        if (!propertyRates.has(propertyName)) {
          propertyRates.set(propertyName, []);
        }
        propertyRates.get(propertyName)!.push(Number(rate));
      }
    });

    console.log(`Grouped into ${propertyRates.size} unique properties\n`);

    // Calculate average rate per property and determine category
    const propertyCategories = new Map<string, string>();
    
    propertyRates.forEach((rates, propertyName) => {
      const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      const category = getRateCategory(avgRate);
      if (category) {
        propertyCategories.set(propertyName, category);
      }
    });

    console.log(`Calculated categories for ${propertyCategories.size} properties\n`);

    // Update all records for each property with the same category
    let updatedCount = 0;
    let errorCount = 0;

    for (const [propertyName, category] of propertyCategories.entries()) {
      const { error: updateError } = await supabase
        .from('sage-glamping-data')
        .update({ rate_category: category })
        .eq('property_name', propertyName);

      if (updateError) {
        console.error(`Error updating ${propertyName}:`, updateError.message);
        errorCount++;
      } else {
        // Count how many records were updated for this property
        const propertyRecords = allRecords.filter((r: any) => r.property_name === propertyName);
        updatedCount += propertyRecords.length;
      }
    }

    console.log('\n✅ Rate category population complete!');
    console.log(`   Updated ${updatedCount} records`);
    console.log(`   ${errorCount} errors`);
    console.log(`\nCategory distribution:`);
    
    // Show distribution
    const categoryCounts = new Map<string, number>();
    propertyCategories.forEach((category) => {
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const sortedCategories = ['≤$149', '$150-$249', '$250-$399', '$400-$549', '$550+'];
    sortedCategories.forEach((cat) => {
      const count = categoryCounts.get(cat) || 0;
      const percentage = ((count / propertyCategories.size) * 100).toFixed(1);
      console.log(`   ${cat.padEnd(15)}: ${count.toString().padStart(4)} properties (${percentage}%)`);
    });

  } catch (error) {
    console.error('❌ Error populating rate category:', error);
    process.exit(1);
  }
}

// Run the script
populateRateCategory();

