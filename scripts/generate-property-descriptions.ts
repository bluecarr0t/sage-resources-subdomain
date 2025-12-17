#!/usr/bin/env npx tsx
/**
 * Generate property descriptions from websites
 * 
 * This script:
 * - Fetches all properties from all_glamping_properties table with google_website_uri
 * - Fetches and analyzes each property's website
 * - Uses OpenAI API to generate 3-5 sentence descriptions
 * - Updates the description column in the database
 * - By default, skips properties that already have descriptions (enables resume)
 * 
 * Usage:
 *   npx tsx scripts/generate-property-descriptions.ts          # Skip existing descriptions (resume mode)
 *   npx tsx scripts/generate-property-descriptions.ts --overwrite  # Regenerate all descriptions
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import * as cheerio from 'cheerio';

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

const TABLE_NAME = 'all_glamping_properties';

// Initialize clients
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const openai = new OpenAI({ apiKey: openaiApiKey });

// Configuration
const FETCH_TIMEOUT = 30000; // 30 seconds
const MAX_CONTENT_LENGTH = 10000; // Limit content to stay within token limits
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds between website fetches
const DELAY_BETWEEN_AI_CALLS = 1000; // 1 second between OpenAI API calls

interface Property {
  id: number;
  property_name: string | null;
  google_website_uri: string | null;
  description: string | null;
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
 * Fetch website HTML content
 */
async function fetchWebsiteContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
    throw new Error('Unknown error fetching website');
  }
}

/**
 * Extract main text content from HTML
 */
function extractTextContent(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $('script, style, noscript, iframe, embed, object').remove();
  
  // Try to find main content areas
  const mainSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    '#main',
  ];
  
  let mainContent = '';
  
  // Try each selector to find main content
  for (const selector of mainSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      mainContent = element.text();
      if (mainContent.length > 500) {
        break;
      }
    }
  }
  
  // If no main content found or it's too short, use body text
  if (mainContent.length < 500) {
    $('nav, header, footer, aside, .nav, .navigation, .sidebar, .footer, .header').remove();
    mainContent = $('body').text();
  }
  
  // Clean up the text
  let text = mainContent
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
    .trim();
  
  // Limit content length
  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.substring(0, MAX_CONTENT_LENGTH) + '...';
  }
  
  return text;
}

/**
 * Generate property description using OpenAI
 */
