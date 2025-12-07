#!/usr/bin/env npx tsx
/**
 * Research glamping properties from AFAR article and add to CSV
 * 
 * This script:
 * - Fetches content from AFAR article URL
 * - Uses OpenAI API to extract glamping property information
 * - Compares against existing CSV file
 * - Checks against sage-glamping-data database for duplicates
 * - Uses OpenAI to enrich property data with detailed information
 * - Appends new unique properties to CSV file
 * 
 * Usage:
 *   npx tsx scripts/research-afar-glamping-properties.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
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

const AFAR_URL = 'https://www.afar.com/hotels/best-places-to-go-glamping';
const CSV_FILE = 'csv/glamping-com-north-america-missing-properties.csv';
const TABLE_NAME = 'sage-glamping-data';
const ARTICLE_TEXT_FILE = 'temp/afar-article-text.txt'; // Optional: manually saved article text

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
const DELAY_BETWEEN_AI_CALLS = 2000; // 2 seconds between OpenAI API calls

interface PropertyData {
  property_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  url?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  unit_type?: string;
  property_type?: string;
  phone_number?: string;
  site_name?: string;
  amenities?: string[];
  [key: string]: any;
}

interface CSVRow {
  [key: string]: string;
}

/**
 * Fetch content from URL
 */
async function fetchUrlContent(url: string): Promise<string> {
  try {
    console.log(`📥 Fetching content from: ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to read from saved file if fetch fails
      const savedFile = 'temp/afar-article.html';
      if (fs.existsSync(savedFile)) {
        console.log(`⚠️  Fetch failed (${response.status}), trying to read from saved file: ${savedFile}`);
        const savedContent = fs.readFileSync(savedFile, 'utf-8');
        console.log(`✅ Read ${savedContent.length} characters from saved file\n`);
        return savedContent;
      }
      throw new Error(`HTTP error! status: ${response.status}. You can save the page HTML to temp/afar-article.html as a fallback.`);
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters of HTML\n`);
    
    // Save to temp file for future use
    const tempDir = 'temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(`${tempDir}/afar-article.html`, html, 'utf-8');
    console.log(`💾 Saved HTML to temp/afar-article.html for future use\n`);
    
    return html;
  } catch (error) {
    // Try to read from saved file if fetch fails
    const savedFile = 'temp/afar-article.html';
    if (fs.existsSync(savedFile)) {
      console.log(`⚠️  Fetch error, trying to read from saved file: ${savedFile}`);
      const savedContent = fs.readFileSync(savedFile, 'utf-8');
      console.log(`✅ Read ${savedContent.length} characters from saved file\n`);
      return savedContent;
    }
    
    if (error instanceof Error) {
      throw new Error(`Failed to fetch URL: ${error.message}. You can save the page HTML to temp/afar-article.html as a fallback.`);
    }
    throw new Error('Failed to fetch URL: Unknown error');
  }
}

/**
 * Extract text content from HTML
 */
function extractTextContent(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $('script, style, noscript, iframe, embed, object').remove();
  
  // Get main content - try various selectors
  let content = '';
  
  // Try common article/content selectors
  const selectors = [
    'article',
    '[role="main"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    'main',
    '.content',
    'body'
  ];
  
  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      content = elements.text();
      if (content.length > 500) {
        break;
      }
    }
  }
  
  // If no good content found, use body text
  if (content.length < 500) {
    content = $('body').text();
  }
  
  // Clean up whitespace
  content = content.replace(/\s+/g, ' ').trim();
  
  return content;
}

/**
 * Extract properties directly from URL using OpenAI (when we can't fetch HTML)
 */
