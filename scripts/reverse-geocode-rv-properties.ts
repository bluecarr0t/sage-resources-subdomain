#!/usr/bin/env npx tsx
/**
 * Reverse geocode RV properties to add City, State, and Zip code
 * 
 * This script:
 * - Reads all records from all_rv_properties table
 * - For records with coordinates but missing city/state/postal_code, uses reverse geocoding
 * - Updates records with city, state, and postal_code information
 * 
 * Usage:
 *   npx tsx scripts/reverse-geocode-rv-properties.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'all_rv_properties';

interface RVProperty {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
}

interface ReverseGeocodeResult {
  city: string | null;
  state: string | null;
  postal_code: string | null;
  county: string | null;
}

interface ProcessingStats {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize state code - convert full state name to abbreviation if needed
 */
function normalizeStateCode(state: string): string {
  const stateMap: Record<string, string> = {
    'alabama': 'AL',
    'alaska': 'AK',
    'arizona': 'AZ',
    'arkansas': 'AR',
    'california': 'CA',
    'colorado': 'CO',
    'connecticut': 'CT',
    'delaware': 'DE',
    'florida': 'FL',
    'georgia': 'GA',
    'hawaii': 'HI',
    'idaho': 'ID',
    'illinois': 'IL',
    'indiana': 'IN',
    'iowa': 'IA',
    'kansas': 'KS',
    'kentucky': 'KY',
    'louisiana': 'LA',
    'maine': 'ME',
    'maryland': 'MD',
    'massachusetts': 'MA',
    'michigan': 'MI',
    'minnesota': 'MN',
    'mississippi': 'MS',
    'missouri': 'MO',
    'montana': 'MT',
    'nebraska': 'NE',
    'nevada': 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    'ohio': 'OH',
    'oklahoma': 'OK',
    'oregon': 'OR',
    'pennsylvania': 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    'tennessee': 'TN',
    'texas': 'TX',
    'utah': 'UT',
    'vermont': 'VT',
    'virginia': 'VA',
    'washington': 'WA',
    'west virginia': 'WV',
    'wisconsin': 'WI',
    'wyoming': 'WY',
  };

  const normalized = state.toLowerCase().trim();
  
  // If already an abbreviation (2 characters, uppercase), return as-is
  if (/^[A-Z]{2}$/.test(state)) {
    return state;
  }

  // Look up in map
  if (stateMap[normalized]) {
    return stateMap[normalized];
  }

  // Return original if no match found
  return state;
}

/**
 * Reverse geocode coordinates to get address information using Nominatim
 */
