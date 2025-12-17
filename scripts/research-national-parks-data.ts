#!/usr/bin/env npx tsx
/**
 * Research and populate national parks data using OpenAI API
 * 
 * This script:
 * - Fetches all national parks from the national-parks table
 * - Uses OpenAI API to research 27 data fields for each park
 * - Validates and updates the database with researched data
 * - By default, skips parks that already have complete data (enables resume)
 * 
 * Usage:
 *   npx tsx scripts/research-national-parks-data.ts          # Skip existing data (resume mode)
 *   npx tsx scripts/research-national-parks-data.ts --overwrite  # Regenerate all data
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

const TABLE_NAME = 'national-parks';

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

interface NationalPark {
  id: number;
  name: string;
  date_established: string | null;
  area_2021: string | null;
  recreation_visitors_2021: string | null;
  description: string | null;
  park_code: string | null;
  state: string | null;
  acres: number | null;
  latitude: number | null;
  longitude: number | null;
}

interface ParkResearchData {
  // Visitor Access & Operations
  operating_months: string | null;
  best_time_to_visit: string | null;
  annual_pass_available: boolean | null;
  reservation_required: boolean | null;
  reservation_website: string | null;
  // Pet & Animal Policies
  dogs_allowed: boolean | null;
  dogs_allowed_restrictions: string | null;
  pet_friendly_areas: string | null;
  // Camping & Accommodations
  camping_available: boolean | null;
  number_of_campgrounds: number | null;
  camping_reservation_required: boolean | null;
  lodging_available: boolean | null;
  rv_camping_available: boolean | null;
  // Activities & Recreation
  hiking_trails_available: boolean | null;
  number_of_trails: number | null;
  water_activities: string | null;
  wildlife_viewing: boolean | null;
  scenic_drives: boolean | null;
  visitor_centers_count: number | null;
  // Climate & Weather
  average_summer_temp: number | null;
  average_winter_temp: number | null;
  climate_type: string | null;
  snow_season: string | null;
  // Park Features
  notable_landmarks: string | null;
  // Practical Information
  cell_phone_coverage: string | null;
  backcountry_permits_required: boolean | null;
  fire_restrictions: string | null;
  // Additional Statistics
  recreation_visitors_2022: string | null;
  recreation_visitors_2023: string | null;
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
function validateResearchData(data: any): ParkResearchData {
  const validated: ParkResearchData = {
    // Visitor Access & Operations
    operating_months: typeof data.operating_months === 'string' ? data.operating_months.trim() || null : null,
    best_time_to_visit: typeof data.best_time_to_visit === 'string' ? data.best_time_to_visit.trim() || null : null,
    annual_pass_available: typeof data.annual_pass_available === 'boolean' ? data.annual_pass_available : null,
    reservation_required: typeof data.reservation_required === 'boolean' ? data.reservation_required : null,
    reservation_website: typeof data.reservation_website === 'string' ? data.reservation_website.trim() || null : null,
    // Pet & Animal Policies
    dogs_allowed: typeof data.dogs_allowed === 'boolean' ? data.dogs_allowed : null,
    dogs_allowed_restrictions: typeof data.dogs_allowed_restrictions === 'string' ? data.dogs_allowed_restrictions.trim() || null : null,
    pet_friendly_areas: typeof data.pet_friendly_areas === 'string' ? data.pet_friendly_areas.trim() || null : null,
    // Camping & Accommodations
    camping_available: typeof data.camping_available === 'boolean' ? data.camping_available : null,
    number_of_campgrounds: typeof data.number_of_campgrounds === 'number' && data.number_of_campgrounds >= 0 ? data.number_of_campgrounds : null,
    camping_reservation_required: typeof data.camping_reservation_required === 'boolean' ? data.camping_reservation_required : null,
    lodging_available: typeof data.lodging_available === 'boolean' ? data.lodging_available : null,
    rv_camping_available: typeof data.rv_camping_available === 'boolean' ? data.rv_camping_available : null,
    // Activities & Recreation
    hiking_trails_available: typeof data.hiking_trails_available === 'boolean' ? data.hiking_trails_available : null,
    number_of_trails: typeof data.number_of_trails === 'number' && data.number_of_trails >= 0 ? data.number_of_trails : null,
    water_activities: typeof data.water_activities === 'string' ? data.water_activities.trim() || null : null,
    wildlife_viewing: typeof data.wildlife_viewing === 'boolean' ? data.wildlife_viewing : null,
    scenic_drives: typeof data.scenic_drives === 'boolean' ? data.scenic_drives : null,
    visitor_centers_count: typeof data.visitor_centers_count === 'number' && data.visitor_centers_count >= 0 ? data.visitor_centers_count : null,
    // Climate & Weather
    average_summer_temp: typeof data.average_summer_temp === 'number' && data.average_summer_temp >= -50 && data.average_summer_temp <= 120 ? data.average_summer_temp : null,
    average_winter_temp: typeof data.average_winter_temp === 'number' && data.average_winter_temp >= -50 && data.average_winter_temp <= 120 ? data.average_winter_temp : null,
    climate_type: typeof data.climate_type === 'string' ? data.climate_type.trim() || null : null,
    snow_season: typeof data.snow_season === 'string' ? data.snow_season.trim() || null : null,
    // Park Features
    notable_landmarks: typeof data.notable_landmarks === 'string' ? data.notable_landmarks.trim() || null : null,
    // Practical Information
    cell_phone_coverage: typeof data.cell_phone_coverage === 'string' ? data.cell_phone_coverage.trim() || null : null,
    backcountry_permits_required: typeof data.backcountry_permits_required === 'boolean' ? data.backcountry_permits_required : null,
    fire_restrictions: typeof data.fire_restrictions === 'string' ? data.fire_restrictions.trim() || null : null,
    // Additional Statistics
    recreation_visitors_2022: typeof data.recreation_visitors_2022 === 'string' ? data.recreation_visitors_2022.trim() || null : null,
    recreation_visitors_2023: typeof data.recreation_visitors_2023 === 'string' ? data.recreation_visitors_2023.trim() || null : null,
  };

  return validated;
}

/**
 * Research park data using OpenAI
 */