async function extractPropertiesDirectlyFromURL(url: string): Promise<PropertyData[]> {
  console.log('🤖 Using OpenAI to extract properties from URL...\n');

  const prompt = `You are researching glamping properties from an AFAR magazine article. The article URL is: ${url}

This article is titled something like "15 Best Glamping Resorts Around the World" or "Best Places to Go Glamping". 

I need you to extract ALL glamping properties mentioned in this article that are located in North America (United States and Canada only). Please use your knowledge of this specific AFAR article or search for information about glamping properties featured in AFAR magazine articles.

For each glamping property/resort mentioned in the article that is in North America, provide:
- property_name (required): The exact name of the property/resort as mentioned
- city (optional): City where it's located
- state (optional): State/province abbreviation (2 letters for US, full for Canadian provinces)
- country (optional): "USA" or "Canada"
- address (optional): Full street address if known
- url (optional): Official website URL if you can find it
- description (optional): Brief description of what makes this property special (from the article)
- unit_type (optional): Types of accommodations offered (e.g., "yurts", "tents", "cabins", "treehouses", "Airstreams", "safari tents")
- property_type (optional): Type of property (e.g., "Glamping Resort", "Luxury Campground", "Boutique Camping")

Be VERY thorough - this article likely mentions 10-15 properties total, and I need ALL of the North American ones. Common glamping properties in AFAR articles include places like Under Canvas, Collective Retreats, AutoCamp, El Cosmico, and many others.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "ST",
      "country": "USA",
      "url": "https://example.com",
      "description": "Brief description from article...",
      "unit_type": "tents, yurts",
      "property_type": "Glamping Resort"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more accurate extraction
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e}`);
    }

    // Extract properties array from response
    let properties: PropertyData[] = [];
    if (parsed.properties && Array.isArray(parsed.properties)) {
      properties = parsed.properties;
    } else if (Array.isArray(parsed)) {
      properties = parsed;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      properties = parsed.data;
    } else {
      // Try to find any array in the object
      for (const key in parsed) {
        if (Array.isArray(parsed[key])) {
          properties = parsed[key];
          break;
        }
      }
    }

    // Filter out properties without names and validate data
    properties = properties
      .filter(p => p && p.property_name && p.property_name.trim().length > 0)
      .map(p => ({
        ...p,
        property_name: p.property_name.trim(),
        city: p.city?.trim() || undefined,
        state: p.state?.trim()?.toUpperCase() || undefined,
        country: p.country?.trim() || 'USA',
      }));

    console.log(`✅ Extracted ${properties.length} properties from URL\n`);
    return properties;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error from OpenAI API');
  }
}

/**
 * Enrich property data using OpenAI
 */
async function enrichPropertyData(property: PropertyData): Promise<PropertyData> {
  console.log(`  🤖 Enriching data for: ${property.property_name}`);

  const prompt = `Research and provide detailed information about this glamping property:

Property Name: ${property.property_name}
City: ${property.city || 'Unknown'}
State: ${property.state || 'Unknown'}
Country: ${property.country || 'USA'}

Provide a JSON object with as much detail as possible:
- property_name: Keep the original name
- city: City name
- state: State abbreviation (2 letters)
- country: Country name (USA or Canada)
- address: Full street address if you can find it
- zip_code: ZIP/postal code if available
- url: Official website URL
- description: 3-5 sentence description of the property, amenities, and what makes it special
- unit_type: Types of accommodations (comma-separated, e.g., "yurts, tents, cabins")
- property_type: Type of property (e.g., "Glamping Resort", "Luxury Campground")
- phone_number: Phone number if available
- latitude: Approximate latitude if known (number)
- longitude: Approximate longitude if known (number)
- amenities: Array of key amenities (e.g., ["wifi", "hot tub", "fire pit", "bathroom", "kitchen"])

Focus on North American properties. If you cannot find specific information, use null or omit the field.

Return ONLY valid JSON object, no other text.`;

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
      temperature: 0.5,
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.log(`    ⚠️  No enriched data returned, using original data`);
      return property;
    }

    const enriched = JSON.parse(content);
    
    // Merge with original property data (original takes precedence for name)
    const merged: PropertyData = {
      ...enriched,
      property_name: property.property_name || enriched.property_name, // Keep original name
    };

    console.log(`    ✅ Enriched with ${Object.keys(merged).length} fields`);
    return merged;
  } catch (error) {
    console.log(`    ⚠️  Error enriching data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return property; // Return original if enrichment fails
  }
}

/**
 * Read existing CSV file
 */
function readCSVFile(filePath: string): CSVRow[] {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  CSV file does not exist: ${filePath}`);
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows: CSVRow[] = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    return rows;
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

/**
 * Get all property names from database
 */
async function getDatabasePropertyNames(): Promise<Set<string>> {
  console.log('📥 Fetching property names from database...\n');

  const propertyNames = new Set<string>();
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('property_name')
      .not('property_name', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Error fetching from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    data.forEach((row: any) => {
      const name = row.property_name?.trim();
      if (name) {
        propertyNames.add(name.toLowerCase());
      }
    });

    offset += batchSize;
    hasMore = data.length === batchSize;

    if (hasMore) {
      console.log(`  Fetched ${propertyNames.size} property names so far...`);
    }
  }

  console.log(`✅ Found ${propertyNames.size} unique property names in database\n`);
  return propertyNames;
}

/**
 * Normalize property name for comparison
 */
function normalizePropertyName(name: string): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(/-/g, ' ');
  normalized = normalized.replace(/\([^)]*\)/g, '');
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');
  
  return normalized.trim();
}

