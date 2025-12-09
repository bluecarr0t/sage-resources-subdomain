#!/usr/bin/env ts-node
/**
 * Check for duplicates between new-glamping-properties.csv and sage-glamping-data database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

interface CSVRow {
  [key: string]: string;
}

async function getDatabaseProperties() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error('Supabase credentials not found in environment variables');
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log('📥 Fetching all property names and URLs from database...');

  // Fetch all properties with name and URL
  let allProperties: Array<{ name: string; url?: string }> = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('sage-glamping-data')
      .select('property_name, url')
      .not('property_name', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Error fetching from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    const properties = data
      .map((row: any) => ({
        name: row.property_name?.trim(),
        url: row.url?.trim(),
      }))
      .filter((p: any) => p.name && p.name.length > 0);

    allProperties = allProperties.concat(properties);
    offset += batchSize;
    hasMore = data.length === batchSize;

    console.log(`  Fetched ${allProperties.length} properties...`);
  }

  // Get unique property names
  const uniqueProperties = new Map<string, string[]>();
  allProperties.forEach((prop) => {
    if (!uniqueProperties.has(prop.name)) {
      uniqueProperties.set(prop.name, []);
    }
    if (prop.url) {
      uniqueProperties.get(prop.name)!.push(prop.url);
    }
  });

  console.log(`✅ Found ${uniqueProperties.size} unique property names in database\n`);

  return uniqueProperties;
}

function normalizePropertyName(name: string): string {
  if (!name) return '';
  
  // Normalize to lowercase and strip whitespace
  let normalized = name.toLowerCase().trim();
  
  // Remove common variations: dashes, parentheses with state codes, extra spaces
  normalized = normalized.replace(/-/g, ' ');
  normalized = normalized.replace(/\([^)]*\)/g, ''); // Remove anything in parentheses
  normalized = normalized.replace(/\s+/g, ' '); // Normalize multiple spaces
  
  return normalized.trim();
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  
  // Remove protocol, www, trailing slashes
  let normalized = url.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.replace(/\/$/, '');
  
  return normalized;
}

function findMatchInDatabase(
  csvPropertyName: string,
  csvUrl: string,
  dbProperties: Map<string, string[]>
): { found: boolean; match?: string; matchType?: 'name' | 'url' } {
  const normalizedCsvName = normalizePropertyName(csvPropertyName);
  const normalizedCsvUrl = normalizeUrl(csvUrl);

  // Check for exact name match
  for (const [dbName, dbUrls] of dbProperties) {
    const normalizedDbName = normalizePropertyName(dbName);
    
    if (normalizedCsvName === normalizedDbName) {
      return { found: true, match: dbName, matchType: 'name' };
    }
  }

  // Check for URL match
  if (normalizedCsvUrl) {
    for (const [dbName, dbUrls] of dbProperties) {
      for (const dbUrl of dbUrls) {
        const normalizedDbUrl = normalizeUrl(dbUrl);
        if (normalizedCsvUrl && normalizedDbUrl && normalizedCsvUrl === normalizedDbUrl) {
          return { found: true, match: dbName, matchType: 'url' };
        }
      }
    }
  }

  // Check for partial name matches
  const csvLocation = normalizedCsvName.replace(/^(under canvas|autocamp|collective|firefall|treebones|ventana|skamania|onera|yurtopian|talula|walden|outdoorsy|summit|basecamp|camp elena|space cowboys|two capes|umpqua|bay point|hart|vintages|sheltered nook|crater lake|mt\.? hood|green rock|alpine|stargazer|lakedale|angel|hill|iron|vine|alexander|darla)\s*/i, '').trim();
  
  if (csvLocation.length > 3) {
    for (const [dbName, dbUrls] of dbProperties) {
      const normalizedDbName = normalizePropertyName(dbName);
      const dbLocation = normalizedDbName.replace(/^(under canvas|autocamp|collective|firefall|treebones|ventana|skamania|onera|yurtopian|talula|walden|outdoorsy|summit|basecamp|camp elena|space cowboys|two capes|umpqua|bay point|hart|vintages|sheltered nook|crater lake|mt\.? hood|green rock|alpine|stargazer|lakedale|angel|hill|iron|vine|alexander|darla)\s*/i, '').trim();
      
      // Check if locations match (exact or one contains the other)
      if (dbLocation.length > 3) {
        if (csvLocation === dbLocation) {
          return { found: true, match: dbName, matchType: 'name' };
        }
        // Check if one contains the other (for variations)
        if (csvLocation.length > 5 && dbLocation.length > 5) {
          if (csvLocation.includes(dbLocation) || dbLocation.includes(csvLocation)) {
            return { found: true, match: dbName, matchType: 'name' };
          }
        }
      }
    }
  }

  return { found: false };
}

async function main() {
  const csvFile = 'csv/new-properties/new-glamping-properties.csv';

  console.log('='.repeat(70));
  console.log('Checking for Duplicates: new-glamping-properties.csv vs sage-glamping-data');
  console.log('='.repeat(70));
  console.log();

  // Read CSV file
  console.log(`📖 Reading CSV file: ${csvFile}`);
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const csvRows: CSVRow[] = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  console.log(`✅ Found ${csvRows.length} properties in CSV\n`);

  // Get database properties
  const dbProperties = await getDatabaseProperties();

  // Check each CSV property against database
  console.log('🔍 Checking for duplicates...\n');
  const duplicates: Array<{ 
    row: CSVRow; 
    match: string; 
    matchType: 'name' | 'url';
    propertyName: string;
    url: string;
  }> = [];
  const unique: CSVRow[] = [];

  for (const row of csvRows) {
    const propertyName = row['Property Name']?.trim() || '';
    const url = row['Url']?.trim() || row['url']?.trim() || '';

    if (!propertyName) {
      continue;
    }

    const matchResult = findMatchInDatabase(propertyName, url, dbProperties);

    if (matchResult.found) {
      console.log(`  ✗ DUPLICATE: ${propertyName}`);
      console.log(`    Matches database: ${matchResult.match} (by ${matchResult.matchType})`);
      duplicates.push({ 
        row, 
        match: matchResult.match!, 
        matchType: matchResult.matchType!,
        propertyName,
        url
      });
    } else {
      unique.push(row);
    }
  }

  console.log();
  console.log(`📊 Summary:`);
  console.log(`   Total in CSV: ${csvRows.length}`);
  console.log(`   Duplicates found: ${duplicates.length}`);
  console.log(`   Unique properties: ${unique.length}`);
  console.log();

  if (duplicates.length > 0) {
    console.log('⚠️  DUPLICATES FOUND:');
    console.log('='.repeat(70));
    duplicates.forEach((dup, i) => {
      console.log(`\n${i + 1}. ${dup.propertyName}`);
      console.log(`   CSV URL: ${dup.url || 'N/A'}`);
      console.log(`   Matches DB: ${dup.match} (by ${dup.matchType})`);
    });
    console.log('\n' + '='.repeat(70));
  } else {
    console.log('✅ No duplicates found - CSV is clean!');
  }

  console.log();
  console.log('='.repeat(70));
  console.log('Analysis complete!');
  console.log('='.repeat(70));
}

// Run the script
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
