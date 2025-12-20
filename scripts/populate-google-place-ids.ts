/**
 * Script to populate google_place_id values in all_glamping_properties table
 * 
 * Uses Google Places API Text Search with fuzzy matching on business names
 * Requires exact city match for validation
 * 
 * Usage:
 *   npx tsx scripts/populate-google-place-ids.ts
 *   npx tsx scripts/populate-google-place-ids.ts --dry-run  # Preview without updating
 *   npx tsx scripts/populate-google-place-ids.ts --limit 100  # Process only first 100
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
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(arg => arg.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : undefined;

// Create Supabase client
const supabase = createClient(supabaseUrl, secretKey);

/**
 * Normalize city name for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeCity(city: string | null | undefined): string {
  if (!city) return '';
  return city.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extract city from Google Places formatted address
 * Attempts to find city name in the address string
 * Common formats: "123 Street, City, STATE ZIP" or "City, STATE ZIP"
 */
function extractCityFromAddress(address: string, state: string | null | undefined): string {
  if (!address) return '';
  
  const addrLower = address.toLowerCase();
  const stateLower = state ? state.toLowerCase().trim() : '';
  
  // Split by comma
  const parts = addrLower.split(',').map(p => p.trim());
  
  // Common US format: Street Address, City, STATE ZIP
  // If we have state, look for the part before it
  if (stateLower && parts.length >= 2) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Check if this part contains the state abbreviation
      // State is usually 2 characters or full state name
      const stateMatch = part.includes(stateLower) || 
                        (stateLower.length === 2 && part.match(new RegExp(`\\b${stateLower}\\b`)));
      
      if (stateMatch && i > 0) {
        // City is usually the part before state
        return parts[i - 1];
      }
    }
  }
  
  // Fallback: if address has 2+ parts, second part is often the city
  // (first part is street address)
  if (parts.length >= 2) {
    return parts[1];
  }
  
  // If only one part, it might be just the city
  return parts[0] || '';
}

/**
 * Calculate string similarity using a simple algorithm
 * Returns a value between 0 and 1, where 1 is identical
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    return shorter.length / longer.length;
  }
  
  // Calculate Levenshtein distance-based similarity
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Search for a place using Google Places API Text Search
 * Returns place data if found, null otherwise
 */
async function searchPlace(
  propertyName: string,
  city: string | null,
  state: string | null,
  address: string | null,
  zipCode: string | null
): Promise<{
  placeId: string;
  displayName: string;
  formattedAddress: string;
  city: string;
} | null> {
  // Build search query
  const queryParts: string[] = [propertyName];
  if (city) queryParts.push(city);
  if (state) queryParts.push(state);
  if (zipCode) queryParts.push(zipCode);
  // Address is usually too specific and can cause misses, so we use it last if available
  // But we'll try without it first to get better matches
  
  const query = queryParts.join(' ');

  const url = 'https://places.googleapis.com/v1/places:searchText';
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': googleApiKey!,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
  };
  const payload = {
    textQuery: query,
    maxResultCount: 5, // Get multiple results to find best match
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ⚠ API error (${response.status}): ${errorText.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return null;
    }

    // Find the best match based on:
    // 1. Exact city match (required)
    // 2. Highest name similarity
    
    const normalizedDbCity = normalizeCity(city);
    let bestMatch: {
      place: any;
      similarity: number;
      cityMatch: boolean;
    } | null = null;

    for (const place of data.places) {
      const displayName = place.displayName?.text || '';
      const formattedAddress = place.formattedAddress || '';
      
      // Extract city from Google's formatted address
      const googleCity = normalizeCity(extractCityFromAddress(formattedAddress, state));
      
      // City must match exactly (normalized)
      const cityMatches = normalizedDbCity && googleCity && normalizedDbCity === googleCity;
      
      if (!cityMatches && normalizedDbCity) {
        // Skip if city doesn't match and we have a city in DB
        continue;
      }
      
      // Calculate name similarity
      const similarity = calculateSimilarity(propertyName, displayName);
      
      // Prefer matches with city match and higher similarity
      if (!bestMatch || 
          (cityMatches && !bestMatch.cityMatch) ||
          (cityMatches === bestMatch.cityMatch && similarity > bestMatch.similarity)) {
        bestMatch = {
          place,
          similarity,
          cityMatch: cityMatches,
        };
      }
    }

    if (!bestMatch || bestMatch.similarity < 0.6) {
      // Similarity threshold: require at least 60% similarity
      return null;
    }

    const place = bestMatch.place;
    const displayName = place.displayName?.text || '';
    const formattedAddress = place.formattedAddress || '';
    const googleCity = extractCityFromAddress(formattedAddress, state);

    return {
      placeId: place.id,
      displayName,
      formattedAddress,
      city: googleCity,
    };
  } catch (error) {
    console.error(`  ⚠ Search error:`, error);
    return null;
  }
}

/**
 * Update google_place_id for a property
 */
async function updatePlaceId(
  propertyId: number,
  placeId: string
): Promise<boolean> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update ID ${propertyId} with place_id: ${placeId}`);
    return true;
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ google_place_id: placeId })
    .eq('id', propertyId);

  if (error) {
    console.error(`  ❌ Database error: ${error.message}`);
    return false;
  }

  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Populating google_place_id values in all_glamping_properties...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be saved\n');
  }

  // Fetch properties without google_place_id
  console.log('📥 Fetching properties without google_place_id...');
  
  let query = supabase
    .from(TABLE_NAME)
    .select('id, property_name, city, state, address, zip_code, google_place_id')
    .is('google_place_id', null);
  
  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: properties, error: fetchError } = await query;

  if (fetchError) {
    console.error('❌ Error fetching properties:', fetchError.message);
    process.exit(1);
  }

  if (!properties || properties.length === 0) {
    console.log('✅ No properties found without google_place_id');
    return;
  }

  console.log(`📊 Found ${properties.length} properties to process\n`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  // Process each property
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const progress = `[${i + 1}/${properties.length}]`;
    
    console.log(`\n${progress} Processing: "${property.property_name}"`);
    console.log(`   Location: ${property.city || 'N/A'}, ${property.state || 'N/A'}`);

    // Skip if missing required fields
    if (!property.property_name) {
      console.log('   ⏭️  Skipping: Missing property_name');
      skipCount++;
      continue;
    }

    if (!property.city) {
      console.log('   ⏭️  Skipping: Missing city (required for validation)');
      skipCount++;
      continue;
    }

    // Search for place
    const placeResult = await searchPlace(
      property.property_name,
      property.city,
      property.state,
      property.address,
      property.zip_code
    );

    if (!placeResult) {
      console.log('   ❌ No matching place found');
      failCount++;
      
      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    // Display match details
    console.log(`   ✅ Found match: "${placeResult.displayName}"`);
    console.log(`      Place ID: ${placeResult.placeId}`);
    console.log(`      Address: ${placeResult.formattedAddress}`);
    if (placeResult.city) {
      console.log(`      City: ${placeResult.city} ${normalizeCity(property.city) === normalizeCity(placeResult.city) ? '✅' : '⚠️'}`);
    }

    // Update database
    const updated = await updatePlaceId(property.id, placeResult.placeId);
    
    if (updated) {
      successCount++;
      console.log('   ✅ Updated successfully');
    } else {
      failCount++;
      console.log('   ❌ Update failed');
    }

    // Rate limiting: wait 100ms between requests to avoid hitting API limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${properties.length}`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed/Not found: ${failCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN - no changes were saved');
    console.log('Run without --dry-run to apply changes');
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
