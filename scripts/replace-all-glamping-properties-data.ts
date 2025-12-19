/**
 * Script to replace all data in all_glamping_properties table with CSV data
 * 
 * Usage:
 *   npx tsx scripts/replace-all-glamping-properties-data.ts <path-to-csv-file>
 * 
 * Example:
 *   npx tsx scripts/replace-all-glamping-properties-data.ts csv/upload-to-db/all_glamping_properties_12-19.csv
 * 
 * WARNING: This script will DELETE all existing data in the table before uploading!
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

const TABLE_NAME = 'all_glamping_properties';

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
 * Clean and convert CSV values to appropriate types
 */
function cleanValue(value: any, columnName: string): any {
  // Handle null/empty values
  if (value === '' || value === undefined || value === null) {
    return null;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Convert common null representations to null
    const lowerValue = trimmed.toLowerCase();
    if (lowerValue === 'none' || lowerValue === 'n/a' || lowerValue === 'na' || lowerValue === 'null' || trimmed === '') {
      return null;
    }
    
    // Check if this column should be numeric
    const isNumericColumn = columnName.includes('rate') || 
                           columnName.includes('occupancy') || 
                           columnName.includes('revpar') || 
                           columnName === 'property__total_sites' ||
                           columnName === 'quantity_of_units' ||
                           columnName === 'unit_capacity' ||
                           columnName === 'year_site_opened' ||
                           columnName === '__of_locations' ||
                           columnName === 'zip_code' ||
                           columnName === 'lon' ||
                           columnName === 'lat' ||
                           columnName === 'google_rating' ||
                           columnName === 'google_user_rating_total' ||
                           columnName === 'google_price_level' ||
                           columnName === 'quality_score' ||
                           columnName === 'minimum_nights';
    
    if (isNumericColumn) {
      // Remove currency symbols, commas, and other formatting
      let cleanedNumStr = trimmed.replace(/[$,\s]/g, '');
      
      // Handle ranges by taking the first number (e.g., "$1150-1450" -> 1150)
      // But preserve negative signs for coordinates (lon/lat can be negative)
      if (cleanedNumStr.includes('-') && !cleanedNumStr.startsWith('-')) {
        // This is a range, not a negative number
        cleanedNumStr = cleanedNumStr.split('-')[0];
      }
      
      // Try to convert to number
      const numValue = Number(cleanedNumStr);
      if (!isNaN(numValue) && isFinite(numValue) && cleanedNumStr !== '') {
        return numValue;
      } else {
        // Try to extract first number from any remaining formatted strings
        const numMatch = cleanedNumStr.match(/^([\d.]+)/);
        if (numMatch) {
          const extractedNum = parseFloat(numMatch[1]);
          if (!isNaN(extractedNum) && isFinite(extractedNum)) {
            return extractedNum;
          }
        }
        return null;
      }
    }
    
    // For boolean-like columns (Yes/No, True/False, etc.)
    const booleanColumns = [
      'toilet', 'hot_tub___sauna', 'pool', 'pets', 'water', 'shower', 'trash',
      'cooking_equipment', 'picnic_table', 'wifi', 'laundry', 'campfires', 'playground',
      'rv___accommodates_slideout', 'rv___surface_level', 'rv___vehicles__fifth_wheels',
      'rv___vehicles__class_a_rvs', 'rv___vehicles__class_b_rvs', 'rv___vehicles__class_c_rvs',
      'rv___vehicles__toy_hauler', 'fishing', 'surfing', 'horseback_riding', 'paddling',
      'climbing', 'off_roading__ohv_', 'boating', 'swimming', 'wind_sports', 'snow_sports',
      'whitewater_paddling', 'fall_fun', 'hiking', 'wildlife_watching', 'biking', 'ranch',
      'beach', 'coastal', 'suburban', 'forest', 'field', 'wetlands', 'hot_spring', 'desert',
      'canyon', 'waterfall', 'swimming_hole', 'lake', 'cave', 'redwoods', 'farm',
      'mountainous', 'sage___p__amenity__food_on_site', 'waterfront', 'restaurant',
      'dog_park', 'clubhouse', 'canoeing___kayaking', 'alcohol_available', 'golf_cart_rental',
      'private_bathroom', 'waterpark', 'kitchen', 'patio', 'electricity', 'general_store',
      'cable', 'charcoal_grill', 'sewer_hook_up', 'electrical_hook_up', 'generators_allowed',
      'water_hookup', 'google_dine_in', 'google_takeout', 'google_delivery',
      'google_serves_breakfast', 'google_serves_lunch', 'google_serves_dinner',
      'google_serves_brunch', 'google_outdoor_seating', 'google_live_music',
      'google_reservable', 'google_wheelchair_accessible_parking',
      'google_wheelchair_accessible_entrance', 'google_wheelchair_accessible_restroom',
      'google_wheelchair_accessible_seating', 'google_allows_dogs', 'is_glamping_property',
      'is_closed'
    ];
    
    if (booleanColumns.includes(columnName)) {
      const lowerValue = trimmed.toLowerCase();
      if (lowerValue === 'yes' || lowerValue === 'true' || lowerValue === '1') {
        return 'Yes';
      } else if (lowerValue === 'no' || lowerValue === 'false' || lowerValue === '0') {
        return 'No';
      }
      return trimmed; // Keep original if not a standard boolean value
    }
    
    // For JSONB columns, try to parse as JSON
    if (columnName.includes('google_') && (columnName.includes('hours') || columnName.includes('options') || columnName.includes('types') || columnName.includes('photos'))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed; // If not valid JSON, keep as string
      }
    }
    
    // TEXT column - keep as string
    return trimmed;
  }
  
  if (typeof value === 'number') {
    // Already a number, keep it (but check for NaN/Infinity)
    return (isNaN(value) || !isFinite(value)) ? null : value;
  }
  
  return value;
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
    
    // Clean the data: convert values to appropriate types
    const cleanedBatch = batch.map(row => {
      const cleaned: CSVRow = {};
      for (const [columnName, value] of Object.entries(row)) {
        cleaned[columnName] = cleanValue(value, columnName);
      }
      
      // Ensure slug is not null/empty to prevent trigger from firing
      // (which would try to query the old table name)
      if (!cleaned.slug || cleaned.slug === '' || cleaned.slug === null) {
        // If slug is missing, generate a basic one from property_name
        if (cleaned.property_name && typeof cleaned.property_name === 'string') {
          const propertyName = cleaned.property_name.trim();
          if (propertyName) {
            // Basic slug generation (same logic as trigger would use)
            let slug = propertyName
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim();
            cleaned.slug = slug || null;
          }
        }
      }
      
      // Ensure is_glamping_property has a value (required NOT NULL column)
      if (!cleaned.is_glamping_property || cleaned.is_glamping_property === '' || cleaned.is_glamping_property === null) {
        cleaned.is_glamping_property = 'Yes'; // Default value
      }
      
      // Ensure is_closed has a value (required NOT NULL column with default 'No')
      if (!cleaned.is_closed || cleaned.is_closed === '' || cleaned.is_closed === null) {
        cleaned.is_closed = 'No'; // Default value
      }
      
      return cleaned;
    });
    
    const { error, count } = await supabase
      .from(TABLE_NAME)
      .insert(cleanedBatch);
    
    if (error) {
      console.error(`  ❌ Error uploading batch ${batchNumber}: ${error.message}`);
      console.error(`     Error code: ${error.code}`);
      if (error.message.includes('invalid input syntax')) {
        console.error(`     This usually means a non-numeric value was sent to a NUMERIC column.`);
        console.error(`     Sample row from batch:`, JSON.stringify(cleanedBatch[0], null, 2));
      }
      errors += batch.length;
      
      // If it's a column error, show helpful message
      if (error.message.includes('column') || error.code === 'PGRST204') {
        console.error('\n  💡 Tip: Make sure all CSV columns match the table columns in Supabase.');
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
    console.error('  npx tsx scripts/replace-all-glamping-properties-data.ts <path-to-csv-file>');
    console.error('\nExample:');
    console.error('  npx tsx scripts/replace-all-glamping-properties-data.ts csv/upload-to-db/all_glamping_properties_12-19.csv');
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
    console.log(`\n📋 Detected ${columns.length} columns in CSV`);
    console.log(`   First few columns: ${columns.slice(0, 5).join(', ')}...`);
    
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
    
    // Clear existing data first
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
    
    // Upload data
    await uploadData(supabase, csvData);
    
    console.log('\n🎉 Data replacement completed successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Verify the data in Supabase Dashboard → Table Editor → ${TABLE_NAME}`);
    console.log(`  2. Check Row Level Security policies if you need public access`);
    
  } catch (error) {
    console.error('\n❌ Operation failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
