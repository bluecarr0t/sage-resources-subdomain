#!/usr/bin/env npx tsx
/**
 * Research and populate private campgrounds data using OpenAI API
 * 
 * This script:
 * - Fetches all private campgrounds from the private_campgrounds table
 * - Uses OpenAI API to research comprehensive business data for each campground
 * - Validates and updates the database with researched data
 * - By default, skips campgrounds that already have complete data (enables resume)
 * 
 * Usage:
 *   npx tsx scripts/research-california-private-campgrounds.ts          # Skip existing data (resume mode)
 *   npx tsx scripts/research-california-private-campgrounds.ts --overwrite  # Regenerate all data
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

if (!openaiApiKey) {
  console.error('❌ Missing OpenAI API key');
  console.error('Please ensure OPENAI_API_KEY is set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'private_campgrounds';

// Initialize clients
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const openai = new OpenAI({ apiKey: openaiApiKey });

// Configuration
const DELAY_BETWEEN_AI_CALLS = 2000; // 2 seconds between OpenAI API calls

interface PrivateCampground {
  id: number;
  name: string;
  state: string | null;
  city: string | null;
  county: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  operator: string | null;
  latitude: number | null;
  longitude: number | null;
  osm_tags: Record<string, any> | null;
}

interface CampgroundResearchData {
  // Basic Info
  description: string | null;
  // Size & Capacity
  total_sites: number | null;
  rv_sites: number | null;
  tent_sites: number | null;
  acres: number | null;
  // Business Info
  year_established: number | null;
  // Pricing
  nightly_rate_min: number | null;
  nightly_rate_max: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
  seasonal_rates: boolean | null;
  // Visitor Access
  operating_months: string | null;
  best_time_to_visit: string | null;
  reservation_required: boolean | null;
  reservation_website: string | null;
  walk_ins_accepted: boolean | null;
  // Pet Policies
  dogs_allowed: boolean | null;
  dogs_allowed_restrictions: string | null;
  pet_fee: number | null;
  pet_friendly_areas: string | null;
  // Camping Features
  rv_camping_available: boolean | null;
  rv_hookups: string | null;
  max_rv_length: number | null;
  tent_camping_available: boolean | null;
  cabin_rentals: boolean | null;
  glamping_available: boolean | null;
  lodging_available: boolean | null;
  // Amenities
  restrooms: boolean | null;
  showers: boolean | null;
  laundry: boolean | null;
  dump_station: boolean | null;
  wifi_available: boolean | null;
  wifi_free: boolean | null;
  cell_phone_coverage: string | null;
  store: boolean | null;
  playground: boolean | null;
  pool: boolean | null;
  hot_tub: boolean | null;
  // Activities
  hiking_trails_available: boolean | null;
  water_activities: string | null;
  fishing_available: boolean | null;
  swimming_available: boolean | null;
  beach_access: boolean | null;
  boat_ramp: boolean | null;
  wildlife_viewing: boolean | null;
  // Climate
  average_summer_temp: number | null;
  average_winter_temp: number | null;
  climate_type: string | null;
  // Features
  notable_features: string | null;
  nearby_attractions: string | null;
  scenic_views: boolean | null;
  // Practical
  fire_restrictions: string | null;
  quiet_hours: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  nearest_major_city: string | null;
  distance_from_city: number | null;
}

interface ProcessingStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate and sanitize research data
 */
