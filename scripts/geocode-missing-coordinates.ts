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
 * Geocode an address using OpenStreetMap Nominatim (free, no API key required)
 */
async function geocodeAddressNominatim(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  country: string
): Promise<{ lat: number; lon: number } | null> {
  // Construct full address
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
    // Use Nominatim (OpenStreetMap) - free, no API key required
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
    console.error(`Error geocoding "${fullAddress}":`, error);
    return null;
  }
}

/**
 * Geocode an address using Google Maps Geocoding API
 */
async function geocodeAddressGoogle(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  country: string,
  apiKey: string
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
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      fullAddress
    )}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lon: location.lng,
      };
    } else {
      console.warn(`Geocoding failed for "${fullAddress}": ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding "${fullAddress}":`, error);
    return null;
  }
}

/**
 * Geocode an address (tries Google first if API key available, then falls back to Nominatim)
 */
async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  country: string,
  apiKey?: string
): Promise<{ lat: number; lon: number } | null> {
  // Try Google Maps API first if key is available
  if (apiKey) {
    const result = await geocodeAddressGoogle(
      address,
      city,
      state,
      zipCode,
      country,
      apiKey
    );
    if (result) return result;
  }

  // Fall back to Nominatim (free, no API key required)
  return await geocodeAddressNominatim(address, city, state, zipCode, country);
}

async function geocodeMissingCoordinates(
  inputFile: string,
  outputFile: string,
  apiKey?: string
) {
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

  // Find rows with missing coordinates
  const missingCoords: Array<{
    row: number;
    record: CSVRow;
    address: string;
  }> = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const lat = parseFloat(row.Latitude || '');
    const lon = parseFloat(row.Longitude || '');

    if (isNaN(lat) || isNaN(lon)) {
      const address = [
        row.Address,
        row.City,
        row.State,
        row['Zip Code'],
        row.Country,
      ]
        .filter(Boolean)
        .join(', ');

      missingCoords.push({
        row: i + 3, // +3 for header lines and 1-indexed
        record: row,
        address,
      });
    }
  }

  if (missingCoords.length === 0) {
    console.log('✓ No rows with missing coordinates found!\n');
    return;
  }

  console.log(`Found ${missingCoords.length} rows with missing coordinates:\n`);

  let geocodedCount = 0;
  let failedCount = 0;

  // Geocode each missing coordinate
  for (const item of missingCoords) {
    const { row, record, address } = item;

    console.log(`Row ${row}: ${record['Property Name'] || 'Unknown'}`);
    console.log(`  Address: ${address}`);

    const geocoded = await geocodeAddress(
      record.Address || '',
      record.City || '',
      record.State || '',
      record['Zip Code'] || '',
      record.Country || '',
      apiKey
    );

    if (geocoded) {
      record.Latitude = geocoded.lat.toString();
      record.Longitude = geocoded.lon.toString();
      geocodedCount++;

      console.log(`  ✓ Geocoded: ${geocoded.lat}, ${geocoded.lon}\n`);
    } else {
      failedCount++;
      console.log(`  ✗ Failed to geocode\n`);
    }

    // Rate limiting: wait 1 second between requests (Nominatim requires this)
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
  console.log(`✓ Written updated CSV to: ${outputFile}\n`);

  // Print summary
  console.log('=== GEOCODING SUMMARY ===\n');
  console.log(`Total rows with missing coordinates: ${missingCoords.length}`);
  console.log(`Successfully geocoded: ${geocodedCount}`);
  console.log(`Failed to geocode: ${failedCount}`);

  if (failedCount > 0) {
    console.log(
      '\n⚠ Some addresses could not be geocoded. You may need to:'
    );
    console.log('  - Verify the address is correct');
    console.log('  - Try a more specific address format');
    console.log('  - Manually add coordinates if the address is unclear');
  }

  console.log('\n✓ Geocoding complete!\n');
}

// Main execution
const inputFile =
  process.argv[2] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_CLEANED.csv'
  );
const outputFile =
  process.argv[3] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_GEOCODED.csv'
  );
const apiKey =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  console.log('ℹ INFO: No Google Maps API key found.');
  console.log('Using OpenStreetMap Nominatim (free) for geocoding.');
  console.log(
    'Set GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Google Maps geocoding.\n'
  );
}

geocodeMissingCoordinates(inputFile, outputFile, apiKey)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

