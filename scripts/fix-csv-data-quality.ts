#!/usr/bin/env npx tsx
/**
 * Fix data quality issues in CSV file
 * 
 * This script fixes:
 * - JSON array format in Unit Type fields (converts to comma-separated)
 * - Placeholder text ("Not available", "Unavailable") replaced with empty strings
 * - Invalid coordinate values cleaned
 * 
 * Usage:
 *   npx tsx scripts/fix-csv-data-quality.ts
 */

import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const CSV_FILE = 'csv/glamping-com-north-america-missing-properties.csv';

interface CSVRow {
  [key: string]: string;
}

/**
 * Parse JSON array string to comma-separated list
 */
function parseJSONArray(value: string | null | undefined): string {
  if (!value || value.trim() === '') return '';
  
  const trimmed = value.trim();
  
  // Check if it looks like a JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
    } catch {
      // If parsing fails, try to extract values manually
      const matches = trimmed.match(/"([^"]+)"/g);
      if (matches) {
        return matches.map(m => m.replace(/"/g, '')).join(', ');
      }
    }
  }
  
  return trimmed;
}

/**
 * Clean placeholder text
 */
function cleanPlaceholder(value: string | null | undefined): string {
  if (!value) return '';
  
  const lower = value.trim().toLowerCase();
  if (lower === 'not available' || lower === 'unavailable' || lower === 'n/a' || lower === 'na') {
    return '';
  }
  
  return value.trim();
}

/**
 * Validate and clean coordinates
 */
function cleanCoordinate(value: string | null | undefined): string {
  if (!value) return '';
  
  const cleaned = cleanPlaceholder(value);
  if (!cleaned) return '';
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  
  // Validate range
  if (cleaned.includes('Latitude') || cleaned.includes('Longitude')) {
    return '';
  }
  
  return cleaned;
}

/**
 * Main function
 */
function fixDataQuality(): void {
  console.log('='.repeat(70));
  console.log('Fix CSV Data Quality Issues');
  console.log('='.repeat(70));
  console.log();

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file does not exist: ${CSV_FILE}`);
    process.exit(1);
  }

  console.log(`📖 Reading CSV file: ${CSV_FILE}`);
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const rows: CSVRow[] = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  console.log(`✅ Loaded ${rows.length} rows\n`);

  let fixesApplied = 0;
  const fixes: Array<{ row: number; property: string; fix: string }> = [];

  // Fix each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header and 0-index
    const propertyName = row['Property Name'] || 'Unknown';

    // Fix Unit Type (JSON array format)
    const unitType = row['Unit Type'];
    if (unitType && (unitType.trim().startsWith('[') || unitType.includes('","'))) {
      const fixed = parseJSONArray(unitType);
      if (fixed !== unitType) {
        row['Unit Type'] = fixed;
        fixesApplied++;
        fixes.push({
          row: rowNum,
          property: propertyName,
          fix: `Unit Type: "${unitType.substring(0, 40)}..." → "${fixed}"`,
        });
      }
    }

    // Clean placeholder text in various fields
    const fieldsToClean = ['Address', 'City', 'State', 'Zip Code', 'Url', 'Latitude', 'Longitude'];
    fieldsToClean.forEach(field => {
      const value = row[field];
      if (value) {
        const cleaned = cleanPlaceholder(value);
        if (cleaned !== value) {
          row[field] = cleaned;
          fixesApplied++;
          fixes.push({
            row: rowNum,
            property: propertyName,
            fix: `${field}: Removed placeholder text`,
          });
        }
      }
    });

    // Clean coordinates specifically
    const lat = row['Latitude'];
    const lon = row['Longitude'];
    
    if (lat) {
      const cleanedLat = cleanCoordinate(lat);
      if (cleanedLat !== lat) {
        row['Latitude'] = cleanedLat;
        fixesApplied++;
        fixes.push({
          row: rowNum,
          property: propertyName,
          fix: `Latitude: Removed invalid value "${lat}"`,
        });
      }
    }

    if (lon) {
      const cleanedLon = cleanCoordinate(lon);
      if (cleanedLon !== lon) {
        row['Longitude'] = cleanedLon;
        fixesApplied++;
        fixes.push({
          row: rowNum,
          property: propertyName,
          fix: `Longitude: Removed invalid value "${lon}"`,
        });
      }
    }
  }

  // Write fixed CSV
  if (fixesApplied > 0) {
    console.log(`🔧 Applied ${fixesApplied} fixes\n`);
    
    // Get headers
    const headers = Object.keys(rows[0]);
    
    // Write CSV
    const csvContent = stringify(rows, {
      header: true,
      columns: headers,
    });

    // Backup original
    const backupFile = `${CSV_FILE}.backup-${new Date().toISOString().split('T')[0]}`;
    fs.copyFileSync(CSV_FILE, backupFile);
    console.log(`💾 Backup created: ${backupFile}\n`);

    // Write fixed version
    fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
    console.log(`✅ Fixed CSV written to: ${CSV_FILE}\n`);

    // Show fixes
    console.log('🔧 FIXES APPLIED:\n');
    fixes.slice(0, 30).forEach((fix, idx) => {
      console.log(`${idx + 1}. Row ${fix.row}: ${fix.property}`);
      console.log(`   ${fix.fix}\n`);
    });
    
    if (fixes.length > 30) {
      console.log(`   ... and ${fixes.length - 30} more fixes\n`);
    }
  } else {
    console.log('✅ No fixes needed - CSV data looks good!\n');
  }

  console.log('='.repeat(70));
  console.log(`Total fixes applied: ${fixesApplied}`);
  console.log('='.repeat(70));
}

// Run the fix
fixDataQuality();
