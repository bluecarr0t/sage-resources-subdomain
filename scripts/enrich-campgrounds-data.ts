#!/usr/bin/env npx tsx
/**
 * Enrich campgrounds data using OpenAI API
 * 
 * This script:
 * - Fetches campgrounds from all_campgrounds table
 * - Prioritizes missing high-value fields
 * - Uses OpenAI to research and enrich missing data
 * - Updates the database with enriched information
 * 
 * Priority fields:
 * 1. Description (essential for SEO)
 * 2. Website (verification/enhancement)
 * 3. Phone/Email (contact info)
 * 4. Operating months / Best time to visit
 * 5. Amenities (restrooms, showers, wifi, etc.)
 * 6. Camping features (RV/tent availability, hookups)
 * 7. Activities (hiking, fishing, swimming)
 * 8. Pet policies
 * 9. Reservation info
 * 10. Pricing (if available)
 * 
 * Usage:
 *   npx tsx scripts/enrich-campgrounds-data.ts [--limit N] [--skip-existing-description]
 * 
 * Options:
 *   --limit N                    Only process first N records (for testing)
 *   --skip-existing-description  Skip records that already have description
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

const TABLE_NAME = 'all_campgrounds';

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const skipExistingDescription = args.includes('--skip-existing-description');

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
const BATCH_SIZE = 10; // Number of records to update in parallel (database updates)
const MAX_RETRIES = 3; // Maximum retries for OpenAI API calls

interface CampgroundRecord {
  id: number;
  name: string;
  state: string | null;
  city: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  operator: string | null;
  description: string | null;
  campground_type: string | null;
  [key: string]: any;
}

interface EnrichmentData {
  // Priority 1: Essential fields
  description?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  
  // Priority 2: Operating info
  operating_months?: string | null;
  best_time_to_visit?: string | null;
  reservation_required?: boolean | null;
  reservation_website?: string | null;
  walk_ins_accepted?: boolean | null;
  
  // Priority 3: Amenities
  restrooms?: boolean | null;
  showers?: boolean | null;
  wifi_available?: boolean | null;
  wifi_free?: boolean | null;
  laundry?: boolean | null;
  dump_station?: boolean | null;
  store?: boolean | null;
  playground?: boolean | null;
  pool?: boolean | null;
  hot_tub?: boolean | null;
  
  // Priority 4: Camping features
  rv_camping_available?: boolean | null;
  rv_hookups?: string | null;
  max_rv_length?: number | null;
  tent_camping_available?: boolean | null;
  cabin_rentals?: boolean | null;
  glamping_available?: boolean | null;
  lodging_available?: boolean | null;
  
  // Priority 5: Activities
  hiking_trails_available?: boolean | null;
  water_activities?: string | null;
  fishing_available?: boolean | null;
  swimming_available?: boolean | null;
  beach_access?: boolean | null;
  boat_ramp?: boolean | null;
  wildlife_viewing?: boolean | null;
  
  // Priority 6: Pet policies
  dogs_allowed?: boolean | null;
  dogs_allowed_restrictions?: string | null;
  pet_fee?: number | null;
  pet_friendly_areas?: string | null;
  
  // Priority 7: Additional info
  total_sites?: number | null;
  rv_sites?: number | null;
  tent_sites?: number | null;
  acres?: number | null;
  cell_phone_coverage?: string | null;
  notable_features?: string | null;
  nearby_attractions?: string | null;
  scenic_views?: boolean | null;
  fire_restrictions?: string | null;
  quiet_hours?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  nearest_major_city?: string | null;
  distance_from_city?: number | null;
}

/**
 * Research campground data using OpenAI
 */
