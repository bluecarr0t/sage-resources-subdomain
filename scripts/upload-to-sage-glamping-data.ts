/**
 * Script to upload CSV file to sage-glamping-data table and calculate rate categories
 * 
 * Usage:
 *   npx tsx scripts/upload-to-sage-glamping-data.ts <path-to-csv-file> [--append]
 * 
 * Examples:
 *   npx tsx scripts/upload-to-sage-glamping-data.ts csv/data.csv
 *   npx tsx scripts/upload-to-sage-glamping-data.ts csv/data.csv --append
 * 
 * Options:
 *   --append    Skip clearing existing data and append new data instead
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
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

const TABLE_NAME = 'sage-glamping-data';

interface CSVRow {
  [key: string]: string | number | null;
}

/**
 * Parse CSV file and return array of objects
 */
function parseCSV(filePath: string): CSVRow[] {
  try {
    console.log(`📖 Reading CSV file: ${filePath}`);
    const fileContent = readFileSync(filePath, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true, // Use first line as column names
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow inconsistent column counts
      cast: false, // Don't auto-cast - we'll handle it manually
    });
    
    console.log(`✅ Parsed ${records.length} rows from CSV`);
    return records;
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Check if table exists
 */
async function ensureTableExists(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .limit(0);
  
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
      console.error(`\n❌ Table '${TABLE_NAME}' does not exist. Please create it in Supabase first.`);
      throw new Error('Table does not exist. Please create it first.');
    } else {
      throw error;
    }
  } else {
    console.log(`✅ Table '${TABLE_NAME}' exists`);
  }
}

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

/**
 * Calculate and populate rate categories
 */
async function populateRateCategories(supabase: ReturnType<typeof createClient>): Promise<void> {
  console.log('\n📊 Calculating rate categories...\n');

  try {
    // Fetch all records with property_name and seasonal rates
    console.log('Fetching data from sage-glamping-data...');
    const { data: allRecords, error: fetchError } = await supabase
      .from(TABLE_NAME)
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
        .from(TABLE_NAME)
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

    console.log('\n✅ Rate category calculation complete!');
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
    console.error('❌ Error calculating rate categories:', error);
    throw error;
  }
}

/**
 * Upload data to Supabase in batches
 */