/**
 * Check if property exists in CSV or database
 */
function propertyExists(
  property: PropertyData,
  csvProperties: Set<string>,
  dbProperties: Set<string>
): { exists: boolean; location: 'csv' | 'database' | null } {
  const normalizedName = normalizePropertyName(property.property_name);
  
  // Check CSV
  for (const csvName of csvProperties) {
    if (normalizePropertyName(csvName) === normalizedName) {
      return { exists: true, location: 'csv' };
    }
    // Also check for partial matches
    if (normalizedName.length > 5 && csvName.toLowerCase().includes(normalizedName) || 
        normalizedName.includes(csvName.toLowerCase())) {
      return { exists: true, location: 'csv' };
    }
  }
  
  // Check database
  if (dbProperties.has(normalizedName)) {
    return { exists: true, location: 'database' };
  }
  
  // Check for partial matches in database
  for (const dbName of dbProperties) {
    if (normalizedName.length > 5 && (
      dbName.includes(normalizedName) || 
      normalizedName.includes(dbName)
    )) {
      return { exists: true, location: 'database' };
    }
  }
  
  return { exists: false, location: null };
}

/**
 * Convert PropertyData to CSV row format
 */
function propertyToCSVRow(property: PropertyData, source: string = 'AFAR', headers: string[]): CSVRow {
  const today = new Date().toISOString().split('T')[0];
  
  // Create row with all columns, defaulting to empty string
  const row: CSVRow = {};
  headers.forEach(header => {
    row[header] = '';
  });
  
  // Map property data to CSV columns
  if (headers.includes('Source')) row['Source'] = source;
  if (headers.includes('Property Name')) row['Property Name'] = property.property_name || '';
  if (headers.includes('Site Name')) row['Site Name'] = property.site_name || '';
  if (headers.includes('Unit Type')) row['Unit Type'] = property.unit_type || '';
  if (headers.includes('Property Type')) row['Property Type'] = property.property_type || '';
  if (headers.includes('Address')) row['Address'] = property.address || '';
  if (headers.includes('City')) row['City'] = property.city || '';
  if (headers.includes('State')) row['State'] = property.state || '';
  if (headers.includes('Zip Code')) row['Zip Code'] = property.zip_code || '';
  if (headers.includes('Country')) row['Country'] = property.country || 'USA';
  if (headers.includes('Url')) row['Url'] = property.url || '';
  if (headers.includes('Description')) row['Description'] = property.description || '';
  if (headers.includes('Latitude')) row['Latitude'] = property.latitude?.toString() || '';
  if (headers.includes('Longitude')) row['Longitude'] = property.longitude?.toString() || '';
  if (headers.includes('Date Added')) row['Date Added'] = today;
  if (headers.includes('Date Updated')) row['Date Updated'] = '';
  
  // Map amenities if available
  if (property.amenities && Array.isArray(property.amenities)) {
    const amenityMap: { [key: string]: string } = {
      'wifi': 'Wifi',
      'campfire': 'Campfires',
      'fire pit': 'Campfires',
      'toilet': 'Toilet',
      'bathroom': 'Toilet',
      'shower': 'Shower',
      'pets': 'Pets',
      'pet friendly': 'Pets',
      'water': 'Water',
      'kitchen': 'Cooking equipment',
      'hot tub': 'Hot Tub',
      'picnic table': 'Picnic Table',
    };
    
    property.amenities.forEach(amenity => {
      const lowerAmenity = amenity.toLowerCase();
      for (const [key, column] of Object.entries(amenityMap)) {
        if (lowerAmenity.includes(key) && headers.includes(column)) {
          row[column] = 'Yes';
        }
      }
    });
  }
  
  return row;
}