async function reverseGeocode(
  latitude: number,
  longitude: number,
  retries = 3
): Promise<ReverseGeocodeResult | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&extratags=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Sage-RV-Properties-Geocoder/1.0', // Required by Nominatim
        },
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          // Rate limited - wait longer before retry
          console.log(`  ⚠️  Rate limited, waiting 2 seconds before retry...`);
          await sleep(2000);
          continue;
        }
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.address) {
        return null;
      }

      const address = data.address;

      // Extract city (can be in various fields)
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        null;

      // Extract state - Nominatim returns full state name, we need abbreviation
      let state: string | null = address.state || null;
      if (state) {
        // Convert full state name to abbreviation if needed
        state = normalizeStateCode(String(state));
      }

      // Extract postal code
      const postal_code = address.postcode || null;

      // Extract county
      const county = address.county || null;

      return {
        city: city ? String(city) : null,
        state: state ? String(state) : null,
        postal_code: postal_code ? String(postal_code) : null,
        county: county ? String(county) : null,
      };
    } catch (error) {
      if (attempt === retries) {
        console.error(`  ❌ Reverse geocoding failed after ${retries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
      await sleep(1000);
    }
  }

  return null;
}

/**
 * Check if a property needs reverse geocoding
 */
function needsReverseGeocode(property: RVProperty): boolean {
  // Need coordinates
  if (!property.latitude || !property.longitude) {
    return false;
  }

  // Need at least one missing field
  return !property.city || !property.state || !property.postal_code;
}

/**
 * Update property with reverse geocoded data
 */
async function updateProperty(
  supabase: ReturnType<typeof createClient>,
  property: RVProperty,
  geocodeResult: ReverseGeocodeResult
): Promise<boolean> {
  const updateData: Partial<RVProperty & { county?: string }> = {};

  // Only update fields that are missing and we have data for
  if (!property.city && geocodeResult.city) {
    updateData.city = geocodeResult.city;
  }
  if (!property.state && geocodeResult.state) {
    updateData.state = geocodeResult.state;
  }
  if (!property.postal_code && geocodeResult.postal_code) {
    updateData.postal_code = geocodeResult.postal_code;
  }
  if (geocodeResult.county) {
    // Update county if available
    updateData.county = geocodeResult.county;
  }

  if (Object.keys(updateData).length === 0) {
    return false; // Nothing to update
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq('id', property.id);

  if (error) {
    console.error(`  ❌ Database update error: ${error.message}`);
    return false;
  }

  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting reverse geocoding for RV properties...\n');

  const stats: ProcessingStats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Fetch all properties with coordinates
    console.log('📥 Fetching all RV properties from database...');
    const { data: properties, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('id, name, latitude, longitude, city, state, postal_code')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching properties:', fetchError.message);
      process.exit(1);
    }

    if (!properties || properties.length === 0) {
      console.log('No properties found with coordinates.');
      return;
    }

    stats.total = properties.length;
    console.log(`✅ Found ${stats.total} properties with coordinates\n`);

    // Filter properties that need reverse geocoding
    const propertiesToGeocode = properties.filter(needsReverseGeocode);
    console.log(`📍 ${propertiesToGeocode.length} properties need reverse geocoding\n`);

    if (propertiesToGeocode.length === 0) {
      console.log('All properties already have city, state, and postal code!');
      return;
    }

    console.log(`📊 Processing ${propertiesToGeocode.length} properties...\n`);

    // Process each property
    for (let i = 0; i < propertiesToGeocode.length; i++) {
      const property = propertiesToGeocode[i];
      stats.processed++;

      const missingFields = [];
      if (!property.city) missingFields.push('city');
      if (!property.state) missingFields.push('state');
      if (!property.postal_code) missingFields.push('postal_code');

      console.log(`[${i + 1}/${propertiesToGeocode.length}] ${property.name || 'Unnamed'}`);
      console.log(`  Coordinates: ${property.latitude}, ${property.longitude}`);
      console.log(`  Missing: ${missingFields.join(', ')}`);

      // Reverse geocode
      const geocodeResult = await reverseGeocode(
        property.latitude!,
        property.longitude!
      );

      if (!geocodeResult) {
        console.log(`  ❌ Failed to reverse geocode\n`);
        stats.failed++;
        // Rate limiting - wait 1 second between requests (Nominatim requirement)
        await sleep(1000);
        continue;
      }

      // Show what we found
      const foundFields = [];
      if (geocodeResult.city) foundFields.push(`city: ${geocodeResult.city}`);
      if (geocodeResult.state) foundFields.push(`state: ${geocodeResult.state}`);
      if (geocodeResult.postal_code) foundFields.push(`postal_code: ${geocodeResult.postal_code}`);
      if (geocodeResult.county) foundFields.push(`county: ${geocodeResult.county}`);

      console.log(`  ✅ Found: ${foundFields.join(', ')}`);

      // Update database
      const updated = await updateProperty(supabase, property, geocodeResult);

      if (updated) {
        console.log(`  ✅ Updated successfully\n`);
        stats.updated++;
      } else {
        console.log(`  ⏭️  No update needed\n`);
        stats.skipped++;
      }

      // Rate limiting - wait 1 second between requests (Nominatim requires this)
      if (i < propertiesToGeocode.length - 1) {
        await sleep(1000);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Processing Summary');
    console.log('='.repeat(60));
    console.log(`Total properties with coordinates: ${stats.total}`);
    console.log(`Properties needing geocoding:       ${stats.processed}`);
    console.log(`Successfully updated:               ${stats.updated}`);
    console.log(`Skipped (no update needed):         ${stats.skipped}`);
    console.log(`Failed:                             ${stats.failed}`);
    console.log('='.repeat(60));

    if (stats.updated > 0) {
      console.log(`\n✅ Successfully reverse geocoded and updated ${stats.updated} properties!`);
    }

    if (stats.failed > 0) {
      console.log(`\n⚠️  ${stats.failed} properties failed to reverse geocode.`);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
