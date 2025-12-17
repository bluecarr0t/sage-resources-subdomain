#!/usr/bin/env npx tsx
/**
 * Generate national park descriptions using OpenAI API
 * 
 * This script:
 * - Fetches all national parks from the national-parks table
 * - Uses OpenAI API to generate 4-5 sentence descriptions for each park
 * - Updates the description column in the database
 * - By default, skips parks that already have descriptions (enables resume)
 * 
 * Usage:
 *   npx tsx scripts/generate-national-park-descriptions.ts          # Skip existing descriptions (resume mode)
 *   npx tsx scripts/generate-national-park-descriptions.ts --overwrite  # Regenerate all descriptions
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
 * Generate national park description using OpenAI
 */
async function generateDescription(park: NationalPark): Promise<string> {
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
  
  const prompt = `Write a compelling 4-5 sentence description of ${park.name}, a U.S. National Park. 

The description should:
1. Highlight the park's unique natural features, landscapes, and ecosystems
2. Mention notable attractions, landmarks, or activities visitors can experience
3. Convey the park's significance and what makes it special
4. Be engaging and informative for potential visitors interested in outdoor recreation and nature

${context}

Write exactly 4-5 sentences. Make it natural, engaging, and informative.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const description = response.choices[0]?.message?.content?.trim();
    
    if (!description) {
      throw new Error('No description generated');
    }
    
    // Validate it's roughly 4-5 sentences
    const sentenceCount = (description.match(/[.!?]+/g) || []).length;
    if (sentenceCount < 3 || sentenceCount > 6) {
      console.warn(`  ⚠️  Warning: Generated description has ${sentenceCount} sentences (expected 4-5)`);
    }
    
    return description;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error from OpenAI API');
  }
}

/**
 * Fetch all national parks that need descriptions
 */
async function fetchParks(skipExisting: boolean = true): Promise<NationalPark[]> {
  console.log('📊 Fetching national parks from database...\n');
  
  // First, get all parks
  const { data: allData, error: allError } = await supabase
    .from(TABLE_NAME)
    .select('id, name, date_established, area_2021, recreation_visitors_2021, description, park_code, state, acres, latitude, longitude')
    .not('name', 'is', null)
    .neq('name', '');
  
  if (allError) {
    throw new Error(`Failed to fetch parks: ${allError.message}`);
  }
  
  if (!allData || allData.length === 0) {
    console.log('No national parks found');
    return [];
  }
  
  // Filter parks that need descriptions (skip those that already have them)
  const parksNeedingDescriptions = skipExisting
    ? allData.filter((p: NationalPark) => {
        const hasDescription = p.description && p.description.trim().length > 0;
        return !hasDescription;
      })
    : allData;
  
  if (skipExisting && parksNeedingDescriptions.length < allData.length) {
    const skipped = allData.length - parksNeedingDescriptions.length;
    console.log(`⏭️  Skipping ${skipped} parks that already have descriptions`);
  }
  
  console.log(`✅ Found ${parksNeedingDescriptions.length} parks needing descriptions (out of ${allData.length} total)\n`);
  return parksNeedingDescriptions as NationalPark[];
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
    
    // Generate description
    console.log('  🤖 Generating description with OpenAI...');
    const description = await generateDescription(park);
    
    console.log(`  ✓ Generated description (${description.length} characters)`);
    
    // Update database
    console.log('  💾 Updating database...');
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ description })
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
  console.log('🚀 Starting national park description generation...\n');
  
  const stats: ProcessingStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };
  
  try {
    // Fetch parks (skip those that already have descriptions to enable resume)
    const skipExisting = process.argv.includes('--overwrite') ? false : true;
    if (skipExisting) {
      console.log('ℹ️  Resuming: Will skip parks that already have descriptions\n');
    } else {
      console.log('ℹ️  Overwrite mode: Will regenerate descriptions for all parks\n');
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
      console.log(`\n✅ Successfully generated descriptions for ${stats.successful} parks!`);
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
