#!/usr/bin/env npx tsx
/**
 * Research amenities for properties in all_glamping_properties using OpenAI API
 * 
 * This script:
 * - Fetches 10 properties from all_glamping_properties
 * - Uses OpenAI API (ChatGPT) to research each property and fill in amenities
 * - Updates amenities from 'toilet' to 'water_hookup'
 * - Updates the database with enriched data
 * 
 * Usage:
 *   npx tsx scripts/research-properties-amenities.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!openaiApiKey) {
  console.error('❌ Missing OpenAI API key');
  console.error('Please ensure OPENAI_API_KEY is set in .env.local');
  process.exit(1);
}

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Initialize clients
const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Configuration
const DELAY_BETWEEN_AI_CALLS = 2000; // 2 seconds between OpenAI API calls
const PROPERTIES_TO_RESEARCH = 10;

// Amenity columns from 'toilet' to 'water_hookup' (in order from CSV)
const AMENITY_COLUMNS = [
  'toilet',
  'hot_tub___sauna',
  'pool',
  'pets',
  'water',
  'shower',
  'trash',
  'cooking_equipment',
  'picnic_table',
  'wifi',
  'laundry',
  'campfires',
  'playground',
  'rv___vehicle_length',
  'rv___parking',
  'rv___accommodates_slideout',
  'rv___surface_type',
  'rv___surface_level',
  'rv___vehicles__fifth_wheels',
  'rv___vehicles__class_a_rvs',
  'rv___vehicles__class_b_rvs',
  'rv___vehicles__class_c_rvs',
  'rv___vehicles__toy_hauler',
  'electricity',
  'private_bathroom',
  'kitchen',
  'patio',
  'general_store',
  'cable',
  'charcoal_grill',
  'sewer_hook_up',
  'electrical_hook_up',
  'generators_allowed',
  'water_hookup',
];

interface PropertyRecord {
  id: number;
  property_name: string | null;
  url: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  [key: string]: any;
}

interface AmenitiesData {
  [key: string]: string | null;
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Research amenities for a property using OpenAI
 */
async function researchPropertyAmenities(property: PropertyRecord): Promise<AmenitiesData> {
  console.log(`\n🔍 Researching amenities for: ${property.property_name} (ID: ${property.id})`);

  const propertyInfo = [
    `Property Name: ${property.property_name || 'Unknown'}`,
    `URL: ${property.url || 'Unknown'}`,
    `Address: ${property.address || 'Unknown'}`,
    `City: ${property.city || 'Unknown'}`,
    `State: ${property.state || 'Unknown'}`,
    `Country: ${property.country || 'Unknown'}`,
    `Description: ${property.description || 'No description available'}`,
  ].join('\n');

  const prompt = `You are researching amenities for a glamping property. Based on the following information, determine which amenities are available.

${propertyInfo}

For each amenity listed below, research the property and determine if it's available. Return "Yes" if the amenity is available, "No" if it's confirmed not available, or null if you cannot determine from available information.

Return a JSON object with ONLY the amenity fields listed below. Use lowercase "yes", "no", or null (not "Yes"/"No").

Amenities to research:
${AMENITY_COLUMNS.map(col => `- ${col}`).join('\n')}

Return ONLY valid JSON in this format:
{
  "toilet": "yes/no/null",
  "hot_tub___sauna": "yes/no/null",
  "pool": "yes/no/null",
  "pets": "yes/no/null",
  "water": "yes/no/null",
  "shower": "yes/no/null",
  "trash": "yes/no/null",
  "cooking_equipment": "yes/no/null",
  "picnic_table": "yes/no/null",
  "wifi": "yes/no/null",
  "laundry": "yes/no/null",
  "campfires": "yes/no/null",
  "playground": "yes/no/null",
  "rv___vehicle_length": "yes/no/null",
  "rv___parking": "yes/no/null",
  "rv___accommodates_slideout": "yes/no/null",
  "rv___surface_type": "yes/no/null",
  "rv___surface_level": "yes/no/null",
  "rv___vehicles__fifth_wheels": "yes/no/null",
  "rv___vehicles__class_a_rvs": "yes/no/null",
  "rv___vehicles__class_b_rvs": "yes/no/null",
  "rv___vehicles__class_c_rvs": "yes/no/null",
  "rv___vehicles__toy_hauler": "yes/no/null",
  "electricity": "yes/no/null",
  "private_bathroom": "yes/no/null",
  "kitchen": "yes/no/null",
  "patio": "yes/no/null",
  "general_store": "yes/no/null",
  "cable": "yes/no/null",
  "charcoal_grill": "yes/no/null",
  "sewer_hook_up": "yes/no/null",
  "electrical_hook_up": "yes/no/null",
  "generators_allowed": "yes/no/null",
  "water_hookup": "yes/no/null"
}

Be thorough and accurate. If you cannot find information about a specific amenity, use null.`;

  try {
    await sleep(DELAY_BETWEEN_AI_CALLS);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    // Normalize the values: convert to proper format (Yes/No/null)
    const amenities: AmenitiesData = {};
    for (const column of AMENITY_COLUMNS) {
      const value = parsed[column];
      if (value === null || value === undefined || value === 'null' || value === '') {
        amenities[column] = null;
      } else {
        const normalized = value.toString().toLowerCase().trim();
        if (normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1') {
          amenities[column] = 'Yes';
        } else if (normalized === 'no' || normalized === 'n' || normalized === 'false' || normalized === '0') {
          amenities[column] = 'No';
        } else {
          amenities[column] = null;
        }
      }
    }

    console.log(`  ✅ Retrieved amenities data`);
    return amenities;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`  ❌ Error researching amenities: ${error.message}`);
    }
    return {};
  }
}

/**
 * Update property amenities in database
 */
async function updatePropertyAmenities(propertyId: number, amenities: AmenitiesData): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('all_glamping_properties')
      .update(amenities)
      .eq('id', propertyId);

    if (error) {
      console.error(`  ❌ Error updating property ${propertyId}: ${error.message}`);
      return false;
    }

    console.log(`  ✅ Updated amenities in database`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`  ❌ Error updating property: ${error.message}`);
    }
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting property amenities research...\n');
  console.log(`📊 Will research ${PROPERTIES_TO_RESEARCH} properties\n`);

  try {
    // Fetch properties from database
    // Get properties that might have missing or incomplete amenity data
    const { data: properties, error: fetchError } = await supabase
      .from('all_glamping_properties')
      .select('id, property_name, url, description, address, city, state, country')
      .limit(PROPERTIES_TO_RESEARCH);

    if (fetchError) {
      throw fetchError;
    }

    if (!properties || properties.length === 0) {
      console.log('❌ No properties found in database');
      return;
    }

    console.log(`✅ Found ${properties.length} properties to research\n`);

    let successCount = 0;
    let errorCount = 0;

    // Process each property
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      console.log(`\n[${i + 1}/${properties.length}] Processing: ${property.property_name}`);

      try {
        // Research amenities
        const amenities = await researchPropertyAmenities(property);

        if (Object.keys(amenities).length > 0) {
          // Update database
          const updated = await updatePropertyAmenities(property.id, amenities);
          if (updated) {
            successCount++;
          } else {
            errorCount++;
          }
        } else {
          console.log(`  ⚠️  No amenities data retrieved, skipping update`);
          errorCount++;
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`  ❌ Error processing property: ${error.message}`);
        }
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('RESEARCH SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total properties processed: ${properties.length}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n✅ Research complete!');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Fatal error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the script
main();