async function researchCampgroundData(
  campground: CampgroundRecord,
  retryCount: number = 0
): Promise<EnrichmentData> {
  // Build context about the campground
  const contextParts: string[] = [];
  
  contextParts.push(`Campground Name: ${campground.name}`);
  
  if (campground.city && campground.state) {
    contextParts.push(`Location: ${campground.city}, ${campground.state}`);
  } else if (campground.state) {
    contextParts.push(`Location: ${campground.state}`);
  }
  
  if (campground.county) {
    contextParts.push(`County: ${campground.county}`);
  }
  
  if (campground.address) {
    contextParts.push(`Address: ${campground.address}`);
  }
  
  if (campground.latitude && campground.longitude) {
    contextParts.push(`Coordinates: ${campground.latitude}, ${campground.longitude}`);
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
  
  if (campground.campground_type) {
    contextParts.push(`Campground Type: ${campground.campground_type}`);
  }

  const context = contextParts.join('\n');

  const prompt = `Research comprehensive information about this campground. Use the campground's website, booking platforms (ReserveAmerica, Recreation.gov, Hipcamp, etc.), reviews, and official park/service websites.

${context}

Provide a JSON object with as much detail as possible. Focus on filling in missing information. Return ONLY the fields you can find information for - use null for unknown values.

Priority fields to research:
1. Description - Brief 3-5 sentence description of the campground, its setting, and what makes it special
2. Website - Official website URL (verify/update if already provided)
3. Phone/Email - Contact information
4. Operating months / Best time to visit - When the campground is open and best seasons
5. Amenities - Restrooms, showers, WiFi, laundry, dump station, store, playground, pool, hot tub
6. Camping features - RV/tent availability, hookups, max RV length, cabins, glamping, lodging
7. Activities - Hiking trails, water activities, fishing, swimming, beach access, boat ramp, wildlife viewing
8. Pet policies - Dogs allowed, restrictions, fees, pet-friendly areas
9. Reservation info - Reservation requirements, reservation website, walk-ins accepted
10. Additional details - Total sites, cell coverage, notable features, nearby attractions, fire restrictions, quiet hours, check-in/out times

Return ONLY valid JSON with these fields (use null for unknown):
{
  "description": "string or null",
  "website": "string or null - URL",
  "phone": "string or null",
  "email": "string or null",
  "operating_months": "string or null - e.g., 'Year-round', 'April-October'",
  "best_time_to_visit": "string or null - e.g., 'May-September'",
  "reservation_required": "boolean or null",
  "reservation_website": "string or null - URL",
  "walk_ins_accepted": "boolean or null",
  "restrooms": "boolean or null",
  "showers": "boolean or null",
  "wifi_available": "boolean or null",
  "wifi_free": "boolean or null",
  "laundry": "boolean or null",
  "dump_station": "boolean or null",
  "store": "boolean or null",
  "playground": "boolean or null",
  "pool": "boolean or null",
  "hot_tub": "boolean or null",
  "rv_camping_available": "boolean or null",
  "rv_hookups": "string or null - e.g., 'Full Hookups', 'Electric Only'",
  "max_rv_length": "number or null - feet",
  "tent_camping_available": "boolean or null",
  "cabin_rentals": "boolean or null",
  "glamping_available": "boolean or null",
  "lodging_available": "boolean or null",
  "hiking_trails_available": "boolean or null",
  "water_activities": "string or null - e.g., 'Swimming, Fishing, Kayaking'",
  "fishing_available": "boolean or null",
  "swimming_available": "boolean or null",
  "beach_access": "boolean or null",
  "boat_ramp": "boolean or null",
  "wildlife_viewing": "boolean or null",
  "dogs_allowed": "boolean or null",
  "dogs_allowed_restrictions": "string or null - e.g., 'On leash only'",
  "pet_fee": "number or null - USD",
  "pet_friendly_areas": "string or null",
  "total_sites": "number or null",
  "rv_sites": "number or null",
  "tent_sites": "number or null",
  "cell_phone_coverage": "string or null - e.g., 'Good', 'Limited', 'None'",
  "notable_features": "string or null",
  "nearby_attractions": "string or null",
  "scenic_views": "boolean or null",
  "fire_restrictions": "string or null",
  "quiet_hours": "string or null - e.g., '10 PM - 7 AM'",
  "check_in_time": "string or null - e.g., '2:00 PM'",
  "check_out_time": "string or null - e.g., '11:00 AM'",
  "nearest_major_city": "string or null",
  "distance_from_city": "number or null - miles"
}

Return ONLY valid JSON, no additional text or markdown formatting.`;

  try {
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_AI_CALLS));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4, // Moderate temperature for balanced research
      response_format: { type: 'json_object' },
      max_tokens: 2500, // Enough tokens for comprehensive data
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse JSON: ${e}`);
      }
    }

    // Validate and sanitize website URL if provided
    if (parsed.website && typeof parsed.website === 'string') {
      let website = parsed.website.trim();
      if (!website.startsWith('http://') && !website.startsWith('https://')) {
        website = `https://${website}`;
      }
      try {
        new URL(website);
        parsed.website = website;
      } catch {
        console.log(`    ⚠️  Invalid website URL, setting to null`);
        parsed.website = null;
      }
    }

    return parsed as EnrichmentData;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`    ⚠️  Error (attempt ${retryCount + 1}/${MAX_RETRIES}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_AI_CALLS * 2));
      return researchCampgroundData(campground, retryCount + 1);
    }
    
    console.log(`    ❌ Error after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {};
  }
}

/**
 * Fetch campground records from database
 */