/**
 * Append properties to CSV file
 */
function appendToCSV(properties: PropertyData[], source: string = 'AFAR'): void {
  console.log(`\n📝 Appending ${properties.length} properties to CSV file...\n`);
  
  // Read existing CSV
  const existingRows = readCSVFile(CSV_FILE);
  
  // Get headers
  const headers = existingRows.length > 0 
    ? Object.keys(existingRows[0])
    : [
        'Source', 'Property Name', 'Site Name', 'Unit Type', 'Property Type',
        'Property: Total Sites', 'Quantity of Units', 'Unit Guest Capacity',
        'Year Site Opened', 'Operating Season (months)', '# of Locations',
        'Address', 'City', 'State', 'Zip Code', 'Country',
        'Occupancy rate 2023', 'Retail Daily Rate 2024', 'Retail Daily Rate(+fees) 2024',
        'Occupancy rate 2024', 'RavPAR 2024',
        '2024 - Fall Weekday', '2024 - Fall Weekend',
        '2025 - Winter Weekday', '2025 - Winter Weekend',
        '2025 - Spring Weekday', '2025 - Spring Weekend',
        '2025 - Summer Weekday', '2025 - Summer Weekend',
        'INTERNAL NOTES ONLY,', 'Url', 'Description', 'Getting there',
        'Latitude', 'Longitude',
        'Campfires', 'Toilet', 'Pets', 'Water', 'Shower', 'Trash',
        'Cooking equipment', 'Picnic Table', 'Wifi', 'Laundry', 'Hot Tub', 'Playground',
        'RV - Vehicle Length', 'RV - Parking', 'RV - Accommodates Slideout',
        'RV - Surface Type', 'RV - Surface level',
        'RV - Vehicles: Fifth Wheels', 'RV - Vehicles: Class A RVs',
        'RV - Vehicles: Class B RVs', 'RV - Vehicles: Class C RVs',
        'RV - Vehicles: Toy Hauler',
        'Date Added', 'Date Updated'
      ];
  
  // Convert properties to CSV rows
  const newRows: CSVRow[] = properties.map(property => propertyToCSVRow(property, source, headers));
  
  // Combine existing and new rows
  const allRows = [...existingRows, ...newRows];
  
  // Write to CSV file
  const csvContent = stringify(allRows, {
    header: true,
    columns: headers,
  });
  
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
  
  console.log(`✅ Successfully appended ${properties.length} properties to ${CSV_FILE}`);
  console.log(`   Total properties in CSV: ${allRows.length}\n`);
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Research AFAR Glamping Properties');
  console.log('='.repeat(70));
  console.log();

  try {
    // Step 1: Fetch article content
    let articleContent: string;
    let extractedProperties: PropertyData[];
    
    // Check if we have manually saved article text
    if (fs.existsSync(ARTICLE_TEXT_FILE)) {
      console.log(`📄 Found manually saved article text: ${ARTICLE_TEXT_FILE}\n`);
      articleContent = fs.readFileSync(ARTICLE_TEXT_FILE, 'utf-8');
      console.log(`✅ Read ${articleContent.length} characters from saved file\n`);
      extractedProperties = await extractPropertiesFromArticle(articleContent);
    } else {
      // Try to extract directly from URL using OpenAI first
      console.log('🌐 Attempting to extract properties directly from URL using OpenAI...\n');
      console.log('💡 Tip: If this doesn\'t find all properties, you can manually save the article text to:', ARTICLE_TEXT_FILE, '\n');
      
      try {
        extractedProperties = await extractPropertiesDirectlyFromURL(AFAR_URL);
        console.log(`✅ Extracted ${extractedProperties.length} properties directly from URL\n`);
      } catch (urlError) {
        console.log(`⚠️  Direct URL extraction failed: ${urlError instanceof Error ? urlError.message : 'Unknown error'}\n`);
        console.log('📥 Trying to fetch HTML content...\n');
        
        // Fallback: fetch HTML and extract
        try {
          const html = await fetchUrlContent(AFAR_URL);
          articleContent = extractTextContent(html);
          
          if (articleContent.length < 500) {
            throw new Error('Extracted article content is too short');
          }
          
          console.log(`✅ Extracted ${articleContent.length} characters of article content\n`);

          // Extract properties from article using OpenAI
          extractedProperties = await extractPropertiesFromArticle(articleContent);
        } catch (fetchError) {
          console.error(`❌ Failed to fetch article: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}\n`);
          console.log(`💡 Alternative: Save the article text manually to: ${ARTICLE_TEXT_FILE}\n`);
          throw fetchError;
        }
      }
    }
    
    if (extractedProperties.length === 0) {
      console.log('⚠️  No properties extracted from article');
      return;
    }

    // Step 3: Read existing CSV and database properties
    console.log('📋 Checking for existing properties...\n');
    const csvRows = readCSVFile(CSV_FILE);
    const csvPropertyNames = new Set(
      csvRows
        .map(row => row['Property Name']?.trim())
        .filter((name): name is string => !!name)
    );
    
    const dbPropertyNames = await getDatabasePropertyNames();

    // Step 4: Filter out existing properties
    console.log('🔍 Filtering out existing properties...\n');
    const newProperties: PropertyData[] = [];
    
    for (const property of extractedProperties) {
      const exists = propertyExists(property, csvPropertyNames, dbPropertyNames);
      
      if (exists.exists) {
        console.log(`  ✗ SKIP: ${property.property_name} (exists in ${exists.location})`);
      } else {
        console.log(`  ✓ NEW: ${property.property_name}`);
        newProperties.push(property);
      }
    }

    console.log(`\n📊 Found ${newProperties.length} new properties out of ${extractedProperties.length} total\n`);

    if (newProperties.length === 0) {
      console.log('✅ All properties already exist in CSV or database!');
      return;
    }

    // Step 5: Enrich property data using OpenAI
    console.log('🔍 Enriching property data with OpenAI...\n');
    const enrichedProperties: PropertyData[] = [];
    
    for (let i = 0; i < newProperties.length; i++) {
      const property = newProperties[i];
      console.log(`[${i + 1}/${newProperties.length}] ${property.property_name}`);
      
      try {
        const enriched = await enrichPropertyData(property);
        enrichedProperties.push(enriched);
        console.log();
      } catch (error) {
        console.log(`  ⚠️  Error, using original data: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        enrichedProperties.push(property);
      }
    }

    // Step 6: Append to CSV
    if (enrichedProperties.length > 0) {
      appendToCSV(enrichedProperties, 'AFAR');
      console.log('✅ Process complete!');
    } else {
      console.log('⚠️  No properties to add');
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