async function researchParkData(park: NationalPark): Promise<ParkResearchData> {
  // Build context about the park
  const contextParts: string[] = [];
  
  contextParts.push(`National Park: ${park.name}`);
  
  if (park.state) {
    contextParts.push(`Location: ${park.state}`);
  }
  
  if (park.date_established) {
    contextParts.push(`Established: ${park.date_established}`);
  }
  
  if (park.area_2021) {
    contextParts.push(`Area: ${park.area_2021}`);
  } else if (park.acres) {
    const acresFormatted = park.acres.toLocaleString('en-US');
    contextParts.push(`Area: ${acresFormatted} acres`);
  }
  
  if (park.recreation_visitors_2021) {
    contextParts.push(`2021 Visitors: ${park.recreation_visitors_2021}`);
  }
  
  const context = contextParts.join('\n');
  
  const prompt = `Research comprehensive information about ${park.name} National Park and return the data in the following JSON format. Use official NPS websites, travel guides, and reliable sources.

${context}

Return a JSON object with exactly these fields (use null for unknown values):

{
  "operating_months": "string or null - Months/seasons when park is fully operational (e.g., 'May-October', 'Year-round', 'June-September')",
  "best_time_to_visit": "string or null - Recommended months/seasons for optimal weather (e.g., 'May-June, September-October')",
  "annual_pass_available": "boolean or null - Whether park offers annual pass",
  "reservation_required": "boolean or null - Whether advance reservations required for entry",
  "reservation_website": "string or null - URL for making reservations (e.g., Recreation.gov link)",
  "dogs_allowed": "boolean or null - Whether dogs are allowed in park",
  "dogs_allowed_restrictions": "string or null - Restrictions on dogs (e.g., 'On leash only', 'Only in developed areas')",
  "pet_friendly_areas": "string or null - Specific areas where pets allowed",
  "camping_available": "boolean or null - Whether park has campgrounds",
  "number_of_campgrounds": "number or null - Total number of campgrounds (non-negative integer)",
  "camping_reservation_required": "boolean or null - Whether camping reservations required",
  "lodging_available": "boolean or null - Whether park has lodges/cabins",
  "rv_camping_available": "boolean or null - Whether RV camping available",
  "hiking_trails_available": "boolean or null - Whether park has hiking trails",
  "number_of_trails": "number or null - Approximate number of hiking trails (non-negative integer)",
  "water_activities": "string or null - Available water activities (e.g., 'Kayaking, Swimming, Fishing')",
  "wildlife_viewing": "boolean or null - Whether park known for wildlife viewing",
  "scenic_drives": "boolean or null - Whether park has scenic drives",
  "visitor_centers_count": "number or null - Number of visitor centers (non-negative integer)",
  "average_summer_temp": "number or null - Average summer temperature in Fahrenheit (-50 to 120)",
  "average_winter_temp": "number or null - Average winter temperature in Fahrenheit (-50 to 120)",
  "climate_type": "string or null - Climate classification (e.g., 'Desert', 'Alpine', 'Temperate', 'Tropical')",
  "snow_season": "string or null - Months when snow typically present (e.g., 'November-April')",
  "notable_landmarks": "string or null - Famous landmarks/features (comma-separated)",
  "cell_phone_coverage": "string or null - Coverage quality (e.g., 'Limited', 'Good', 'None')",
  "backcountry_permits_required": "boolean or null - Whether backcountry camping requires permits",
  "fire_restrictions": "string or null - General fire restriction info",
  "recreation_visitors_2022": "string or null - Visitor count for 2022",
  "recreation_visitors_2023": "string or null - Visitor count for 2023"
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
      max_tokens: 2000,
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
 * Check if park has complete data (all fields populated)
 */
function hasCompleteData(park: any): boolean {
  const requiredFields: (keyof ParkResearchData)[] = [
    'operating_months',
    'best_time_to_visit',
    'annual_pass_available',
    'reservation_required',
    'dogs_allowed',
    'camping_available',
    'hiking_trails_available',
    'wildlife_viewing',
    'scenic_drives',
    'climate_type',
    'backcountry_permits_required',
  ];
  
  // Check if at least 80% of key fields are populated
  const populatedCount = requiredFields.filter(field => park[field] !== null && park[field] !== undefined).length;
  return populatedCount >= requiredFields.length * 0.8;
}

/**
 * Fetch all national parks that need data
 */
async function fetchParks(skipExisting: boolean = true): Promise<NationalPark[]> {
  console.log('📊 Fetching national parks from database...\n');
  
  // Get all parks with new fields
  const { data: allData, error: allError } = await supabase
    .from(TABLE_NAME)
    .select('id, name, date_established, area_2021, recreation_visitors_2021, description, park_code, state, acres, latitude, longitude, operating_months, best_time_to_visit, annual_pass_available, reservation_required, dogs_allowed, camping_available, hiking_trails_available, wildlife_viewing, scenic_drives, climate_type, backcountry_permits_required')
    .not('name', 'is', null)
    .neq('name', '');
  
  if (allError) {
    throw new Error(`Failed to fetch parks: ${allError.message}`);
  }
  
  if (!allData || allData.length === 0) {
    console.log('No national parks found');
    return [];
  }
  
  // Filter parks that need data (skip those that already have complete data)
  const parksNeedingData = skipExisting
    ? allData.filter((p: any) => !hasCompleteData(p))
    : allData;
  
  if (skipExisting && parksNeedingData.length < allData.length) {
    const skipped = allData.length - parksNeedingData.length;
    console.log(`⏭️  Skipping ${skipped} parks that already have complete data`);
  }
  
  console.log(`✅ Found ${parksNeedingData.length} parks needing data (out of ${allData.length} total)\n`);
  return parksNeedingData as NationalPark[];
}

/**
 * Process a single national park
 */
async function processPark(
  park: NationalPark,
  index: number,
  total: number
): Promise<{ success: boolean; error?: string }> {
  const parkName = park.name || `Park #${park.id}`;
  
  console.log(`[${index + 1}/${total}] Processing: ${parkName}`);
  if (park.state) {
    console.log(`  Location: ${park.state}`);
  }
  
  try {
    // Wait before OpenAI API call
    await sleep(DELAY_BETWEEN_AI_CALLS);
    
    // Research data
    console.log('  🤖 Researching data with OpenAI...');
    const researchData = await researchParkData(park);
    
    // Count populated fields
    const populatedFields = Object.values(researchData).filter(v => v !== null && v !== undefined).length;
    console.log(`  ✓ Researched ${populatedFields} fields`);
    
    // Update database
    console.log('  💾 Updating database...');
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update(researchData)
      .eq('id', park.id);
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log(`  ✅ Successfully updated ${parkName}\n`);
    
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
  console.log('🚀 Starting national park data research...\n');
  
  const stats: ProcessingStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };
  
  try {
    // Fetch parks (skip those that already have complete data to enable resume)
    const skipExisting = process.argv.includes('--overwrite') ? false : true;
    if (skipExisting) {
      console.log('ℹ️  Resuming: Will skip parks that already have complete data\n');
    } else {
      console.log('ℹ️  Overwrite mode: Will regenerate data for all parks\n');
    }
    
    const parks = await fetchParks(skipExisting);
    stats.total = parks.length;
    
    if (parks.length === 0) {
      console.log('No parks to process. Exiting.');
      return;
    }
    
    // Process each park
    for (let i = 0; i < parks.length; i++) {
      const park = parks[i];
      
      // Process park
      const result = await processPark(park, i, stats.total);
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
    console.log(`Total parks:             ${stats.total}`);
    console.log(`Processed:               ${stats.processed}`);
    console.log(`Successful:              ${stats.successful}`);
    console.log(`Failed:                  ${stats.failed}`);
    console.log(`Skipped:                 ${stats.skipped}`);
    console.log('='.repeat(60));
    
    if (stats.failed > 0) {
      console.log(`\n⚠️  ${stats.failed} parks failed to process. Check the error messages above for details.`);
    }
    
    if (stats.successful > 0) {
      console.log(`\n✅ Successfully researched data for ${stats.successful} parks!`);
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
