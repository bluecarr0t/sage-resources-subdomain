/**
 * Analyze the sage-glamping-data table to find:
 * - How many valid coordinates there are
 * - How many unique coordinates there are
 * - How many unique property names there are
 * - Compare these numbers
 * 
 * Run with: npx tsx scripts/analyze-coordinates-and-properties.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseCoordinates, isInUSAOrCanada } from '../lib/types/sage';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

interface PropertyRecord {
  id: number;
  property_name: string | null;
  lat: string | number | null;
  lon: string | number | null;
  state: string | null;
  country: string | null;
}

async function analyzeTable() {
  console.log('🔍 Analyzing sage-glamping-data table...\n');

  try {
    // Fetch all records (in batches if needed)
    console.log('📥 Fetching all records from sage-glamping-data...');
    
    let allData: PropertyRecord[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      const { data, error, count } = await supabase
        .from('sage-glamping-data')
        .select('id, property_name, lat, lon, state, country', { count: 'exact' })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Error fetching data:', error);
        process.exit(1);
      }

      if (!data) {
        break;
      }

      if (count !== null && totalCount === 0) {
        totalCount = count;
      }

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
      
      console.log(`  Fetched ${allData.length} / ${totalCount || '?'} records...`);
    }

    const data = allData;
    const count = totalCount;

    if (!data || data.length === 0) {
      console.error('❌ No data returned');
      process.exit(1);
    }

    console.log(`✅ Fetched ${data.length} records (total in table: ${count ?? 'unknown'})\n`);

    // Analyze coordinates
    const validCoordinates: Array<[number, number]> = [];
    const uniqueCoordinates = new Set<string>();
    const uniquePropertyNames = new Set<string>();
    const propertiesByCoords = new Map<string, Set<string>>(); // Track which properties share coordinates
    const propertiesWithoutCoords: string[] = [];
    const invalidCoordinates: Array<{ property: string; lat: any; lon: any; reason: string }> = [];

    console.log('🔍 Analyzing coordinates and property names...\n');

    for (const record of data) {
      const propertyName = record.property_name?.trim() || null;
      
      // Track unique property names
      if (propertyName) {
        uniquePropertyNames.add(propertyName);
      }

      // Parse and validate coordinates
      const coords = parseCoordinates(record.lat, record.lon);
      
      if (!coords) {
        if (propertyName) {
          propertiesWithoutCoords.push(propertyName);
        }
        invalidCoordinates.push({
          property: propertyName || `ID: ${record.id}`,
          lat: record.lat,
          lon: record.lon,
          reason: 'Invalid or missing coordinates',
        });
        continue;
      }

      // Check if coordinates are in USA/Canada bounds
      if (!isInUSAOrCanada(coords[0], coords[1])) {
        invalidCoordinates.push({
          property: propertyName || `ID: ${record.id}`,
          lat: coords[0],
          lon: coords[1],
          reason: 'Outside USA/Canada bounds',
        });
        continue;
      }

      // Valid coordinates
      validCoordinates.push(coords);
      
      // Track unique coordinates (rounded to 6 decimal places for comparison)
      const coordKey = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
      uniqueCoordinates.add(coordKey);
      
      // Track which properties share the same coordinates
      if (propertyName) {
        if (!propertiesByCoords.has(coordKey)) {
          propertiesByCoords.set(coordKey, new Set());
        }
        propertiesByCoords.get(coordKey)!.add(propertyName);
      }
    }

    // Find coordinates shared by multiple properties
    const sharedCoordinates: Array<{ coords: string; properties: string[]; count: number }> = [];
    propertiesByCoords.forEach((properties, coords) => {
      if (properties.size > 1) {
        sharedCoordinates.push({
          coords,
          properties: Array.from(properties),
          count: properties.size,
        });
      }
    });

    // Sort by number of properties sharing the coordinate
    sharedCoordinates.sort((a, b) => b.count - a.count);

    // Print results
    console.log('='.repeat(60));
    console.log('📊 ANALYSIS RESULTS');
    console.log('='.repeat(60));
    console.log('');

    console.log('📈 OVERALL STATISTICS:');
    console.log(`  Total records: ${data.length}`);
    console.log(`  Unique property names: ${uniquePropertyNames.size}`);
    console.log(`  Records with valid coordinates: ${validCoordinates.length}`);
    console.log(`  Records without valid coordinates: ${invalidCoordinates.length}`);
    console.log(`  Unique coordinates: ${uniqueCoordinates.size}`);
    console.log('');

    console.log('🔢 COORDINATE ANALYSIS:');
    console.log(`  Valid coordinates: ${validCoordinates.length} (${((validCoordinates.length / data.length) * 100).toFixed(1)}% of records)`);
    console.log(`  Unique coordinates: ${uniqueCoordinates.size}`);
    console.log(`  Duplicate coordinates: ${validCoordinates.length - uniqueCoordinates.size}`);
    if (validCoordinates.length > 0) {
      console.log(`  Average properties per coordinate: ${(validCoordinates.length / uniqueCoordinates.size).toFixed(2)}`);
    }
    console.log('');

    console.log('🏢 PROPERTY NAME ANALYSIS:');
    console.log(`  Unique property names: ${uniquePropertyNames.size}`);
    console.log(`  Records per property (avg): ${(data.length / uniquePropertyNames.size).toFixed(2)}`);
    console.log('');

    console.log('🔗 COMPARISON:');
    console.log(`  Unique property names: ${uniquePropertyNames.size}`);
    console.log(`  Unique coordinates: ${uniqueCoordinates.size}`);
    console.log(`  Difference: ${Math.abs(uniquePropertyNames.size - uniqueCoordinates.size)}`);
    
    if (uniquePropertyNames.size > uniqueCoordinates.size) {
      console.log(`  ⚠️  More unique properties than unique coordinates`);
      console.log(`     This means some properties share the same coordinates`);
    } else if (uniqueCoordinates.size > uniquePropertyNames.size) {
      console.log(`  ⚠️  More unique coordinates than unique properties`);
      console.log(`     This means some properties have multiple coordinate records`);
    } else {
      console.log(`  ✅ Equal number of unique properties and coordinates`);
    }
    console.log('');

    if (sharedCoordinates.length > 0) {
      console.log('📍 SHARED COORDINATES (Top 10):');
      sharedCoordinates.slice(0, 10).forEach((item, index) => {
        console.log(`  ${index + 1}. Coordinates: ${item.coords}`);
        console.log(`     Shared by ${item.count} properties:`);
        item.properties.forEach((prop, i) => {
          console.log(`       ${i + 1}. ${prop}`);
        });
        console.log('');
      });
    }

    if (invalidCoordinates.length > 0) {
      console.log('❌ INVALID COORDINATES (Sample):');
      invalidCoordinates.slice(0, 10).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.property}`);
        console.log(`     Lat: ${item.lat}, Lon: ${item.lon}`);
        console.log(`     Reason: ${item.reason}`);
        console.log('');
      });
      if (invalidCoordinates.length > 10) {
        console.log(`  ... and ${invalidCoordinates.length - 10} more invalid coordinates`);
      }
    }

    // Summary statistics
    console.log('');
    console.log('='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Total Records:                    ${data.length}`);
    console.log(`Unique Property Names:            ${uniquePropertyNames.size}`);
    console.log(`Valid Coordinates:                ${validCoordinates.length}`);
    console.log(`Unique Coordinates:               ${uniqueCoordinates.size}`);
    console.log(`Properties without Coordinates:   ${propertiesWithoutCoords.length}`);
    console.log(`Coordinates shared by >1 property: ${sharedCoordinates.length}`);
    console.log('');

    // Calculate what the map would show
    const propertiesWithValidCoords = new Set<string>();
    data.forEach((record) => {
      const coords = parseCoordinates(record.lat, record.lon);
      if (coords && isInUSAOrCanada(coords[0], coords[1])) {
        if (record.property_name) {
          propertiesWithValidCoords.add(record.property_name);
        }
      }
    });

    console.log('🗺️  MAP DISPLAY ANALYSIS:');
    console.log(`  Unique properties with valid coordinates: ${propertiesWithValidCoords.size}`);
    console.log(`  This is what the map count should show: ${propertiesWithValidCoords.size}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeTable()
  .then(() => {
    console.log('✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

