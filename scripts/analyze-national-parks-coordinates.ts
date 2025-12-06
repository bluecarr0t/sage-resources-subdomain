/**
 * Script to analyze National Parks coordinates in the database
 * 
 * Usage:
 *   npx tsx scripts/analyze-national-parks-coordinates.ts
 * 
 * Analyzes:
 *   - Parks with missing coordinates
 *   - Parks with invalid coordinates (out of range)
 *   - Coordinate data quality issues
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'national-parks';
const CSV_PATH = resolve(process.cwd(), 'csv/national-parks/national_parks.csv');

interface CSVRow {
  [key: string]: string | number | null;
}

interface ParkAnalysis {
  name: string;
  park_code: string | null;
  state: string | null;
  db_latitude: number | null;
  db_longitude: number | null;
  csv_latitude: number | null;
  csv_longitude: number | null;
  hasValidCoords: boolean;
  hasCoordsInDB: boolean;
  hasCoordsInCSV: boolean;
  issues: string[];
}

/**
 * Parse CSV file
 */
function parseCSV(filePath: string): CSVRow[] {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as CSVRow[];
    return records;
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Validate coordinates
 */
function isValidCoordinate(lat: number | null, lon: number | null): boolean {
  if (lat === null || lon === null) return false;
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  if (isNaN(lat) || isNaN(lon)) return false;
  if (!isFinite(lat) || !isFinite(lon)) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Parse coordinate from CSV value
 */
function parseCoordinate(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) return null;
  return num;
}

/**
 * Main analysis function
 */
async function main() {
  try {
    console.log('🔍 Analyzing National Parks Coordinates\n');

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Fetch data from database
    console.log('📊 Fetching data from database...');
    const { data: dbParks, error: dbError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('name');

    if (dbError) {
      console.error('❌ Error fetching from database:', dbError.message);
      process.exit(1);
    }

    if (!dbParks || dbParks.length === 0) {
      console.error('❌ No parks found in database');
      process.exit(1);
    }

    console.log(`✅ Found ${dbParks.length} parks in database\n`);

    // Parse CSV data
    console.log('📖 Reading CSV file...');
    const csvData = parseCSV(CSV_PATH);
    console.log(`✅ Found ${csvData.length} parks in CSV\n`);

    // Create map of CSV data by name
    const csvMap = new Map<string, CSVRow>();
    csvData.forEach((row) => {
      const name = (row.Name || row.name || '').toString().trim();
      if (name) {
        csvMap.set(name, row);
      }
    });

    // Analyze parks
    const analyses: ParkAnalysis[] = [];
    const issues: {
      missingCoordinates: string[];
      invalidCoordinates: string[];
      coordinateMismatches: string[];
      csvMissingCoordinates: string[];
    } = {
      missingCoordinates: [],
      invalidCoordinates: [],
      coordinateMismatches: [],
      csvMissingCoordinates: [],
    };

    for (const park of dbParks) {
      const dbLat = park.latitude ? parseFloat(String(park.latitude)) : null;
      const dbLon = park.longitude ? parseFloat(String(park.longitude)) : null;

      // Find corresponding CSV row
      const csvRow = csvMap.get(park.name);
      let csvLat: number | null = null;
      let csvLon: number | null = null;

      if (csvRow) {
        csvLat = parseCoordinate(csvRow.Latitude || csvRow.latitude);
        csvLon = parseCoordinate(csvRow.Longitude || csvRow.longitude);
      }

      const analysis: ParkAnalysis = {
        name: park.name,
        park_code: park.park_code,
        state: park.state,
        db_latitude: dbLat,
        db_longitude: dbLon,
        csv_latitude: csvLat,
        csv_longitude: csvLon,
        hasValidCoords: isValidCoordinate(dbLat, dbLon),
        hasCoordsInDB: dbLat !== null && dbLon !== null,
        hasCoordsInCSV: csvLat !== null && csvLon !== null,
        issues: [],
      };

      // Check for issues
      if (!analysis.hasCoordsInDB) {
        analysis.issues.push('Missing coordinates in database');
        issues.missingCoordinates.push(park.name);
      }

      if (analysis.hasCoordsInDB && !analysis.hasValidCoords) {
        analysis.issues.push('Invalid coordinates (out of range)');
        issues.invalidCoordinates.push(park.name);
      }

      if (analysis.hasCoordsInCSV && !analysis.hasCoordsInDB) {
        analysis.issues.push('Coordinates exist in CSV but not in database');
      }

      if (!analysis.hasCoordsInCSV && csvRow) {
        analysis.issues.push('Missing coordinates in CSV');
        issues.csvMissingCoordinates.push(park.name);
      }

      if (
        analysis.hasCoordsInDB &&
        analysis.hasCoordsInCSV &&
        analysis.hasValidCoords &&
        (Math.abs((dbLat || 0) - (csvLat || 0)) > 0.001 ||
          Math.abs((dbLon || 0) - (csvLon || 0)) > 0.001)
      ) {
        analysis.issues.push(
          `Coordinate mismatch: DB (${dbLat}, ${dbLon}) vs CSV (${csvLat}, ${csvLon})`
        );
        issues.coordinateMismatches.push(park.name);
      }

      analyses.push(analysis);
    }

    // Print summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 ANALYSIS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const parksWithValidCoords = analyses.filter((a) => a.hasValidCoords).length;
    const parksWithIssues = analyses.filter((a) => a.issues.length > 0).length;

    console.log(`Total parks: ${analyses.length}`);
    console.log(`Parks with valid coordinates: ${parksWithValidCoords}`);
    console.log(`Parks with issues: ${parksWithIssues}\n`);

    // Missing coordinates in database
    if (issues.missingCoordinates.length > 0) {
      console.log('❌ MISSING COORDINATES IN DATABASE:');
      console.log('─────────────────────────────────────────────────────────────');
      issues.missingCoordinates.forEach((name) => {
        const analysis = analyses.find((a) => a.name === name);
        console.log(`  • ${name}`);
        if (analysis?.hasCoordsInCSV) {
          console.log(`    ⚠️  CSV has coordinates: (${analysis.csv_latitude}, ${analysis.csv_longitude})`);
        }
      });
      console.log();
    }

    // Invalid coordinates
    if (issues.invalidCoordinates.length > 0) {
      console.log('⚠️  INVALID COORDINATES (out of valid range):');
      console.log('─────────────────────────────────────────────────────────────');
      issues.invalidCoordinates.forEach((name) => {
        const analysis = analyses.find((a) => a.name === name);
        console.log(`  • ${name}: (${analysis?.db_latitude}, ${analysis?.db_longitude})`);
      });
      console.log();
    }

    // Coordinate mismatches
    if (issues.coordinateMismatches.length > 0) {
      console.log('⚠️  COORDINATE MISMATCHES (DB vs CSV):');
      console.log('─────────────────────────────────────────────────────────────');
      issues.coordinateMismatches.forEach((name) => {
        const analysis = analyses.find((a) => a.name === name);
        console.log(`  • ${name}:`);
        console.log(`    DB: (${analysis?.db_latitude}, ${analysis?.db_longitude})`);
        console.log(`    CSV: (${analysis?.csv_latitude}, ${analysis?.csv_longitude})`);
      });
      console.log();
    }

    // Missing coordinates in CSV
    if (issues.csvMissingCoordinates.length > 0) {
      console.log('⚠️  MISSING COORDINATES IN CSV:');
      console.log('─────────────────────────────────────────────────────────────');
      issues.csvMissingCoordinates.forEach((name) => {
        console.log(`  • ${name}`);
      });
      console.log();
    }

    // Parks with valid coordinates (no issues)
    const parksWithNoIssues = analyses.filter((a) => a.issues.length === 0);
    if (parksWithNoIssues.length > 0) {
      console.log(`✅ PARKS WITH VALID COORDINATES (${parksWithNoIssues.length}):`);
      console.log('─────────────────────────────────────────────────────────────');
      parksWithNoIssues.forEach((analysis) => {
        console.log(
          `  • ${analysis.name} (${analysis.state || 'N/A'}): (${analysis.db_latitude}, ${analysis.db_longitude})`
        );
      });
      console.log();
    }

    // Detailed table of all parks
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 DETAILED ANALYSIS BY PARK');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(
      'Name'.padEnd(40) +
        'State'.padEnd(15) +
        'DB Coords'.padEnd(25) +
        'CSV Coords'.padEnd(25) +
        'Status'
    );
    console.log('─'.repeat(120));

    analyses.forEach((analysis) => {
      const dbCoords = analysis.hasCoordsInDB
        ? `(${analysis.db_latitude}, ${analysis.db_longitude})`
        : 'N/A';
      const csvCoords = analysis.hasCoordsInCSV
        ? `(${analysis.csv_latitude}, ${analysis.csv_longitude})`
        : 'N/A';
      const status = analysis.hasValidCoords
        ? '✅ Valid'
        : analysis.hasCoordsInDB
        ? '❌ Invalid'
        : '⚠️  Missing';

      console.log(
        analysis.name.substring(0, 39).padEnd(40) +
          (analysis.state || 'N/A').substring(0, 14).padEnd(15) +
          dbCoords.padEnd(25) +
          csvCoords.padEnd(25) +
          status
      );

      if (analysis.issues.length > 0) {
        analysis.issues.forEach((issue) => {
          console.log('  └─ ' + issue);
        });
      }
    });

    console.log('\n✅ Analysis complete!\n');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
