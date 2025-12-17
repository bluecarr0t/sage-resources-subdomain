/**
 * Check if Canadian properties have duplicate coordinates that would cause markers to stack
 * 
 * Run with: npx tsx scripts/check-duplicate-coordinates-canada.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Nova Scotia', 'Northwest Territories',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon'
];

const CANADIAN_PROVINCE_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

function isCanadianProperty(property: {
  country: string | null;
  state: string | null;
  lat: string | number | null;
  lon: string | number | null;
}): boolean {
  const country = String(property.country || '').toUpperCase();
  const state = String(property.state || '').toUpperCase();
  
  if (country === 'CA' || country === 'CAN' || country === 'CANADA') return true;
  if (CANADIAN_PROVINCE_CODES.includes(state)) return true;
  if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) return true;
  
  return false;
}

function isLikelyCanadaByCoords(lat: number, lon: number): boolean {
  if (lat < 41.7 || lat >= 85 || lon < -141 || lon > -52) return false;
  if (lat >= 60) return true;
  if (lat >= 41.7 && lat < 60 && lon >= -95 && lon <= -52) return true;
  if (lat >= 48 && lat < 60 && lon >= -139 && lon <= -89) return true;
  if (lat >= 49 && lat < 60) {
    if (lon < -100) return true;
    if (lon >= -100 && lon <= -89 && lat >= 50) return true;
    if (lon >= -95 && lon <= -89 && lat >= 49) return true;
  }
  if (lat >= 45 && lat < 49) {
    if (lon >= -75 && lon <= -52) return true;
    if (lon >= -95 && lon < -75) {
      if (lat >= 46) return true;
      if (lon >= -80) return true;
    }
  }
  if (lat >= 41.7 && lat < 45 && lon >= -95.2 && lon <= -74.3) return true;
  return false;
}

function parseCoordinates(lat: string | number | null, lon: string | number | null): [number, number] | null {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return null;
  const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const longitude = typeof lon === 'number' ? lon : parseFloat(String(lon));
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  return [latitude, longitude];
}

function isInUSAOrCanada(lat: number, lon: number): boolean {
  if (lat < 18 || lat > 85) return false;
  if (lon < -179 || lon > -50) return false;
  return true;
}

function normalizePropertyName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().toLowerCase();
}

async function checkDuplicateCoordinates() {
  console.log('🔍 Checking for duplicate coordinates in Canadian properties...\n');

  try {
    // Fetch all records
    let allData: Array<{
      id: number;
      property_name: string | null;
      country: string | null;
      state: string | null;
      lat: string | number | null;
      lon: string | number | null;
    }> = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('all_glamping_properties')
        .select('id, property_name, country, state, lat, lon')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Error fetching data:', error);
        process.exit(1);
      }

      if (!data) break;

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    }

    console.log(`✅ Fetched ${allData.length} total records\n`);

    // Identify Canadian properties and group by coordinates
    const coordinatesMap = new Map<string, Array<{ name: string; id: number }>>();
    const canadianProperties = new Set<string>();

    for (const record of allData) {
      const propertyName = record.property_name;
      if (!propertyName) continue;

      const normalizedName = normalizePropertyName(propertyName);
      const coords = parseCoordinates(record.lat, record.lon);
      
      if (!coords || !isInUSAOrCanada(coords[0], coords[1])) continue;

      // Check if Canadian
      let isCanadian = false;
      if (isLikelyCanadaByCoords(coords[0], coords[1])) {
        isCanadian = true;
      } else if (isCanadianProperty(record)) {
        isCanadian = true;
      }

      if (isCanadian) {
        canadianProperties.add(normalizedName);
        
        // Group by coordinates (rounded to 4 decimal places to catch near-duplicates)
        const coordKey = `${coords[0].toFixed(4)},${coords[1].toFixed(4)}`;
        
        if (!coordinatesMap.has(coordKey)) {
          coordinatesMap.set(coordKey, []);
        }
        coordinatesMap.get(coordKey)!.push({
          name: normalizedName,
          id: record.id,
        });
      }
    }

    // Find coordinates with multiple properties
    const duplicateCoords: Array<{ coords: string; count: number; properties: string[] }> = [];
    coordinatesMap.forEach((properties, coords) => {
      // Get unique property names at this coordinate
      const uniqueNames = new Set(properties.map(p => p.name));
      if (uniqueNames.size > 1) {
        duplicateCoords.push({
          coords,
          count: uniqueNames.size,
          properties: Array.from(uniqueNames),
        });
      }
    });

    console.log('📊 Results:\n');
    console.log(`✅ Unique Canadian properties: ${canadianProperties.size}`);
    console.log(`✅ Unique coordinate locations: ${coordinatesMap.size}`);
    console.log(`⚠️  Coordinates with multiple properties: ${duplicateCoords.length}`);
    
    if (duplicateCoords.length > 0) {
      console.log(`\n📍 Top 10 coordinates with most properties:`);
      duplicateCoords
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach((dup, idx) => {
          console.log(`   ${idx + 1}. ${dup.coords} - ${dup.count} properties`);
          dup.properties.slice(0, 3).forEach(name => {
            console.log(`      - ${name}`);
          });
          if (dup.properties.length > 3) {
            console.log(`      ... and ${dup.properties.length - 3} more`);
          }
        });
      
      const totalStacked = duplicateCoords.reduce((sum, dup) => sum + (dup.count - 1), 0);
      console.log(`\n💡 ${totalStacked} properties are stacked at duplicate coordinates`);
      console.log(`   This means ${canadianProperties.size - totalStacked} unique markers would be visible`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDuplicateCoordinates()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
