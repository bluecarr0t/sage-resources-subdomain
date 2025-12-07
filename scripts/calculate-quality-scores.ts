#!/usr/bin/env npx tsx
/**
 * Calculate and populate quality scores for all properties in sage-glamping-data
 * 
 * This script:
 * - Fetches all properties from the database
 * - Calculates quality scores (1-100) based on data completeness and accuracy
 * - Updates the database with calculated scores
 * - Provides summary statistics
 * 
 * Usage:
 *   npx tsx scripts/calculate-quality-scores.ts              # Calculate for all properties
 *   npx tsx scripts/calculate-quality-scores.ts --skip-existing  # Skip properties that already have scores
 *   npx tsx scripts/calculate-quality-scores.ts --update-all     # Recalculate all scores (overwrite)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { SageProperty, parseCoordinates, isInUSAOrCanada } from '../lib/types/sage';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'sage-glamping-data';
const BATCH_SIZE = 100; // Update in batches for performance

// Initialize Supabase client
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Validate state code format
 */
function isValidStateCode(state: string | null | undefined): boolean {
  if (!state || state.trim() === '') return false;
  
  const stateUpper = state.toUpperCase().trim();
  
  // Valid US states (2-letter codes)
  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];
  
  // Valid Canadian provinces (2-letter codes)
  const canadianProvinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
  
  return usStates.includes(stateUpper) || canadianProvinces.includes(stateUpper);
}

/**
 * Validate URL format
 */
