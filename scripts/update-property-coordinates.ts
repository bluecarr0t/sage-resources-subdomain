/**
 * Script to update geocoordinates for specific properties in all_glamping_properties table
 * 
 * Usage:
 *   npx tsx scripts/update-property-coordinates.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

if (!googleApiKey) {
  console.error('❌ Missing Google Maps API key!');
  console.error('Please ensure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'all_glamping_properties';

interface PropertyUpdate {
  propertyName: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Geocode an address using Google Places API Text Search
 */
async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  country?: string
): Promise<{ lat: number; lon: number } | null> {
  // Build search query
  const queryParts = [address];
  if (city) queryParts.push(city);
  if (state) queryParts.push(state);
  if (country) queryParts.push(country);
  
  const query = queryParts.join(', ');

  const url = 'https://places.googleapis.com/v1/places:searchText';
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': googleApiKey!,
    'X-Goog-FieldMask': 'places.id,places.location',
  };
  const payload = {
    textQuery: query,
    maxResultCount: 1,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ⚠ Geocoding API error: ${response.status} ${response.statusText}`);
      console.error(`  Response: ${errorText}`);
      return null;
    }

    const data = await response.json();

    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      const location = place.location;
      if (location && location.latitude && location.longitude) {
        return {
          lat: location.latitude,
          lon: location.longitude,
        };
      }
    }
  } catch (error) {
    console.error(`  ⚠ Geocoding error:`, error);
    return null;
  }

  return null;
}

/**
 * Update coordinates for a property
 */
async function updatePropertyCoordinates(
  supabase: ReturnType<typeof createClient>,
  propertyName: string,
  address: string,
  city?: string,
  state?: string,
  country?: string
): Promise<boolean> {
  console.log(`\n🔍 Searching for property: "${propertyName}"`);
  console.log(`   Address: ${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`);

  // Search for the property by name (case-insensitive)
  const { data: properties, error: searchError } = await supabase
    .from(TABLE_NAME)
    .select('id, property_name, address, city, state, country, lat, lon')
    .ilike('property_name', `%${propertyName}%`);

  if (searchError) {
    console.error(`❌ Error searching for property: ${searchError.message}`);
    return false;
  }

  if (!properties || properties.length === 0) {
    console.error(`❌ No property found with name containing "${propertyName}"`);
    return false;
  }

  if (properties.length > 1) {
    console.log(`⚠️  Found ${properties.length} properties matching "${propertyName}":`);
    properties.forEach((prop, idx) => {
      console.log(`   ${idx + 1}. ID: ${prop.id}, Name: ${prop.property_name}, Location: ${prop.city || 'N/A'}, ${prop.state || 'N/A'}`);
    });
    console.log(`\n📍 Will update all ${properties.length} properties with the same coordinates.`);
  }

  // Geocode the address once for all matching properties
  console.log(`\n📍 Geocoding address...`);
  const coordinates = await geocodeAddress(address, city, state, country);

  if (!coordinates) {
    console.error(`❌ Failed to geocode address`);
    return false;
  }

  console.log(`✅ Geocoded coordinates: ${coordinates.lat}, ${coordinates.lon}`);

  // Update all matching properties
  let successCount = 0;
  let failCount = 0;

  for (const property of properties) {
    console.log(`\n💾 Updating property ID ${property.id}...`);
    console.log(`   Current coordinates: ${property.lat || 'N/A'}, ${property.lon || 'N/A'}`);

    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({
        lat: coordinates.lat.toString(),
        lon: coordinates.lon.toString(),
      })
      .eq('id', property.id);

    if (updateError) {
      console.error(`❌ Error updating coordinates: ${updateError.message}`);
      failCount++;
    } else {
      console.log(`✅ Successfully updated coordinates for "${property.property_name}" (ID: ${property.id})`);
      console.log(`   New coordinates: ${coordinates.lat}, ${coordinates.lon}`);
      successCount++;
    }
  }

  return successCount > 0;
}

/**
 * Main function
 */
async function main() {
  console.log(`🔌 Connecting to Supabase...`);
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Properties to update
  const propertiesToUpdate: PropertyUpdate[] = [
    {
      propertyName: 'Half Moon Lake Resort',
      address: '21524 Township Rd 520',
      city: 'Sherwood Park',
      state: 'AB',
      country: 'Canada',
    },
  ];

  console.log(`\n📋 Properties to update: ${propertiesToUpdate.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const prop of propertiesToUpdate) {
    const success = await updatePropertyCoordinates(
      supabase,
      prop.propertyName,
      prop.address,
      prop.city,
      prop.state,
      prop.country
    );

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting: wait 1 second between requests
    if (propertiesToUpdate.indexOf(prop) < propertiesToUpdate.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully updated: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n🎉 Update completed!`);
}

main().catch((error) => {
  console.error('\n❌ Operation failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});