function validateResearchData(data: any): CampgroundResearchData {
  const validated: CampgroundResearchData = {
    // Basic Info
    description: typeof data.description === 'string' ? data.description.trim() || null : null,
    // Size & Capacity
    total_sites: typeof data.total_sites === 'number' && data.total_sites >= 0 ? data.total_sites : null,
    rv_sites: typeof data.rv_sites === 'number' && data.rv_sites >= 0 ? data.rv_sites : null,
    tent_sites: typeof data.tent_sites === 'number' && data.tent_sites >= 0 ? data.tent_sites : null,
    acres: typeof data.acres === 'number' && data.acres >= 0 ? data.acres : null,
    // Business Info
    year_established: typeof data.year_established === 'number' && data.year_established >= 1800 && data.year_established <= new Date().getFullYear() ? data.year_established : null,
    // Pricing
    nightly_rate_min: typeof data.nightly_rate_min === 'number' && data.nightly_rate_min >= 0 && data.nightly_rate_min <= 10000 ? data.nightly_rate_min : null,
    nightly_rate_max: typeof data.nightly_rate_max === 'number' && data.nightly_rate_max >= 0 && data.nightly_rate_max <= 10000 ? data.nightly_rate_max : null,
    weekly_rate: typeof data.weekly_rate === 'number' && data.weekly_rate >= 0 && data.weekly_rate <= 50000 ? data.weekly_rate : null,
    monthly_rate: typeof data.monthly_rate === 'number' && data.monthly_rate >= 0 && data.monthly_rate <= 200000 ? data.monthly_rate : null,
    seasonal_rates: typeof data.seasonal_rates === 'boolean' ? data.seasonal_rates : null,
    // Visitor Access
    operating_months: typeof data.operating_months === 'string' ? data.operating_months.trim() || null : null,
    best_time_to_visit: typeof data.best_time_to_visit === 'string' ? data.best_time_to_visit.trim() || null : null,
    reservation_required: typeof data.reservation_required === 'boolean' ? data.reservation_required : null,
    reservation_website: typeof data.reservation_website === 'string' ? data.reservation_website.trim() || null : null,
    walk_ins_accepted: typeof data.walk_ins_accepted === 'boolean' ? data.walk_ins_accepted : null,
    // Pet Policies
    dogs_allowed: typeof data.dogs_allowed === 'boolean' ? data.dogs_allowed : null,
    dogs_allowed_restrictions: typeof data.dogs_allowed_restrictions === 'string' ? data.dogs_allowed_restrictions.trim() || null : null,
    pet_fee: typeof data.pet_fee === 'number' && data.pet_fee >= 0 && data.pet_fee <= 1000 ? data.pet_fee : null,
    pet_friendly_areas: typeof data.pet_friendly_areas === 'string' ? data.pet_friendly_areas.trim() || null : null,
    // Camping Features
    rv_camping_available: typeof data.rv_camping_available === 'boolean' ? data.rv_camping_available : null,
    rv_hookups: typeof data.rv_hookups === 'string' ? data.rv_hookups.trim() || null : null,
    max_rv_length: typeof data.max_rv_length === 'number' && data.max_rv_length >= 0 && data.max_rv_length <= 200 ? data.max_rv_length : null,
    tent_camping_available: typeof data.tent_camping_available === 'boolean' ? data.tent_camping_available : null,
    cabin_rentals: typeof data.cabin_rentals === 'boolean' ? data.cabin_rentals : null,
    glamping_available: typeof data.glamping_available === 'boolean' ? data.glamping_available : null,
    lodging_available: typeof data.lodging_available === 'boolean' ? data.lodging_available : null,
    // Amenities
    restrooms: typeof data.restrooms === 'boolean' ? data.restrooms : null,
    showers: typeof data.showers === 'boolean' ? data.showers : null,
    laundry: typeof data.laundry === 'boolean' ? data.laundry : null,
    dump_station: typeof data.dump_station === 'boolean' ? data.dump_station : null,
    wifi_available: typeof data.wifi_available === 'boolean' ? data.wifi_available : null,
    wifi_free: typeof data.wifi_free === 'boolean' ? data.wifi_free : null,
    cell_phone_coverage: typeof data.cell_phone_coverage === 'string' ? data.cell_phone_coverage.trim() || null : null,
    store: typeof data.store === 'boolean' ? data.store : null,
    playground: typeof data.playground === 'boolean' ? data.playground : null,
    pool: typeof data.pool === 'boolean' ? data.pool : null,
    hot_tub: typeof data.hot_tub === 'boolean' ? data.hot_tub : null,
    // Activities
    hiking_trails_available: typeof data.hiking_trails_available === 'boolean' ? data.hiking_trails_available : null,
    water_activities: typeof data.water_activities === 'string' ? data.water_activities.trim() || null : null,
    fishing_available: typeof data.fishing_available === 'boolean' ? data.fishing_available : null,
    swimming_available: typeof data.swimming_available === 'boolean' ? data.swimming_available : null,
    beach_access: typeof data.beach_access === 'boolean' ? data.beach_access : null,
    boat_ramp: typeof data.boat_ramp === 'boolean' ? data.boat_ramp : null,
    wildlife_viewing: typeof data.wildlife_viewing === 'boolean' ? data.wildlife_viewing : null,
    // Climate
    average_summer_temp: typeof data.average_summer_temp === 'number' && data.average_summer_temp >= -50 && data.average_summer_temp <= 120 ? data.average_summer_temp : null,
    average_winter_temp: typeof data.average_winter_temp === 'number' && data.average_winter_temp >= -50 && data.average_winter_temp <= 120 ? data.average_winter_temp : null,
    climate_type: typeof data.climate_type === 'string' ? data.climate_type.trim() || null : null,
    // Features
    notable_features: typeof data.notable_features === 'string' ? data.notable_features.trim() || null : null,
    nearby_attractions: typeof data.nearby_attractions === 'string' ? data.nearby_attractions.trim() || null : null,
    scenic_views: typeof data.scenic_views === 'boolean' ? data.scenic_views : null,
    // Practical
    fire_restrictions: typeof data.fire_restrictions === 'string' ? data.fire_restrictions.trim() || null : null,
    quiet_hours: typeof data.quiet_hours === 'string' ? data.quiet_hours.trim() || null : null,
    check_in_time: typeof data.check_in_time === 'string' ? data.check_in_time.trim() || null : null,
    check_out_time: typeof data.check_out_time === 'string' ? data.check_out_time.trim() || null : null,
    nearest_major_city: typeof data.nearest_major_city === 'string' ? data.nearest_major_city.trim() || null : null,
    distance_from_city: typeof data.distance_from_city === 'number' && data.distance_from_city >= 0 && data.distance_from_city <= 500 ? data.distance_from_city : null,
  };

  return validated;
}

