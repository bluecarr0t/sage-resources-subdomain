#!/usr/bin/env npx tsx
/**
 * Verify data quality of newly added properties in CSV
 * 
 * This script:
 * - Analyzes the CSV file for data quality issues
 * - Checks newly added properties (those added after initial entries)
 * - Validates required fields, formatting, and data consistency
 * - Generates a quality report
 * 
 * Usage:
 *   npx tsx scripts/verify-added-properties-quality.ts
 */

import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const CSV_FILE = 'csv/glamping-com-north-america-missing-properties.csv';
const TABLE_NAME = 'all_glamping_properties';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface CSVRow {
  [key: string]: string;
}

interface QualityIssue {
  row: number;
  propertyName: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  field?: string;
  currentValue?: string;
  recommendation?: string;
}

/**
 * Read CSV file
 */
function readCSVFile(filePath: string): CSVRow[] {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ CSV file does not exist: ${filePath}`);
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
    console.error(`❌ Error reading CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

/**
 * Validate coordinates
 */
function isValidCoordinate(lat: string | null | undefined, lon: string | null | undefined): boolean {
  if (!lat || !lon) return false;
  
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  
  return true;
}

/**
 * Validate URL format
 */
function isValidURL(url: string | null | undefined): boolean {
  if (!url || url.trim() === '' || url.toLowerCase() === 'not available' || url.toLowerCase() === 'unavailable') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate state code
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
 * Validate ZIP code format
 */
function isValidZIPCode(zip: string | null | undefined, country: string | null | undefined): boolean {
  if (!zip || zip.trim() === '' || zip.toLowerCase() === 'not available' || zip.toLowerCase() === 'unavailable') {
    return false;
  }
  
  const zipTrimmed = zip.trim();
  
  // US ZIP codes: 5 digits or 5+4 format
  if (country === 'USA' || !country) {
    return /^\d{5}(-\d{4})?$/.test(zipTrimmed);
  }
  
  // Canadian postal codes: A1A 1A1 format
  if (country === 'Canada') {
    return /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i.test(zipTrimmed);
  }
  
  return true; // Unknown country format, assume valid
}

/**
 * Check if property exists in database
 */
async function checkDatabaseExists(propertyName: string): Promise<boolean> {
  try {
    const normalizedName = propertyName.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('property_name')
      .ilike('property_name', `%${normalizedName}%`)
      .limit(5);
    
    if (error) return false;
    
    if (data && data.length > 0) {
      // Check for exact or close match
      return data.some((row: any) => 
        normalizePropertyName(row.property_name) === normalizedName ||
        normalizedName.includes(normalizePropertyName(row.property_name)) ||
        normalizePropertyName(row.property_name).includes(normalizedName)
      );
    }
    
    return false;
  } catch {
    return false;
  }
}

function normalizePropertyName(name: string): string {
  return name.toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Analyze data quality
 */
async function analyzeDataQuality(): Promise<void> {
  console.log('='.repeat(70));
  console.log('Data Quality Verification - Newly Added Properties');
  console.log('='.repeat(70));
  console.log();

  const rows = readCSVFile(CSV_FILE);
  
  if (rows.length === 0) {
    console.error('❌ No data found in CSV file');
    return;
  }

  console.log(`📊 Analyzing ${rows.length} properties in CSV file...\n`);

  const issues: QualityIssue[] = [];
  const stats = {
    total: rows.length,
    withPropertyName: 0,
    withAddress: 0,
    withCity: 0,
    withState: 0,
    withCountry: 0,
    withCoordinates: 0,
    withURL: 0,
    withDescription: 0,
    withValidCoordinates: 0,
    withValidURL: 0,
    withValidState: 0,
    withValidZIP: 0,
    missingRequired: 0,
  };

  // Analyze each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because row 1 is header and we're 0-indexed
    const propertyName = row['Property Name']?.trim() || '';

    if (!propertyName) {
      issues.push({
        row: rowNum,
        propertyName: 'MISSING',
        issue: 'Missing property name',
        severity: 'error',
        field: 'Property Name',
        recommendation: 'Property name is required and cannot be empty',
      });
      stats.missingRequired++;
      continue;
    }

    stats.withPropertyName++;

    // Check required fields
    if (row['City']?.trim()) stats.withCity++;
    else {
      issues.push({
        row: rowNum,
        propertyName,
        issue: 'Missing city',
        severity: 'warning',
        field: 'City',
        recommendation: 'Add city name if available',
      });
    }

    if (row['State']?.trim()) {
      stats.withState++;
      if (isValidStateCode(row['State'])) {
        stats.withValidState++;
      } else {
        issues.push({
          row: rowNum,
          propertyName,
          issue: `Invalid state code: "${row['State']}"`,
          severity: 'error',
          field: 'State',
          currentValue: row['State'],
          recommendation: 'Use 2-letter state/province code (e.g., CA, NY, BC)',
        });
      }
    } else {
      issues.push({
        row: rowNum,
        propertyName,
        issue: 'Missing state',
        severity: 'warning',
        field: 'State',
        recommendation: 'Add state/province code if available',
      });
    }

    if (row['Country']?.trim()) stats.withCountry++;
    else {
      issues.push({
        row: rowNum,
        propertyName,
        issue: 'Missing country',
        severity: 'warning',
        field: 'Country',
        recommendation: 'Default to "USA" or "Canada" based on location',
      });
    }

    if (row['Address']?.trim()) stats.withAddress++;
    else {
      issues.push({
        row: rowNum,
        propertyName,
        issue: 'Missing address',
        severity: 'info',
        field: 'Address',
        recommendation: 'Add full street address if available',
      });
    }

    // Check coordinates
    const lat = row['Latitude']?.trim();
    const lon = row['Longitude']?.trim();
    
    if (lat || lon) {
      stats.withCoordinates++;
      if (isValidCoordinate(lat, lon)) {
        stats.withValidCoordinates++;
      } else {
        issues.push({
          row: rowNum,
          propertyName,
          issue: 'Invalid coordinates',
          severity: 'error',
          field: 'Latitude/Longitude',
          currentValue: `Lat: ${lat || 'missing'}, Lon: ${lon || 'missing'}`,
          recommendation: 'Ensure coordinates are valid numbers within valid ranges',
        });
      }
    } else {
      issues.push({
        row: rowNum,
        propertyName,
        issue: 'Missing coordinates',
        severity: 'warning',
        field: 'Latitude/Longitude',
        recommendation: 'Add latitude and longitude for map display',
      });
    }

    // Check URL
    const url = row['Url']?.trim();
    if (url && url.toLowerCase() !== 'not available' && url.toLowerCase() !== 'unavailable') {
      stats.withURL++;
      if (isValidURL(url)) {
        stats.withValidURL++;
      } else {
        issues.push({
          row: rowNum,
          propertyName,
          issue: 'Invalid URL format',
          severity: 'error',
          field: 'Url',
          currentValue: url.substring(0, 50),
          recommendation: 'URL should start with http:// or https://',
        });
      }
    } else {
      issues.push({
        row: rowNum,
        propertyName,
        issue: 'Missing or placeholder URL',
        severity: 'warning',
        field: 'Url',
        currentValue: url || 'empty',
        recommendation: 'Add property website URL if available',
      });
    }

    // Check description
    if (row['Description']?.trim()) {
      stats.withDescription++;
      const descLength = row['Description'].trim().length;
      if (descLength < 50) {
        issues.push({
          row: rowNum,
          propertyName,
          issue: 'Description too short',
          severity: 'info',
          field: 'Description',
          currentValue: `${descLength} characters`,
          recommendation: 'Consider adding more detail (aim for 100+ characters)',
        });
      }
    } else {
      issues.push({
        row: rowNum,
        propertyName,
        issue: 'Missing description',
        severity: 'warning',
        field: 'Description',
        recommendation: 'Add property description to help users understand the offering',
      });
    }

    // Check ZIP code
    const zip = row['Zip Code']?.trim();
    const country = row['Country']?.trim();
    if (zip && zip.toLowerCase() !== 'not available' && zip.toLowerCase() !== 'unavailable') {
      if (!isValidZIPCode(zip, country)) {
        issues.push({
          row: rowNum,
          propertyName,
          issue: 'Invalid ZIP/postal code format',
          severity: 'warning',
          field: 'Zip Code',
          currentValue: zip,
          recommendation: `Use valid format for ${country || 'USA'} (US: 12345 or 12345-6789, Canada: A1A 1A1)`,
        });
      } else {
        stats.withValidZIP++;
      }
    }

    // Check for "Not available" or "Unavailable" placeholders
    const fieldsToCheck = ['Address', 'City', 'State', 'Zip Code', 'Url', 'Latitude', 'Longitude'];
    fieldsToCheck.forEach(field => {
      const value = row[field]?.trim();
      if (value && (value.toLowerCase() === 'not available' || value.toLowerCase() === 'unavailable')) {
        issues.push({
          row: rowNum,
          propertyName,
          issue: `Field contains placeholder text: "${value}"`,
          severity: 'warning',
          field,
          currentValue: value,
          recommendation: 'Use empty string instead of placeholder text if data is unavailable',
        });
      }
    });

    // Check unit type format (should not be JSON array string)
    const unitType = row['Unit Type']?.trim();
    if (unitType && unitType.startsWith('[') && unitType.endsWith(']')) {
      issues.push({
        row: rowNum,
        propertyName,
        issue: 'Unit Type appears to be JSON array format',
        severity: 'error',
        field: 'Unit Type',
        currentValue: unitType.substring(0, 50),
        recommendation: 'Use comma-separated list instead of JSON array (e.g., "tents, yurts" instead of ["tents","yurts"])',
      });
    }
  }

  // Generate report
  console.log('📊 DATA QUALITY STATISTICS\n');
  console.log('Field Coverage:');
  console.log(`  ✅ Property Name:     ${stats.withPropertyName}/${stats.total} (${Math.round(stats.withPropertyName/stats.total*100)}%)`);
  console.log(`  ⚠️  Address:            ${stats.withAddress}/${stats.total} (${Math.round(stats.withAddress/stats.total*100)}%)`);
  console.log(`  ⚠️  City:               ${stats.withCity}/${stats.total} (${Math.round(stats.withCity/stats.total*100)}%)`);
  console.log(`  ⚠️  State:              ${stats.withState}/${stats.total} (${Math.round(stats.withState/stats.total*100)}%)`);
  console.log(`  ⚠️  Country:            ${stats.withCountry}/${stats.total} (${Math.round(stats.withCountry/stats.total*100)}%)`);
  console.log(`  ⚠️  Coordinates:        ${stats.withCoordinates}/${stats.total} (${Math.round(stats.withCoordinates/stats.total*100)}%)`);
  console.log(`  ⚠️  URL:                ${stats.withURL}/${stats.total} (${Math.round(stats.withURL/stats.total*100)}%)`);
  console.log(`  ⚠️  Description:        ${stats.withDescription}/${stats.total} (${Math.round(stats.withDescription/stats.total*100)}%)`);
  console.log();

  console.log('Data Validation:');
  console.log(`  ✅ Valid Coordinates:  ${stats.withValidCoordinates}/${stats.withCoordinates} (${stats.withCoordinates > 0 ? Math.round(stats.withValidCoordinates/stats.withCoordinates*100) : 0}%)`);
  console.log(`  ✅ Valid URLs:         ${stats.withValidURL}/${stats.withURL} (${stats.withURL > 0 ? Math.round(stats.withValidURL/stats.withURL*100) : 0}%)`);
  console.log(`  ✅ Valid State Codes:  ${stats.withValidState}/${stats.withState} (${stats.withState > 0 ? Math.round(stats.withValidState/stats.withState*100) : 0}%)`);
  console.log();

  // Group issues by severity
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');

  console.log('🔍 ISSUES FOUND\n');
  console.log(`  🔴 Errors:   ${errors.length}`);
  console.log(`  🟡 Warnings: ${warnings.length}`);
  console.log(`  🔵 Info:     ${info.length}`);
  console.log(`  📊 Total:    ${issues.length}\n`);

  // Show errors
  if (errors.length > 0) {
    console.log('🔴 ERRORS (Must Fix):\n');
    errors.slice(0, 20).forEach(issue => {
      console.log(`  Row ${issue.row}: ${issue.propertyName}`);
      console.log(`    Issue: ${issue.issue}`);
      if (issue.currentValue) {
        console.log(`    Current: ${issue.currentValue.substring(0, 60)}`);
      }
      if (issue.recommendation) {
        console.log(`    Fix: ${issue.recommendation}`);
      }
      console.log();
    });
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more errors\n`);
    }
  }

  // Show warnings
  if (warnings.length > 0) {
    console.log('🟡 WARNINGS (Should Fix):\n');
    warnings.slice(0, 15).forEach(issue => {
      console.log(`  Row ${issue.row}: ${issue.propertyName}`);
      console.log(`    Issue: ${issue.issue}`);
      if (issue.field) {
        console.log(`    Field: ${issue.field}`);
      }
      if (issue.recommendation) {
        console.log(`    Recommendation: ${issue.recommendation}`);
      }
      console.log();
    });
    if (warnings.length > 15) {
      console.log(`  ... and ${warnings.length - 15} more warnings\n`);
    }
  }

  // Check for duplicates in CSV
  console.log('🔍 DUPLICATE CHECK\n');
  const propertyNames = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const name = row['Property Name']?.trim();
    if (name) {
      if (!propertyNames.has(name)) {
        propertyNames.set(name, []);
      }
      propertyNames.get(name)!.push(index + 2);
    }
  });

  const duplicates = Array.from(propertyNames.entries()).filter(([_, rows]) => rows.length > 1);
  
  if (duplicates.length > 0) {
    console.log(`  ⚠️  Found ${duplicates.length} properties with duplicate names:\n`);
    duplicates.slice(0, 10).forEach(([name, rowNums]) => {
      console.log(`    "${name}" appears in rows: ${rowNums.join(', ')}`);
      // Check if they're different sites/units (which is OK)
      const rows = rowNums.map(r => rows[r - 2]);
      const hasDifferentSites = rows.some(r => r['Site Name']?.trim()) && 
                                new Set(rows.map(r => r['Site Name']?.trim())).size > 1;
      const hasDifferentUnits = rows.some(r => r['Unit Type']?.trim()) && 
                               new Set(rows.map(r => r['Unit Type']?.trim())).size > 1;
      
      if (hasDifferentSites || hasDifferentUnits) {
        console.log(`      → OK: Different sites/units (intentional)`);
      } else {
        console.log(`      → ⚠️  Potential duplicate - review needed`);
      }
    });
    if (duplicates.length > 10) {
      console.log(`    ... and ${duplicates.length - 10} more duplicates\n`);
    }
  } else {
    console.log('  ✅ No duplicate property names found\n');
  }

  // Check recently added properties specifically
  console.log('📅 RECENTLY ADDED PROPERTIES ANALYSIS\n');
  const recentSources = ['Google Search', 'AFAR', 'Outdoorsy', 'LA Times', 'Sunset Magazine', 'Travel + Leisure'];
  const recentProperties = rows.filter(row => 
    recentSources.some(source => row['Source']?.includes(source)) ||
    row['Date Added']?.includes('2025-12-07')
  );

  console.log(`  Found ${recentProperties.length} recently added properties\n`);

  if (recentProperties.length > 0) {
    const recentIssues = issues.filter(issue => {
      const row = rows[issue.row - 2];
      return recentSources.some(source => row['Source']?.includes(source)) ||
             row['Date Added']?.includes('2025-12-07');
    });

    const recentErrors = recentIssues.filter(i => i.severity === 'error');
    const recentWarnings = recentIssues.filter(i => i.severity === 'warning');

    console.log(`  Recent Properties Issues:`);
    console.log(`    🔴 Errors: ${recentErrors.length}`);
    console.log(`    🟡 Warnings: ${recentWarnings.length}\n`);

    if (recentErrors.length > 0) {
      console.log('  🔴 Errors in Recent Properties:\n');
      recentErrors.forEach(issue => {
        const row = rows[issue.row - 2];
        console.log(`    ${issue.propertyName} (Row ${issue.row})`);
        console.log(`      ${issue.issue}`);
        if (issue.currentValue) {
          console.log(`      Current: ${issue.currentValue.substring(0, 50)}`);
        }
        console.log();
      });
    }
  }

  // Summary
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log();
  console.log(`Total Properties Analyzed: ${stats.total}`);
  console.log(`Total Issues Found: ${issues.length}`);
  console.log(`  🔴 Critical Errors: ${errors.length}`);
  console.log(`  🟡 Warnings: ${warnings.length}`);
  console.log(`  🔵 Info: ${info.length}`);
  console.log();
  
  if (errors.length === 0 && warnings.length < 10) {
    console.log('✅ Data quality is good!');
  } else if (errors.length === 0) {
    console.log('⚠️  Data quality is acceptable with some warnings to address');
  } else {
    console.log('❌ Data quality issues found that need attention');
  }
  console.log();
}

// Run the analysis
analyzeDataQuality().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
