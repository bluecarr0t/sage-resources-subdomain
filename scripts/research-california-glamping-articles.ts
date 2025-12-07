#!/usr/bin/env npx tsx
/**
 * Research glamping properties from multiple California glamping articles and add to CSV
 * 
 * This script:
 * - Fetches content from multiple article URLs about California glamping
 * - Uses OpenAI API to extract glamping property information from each article
 * - Compares against existing CSV file
 * - Checks against sage-glamping-data database for duplicates
 * - Uses OpenAI to enrich property data with detailed information
 * - Appends new unique properties to CSV file
 * 
 * Usage:
 *   npx tsx scripts/research-california-glamping-articles.ts
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

// Multiple article URLs to process
const ARTICLE_URLS = [
  {
    url: 'https://www.outdoorsy.com/blog/glamping-southern-california',
    source: 'Outdoorsy',
    description: 'Glamping in Southern California'
  },
  {
    url: 'https://www.sunset.com/travel/outdoor-adventure/yurt-camping#autocamp-russian-river',
    source: 'Sunset Magazine',
    description: 'Yurt camping in California'
  },
  {
    url: 'https://www.latimes.com/travel/list/glamping-los-angeles-ventura-joshua-tree-catalina-big-bear',
    source: 'LA Times',
    description: 'Glamping in Los Angeles, Ventura, Joshua Tree, Catalina, Big Bear'
  },
  {
    url: 'https://www.travelandleisure.com/trip-ideas/nature-travel/best-places-to-go-glamping-in-california',
    source: 'Travel + Leisure',
    description: 'Best places to go glamping in California'
  }
];

const CSV_FILE = 'csv/glamping-com-north-america-missing-properties.csv';
const TABLE_NAME = 'sage-glamping-data';

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
const DELAY_BETWEEN_ARTICLES = 3000; // 3 seconds between articles

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

interface ArticleInfo {
  url: string;
  source: string;
  description: string;
}

/**
 * Sleep/delay function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      const urlSlug = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const savedFile = `temp/article-${urlSlug}.html`;
      if (fs.existsSync(savedFile)) {
        console.log(`⚠️  Fetch failed (${response.status}), trying to read from saved file: ${savedFile}`);
        const savedContent = fs.readFileSync(savedFile, 'utf-8');
        console.log(`✅ Read ${savedContent.length} characters from saved file\n`);
        return savedContent;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters of HTML\n`);
    
    // Save to temp file for future use
    const tempDir = 'temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const urlSlug = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    fs.writeFileSync(`${tempDir}/article-${urlSlug}.html`, html, 'utf-8');
    
    return html;
  } catch (error) {
    // Try to read from saved file if fetch fails
    const urlSlug = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const savedFile = `temp/article-${urlSlug}.html`;
    if (fs.existsSync(savedFile)) {
      console.log(`⚠️  Fetch error, trying to read from saved file: ${savedFile}`);
      const savedContent = fs.readFileSync(savedFile, 'utf-8');
      console.log(`✅ Read ${savedContent.length} characters from saved file\n`);
      return savedContent;
    }
    
    if (error instanceof Error) {
      throw new Error(`Failed to fetch URL: ${error.message}`);
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
    '.story-body',
    '.article-body',
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
    $('nav, header, footer, aside, .nav, .navigation, .sidebar, .footer, .header').remove();
    content = $('body').text();
  }
  
  // Clean up whitespace
  content = content.replace(/\s+/g, ' ').trim();
  
  return content;
}

/**
 * Extract glamping properties from article using OpenAI
 */
async function extractPropertiesFromArticle(
  articleContent: string,
  articleInfo: ArticleInfo
): Promise<PropertyData[]> {
  console.log(`🤖 Using OpenAI to extract glamping properties from ${articleInfo.source} article...\n`);

  const prompt = `Extract all glamping resort/campground/property information from the following article about glamping in California.

Article Source: ${articleInfo.source}
Article URL: ${articleInfo.url}
Article Description: ${articleInfo.description}

Return a JSON object with a "properties" array containing one object for each glamping property mentioned in the article. Each property object should have:
- property_name (required): The name of the property/resort
- city (optional): City where it's located
- state (optional): State abbreviation (should be "CA" for California)
- country (optional): Country (default to "USA")
- address (optional): Full street address if mentioned
- url (optional): Website URL if mentioned
- description (optional): Brief description of the property from the article
- unit_type (optional): Types of accommodations (e.g., "yurts", "tents", "cabins", "treehouses", "Airstreams", "safari tents")
- property_type (optional): Type of property (e.g., "Glamping Resort", "Campground", "Luxury Camping")

Be thorough and extract ALL properties mentioned. Focus on properties in California, USA.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "CA",
      "country": "USA",
      "url": "https://example.com",
      "description": "Brief description..."
    }
  ]
}

Article content:
${articleContent.substring(0, 50000)}`; // Limit to 50k chars to avoid token limits

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
        state: p.state?.trim()?.toUpperCase() || 'CA',
        country: p.country?.trim() || 'USA',
      }));

    console.log(`✅ Extracted ${properties.length} properties from ${articleInfo.source} article\n`);
    return properties;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error from OpenAI API');
  }
}