async function fetchCampgroundRecords(): Promise<CampgroundRecord[]> {
  console.log('📥 Fetching campground records from database...\n');

  let query = supabase
    .from(TABLE_NAME)
    .select('id, name, state, city, county, latitude, longitude, address, website, phone, email, operator, description, campground_type')
    .order('id', { ascending: true });

  // Skip records with existing description if flag is set
  if (skipExistingDescription) {
    query = query.is('description', null);
  }

  const { data, error } = await query.limit(limit || 10000);

  if (error) {
    throw new Error(`Error fetching from database: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log('✅ No campgrounds found to process!');
    return [];
  }

  // Apply limit if specified
  const records = limit && limit > 0 ? data.slice(0, limit) : data;

  console.log(`✅ Found ${records.length} campground records to process\n`);
  return records;
}

/**
 * Update campground record in database
 */
async function updateCampgroundRecord(
  id: number,
  enrichmentData: EnrichmentData
): Promise<boolean> {
  // Only update fields that are not null/undefined in enrichmentData
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Add all non-null fields from enrichmentData
  Object.keys(enrichmentData).forEach(key => {
    const value = (enrichmentData as any)[key];
    if (value !== null && value !== undefined) {
      updateData[key] = value;
    }
  });

  // Only update if we have data to update
  if (Object.keys(updateData).length <= 1) { // Only updated_at
    return false;
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error(`    ❌ Database error: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Update records in batches
 */
async function updateRecords(
  updates: Array<{ id: number; data: EnrichmentData }>
): Promise<void> {
  console.log(`\n📤 Updating ${updates.length} records in database...`);

  let updated = 0;
  let skipped = 0;
  let errorCount = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    // Update each record concurrently using Promise.all
    const updatePromises = batch.map(async (update) => {
      const success = await updateCampgroundRecord(update.id, update.data);
      return { success, hasData: Object.keys(update.data).length > 0 };
    });

    const results = await Promise.all(updatePromises);

    const batchUpdated = results.filter(r => r.success).length;
    const batchSkipped = results.filter(r => !r.success && r.hasData).length;
    const batchErrors = results.length - batchUpdated - batchSkipped;

    updated += batchUpdated;
    skipped += batchSkipped;
    errorCount += batchErrors;

    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= updates.length) {
      console.log(`  ✅ Updated ${updated}/${updates.length} records...`);
    }
  }

  console.log(`\n✅ Successfully updated ${updated} records`);
  if (skipped > 0) {
    console.log(`⚠️  ${skipped} records had no new data to update`);
  }
  if (errorCount > 0) {
    console.warn(`⚠️  ${errorCount} records failed to update`);
  }
}

/**
 * Count fields that were enriched
 */
function countEnrichedFields(data: EnrichmentData): number {
  return Object.keys(data).filter(key => data[key as keyof EnrichmentData] !== null && data[key as keyof EnrichmentData] !== undefined).length;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Enrich Campgrounds Data with OpenAI');
  console.log('='.repeat(70));
  console.log();

  if (skipExistingDescription) {
    console.log('📌 Mode: Skipping records with existing description');
  }
  if (limit) {
    console.log(`📌 Limit: Processing only first ${limit} records`);
  }
  console.log();

  try {
    // Step 1: Fetch campground records
    const campgrounds = await fetchCampgroundRecords();

    if (campgrounds.length === 0) {
      console.log('✅ No campgrounds to process!');
      return;
    }

    // Step 2: Research each campground
    console.log('🔍 Researching campgrounds using OpenAI...\n');
    const updates: Array<{ id: number; data: EnrichmentData }> = [];
    const stats = {
      totalFields: 0,
      fieldsPerRecord: [] as number[],
      descriptionsAdded: 0,
      websitesAdded: 0,
      phonesAdded: 0,
    };

    for (let i = 0; i < campgrounds.length; i++) {
      const campground = campgrounds[i];
      console.log(`[${i + 1}/${campgrounds.length}] ${campground.name}`);
      if (campground.city && campground.state) {
        console.log(`     Location: ${campground.city}, ${campground.state}`);
      } else if (campground.state) {
        console.log(`     Location: ${campground.state}`);
      }

      try {
        const enrichmentData = await researchCampgroundData(campground);
        const fieldCount = countEnrichedFields(enrichmentData);

        if (fieldCount > 0) {
          stats.totalFields += fieldCount;
          stats.fieldsPerRecord.push(fieldCount);
          if (enrichmentData.description) stats.descriptionsAdded++;
          if (enrichmentData.website) stats.websitesAdded++;
          if (enrichmentData.phone) stats.phonesAdded++;

          console.log(`     ✅ Enriched with ${fieldCount} fields`);
          if (enrichmentData.description) {
            console.log(`     📝 Description: ${enrichmentData.description.substring(0, 100)}...`);
          }
          
          updates.push({
            id: campground.id,
            data: enrichmentData,
          });
        } else {
          console.log(`     ⚠️  No data found`);
        }
      } catch (error) {
        console.log(`     ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      console.log();
    }

    // Step 3: Update database
    if (updates.length > 0) {
      await updateRecords(updates);

      // Step 4: Print summary statistics
      const avgFields = stats.fieldsPerRecord.length > 0
        ? (stats.totalFields / stats.fieldsPerRecord.length).toFixed(1)
        : '0';

      console.log('\n' + '='.repeat(70));
      console.log('Summary Statistics');
      console.log('='.repeat(70));
      console.log(`Total records processed: ${campgrounds.length}`);
      console.log(`Records enriched: ${updates.length}`);
      console.log(`Total fields added: ${stats.totalFields}`);
      console.log(`Average fields per record: ${avgFields}`);
      console.log(`Descriptions added: ${stats.descriptionsAdded}`);
      console.log(`Websites added: ${stats.websitesAdded}`);
      console.log(`Phone numbers added: ${stats.phonesAdded}`);
      console.log();
    } else {
      console.log('⚠️  No updates to apply');
    }

    console.log('✅ Process complete!');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
