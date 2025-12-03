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

async function fixRemainingCoordinates(inputFile: string, outputFile: string) {
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

  let fixedCount = 0;

  // Fix coordinates based on property name and address
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const propertyName = (row['Property Name'] || '').trim();
    const address = (row.Address || '').trim();
    const city = (row.City || '').trim();
    const state = (row.State || '').trim();
    const lat = parseFloat(row.Latitude || '');
    const lon = parseFloat(row.Longitude || '');

    // Fix Zion Ponderosa Ranch Resort - wrong coordinates (pointing to Maryland instead of Utah)
    if (
      propertyName.includes('Zion Ponderosa') &&
      (isNaN(lat) ||
        isNaN(lon) ||
        (lat === 39.2208579 && lon === -76.8419146))
    ) {
      row.Latitude = '37.2756009';
      row.Longitude = '-112.6381260';
      fixedCount++;
      console.log(
        `Row ${i + 3}: Fixed Zion Ponderosa coordinates (was pointing to Maryland)`
      );
    }

    // Fix Pampered Wilderness - missing coordinates
    if (
      propertyName.includes('Pampered Wilderness') &&
      (isNaN(lat) || isNaN(lon))
    ) {
      row.Latitude = '47.0451022';
      row.Longitude = '-122.8950075';
      fixedCount++;
      console.log(`Row ${i + 3}: Added coordinates for Pampered Wilderness`);
    }

    // Fix Under Canvas Grand Canyon - check if missing
    if (
      propertyName.includes('Under Canvas Grand Canyon') &&
      (isNaN(lat) || isNaN(lon))
    ) {
      row.Latitude = '35.6520930';
      row.Longitude = '-112.1394666';
      fixedCount++;
      console.log(
        `Row ${i + 3}: Added coordinates for Under Canvas Grand Canyon`
      );
    }

    // Fix Monument Glamping - use coordinates from row 577 if this row is missing them
    if (
      (propertyName.includes('Monument Glamping') || (!propertyName && i === 573)) &&
      (address.includes('Rickenbacker') || city.includes('Monument') || state === 'CO')
    ) {
      if (isNaN(lat) || isNaN(lon)) {
        row.Latitude = '39.0757787';
        row.Longitude = '-104.8699646';
        fixedCount++;
        console.log(`Row ${i + 3}: Added coordinates for Monument Glamping`);
      }
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
  console.log('=== COORDINATE FIX SUMMARY ===\n');
  console.log(`Total coordinate fixes: ${fixedCount}`);
  console.log('\n✓ Coordinate fixes complete!\n');
}

// Main execution
const inputFile =
  process.argv[2] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_GEOCODED.csv'
  );
const outputFile =
  process.argv[3] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_FINAL.csv'
  );

fixRemainingCoordinates(inputFile, outputFile)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

