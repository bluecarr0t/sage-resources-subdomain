/**
 * Script to upload CSV file to Supabase table 'sage-updated'
 * 
 * Usage:
 *   npx tsx scripts/upload-csv-to-supabase.ts <path-to-csv-file>
 * 
 * Example:
 *   npx tsx scripts/upload-csv-to-supabase.ts data/sage-updated.csv
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

const TABLE_NAME = 'sage-updated';

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
 * Check if table exists and create it if it doesn't
 * Note: This requires the table to be created manually in Supabase
 * We'll provide SQL instructions instead
 */
async function ensureTableExists(supabase: ReturnType<typeof createClient>, columns: string[]): Promise<void> {
  // Try to query the table to see if it exists
  const { error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .limit(0);
  
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
      console.log('\n⚠️  Table does not exist. Please create it in Supabase first.');
      console.log('\n📝 SQL to create the table:');
      console.log('\n```sql');
      // Quote table name if it contains hyphens or special characters
      const quotedTableName = TABLE_NAME.includes('-') ? `"${TABLE_NAME}"` : TABLE_NAME;
      console.log(`CREATE TABLE IF NOT EXISTS ${quotedTableName} (`);
      console.log('  id BIGSERIAL PRIMARY KEY,');
      
      // Generate column definitions
      columns.forEach((col, index) => {
        const sanitizedCol = col.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const isLast = index === columns.length - 1;
        console.log(`  ${sanitizedCol} TEXT,`);
      });
      
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      console.log(');');
      console.log('\n-- Enable Row Level Security (optional)');
      console.log(`ALTER TABLE ${quotedTableName} ENABLE ROW LEVEL SECURITY;`);
      console.log('\n-- Allow public read access (optional)');
      console.log(`CREATE POLICY "Allow public read access" ON ${quotedTableName}`);
      console.log('  FOR SELECT');
      console.log('  USING (true);');
      console.log('```\n');
      
      console.log('💡 Steps to create the table:');
      console.log('  1. Go to your Supabase Dashboard');
      console.log('  2. Navigate to SQL Editor');
      console.log('  3. Run the SQL above (adjust column types as needed)');
      console.log('  4. Re-run this script\n');
      
      throw new Error('Table does not exist. Please create it first using the SQL provided above.');
    } else {
      throw error;
    }
  } else {
    console.log(`✅ Table '${TABLE_NAME}' exists`);
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
  
  if (!csvPath) {
    console.error('❌ Please provide a CSV file path');
    console.error('\nUsage:');
    console.error('  npx tsx scripts/upload-csv-to-supabase.ts <path-to-csv-file>');
    console.error('\nExample:');
    console.error('  npx tsx scripts/upload-csv-to-supabase.ts data/sage-updated.csv');
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
    await ensureTableExists(supabase, columns);
    
    // Clear existing data first
    console.log(`\n🗑️  Clearing existing data from '${TABLE_NAME}' table...`);
    const { error: deleteError } = await supabase
      .from(TABLE_NAME)
      .delete()
      .neq('id', 0); // Delete all rows (id is always > 0)
    
    if (deleteError) {
      console.warn(`  ⚠️  Warning: Could not clear table: ${deleteError.message}`);
      console.warn(`  Continuing with upload (may result in duplicates)...`);
    } else {
      console.log(`  ✅ Table cleared`);
    }
    
    // Upload data
    await uploadData(supabase, csvData);
    
    console.log('\n🎉 Upload completed successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Verify the data in Supabase Dashboard → Table Editor → ${TABLE_NAME}`);
    console.log(`  2. Check Row Level Security policies if you need public access`);
    
  } catch (error) {
    console.error('\n❌ Upload failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();