function isValidURL(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false;
  
  const trimmed = url.trim();
  
  // Check for placeholder text
  const lower = trimmed.toLowerCase();
  if (lower === 'not available' || lower === 'unavailable' || lower === 'n/a' || lower === 'na') {
    return false;
  }
  
  try {
    const urlObj = new URL(trimmed);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate ZIP code format
 */
function isValidZIPCode(zip: string | null | undefined, country: string | null | undefined): boolean {
  if (!zip || zip.trim() === '') return false;
  
  const trimmed = zip.trim();
  const lower = trimmed.toLowerCase();
  
  // Check for placeholder text
  if (lower === 'not available' || lower === 'unavailable' || lower === 'n/a' || lower === 'na') {
    return false;
  }
  
  // US ZIP codes: 5 digits or 5+4 format
  if (country === 'USA' || !country) {
    return /^\d{5}(-\d{4})?$/.test(trimmed);
  }
  
  // Canadian postal codes: A1A 1A1 format (with or without space)
  if (country === 'Canada') {
    return /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i.test(trimmed);
  }
  
  return true; // Unknown country format, assume valid if not placeholder
}

/**
 * Check if text contains placeholder
 */
function hasPlaceholderText(value: string | null | undefined): boolean {
  if (!value || value.trim() === '') return false;
  
  const lower = value.trim().toLowerCase();
  return lower === 'not available' || lower === 'unavailable' || lower === 'n/a' || lower === 'na';
}

/**
 * Validate coordinates
 */
function isValidCoordinate(lat: number | string | null, lon: number | string | null): boolean {
  if (lat === null || lon === null || lat === undefined || lon === undefined) return false;
  
  const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const longitude = typeof lon === 'number' ? lon : parseFloat(String(lon));
  
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  
  return true;
}

/**
 * Calculate quality score for a property (1-100)
 */
function calculateQualityScore(property: SageProperty): number {
  let score = 0;
  let penalties = 0;

  // A. Core Identity Fields (25 points)
  if (property.property_name && String(property.property_name).trim().length > 0) {
    score += 10;
  }
  
  if (property.slug && String(property.slug).trim().length > 0) {
    score += 5;
  }
  
  if (property.property_type && String(property.property_type).trim().length > 0) {
    score += 5;
  }
  
  if (property.unit_type && String(property.unit_type).trim().length > 0) {
    score += 5;
  }

  // B. Location Data (30 points)
  if (property.city && String(property.city).trim().length > 0) {
    score += 5;
  }
  
  if (property.state) {
    const stateTrimmed = String(property.state).trim();
    if (isValidStateCode(stateTrimmed)) {
      score += 5;
    } else if (stateTrimmed.length > 0) {
      penalties += 2; // Invalid state code
    }
  }
  
  if (property.country && String(property.country).trim().length > 0) {
    score += 5;
  }
  
  const addressStr = property.address ? String(property.address) : '';
  if (addressStr.trim().length > 0 && !hasPlaceholderText(addressStr)) {
    score += 8;
  } else if (hasPlaceholderText(addressStr)) {
    penalties += 1; // Placeholder text penalty
  }
  
  // Coordinates validation
  const coords = parseCoordinates(property.lat, property.lon);
  if (coords && isValidCoordinate(coords[0], coords[1])) {
    score += 7;
    // Check if coordinates are within USA/Canada bounds
    if (!isInUSAOrCanada(coords[0], coords[1])) {
      penalties += 2; // Outside bounds
    }
  } else if ((property.lat && property.lat.toString().trim() !== '') || 
             (property.lon && property.lon.toString().trim() !== '')) {
    // Coordinates exist but are invalid
    penalties += 3; // Invalid coordinates
  }

  // C. Contact & Information (20 points)
  const url = property.url || property.google_website_uri;
  const urlStr = url ? String(url) : null;
  if (urlStr && isValidURL(urlStr)) {
    score += 8;
  } else if (urlStr && urlStr.trim().length > 0) {
    if (hasPlaceholderText(urlStr)) {
      penalties += 1;
    } else {
      penalties += 2; // Invalid URL format
    }
  }
  
  // Description scoring (graded by length)
  const descriptionStr = property.description ? String(property.description) : '';
  if (descriptionStr.trim().length > 0) {
    const descLength = descriptionStr.trim().length;
    if (descLength >= 100) {
      score += 7; // Full points for 100+ characters
    } else if (descLength >= 50) {
      score += 4; // Partial points for 50-99 characters
    } else {
      score += 2; // Minimal points for < 50 characters
    }
  }
  
  const phoneNumber = property.phone_number || property.google_phone_number;
  if (phoneNumber && String(phoneNumber).trim().length > 0) {
    score += 5;
  }

  // D. Property Details (15 points)
  const quantityOfUnits = property.quantity_of_units ? String(property.quantity_of_units).trim() : '';
  if (quantityOfUnits.length > 0) {
    score += 3;
  }
  
  const yearOpened = property.year_site_opened ? String(property.year_site_opened).trim() : '';
  if (yearOpened.length > 0) {
    score += 2;
  }
  
  if (property.operating_season_months && String(property.operating_season_months).trim().length > 0) {
    score += 3;
  }
  
  const minNights = property.minimum_nights ? String(property.minimum_nights).trim() : '';
  if (minNights.length > 0) {
    score += 2;
  }
  
  if (property.getting_there && String(property.getting_there).trim().length > 0) {
    score += 2;
  }
  
  if (property.site_name && String(property.site_name).trim().length > 0) {
    score += 3;
  }

  // E. Google Places Data Enhancement (10 points)
  if (property.google_rating !== null && property.google_rating !== undefined) {
    score += 3;
  }
  
  if (property.google_business_status === 'OPERATIONAL') {
    score += 2;
  }
  
  if (property.google_photos && Array.isArray(property.google_photos) && property.google_photos.length > 0) {
    score += 2;
  }
  
  if (property.google_opening_hours && 
      (property.google_opening_hours.weekdayDescriptions?.length > 0 || 
       property.google_opening_hours.periods?.length > 0)) {
    score += 1;
  }
  
  if (property.google_description && String(property.google_description).trim().length > 0) {
    score += 1;
  }
  
  if (property.google_phone_number && String(property.google_phone_number).trim().length > 0) {
    score += 1;
  }

  // Additional accuracy penalties
  const zipCodeStr = property.zip_code ? String(property.zip_code) : null;
  if (zipCodeStr) {
    if (hasPlaceholderText(zipCodeStr)) {
      penalties += 1;
    } else {
      const countryStr = property.country ? String(property.country) : null;
      if (!isValidZIPCode(zipCodeStr, countryStr)) {
        penalties += 1; // Invalid ZIP format
      }
    }
  }

  // Check for placeholder text in other fields
  const fieldsToCheck = [
    property.address ? String(property.address) : null,
    property.url ? String(property.url) : null,
    property.google_website_uri ? String(property.google_website_uri) : null,
    zipCodeStr,
    property.lat ? String(property.lat) : null,
    property.lon ? String(property.lon) : null,
  ];
  
  fieldsToCheck.forEach(field => {
    if (field && hasPlaceholderText(field)) {
      penalties += 1;
    }
  });

  // Calculate final score (capped between 1 and 100)
  const finalScore = Math.max(1, Math.min(100, score - penalties));
  return Math.round(finalScore);
}

/**
 * Fetch all properties from database
 */
async function fetchAllProperties(
  skipExisting: boolean = false,
  limit?: number
): Promise<SageProperty[]> {
  console.log('📥 Fetching properties from database...\n');

  let allProperties: SageProperty[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (skipExisting) {
      query = query.is('quality_score', null);
    }

    if (limit && allProperties.length + batchSize > limit) {
      const remaining = limit - allProperties.length;
      query = query.limit(remaining);
      hasMore = false;
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching properties: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    allProperties = allProperties.concat(data as SageProperty[]);
    offset += batchSize;
    hasMore = data.length === batchSize && (!limit || allProperties.length < limit);

    if (hasMore) {
      console.log(`  Fetched ${allProperties.length} properties so far...`);
    }
  }

  console.log(`✅ Fetched ${allProperties.length} total properties\n`);
  return allProperties;
}

/**
 * Update quality scores in batches
 */
async function updateQualityScores(
  properties: Array<{ id: number; quality_score: number }>
): Promise<void> {
  console.log(`💾 Updating quality scores in batches of ${BATCH_SIZE}...\n`);

  let updatedCount = 0;
  let errorCount = 0;

  // Process in batches
  for (let i = 0; i < properties.length; i += BATCH_SIZE) {
    const batch = properties.slice(i, i + BATCH_SIZE);
    
    // Update each property in the batch (Supabase doesn't support batch updates with different values easily)
    // Using Promise.all for concurrent updates within batch
    const updatePromises = batch.map(async (prop) => {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ quality_score: prop.quality_score })
        .eq('id', prop.id);

      if (error) {
        console.error(`  ❌ Error updating property ID ${prop.id}: ${error.message}`);
        return { success: false };
      }
      return { success: true };
    });

    const results = await Promise.all(updatePromises);
    
    results.forEach(result => {
      if (result.success) {
        updatedCount++;
      } else {
        errorCount++;
      }
    });

    // Progress update
    if ((i + BATCH_SIZE) % (BATCH_SIZE * 10) === 0 || (i + BATCH_SIZE) >= properties.length) {
      console.log(`  Updated ${updatedCount}/${properties.length} properties...`);
    }
  }

  console.log(`\n✅ Updated ${updatedCount} properties`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} errors occurred`);
  }
  console.log();
}

/**
 * Calculate summary statistics
 */
function calculateStatistics(scores: number[]): {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  distribution: Array<{ range: string; count: number; percentage: number }>;
} {
  if (scores.length === 0) {
    return {
      total: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      distribution: [],
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const sum = scores.reduce((acc, score) => acc + score, 0);
  const average = sum / scores.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  // Distribution by ranges
  const ranges = [
    { label: '1-20 (Poor)', min: 1, max: 20 },
    { label: '21-40 (Fair)', min: 21, max: 40 },
    { label: '41-60 (Good)', min: 41, max: 60 },
    { label: '61-80 (Very Good)', min: 61, max: 80 },
    { label: '81-100 (Excellent)', min: 81, max: 100 },
  ];

  const distribution = ranges.map(range => {
    const count = scores.filter(s => s >= range.min && s <= range.max).length;
    return {
      range: range.label,
      count,
      percentage: (count / scores.length) * 100,
    };
  });

  return {
    total: scores.length,
    average: Math.round(average * 10) / 10,
    median: Math.round(median * 10) / 10,
    min,
    max,
    distribution,
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const skipExisting = args.includes('--skip-existing');
  const updateAll = args.includes('--update-all');

  console.log('='.repeat(70));
  console.log('Calculate Quality Scores for Properties');
  console.log('='.repeat(70));
  console.log();

  try {
    // Determine mode
    if (skipExisting) {
      console.log('📋 Mode: Calculate scores only for properties without scores\n');
    } else if (updateAll) {
      console.log('🔄 Mode: Recalculate all scores (overwrite existing)\n');
    } else {
      console.log('📋 Mode: Calculate scores for all properties\n');
    }

    // Fetch properties
    const properties = await fetchAllProperties(skipExisting);

    if (properties.length === 0) {
      console.log('✅ No properties found to process');
      if (skipExisting) {
        console.log('   All properties already have quality scores!');
      }
      return;
    }

    // Calculate scores
    console.log('🧮 Calculating quality scores...\n');
    const propertiesWithScores: Array<{ id: number; quality_score: number; property_name: string | null }> = [];
    
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const score = calculateQualityScore(property);
      propertiesWithScores.push({
        id: property.id,
        quality_score: score,
        property_name: property.property_name,
      });

      if ((i + 1) % 100 === 0) {
        console.log(`  Calculated scores for ${i + 1}/${properties.length} properties...`);
      }
    }

    console.log(`✅ Calculated scores for ${propertiesWithScores.length} properties\n`);

    // Show sample scores
    console.log('📊 Sample Quality Scores:\n');
    const sortedSamples = [...propertiesWithScores]
      .sort((a, b) => b.quality_score - a.quality_score)
      .slice(0, 10);
    
    sortedSamples.forEach((prop, idx) => {
      console.log(`  ${idx + 1}. ${prop.property_name || 'Unknown'} - Score: ${prop.quality_score}/100`);
    });
    console.log();

    // Calculate statistics
    const scores = propertiesWithScores.map(p => p.quality_score);
    const stats = calculateStatistics(scores);

    console.log('📊 QUALITY SCORE STATISTICS\n');
    console.log(`Total Properties: ${stats.total}`);
    console.log(`Average Score: ${stats.average}/100`);
    console.log(`Median Score: ${stats.median}/100`);
    console.log(`Min Score: ${stats.min}/100`);
    console.log(`Max Score: ${stats.max}/100`);
    console.log();

    console.log('Score Distribution:');
    stats.distribution.forEach(dist => {
      const bar = '█'.repeat(Math.round(dist.percentage / 2));
      console.log(`  ${dist.range.padEnd(25)} ${dist.count.toString().padStart(4)} (${dist.percentage.toFixed(1)}%) ${bar}`);
    });
    console.log();

    // Update database
    await updateQualityScores(propertiesWithScores);

    console.log('='.repeat(70));
    console.log('✅ Process Complete!');
    console.log('='.repeat(70));
    console.log();
    console.log(`Total properties processed: ${propertiesWithScores.length}`);
    console.log(`Average quality score: ${stats.average}/100`);
    console.log();
    
    if (stats.average >= 70) {
      console.log('🎉 Excellent! Average data quality is high.');
    } else if (stats.average >= 50) {
      console.log('👍 Good data quality overall.');
    } else {
      console.log('⚠️  Consider improving data quality for better scores.');
    }

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