/**
 * Research campground data using OpenAI
 */
async function researchCampgroundData(campground: PrivateCampground): Promise<CampgroundResearchData> {
  // Build context about the campground
  const contextParts: string[] = [];
  
  contextParts.push(`Campground: ${campground.name}`);
  
  if (campground.city) {
    contextParts.push(`Location: ${campground.city}`);
  }
  
  if (campground.county) {
    contextParts.push(`County: ${campground.county}`);
  }
  
  if (campground.state) {
    contextParts.push(`State: ${campground.state}`);
  }
  
  if (campground.address) {
    contextParts.push(`Address: ${campground.address}`);
  }
  
  if (campground.website) {
    contextParts.push(`Website: ${campground.website}`);
  }
  
  if (campground.phone) {
    contextParts.push(`Phone: ${campground.phone}`);
  }
  
  if (campground.operator) {
    contextParts.push(`Operator: ${campground.operator}`);
  }
  
  const context = contextParts.join('\n');
  
  const prompt = `Research comprehensive business information about ${campground.name}, a privately owned campground in California, and return the data in the following JSON format. Use the campground's website, booking platforms (like ReserveAmerica, Hipcamp, etc.), and reviews.

${context}

Return a JSON object with exactly these fields (use null for unknown values):

{
  "description": "string or null - Brief description of the campground (2-3 sentences)",
  "total_sites": "number or null - Total number of campsites (non-negative integer)",
  "rv_sites": "number or null - Number of RV sites (non-negative integer)",
  "tent_sites": "number or null - Number of tent sites (non-negative integer)",
  "acres": "number or null - Size in acres (non-negative number)",
  "year_established": "number or null - Year campground was established (1800 to current year)",
  "nightly_rate_min": "number or null - Minimum nightly rate in USD (0-10000)",
  "nightly_rate_max": "number or null - Maximum nightly rate in USD (0-10000)",
  "weekly_rate": "number or null - Weekly rate in USD (0-50000)",
  "monthly_rate": "number or null - Monthly rate in USD (0-200000)",
  "seasonal_rates": "boolean or null - Whether rates vary by season",
  "operating_months": "string or null - Months when campground is open (e.g., 'Year-round', 'April-October')",
  "best_time_to_visit": "string or null - Recommended months for visiting",
  "reservation_required": "boolean or null - Whether reservations are required",
  "reservation_website": "string or null - URL for making reservations",
  "walk_ins_accepted": "boolean or null - Whether walk-ins are accepted",
  "dogs_allowed": "boolean or null - Whether dogs are allowed",
  "dogs_allowed_restrictions": "string or null - Restrictions on dogs (e.g., 'On leash only', 'Certain areas only')",
  "pet_fee": "number or null - Pet fee per night in USD (0-1000)",
  "pet_friendly_areas": "string or null - Areas where pets are allowed",
  "rv_camping_available": "boolean or null - Whether RV camping is available",
  "rv_hookups": "string or null - Type of RV hookups (e.g., 'Full Hookups', 'Electric Only', 'Water and Electric')",
  "max_rv_length": "number or null - Maximum RV length in feet (0-200)",
  "tent_camping_available": "boolean or null - Whether tent camping is available",
  "cabin_rentals": "boolean or null - Whether cabins are available for rent",
  "glamping_available": "boolean or null - Whether glamping accommodations are available",
  "lodging_available": "boolean or null - Whether other lodging (motel, hotel) is available",
  "restrooms": "boolean or null - Whether restrooms are available",
  "showers": "boolean or null - Whether showers are available",
  "laundry": "boolean or null - Whether laundry facilities are available",
  "dump_station": "boolean or null - Whether RV dump station is available",
  "wifi_available": "boolean or null - Whether WiFi is available",
  "wifi_free": "boolean or null - Whether WiFi is free",
  "cell_phone_coverage": "string or null - Cell phone coverage quality (e.g., 'Good', 'Limited', 'None')",
  "store": "boolean or null - Whether a store/shop is on-site",
  "playground": "boolean or null - Whether a playground is available",
  "pool": "boolean or null - Whether a pool is available",
  "hot_tub": "boolean or null - Whether a hot tub is available",
  "hiking_trails_available": "boolean or null - Whether hiking trails are available",
  "water_activities": "string or null - Available water activities (e.g., 'Swimming, Fishing, Kayaking')",
  "fishing_available": "boolean or null - Whether fishing is available",
  "swimming_available": "boolean or null - Whether swimming is available",
  "beach_access": "boolean or null - Whether beach access is available",
  "boat_ramp": "boolean or null - Whether a boat ramp is available",
  "wildlife_viewing": "boolean or null - Whether wildlife viewing is common",
  "average_summer_temp": "number or null - Average summer temperature in Fahrenheit (-50 to 120)",
  "average_winter_temp": "number or null - Average winter temperature in Fahrenheit (-50 to 120)",
  "climate_type": "string or null - Climate classification (e.g., 'Mediterranean', 'Desert', 'Mountain')",
  "notable_features": "string or null - Notable features or highlights (comma-separated)",
  "nearby_attractions": "string or null - Nearby attractions or points of interest",
  "scenic_views": "boolean or null - Whether scenic views are available",
  "fire_restrictions": "string or null - Fire restriction information",
  "quiet_hours": "string or null - Quiet hours policy (e.g., '10 PM - 7 AM')",
  "check_in_time": "string or null - Check-in time (e.g., '2:00 PM', '3:00 PM')",
  "check_out_time": "string or null - Check-out time (e.g., '11:00 AM', '12:00 PM')",
  "nearest_major_city": "string or null - Nearest major city",
  "distance_from_city": "number or null - Distance from nearest major city in miles (0-500)"
}

Return ONLY valid JSON, no additional text or markdown formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more factual/research-based responses
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    // Parse JSON response
    let parsedData: any;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }
    
    // Validate and sanitize the data
    const validatedData = validateResearchData(parsedData);
    
    return validatedData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error from OpenAI API');
  }
}

/**
 * Check if campground has complete data (key fields populated)
 */
function hasCompleteData(campground: any): boolean {
  const requiredFields: (keyof CampgroundResearchData)[] = [
    'description',
    'total_sites',
    'nightly_rate_min',
    'reservation_required',
    'dogs_allowed',
    'rv_camping_available',
    'tent_camping_available',
    'restrooms',
    'wifi_available',
  ];
  
  // Check if at least 70% of key fields are populated
  const populatedCount = requiredFields.filter(field => campground[field] !== null && campground[field] !== undefined).length;
  return populatedCount >= requiredFields.length * 0.7;
}

/**
 * Fetch all campgrounds that need data
 */
async function fetchCampgrounds(skipExisting: boolean = true): Promise<PrivateCampground[]> {
  console.log('📊 Fetching private campgrounds from database...\n');
  
  // Get all campgrounds with key fields
  const { data: allData, error: allError } = await supabase
    .from(TABLE_NAME)
    .select('id, name, state, city, county, address, website, phone, operator, latitude, longitude, osm_tags, description, total_sites, nightly_rate_min, reservation_required, dogs_allowed, rv_camping_available, tent_camping_available, restrooms, wifi_available')
    .not('name', 'is', null)
    .neq('name', '');
  
  if (allError) {
    throw new Error(`Failed to fetch campgrounds: ${allError.message}`);
  }
  
  if (!allData || allData.length === 0) {
    console.log('No private campgrounds found');
    return [];
  }
  
  // Filter campgrounds that need data (skip those that already have complete data)
  const campgroundsNeedingData = skipExisting
    ? allData.filter((c: any) => !hasCompleteData(c))
    : allData;
  
  if (skipExisting && campgroundsNeedingData.length < allData.length) {
    const skipped = allData.length - campgroundsNeedingData.length;
    console.log(`⏭️  Skipping ${skipped} campgrounds that already have complete data`);
  }
  
  console.log(`✅ Found ${campgroundsNeedingData.length} campgrounds needing data (out of ${allData.length} total)\n`);
  return campgroundsNeedingData as PrivateCampground[];
}

/**
 * Process a single campground
 */
async function processCampground(
  campground: PrivateCampground,
  index: number,
  total: number
): Promise<{ success: boolean; error?: string }> {
  const campgroundName = campground.name || `Campground #${campground.id}`;
  
  console.log(`[${index + 1}/${total}] Processing: ${campgroundName}`);
  if (campground.city) {
    console.log(`  Location: ${campground.city}`);
  }
  
  try {
    // Wait before OpenAI API call
    await sleep(DELAY_BETWEEN_AI_CALLS);
    
    // Research data
    console.log('  🤖 Researching data with OpenAI...');
    const researchData = await researchCampgroundData(campground);
    
    // Count populated fields
    const populatedFields = Object.values(researchData).filter(v => v !== null && v !== undefined).length;
    console.log(`  ✓ Researched ${populatedFields} fields`);
    
    // Update database
    console.log('  💾 Updating database...');
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ ...researchData, last_verified: new Date().toISOString() })
      .eq('id', campground.id);
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log(`  ✅ Successfully updated ${campgroundName}\n`);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ Error: ${errorMessage}\n`);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting private campgrounds data research...\n');
  
  const stats: ProcessingStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };
  
  try {
    // Fetch campgrounds (skip those that already have complete data to enable resume)
    const skipExisting = process.argv.includes('--overwrite') ? false : true;
    if (skipExisting) {
      console.log('ℹ️  Resuming: Will skip campgrounds that already have complete data\n');
    } else {
      console.log('ℹ️  Overwrite mode: Will regenerate data for all campgrounds\n');
    }
    
    const campgrounds = await fetchCampgrounds(skipExisting);
    stats.total = campgrounds.length;
    
    if (campgrounds.length === 0) {
      console.log('No campgrounds to process. Exiting.');
      return;
    }
    
    // Process each campground
    for (let i = 0; i < campgrounds.length; i++) {
      const campground = campgrounds[i];
      
      // Process campground
      const result = await processCampground(campground, i, stats.total);
      stats.processed++;
      
      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Processing Summary');
    console.log('='.repeat(60));
    console.log(`Total campgrounds:        ${stats.total}`);
    console.log(`Processed:               ${stats.processed}`);
    console.log(`Successful:              ${stats.successful}`);
    console.log(`Failed:                  ${stats.failed}`);
    console.log(`Skipped:                 ${stats.skipped}`);
    console.log('='.repeat(60));
    
    if (stats.failed > 0) {
      console.log(`\n⚠️  ${stats.failed} campgrounds failed to process. Check the error messages above for details.`);
    }
    
    if (stats.successful > 0) {
      console.log(`\n✅ Successfully researched data for ${stats.successful} campgrounds!`);
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
