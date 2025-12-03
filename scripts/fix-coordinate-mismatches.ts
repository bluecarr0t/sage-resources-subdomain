import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  [key: string]: string;
}

/**
 * Escape a CSV field value
 */
function escapeCSVField(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Geocode an address using OpenStreetMap Nominatim
 */
async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  country: string
): Promise<{ lat: number; lon: number } | null> {
  const fullAddress = [
    address?.trim(),
    city?.trim(),
    state?.trim(),
    zipCode?.trim(),
    country?.trim(),
  ]
    .filter(Boolean)
    .join(', ');

  if (!fullAddress) {
    return null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      fullAddress
    )}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Sage-Outdoor-Advisory-Coordinate-Validator/1.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function fixCoordinateMismatches(inputFile: string, outputFile: string) {
  console.log(`Reading CSV file: ${inputFile}\n`);

  const fileContent = fs.readFileSync(inputFile, 'utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim());

  // Combine header lines
  const headerLine1 = lines[0].trim();
  const headerLine2 = lines[1]?.trim() || '';
  const cleanHeader1 = headerLine1.replace(/,$/, '');
  const combinedHeader = cleanHeader1 + (headerLine2 ? ',' + headerLine2 : '');

  const dataLines = lines.slice(2);
  const reconstructedContent = combinedHeader + '\n' + dataLines.join('\n');

  // Parse CSV
  const records: CSVRow[] = parse(reconstructedContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  });

  console.log(`Total rows: ${records.length}\n`);
  console.log('This script will re-geocode all rows to ensure coordinates match addresses.\n');
  console.log('⚠️  WARNING: This will take a long time (about 1 second per row).\n');
  console.log('Processing...\n');

  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each row
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNumber = i + 3;

    const address = (row.Address || '').trim();
    const city = (row.City || '').trim();
    const state = (row.State || '').trim();
    const zipCode = (row['Zip Code'] || '').trim();
    const country = (row.Country || '').trim();
    const propertyName = (row['Property Name'] || '').trim();

    // Skip if missing critical data
    if (!address && !city && !state) {
      skippedCount++;
      continue;
    }

    // Geocode the address
    const geocoded = await geocodeAddress(address, city, state, zipCode, country);

    if (geocoded) {
      const oldLat = row.Latitude || '';
      const oldLon = row.Longitude || '';

      row.Latitude = geocoded.lat.toString();
      row.Longitude = geocoded.lon.toString();

      // Only count as fixed if coordinates actually changed
      if (oldLat !== geocoded.lat.toString() || oldLon !== geocoded.lon.toString()) {
        fixedCount++;
        if (fixedCount <= 10) {
          console.log(
            `Row ${rowNumber}: ${propertyName || 'Unknown'} - Updated coordinates`
          );
        }
      }
    } else {
      errorCount++;
      if (errorCount <= 10) {
        console.log(`Row ${rowNumber}: ${propertyName || 'Unknown'} - Failed to geocode`);
      }
    }

    // Rate limiting: wait 1 second between requests
    if (i < records.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Progress indicator
    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${records.length} rows processed...`);
    }
  }

  // Write updated CSV
  if (records.length === 0) {
    console.log('No records to write');
    return;
  }

  const headers = Object.keys(records[0]);
  const csvLines: string[] = [];

  // Add header row
  csvLines.push(headers.map((h) => escapeCSVField(h)).join(','));

  // Add data rows
  for (const record of records) {
    const row = headers.map((header) => {
      const value = record[header] || '';
      return escapeCSVField(value);
    });
    csvLines.push(row.join(','));
  }

  fs.writeFileSync(outputFile, csvLines.join('\n'));
  console.log(`\n✓ Written updated CSV to: ${outputFile}\n`);

  // Print summary
  console.log('=== GEOCODING SUMMARY ===\n');
  console.log(`Total rows processed: ${records.length}`);
  console.log(`Coordinates updated: ${fixedCount}`);
  console.log(`Rows skipped: ${skippedCount}`);
  console.log(`Geocoding errors: ${errorCount}`);
  console.log('\n✓ Re-geocoding complete!\n');
}

// Main execution
const inputFile =
  process.argv[2] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_FINAL.csv'
  );
const outputFile =
  process.argv[3] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_COORDS_FIXED.csv'
  );

console.log('⚠️  This will re-geocode ALL addresses and may take 15-20 minutes.\n');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  fixCoordinateMismatches(inputFile, outputFile)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}, 5000);