async function generateDescription(
  propertyName: string | null,
  websiteContent: string,
  websiteUrl: string
): Promise<string> {
  const propertyNameText = propertyName ? `Property: ${propertyName}\n\n` : '';
  
  const prompt = `${propertyNameText}Analyze the following website content and write a 3-5 sentence description of this glamping property. Focus on:

1. Property overview/type (glamping resort, campground, etc.)
2. Unit types available (tents, cabins, yurts, etc.)
3. Key amenities and features
4. Unique features or setting

Write a compelling, natural description that would help potential guests understand what this property offers. Make it exactly 3-5 sentences.

Website URL: ${websiteUrl}

Website Content:
${websiteContent}`;

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
      max_tokens: 300,
    });

    const description = response.choices[0]?.message?.content?.trim();
    
    if (!description) {
      throw new Error('No description generated');
    }
    
    // Validate it's roughly 3-5 sentences
    const sentenceCount = (description.match(/[.!?]+/g) || []).length;
    if (sentenceCount < 2 || sentenceCount > 6) {
      console.warn(`  ⚠️  Warning: Generated description has ${sentenceCount} sentences (expected 3-5)`);
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
 * Fetch all properties that need descriptions
 */
async function fetchProperties(skipExisting: boolean = true): Promise<Property[]> {
  console.log('📊 Fetching properties from database...\n');
  
  // First, get all properties with website URIs
  const { data: allData, error: allError } = await supabase
    .from(TABLE_NAME)
    .select('id, property_name, google_website_uri, description')
    .not('google_website_uri', 'is', null)
    .neq('google_website_uri', '');
  
  if (allError) {
    throw new Error(`Failed to fetch properties: ${allError.message}`);
  }
  
  if (!allData || allData.length === 0) {
    console.log('No properties found with google_website_uri');
    return [];
  }
  
  // Filter properties that need descriptions (skip those that already have them)
  const propertiesNeedingDescriptions = skipExisting
    ? allData.filter((p: Property) => {
        const hasDescription = p.description && p.description.trim().length > 0;
        return !hasDescription;
      })
    : allData;
  
  if (skipExisting && propertiesNeedingDescriptions.length < allData.length) {
    const skipped = allData.length - propertiesNeedingDescriptions.length;
    console.log(`⏭️  Skipping ${skipped} properties that already have descriptions`);
  }
  
  console.log(`✅ Found ${propertiesNeedingDescriptions.length} properties needing descriptions (out of ${allData.length} total with website URIs)\n`);
  return propertiesNeedingDescriptions as Property[];
}

/**
 * Process a single property
 */
async function processProperty(
  property: Property,
  index: number,
  total: number
): Promise<{ success: boolean; error?: string }> {
  const propertyName = property.property_name || `Property #${property.id}`;
  const url = property.google_website_uri!;
  
  console.log(`[${index + 1}/${total}] Processing: ${propertyName}`);
  console.log(`  URL: ${url}`);
  
  try {
    // Fetch website content
    console.log('  📥 Fetching website...');
    const html = await fetchWebsiteContent(url);
    
    // Extract text content
    console.log('  🔍 Extracting content...');
    const textContent = extractTextContent(html);
    
    if (textContent.length < 100) {
      throw new Error('Extracted content is too short (< 100 characters)');
    }
    
    console.log(`  ✓ Extracted ${textContent.length} characters of content`);
    
    // Wait before OpenAI API call
    await sleep(DELAY_BETWEEN_AI_CALLS);
    
    // Generate description
    console.log('  🤖 Generating description with OpenAI...');
    const description = await generateDescription(property.property_name, textContent, url);
    
    console.log(`  ✓ Generated description (${description.length} characters)`);
    
    // Update database
    console.log('  💾 Updating database...');
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ description })
      .eq('id', property.id);
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log(`  ✅ Successfully updated ${propertyName}\n`);
    
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
  console.log('🚀 Starting property description generation...\n');
  
  const stats: ProcessingStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };
  
  try {
    // Fetch properties (skip those that already have descriptions to enable resume)
    const skipExisting = process.argv.includes('--overwrite') ? false : true;
    if (skipExisting) {
      console.log('ℹ️  Resuming: Will skip properties that already have descriptions\n');
    } else {
      console.log('ℹ️  Overwrite mode: Will regenerate descriptions for all properties\n');
    }
    
    const properties = await fetchProperties(skipExisting);
    stats.total = properties.length;
    
    if (properties.length === 0) {
      console.log('No properties to process. Exiting.');
      return;
    }
    
    // Process each property
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      
      // Skip if no URL
      if (!property.google_website_uri || property.google_website_uri.trim() === '') {
        console.log(`[${i + 1}/${stats.total}] Skipping ${property.property_name || `Property #${property.id}`} - no website URI\n`);
        stats.skipped++;
        continue;
      }
      
      // Process property
      const result = await processProperty(property, i, stats.total);
      stats.processed++;
      
      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }
      
      // Wait before next request (except for the last one)
      if (i < properties.length - 1) {
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Processing Summary');
    console.log('='.repeat(60));
    console.log(`Total properties:        ${stats.total}`);
    console.log(`Processed:               ${stats.processed}`);
    console.log(`Successful:              ${stats.successful}`);
    console.log(`Failed:                  ${stats.failed}`);
    console.log(`Skipped:                 ${stats.skipped}`);
    console.log('='.repeat(60));
    
    if (stats.failed > 0) {
      console.log(`\n⚠️  ${stats.failed} properties failed to process. Check the error messages above for details.`);
    }
    
    if (stats.successful > 0) {
      console.log(`\n✅ Successfully generated descriptions for ${stats.successful} properties!`);
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