async function uploadData(
  supabase: ReturnType<typeof createClient>,
  data: CSVRow[]
): Promise<void> {
  const BATCH_SIZE = 1000; // Supabase recommends batches of 1000 or less
  
  console.log(`\n📤 Uploading ${data.length} rows to '${TABLE_NAME}' table...`);
  
  let uploaded = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);
    
    console.log(`  📦 Uploading batch ${batchNumber}/${totalBatches} (${batch.length} rows)...`);
    
    // Map CSV column names (as they appear in the file) to table column names
    // null means skip this column
    const csvToTableMapping: Record<string, string | null> = {
      'DuplicateNote': 'duplicatenote',
      'Source': 'source',
      'Date Added': 'date_added',
      'Date Updated': 'date_updated',
      'Property Name': 'property_name',
      'Site Name': 'site_name',
      'Unit Type': 'unit_type',
      'Property Type': 'property_type',
      'Property: Total Sites': 'property__total_sites',
      'Quantity of Units': 'quantity_of_units',
      'Unit Capacity': 'unit_capacity',
      'Unit Guest Capacity': 'unit_capacity', // Alternative column name
      'Year Site Opened': 'year_site_opened',
      'Operating Season (months)': 'operating_season__months_',
      '# of Locations': '__of_locations',
      'Address': 'address',
      'City': 'city',
      'State': 'state',
      'Zip Code': 'zip_code',
      'Country': 'country',
      'Occupancy rate 2023': null, // Not in table schema, skip
      'Occupancy Rate 2024': 'occupancy_rate_2024',
      'Occupancy rate 2024': 'occupancy_rate_2024',
      'Retail Daily Rate 2024': null, // Not in table schema, skip (we have avg__retail_daily_rate_2024)
      'Avg. Retail Daily Rate 2024': 'avg__retail_daily_rate_2024',
      'High Rate 2024': 'high_rate_2024',
      'Low Rate 2024': 'low_rate_2024',
      'Retail Daily Rate(+fees) 2024': 'retail_daily_rate__fees__2024',
      'RevPAR 2024': 'revpar_2024',
      'RavPAR 2024': 'revpar_2024', // Handle typo in CSV
      'Occupancy Rate 2025': 'occupancy_rate_2025',
      'Retail Daily Rate YTD': 'retail_daily_rate_ytd',
      'Retail Daily Rate(+fees) YTD': 'retail_daily_rate__fees__ytd',
      'High Rate 2025': 'high_rate_2025',
      'Low Rate 2025': 'low_rate_2025',
      'RevPAR 2025': 'revpar_2025',
      'High Month 2025': 'high_month_2025',
      'High Avg. Occupancy 2025': 'high_avg__occupancy_2025',
      'Low Month 2025': 'low_month_2025',
      'Low Avg. Occupancy 2025': 'low_avg__occupancy_2025',
      'Operating Season (Months)': 'operating_season__excel_format_',
      'Operating Season (Excel Format)': 'operating_season__excel_format_',
      'Avg. Rate (Next 12 Months)': 'avg__rate__next_12_months_',
      'High Rate (Next 12 Months)': 'high_rate__next_12_months_',
      'Low Rate (Next 12 Months)': 'low_rate__next_12_months_',
      'Winter Weekday': 'winter_weekday',
      '2025 - Winter Weekday': 'winter_weekday',
      'Winter Weekend': 'winter_weekend',
      '2025 - Winter Weekend': 'winter_weekend',
      'Spring Weekday': 'spring_weekday',
      '2025 - Spring Weekday': 'spring_weekday',
      'Spring Weekend': 'spring_weekend',
      '2025 - Spring Weekend': 'spring_weekend',
      'Summer Weekday': 'summer_weekday',
      '2025 - Summer Weekday': 'summer_weekday',
      'Summer Weekend': 'summer_weekend',
      '2025 - Summer Weekend': 'summer_weekend',
      'Fall Weekday': 'fall_weekday',
      '2024 - Fall Weekday': 'fall_weekday',
      'Fall Weekend': 'fall_weekend',
      '2024 - Fall Weekend': 'fall_weekend',
      'Url': 'url',
      'Description': 'description',
      'Minimum nights': 'minimum_nights',
      'Getting there': 'getting_there',
      'lon': 'lon',
      'Longitude': 'lon',
      'lat': 'lat',
      'Latitude': 'lat',
      'Toilet': 'toilet',
      'Hot Tub / Sauna': 'hot_tub___sauna',
      'Hot Tub': 'hot_tub___sauna',
      'SGD - P. Amenity: Hot Tub / Sauna': 'hot_tub___sauna',
      'Pool': 'pool',
      'SGD - P. Amenity: Pool - Indoor': 'pool',
      'SGD - P. Amenity: Pool - Outdoor': 'pool',
      'Pets': 'pets',
      'Water': 'water',
      'Shower': 'shower',
      'Trash': 'trash',
      'Cooking Equipment': 'cooking_equipment',
      'Cooking equipment': 'cooking_equipment',
      'Picnic table': 'picnic_table',
      'Picnic Table': 'picnic_table',
      'Wifi': 'wifi',
      'Laundry': 'laundry',
      'Campfires': 'campfires',
      'Playground': 'playground',
      'RV - Vehicle Length': 'rv___vehicle_length',
      'RV - Parking': 'rv___parking',
      'RV - Accommodates Slideout': 'rv___accommodates_slideout',
      'RV - Surface Type': 'rv___surface_type',
      'RV - Surface Level': 'rv___surface_level',
      'RV - Surface level': 'rv___surface_level',
      'RV - Vehicles: Fifth Wheels': 'rv___vehicles__fifth_wheels',
      'RV - Vehicles: Class A RVs': 'rv___vehicles__class_a_rvs',
      'RV - Vehicles: Class B RVs': 'rv___vehicles__class_b_rvs',
      'RV - Vehicles: Class C RVs': 'rv___vehicles__class_c_rvs',
      'RV - Vehicles: Toy Hauler': 'rv___vehicles__toy_hauler',
      'Fishing': 'fishing',
      'Surfing': 'surfing',
      'Horseback riding': 'horseback_riding',
      'Paddling': 'paddling',
      'Climbing': 'climbing',
      'Off-roading (OHV)': 'off_roading__ohv_',
      'Boating': 'boating',
      'Swimming': 'swimming',
      'Wind sports': 'wind_sports',
      'Snow sports': 'snow_sports',
      'Whitewater paddling': 'whitewater_paddling',
      'Fall Fun': 'fall_fun',
      'Hiking': 'hiking',
      'Wildlife watching': 'wildlife_watching',
      'Biking': 'biking',
      'Ranch': 'ranch',
      'Beach': 'beach',
      'Coastal': 'coastal',
      'Suburban': 'suburban',
      'Forest': 'forest',
      'Field': 'field',
      'Wetlands': 'wetlands',
      'Hot spring': 'hot_spring',
      'Desert': 'desert',
      'Canyon': 'canyon',
      'Waterfall': 'waterfall',
      'Swimming hole': 'swimming_hole',
      'Lake': 'lake',
      'Cave': 'cave',
      'Redwoods': 'redwoods',
      'Farm': 'farm',
      'River, stream, or creek': 'river__stream__or_creek',
      'Mountainous': 'mountainous',
      'Sage - P. Amenity: Food On Site': 'sage___p__amenity__food_on_site',
      'SGD - P. Amenity: Food On Site': 'sage___p__amenity__food_on_site',
      'Waterfront': 'waterfront',
      'SGD - P. Amenity: Waterfront': 'waterfront',
      'Restaurant': 'restaurant',
      'SGD - P. Amenity: Restaurant': 'restaurant',
      'Dog Park': 'dog_park',
      'Clubhouse': 'clubhouse',
      'Canoeing / Kayaking': 'canoeing___kayaking',
      'Alcohol Available': 'alcohol_available',
      'Golf Cart Rental': 'golf_cart_rental',
      'Private Bathroom': 'private_bathroom',
      'SGD - S. Amenity: Private Bathroom': 'private_bathroom',
      'Waterpark': 'waterpark',
      'Kitchen': 'kitchen',
      'Patio': 'patio',
      'Electricity': 'electricity',
      'General Store': 'general_store',
      'Cable': 'cable',
      'Charcoal Grill': 'charcoal_grill',
      'Sewer Hook-Up': 'sewer_hook_up',
      'Electrical Hook-Up': 'electrical_hook_up',
      'Generators Allowed': 'generators_allowed',
      'Water Hookup': 'water_hookup',
      'INTERNAL NOTES ONLY,': null, // Skip internal notes column
      // Google Places API fields - Skip all Google columns as they don't exist in table
      'Google Phone Number': null,
      'Google Website URI': null,
      'Google Dine In': null,
      'Google Takeout': null,
      'Google Delivery': null,
      'Google Serves Breakfast': null,
      'Google Serves Lunch': null,
      'Google Serves Dinner': null,
      'Google Serves Brunch': null,
      'Google Outdoor Seating': null,
      'Google Live Music': null,
      'Google Menu URI': null,
      'Google Place Types': null,
      'Google Primary Type': null,
      'Google Primary Type Display Name': null,
      'Google Photos': null,
      'Google Photos Count': null, // Skip - this is just metadata
      'Google Icon URI': null,
      'Google Icon Background Color': null,
      'Google Reservable': null,
      'Google Rating': null, // Already handled above
      'Google Review Count': null, // Already handled above
      'Verification Status': null, // Skip - not in table schema
      'Verification Notes': null, // Skip - not in table schema
    };
    
    // Clean the data: remove empty strings, convert "None" and similar to null
    // Also handle numeric columns that might contain formatted strings
    const cleanedBatch = batch.map(row => {
      const cleaned: CSVRow = {};
      for (const [csvKey, value] of Object.entries(row)) {
        // Map CSV column name to table column name
        const mappedKey = csvToTableMapping[csvKey];
        
        // Skip columns that are explicitly mapped to null
        if (mappedKey === null) {
          continue;
        }
        
        const tableKey = mappedKey || csvKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        // Convert null-like values to null
        let cleanedValue: any = value;
        
        // Handle null/empty values
        if (value === '' || value === undefined || value === null) {
          cleanedValue = null;
        } else if (typeof value === 'string') {
          const trimmed = value.trim();
          
          // Convert common null representations to null
          const lowerValue = trimmed.toLowerCase();
          if (lowerValue === 'none' || lowerValue === 'n/a' || lowerValue === 'na' || lowerValue === 'null' || trimmed === '') {
            cleanedValue = null;
          } else {
            // Check if this column should be numeric based on the table schema
            // For TEXT columns, keep as string
            // For NUMERIC columns, try to convert to number
            const isNumericColumn = tableKey.includes('rate') || 
                                   tableKey.includes('occupancy') || 
                                   tableKey.includes('revpar') || 
                                   tableKey === 'property__total_sites' ||
                                   tableKey === 'quantity_of_units' ||
                                   tableKey === 'year_site_opened' ||
                                   tableKey === '__of_locations' ||
                                   tableKey === 'zip_code' ||
                                   tableKey === 'lon' ||
                                   tableKey === 'lat';
            
            if (isNumericColumn) {
              // Remove currency symbols, commas, and other formatting
              // Handle ranges by taking the first number (e.g., "$1150-1450" -> 1150)
              // But preserve negative signs for coordinates (lon/lat can be negative)
              let cleanedNumStr = trimmed.replace(/[$,\s]/g, '');
              
              // If there's a dash that's NOT at the start (negative number), it's a range
              // For ranges, take only the part before it (e.g., "$1150-1450" -> 1150)
              // For negative numbers (e.g., "-97.4356416"), keep the whole value
              if (cleanedNumStr.includes('-') && !cleanedNumStr.startsWith('-')) {
                // This is a range, not a negative number
                cleanedNumStr = cleanedNumStr.split('-')[0];
              }
              
              // Try to convert to number
              const numValue = Number(cleanedNumStr);
              if (!isNaN(numValue) && isFinite(numValue) && cleanedNumStr !== '') {
                cleanedValue = numValue;
              } else {
                // Try to extract first number from any remaining formatted strings
                const numMatch = cleanedNumStr.match(/^([\d.]+)/);
                if (numMatch) {
                  const extractedNum = parseFloat(numMatch[1]);
                  if (!isNaN(extractedNum) && isFinite(extractedNum)) {
                    cleanedValue = extractedNum;
                  } else {
                    cleanedValue = null;
                  }
                } else {
                  // Non-numeric text in numeric column - set to null
                  cleanedValue = null;
                }
              }
            } else {
              // TEXT column - keep as string
              cleanedValue = trimmed;
            }
          }
        } else if (typeof value === 'number') {
          // Already a number, keep it (but check for NaN/Infinity)
          cleanedValue = (isNaN(value) || !isFinite(value)) ? null : value;
        }
        
        cleaned[tableKey] = cleanedValue;
      }
      return cleaned;
    });
    
    // Final check: ensure all numeric columns are actually numbers or null
    // List of all numeric columns in the table
    const numericColumns = new Set([
      'property__total_sites', 'quantity_of_units', 'year_site_opened', '__of_locations',
      'zip_code', 'lon', 'lat',
      'occupancy_rate_2024', 'avg__retail_daily_rate_2024', 'high_rate_2024', 'low_rate_2024',
      'retail_daily_rate__fees__2024', 'revpar_2024',
      'occupancy_rate_2025', 'retail_daily_rate_ytd', 'retail_daily_rate__fees__ytd',
      'high_rate_2025', 'low_rate_2025', 'revpar_2025',
      'high_avg__occupancy_2025', 'low_avg__occupancy_2025',
      'avg__rate__next_12_months_', 'high_rate__next_12_months_', 'low_rate__next_12_months_',
      'winter_weekday', 'winter_weekend', 'spring_weekday', 'spring_weekend',
      'summer_weekday', 'summer_weekend', 'fall_weekday', 'fall_weekend'
    ]);
    
    const finalBatch = cleanedBatch.map(row => {
      const final: CSVRow = {};
      for (const [key, value] of Object.entries(row)) {
        // Double-check numeric columns
        if (numericColumns.has(key) && value !== null && typeof value !== 'number') {
          // Force conversion or set to null
          const strValue = String(value);
          const cleaned = strValue.replace(/[$,\s]/g, '').split('-')[0].split('+')[0];
          const numValue = Number(cleaned);
          final[key] = (!isNaN(numValue) && isFinite(numValue) && cleaned !== '') ? numValue : null;
        } else {
          final[key] = value;
        }
      }
      return final;
    });
    
    const { error, count } = await supabase
      .from(TABLE_NAME)
      .insert(finalBatch);
    
    if (error) {
      console.error(`  ❌ Error uploading batch ${batchNumber}: ${error.message}`);
      console.error(`     Error code: ${error.code}`);
      if (error.message.includes('invalid input syntax')) {
        console.error(`     This usually means a non-numeric value was sent to a NUMERIC column.`);
        console.error(`     Sample row from batch:`, JSON.stringify(finalBatch[0], null, 2));
      }
      errors += batch.length;
      
      // If it's a column error, show helpful message
      if (error.message.includes('column') || error.code === 'PGRST204') {
        console.error('\n  💡 Tip: Make sure all CSV columns match the table columns in Supabase.');
        console.error('     Column names are case-insensitive and special characters are replaced with underscores.');
      }
    } else {
      uploaded += batch.length;
      console.log(`  ✅ Batch ${batchNumber} uploaded successfully`);
    }
  }
  
  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Successfully uploaded: ${uploaded} rows`);
  if (errors > 0) {
    console.log(`   ❌ Failed: ${errors} rows`);
  }
  
  if (errors > 0) {
    throw new Error(`Failed to upload ${errors} rows`);
  }
}

/**
 * Main function
 */
async function main() {
  const csvPath = process.argv[2];
  const appendMode = process.argv.includes('--append');
  
  if (!csvPath) {
    console.error('❌ Please provide a CSV file path');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/upload-to-sage-glamping-data.ts <path-to-csv-file> [--append]');
    console.error('\nExamples:');
    console.error('  npx tsx scripts/upload-to-sage-glamping-data.ts csv/data.csv');
    console.error('  npx tsx scripts/upload-to-sage-glamping-data.ts csv/data.csv --append');
    process.exit(1);
  }
  
  try {
    // Parse CSV
    const csvData = parseCSV(csvPath);
    
    if (csvData.length === 0) {
      console.error('❌ CSV file is empty or has no data rows');
      process.exit(1);
    }
    
    // Get column names from first row
    const columns = Object.keys(csvData[0]);
    console.log(`\n📋 Detected columns: ${columns.join(', ')}`);
    
    // Create Supabase client
    console.log('\n🔌 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Check if table exists
    await ensureTableExists(supabase);
    
    // Clear existing data first (unless in append mode)
    if (!appendMode) {
      console.log(`\n🗑️  Clearing existing data from '${TABLE_NAME}' table...`);
      const { error: deleteError, count: deleteCount } = await supabase
        .from(TABLE_NAME)
        .delete()
        .neq('id', 0); // Delete all rows (id is always > 0)
      
      if (deleteError) {
        console.error(`  ❌ Error clearing table: ${deleteError.message}`);
        throw deleteError;
      } else {
        console.log(`  ✅ Table cleared (${deleteCount || 0} rows deleted)`);
      }
    } else {
      console.log(`\n➕ Append mode: Keeping existing data and adding new records...`);
    }
    
    // Upload data
    await uploadData(supabase, csvData);
    
    // Calculate rate categories
    await populateRateCategories(supabase);
    
    console.log('\n🎉 Upload and rate category calculation completed successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Verify the data in Supabase Dashboard → Table Editor → ${TABLE_NAME}`);
    console.log(`  2. Check Row Level Security policies if you need public access`);
    
  } catch (error) {
    console.error('\n❌ Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();

