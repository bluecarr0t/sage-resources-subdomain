#!/usr/bin/env ts-node
/**
 * Compare CSV file with live Supabase database to find and remove duplicates
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

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

  console.log('📥 Fetching all property names from database...');

  // Fetch all unique property names from database
  let allProperties: string[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name')
      .not('property_name', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Error fetching from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    // Extract unique property names
    const propertyNames = data
      .map((row: any) => row.property_name?.trim())
      .filter((name: string) => name && name.length > 0);

    allProperties = allProperties.concat(propertyNames);
    offset += batchSize;
    hasMore = data.length === batchSize;

    console.log(`  Fetched ${allProperties.length} property names...`);
  }

  // Get unique property names
  const uniqueProperties = new Set(allProperties);
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

function findMatchInDatabase(
  csvPropertyName: string,
  dbProperties: Set<string>
): { found: boolean; match?: string } {
  const normalizedCsv = normalizePropertyName(csvPropertyName);

  // Check for exact match
  for (const dbProp of dbProperties) {
    const normalizedDb = normalizePropertyName(dbProp);
    
    if (normalizedCsv === normalizedDb) {
      return { found: true, match: dbProp };
    }
  }

  // Check for partial matches (location name matches)
  const csvLocation = normalizedCsv.replace(/^(postcard cabins|huttopia|under canvas|glamping\.com|field mag|us news travel)\s*/i, '').trim();
  
  if (csvLocation.length > 3) {
    for (const dbProp of dbProperties) {
      const normalizedDb = normalizePropertyName(dbProp);
      const dbLocation = normalizedDb.replace(/^(postcard cabins|huttopia|under canvas|glamping\.com|field mag|us news travel)\s*/i, '').trim();
      
      // Check if locations match (exact or one contains the other)
      if (dbLocation.length > 3) {
        if (csvLocation === dbLocation) {
          return { found: true, match: dbProp };
        }
        // Check if one contains the other (for variations like "Shenandoah" vs "Shenandoah North")
        if (csvLocation.length > 5 && dbLocation.length > 5) {
          if (csvLocation.includes(dbLocation) || dbLocation.includes(csvLocation)) {
            return { found: true, match: dbProp };
          }
        }
      }
    }
  }

  return { found: false };
}

async function main() {
  const csvFile = 'csv/glamping-com-north-america-missing-properties.csv';

  console.log('='.repeat(70));
  console.log('Comparing CSV with Live Database to Find Duplicates');
  console.log('='.repeat(70));
  console.log();

  // Read CSV file
  console.log(`📖 Reading CSV file: ${csvFile}`);
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const csvRows: CSVRow[] = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`✅ Found ${csvRows.length} properties in CSV\n`);

  // Get database properties
  const dbProperties = await getDatabaseProperties();

  // Check each CSV property against database
  console.log('🔍 Checking for duplicates...\n');
  const duplicates: Array<{ row: CSVRow; match: string }> = [];
  const unique: CSVRow[] = [];

  for (const row of csvRows) {
    const propertyName = row['Property Name']?.trim();
    if (!propertyName) {
      continue;
    }

    const matchResult = findMatchInDatabase(propertyName, dbProperties);

    if (matchResult.found) {
      console.log(`  ✗ DUPLICATE: ${propertyName}`);
      console.log(`    Matches database: ${matchResult.match}`);
      duplicates.push({ row, match: matchResult.match! });
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

  // Remove duplicates from CSV if any found
  if (duplicates.length > 0) {
    console.log('🗑️  Removing duplicates from CSV...\n');
    
    // Get fieldnames from first row
    const fieldnames = Object.keys(csvRows[0]);

    // Write updated CSV
    const updatedCsv = stringify(unique, {
      header: true,
      columns: fieldnames,
    });

    fs.writeFileSync(csvFile, updatedCsv, 'utf-8');

    console.log(`✅ Updated CSV file: ${csvFile}`);
    console.log(`   Removed ${duplicates.length} duplicate properties`);
    console.log(`   Remaining properties: ${unique.length}`);
    console.log();
    console.log('Removed duplicates:');
    duplicates.forEach((dup, i) => {
      console.log(`  ${i + 1}. ${dup.row['Property Name']} (matched: ${dup.match})`);
    });
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