/**
 * Extract properties directly from URL using OpenAI (when we can't fetch HTML)
 */
async function extractPropertiesDirectlyFromURL(articleInfo: ArticleInfo): Promise<PropertyData[]> {
  console.log(`🤖 Using OpenAI to extract properties from ${articleInfo.source} URL...\n`);

  const prompt = `Extract all glamping resort/campground/property information from this article about glamping in California:

Article URL: ${articleInfo.url}
Article Source: ${articleInfo.source}
Article Description: ${articleInfo.description}

This article is about glamping properties in California. Extract ALL glamping properties mentioned that are located in California, USA.

For each glamping property/resort mentioned, provide:
- property_name (required): The exact name of the property/resort
- city (optional): City in California where it's located
- state (optional): Should be "CA"
- country (optional): "USA"
- address (optional): Full street address if known
- url (optional): Official website URL if you can find it
- description (optional): Brief description of what makes this property special
- unit_type (optional): Types of accommodations (e.g., "yurts", "tents", "cabins", "treehouses", "Airstreams")
- property_type (optional): Type of property (e.g., "Glamping Resort", "Luxury Campground")

Be VERY thorough - extract ALL properties mentioned in the article that are in California.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "CA",
      "country": "USA",
      "url": "https://example.com",
      "description": "Brief description..."
    }
  ]
}`;

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
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    let properties: PropertyData[] = [];
    
    if (parsed.properties && Array.isArray(parsed.properties)) {
      properties = parsed.properties;
    } else if (Array.isArray(parsed)) {
      properties = parsed;
    }

    properties = properties
      .filter(p => p && p.property_name && p.property_name.trim().length > 0)
      .map(p => ({
        ...p,
        property_name: p.property_name.trim(),
        city: p.city?.trim() || undefined,
        state: p.state?.trim()?.toUpperCase() || 'CA',
        country: p.country?.trim() || 'USA',
      }));

    console.log(`✅ Extracted ${properties.length} properties from ${articleInfo.source} URL\n`);
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

  const prompt = `Research and provide detailed information about this glamping property in California:

Property Name: ${property.property_name}
City: ${property.city || 'Unknown'}
State: ${property.state || 'CA'}
Country: ${property.country || 'USA'}

Provide a JSON object with as much detail as possible:
- property_name: Keep the original name
- city: City name in California
- state: "CA"
- country: "USA"
- address: Full street address if you can find it
- zip_code: ZIP code if available
- url: Official website URL
- description: 3-5 sentence description of the property, amenities, and what makes it special
- unit_type: Types of accommodations (comma-separated, e.g., "yurts, tents, cabins")
- property_type: Type of property (e.g., "Glamping Resort", "Luxury Campground")
- phone_number: Phone number if available
- latitude: Approximate latitude if known (number)
- longitude: Approximate longitude if known (number)
- amenities: Array of key amenities (e.g., ["wifi", "hot tub", "fire pit", "bathroom", "kitchen"])

Focus on California properties. If you cannot find specific information, use null or omit the field.

Return ONLY valid JSON object, no other text.`;

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
      property_name: property.property_name || enriched.property_name,
      state: 'CA', // Ensure it's California
      country: 'USA',
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
    if (normalizedName.length > 5 && (csvName.toLowerCase().includes(normalizedName) || 
        normalizedName.includes(csvName.toLowerCase()))) {
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
function propertyToCSVRow(property: PropertyData, source: string, headers: string[]): CSVRow {
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
  if (headers.includes('State')) row['State'] = property.state || 'CA';
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
function appendToCSV(properties: PropertyData[], source: string): void {
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
 * Process a single article
 */
async function processArticle(
  articleInfo: ArticleInfo,
  csvPropertyNames: Set<string>,
  dbPropertyNames: Set<string>
): Promise<PropertyData[]> {
  console.log('\n' + '='.repeat(70));
  console.log(`Processing: ${articleInfo.source}`);
  console.log(`URL: ${articleInfo.url}`);
  console.log('='.repeat(70) + '\n');

  let extractedProperties: PropertyData[] = [];

  try {
    // Try to extract directly from URL using OpenAI first
    console.log(`🌐 Attempting to extract properties directly from URL using OpenAI...\n`);
    
    try {
      extractedProperties = await extractPropertiesDirectlyFromURL(articleInfo);
      console.log(`✅ Extracted ${extractedProperties.length} properties directly from URL\n`);
    } catch (urlError) {
      console.log(`⚠️  Direct URL extraction failed: ${urlError instanceof Error ? urlError.message : 'Unknown error'}\n`);
      console.log('📥 Trying to fetch HTML content...\n');
      
      // Fallback: fetch HTML and extract
      try {
        const html = await fetchUrlContent(articleInfo.url);
        const articleContent = extractTextContent(html);
        
        if (articleContent.length < 500) {
          throw new Error('Extracted article content is too short');
        }
        
        console.log(`✅ Extracted ${articleContent.length} characters of article content\n`);

        // Extract properties from article using OpenAI
        extractedProperties = await extractPropertiesFromArticle(articleContent, articleInfo);
      } catch (fetchError) {
        console.error(`❌ Failed to fetch article: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}\n`);
        console.log(`⚠️  Skipping this article...\n`);
        return [];
      }
    }

    if (extractedProperties.length === 0) {
      console.log(`⚠️  No properties extracted from ${articleInfo.source} article\n`);
      return [];
    }

    // Filter out existing properties
    console.log(`🔍 Filtering out existing properties from ${articleInfo.source}...\n`);
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

    console.log(`\n📊 From ${articleInfo.source}: Found ${newProperties.length} new properties out of ${extractedProperties.length} total\n`);

    return newProperties;
  } catch (error) {
    console.error(`❌ Error processing ${articleInfo.source}: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Research California Glamping Articles');
  console.log('='.repeat(70));
  console.log(`Processing ${ARTICLE_URLS.length} articles...\n`);

  try {
    // Step 1: Read existing CSV and database properties (once for all articles)
    console.log('📋 Loading existing properties...\n');
    const csvRows = readCSVFile(CSV_FILE);
    const csvPropertyNames = new Set(
      csvRows
        .map(row => row['Property Name']?.trim())
        .filter((name): name is string => !!name)
    );
    
    const dbPropertyNames = await getDatabasePropertyNames();

    // Step 2: Process each article
    const allNewProperties: Array<{ property: PropertyData; source: string }> = [];
    
    for (let i = 0; i < ARTICLE_URLS.length; i++) {
      const articleInfo = ARTICLE_URLS[i];
      console.log(`\n[Article ${i + 1}/${ARTICLE_URLS.length}]`);
      
      const newProperties = await processArticle(articleInfo, csvPropertyNames, dbPropertyNames);
      
      // Add source information to each property
      newProperties.forEach(prop => {
        allNewProperties.push({ property: prop, source: articleInfo.source });
      });

      // Update CSV property names set to avoid duplicates across articles
      newProperties.forEach(prop => {
        csvPropertyNames.add(prop.property_name);
      });

      // Delay between articles to be respectful
      if (i < ARTICLE_URLS.length - 1) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_ARTICLES / 1000} seconds before next article...\n`);
        await sleep(DELAY_BETWEEN_ARTICLES);
      }
    }

    // Step 3: Enrich all new properties
    if (allNewProperties.length === 0) {
      console.log('\n✅ No new properties found across all articles!');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Found ${allNewProperties.length} total new properties across all articles`);
    console.log('='.repeat(70));
    console.log('\n🔍 Enriching property data with OpenAI...\n');
    
    const enrichedProperties: PropertyData[] = [];
    const sourcesMap = new Map<number, string>();
    
    for (let i = 0; i < allNewProperties.length; i++) {
      const { property, source } = allNewProperties[i];
      console.log(`[${i + 1}/${allNewProperties.length}] ${property.property_name} (from ${source})`);
      
      try {
        const enriched = await enrichPropertyData(property);
        enrichedProperties.push(enriched);
        sourcesMap.set(enrichedProperties.length - 1, source);
        console.log();
      } catch (error) {
        console.log(`  ⚠️  Error, using original data: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        enrichedProperties.push(property);
        sourcesMap.set(enrichedProperties.length - 1, source);
      }
    }

    // Step 4: Group by source and append to CSV
    const propertiesBySource = new Map<string, PropertyData[]>();
    enrichedProperties.forEach((prop, index) => {
      const source = sourcesMap.get(index) || 'Unknown';
      if (!propertiesBySource.has(source)) {
        propertiesBySource.set(source, []);
      }
      propertiesBySource.get(source)!.push(prop);
    });

    // Append each source's properties separately
    for (const [source, properties] of propertiesBySource.entries()) {
      if (properties.length > 0) {
        appendToCSV(properties, source);
      }
    }

    console.log('='.repeat(70));
    console.log('✅ Process complete!');
    console.log(`   Total new properties added: ${enrichedProperties.length}`);
    console.log('='.repeat(70));

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
