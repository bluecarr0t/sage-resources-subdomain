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
  // If the value contains comma, newline, or quote, wrap it in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    const result = await geocodeAddressGoogle(address, city, state, zipCode, country, apiKey);
    if (result) return result;
  }

  // Fall back to Nominatim (free, no API key required)
  return await geocodeAddressNominatim(address, city, state, zipCode, country);
}

/**
 * Validate if coordinates are reasonable for the given state/country
 */
function validateCoordinatesForLocation(
  lat: number,
  lon: number,
  state: string,
  country: string
): boolean {
  // Basic validation ranges for USA and Canada
  if (country?.toUpperCase().includes('USA') || country?.toUpperCase().includes('UNITED STATES')) {
    // USA: approximately 24°N to 49°N, -125°W to -66°W
    if (lat < 20 || lat > 50 || lon > -50 || lon < -130) {
      return false;
    }
  } else if (country?.toUpperCase().includes('CANADA')) {
    // Canada: approximately 41°N to 83°N, -141°W to -52°W
    if (lat < 40 || lat > 85 || lon > -50 || lon < -145) {
      return false;
    }
  }

  return true;
}

/**
 * Main function to validate and correct coordinates
 */
async function validateAndCorrectCoordinates(
  inputFile: string,
  outputFile: string,
  apiKey?: string
) {
  console.log(`Reading CSV file: ${inputFile}`);

  const fileContent = fs.readFileSync(inputFile, 'utf-8');

  // Parse CSV - handle multi-line header by combining first two lines
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  // Combine first two lines as header (they form the complete header)
  const headerLine1 = lines[0].trim();
  const headerLine2 = lines[1]?.trim() || '';
  
  // Remove trailing comma from first line if present
  const cleanHeader1 = headerLine1.replace(/,$/, '');
  const combinedHeader = cleanHeader1 + (headerLine2 ? ',' + headerLine2 : '');
  
  // Reconstruct file with single header line
  const dataLines = lines.slice(2);
  const reconstructedContent = combinedHeader + '\n' + dataLines.join('\n');

  // Parse CSV
  const records: CSVRow[] = parse(reconstructedContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  });

  console.log(`Found ${records.length} rows to process`);

  const corrections: Array<{
    row: number;
    property: string;
    address: string;
    oldCoords: string;
    newCoords: string;
    distance: number;
  }> = [];

  let correctedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each row
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNumber = i + 3; // +3 because CSV has 2 header lines and is 1-indexed

    const address = (row.Address || '').trim();
    const city = (row.City || '').trim();
    const state = (row.State || '').trim();
    const zipCode = (row['Zip Code'] || '').trim();
    const country = (row.Country || '').trim();
    const propertyName = (row['Property Name'] || '').trim();

    // Get current coordinates
    const currentLat = parseFloat(row.Latitude || '');
    const currentLon = parseFloat(row.Longitude || '');

    // Skip if no coordinates
    if (isNaN(currentLat) || isNaN(currentLon)) {
      skippedCount++;
      continue;
    }

    // Validate coordinates are in reasonable range for the location
    const isValid = validateCoordinatesForLocation(
      currentLat,
      currentLon,
      state,
      country
    );

    if (!isValid) {
      console.log(
        `\nRow ${rowNumber}: Invalid coordinates detected for "${propertyName}"`
      );
      console.log(`  Address: ${address}, ${city}, ${state} ${zipCode}, ${country}`);
      console.log(`  Current: ${currentLat}, ${currentLon}`);

      // Try to geocode (will use Nominatim if no API key)
      const geocoded = await geocodeAddress(
        address,
        city,
        state,
        zipCode,
        country,
        apiKey
      );

      if (geocoded) {
        const distance = calculateDistance(
          currentLat,
          currentLon,
          geocoded.lat,
          geocoded.lon
        );

        console.log(`  Geocoded: ${geocoded.lat}, ${geocoded.lon}`);
        console.log(`  Distance difference: ${distance.toFixed(2)} km`);

        // Update coordinates if distance is significant (> 10km)
        if (distance > 10) {
          row.Latitude = geocoded.lat.toString();
          row.Longitude = geocoded.lon.toString();
          correctedCount++;

          corrections.push({
            row: rowNumber,
            property: propertyName,
            address: `${address}, ${city}, ${state}`,
            oldCoords: `${currentLat}, ${currentLon}`,
            newCoords: `${geocoded.lat}, ${geocoded.lon}`,
            distance: distance,
          });

          console.log(`  ✓ CORRECTED`);
        } else {
          console.log(`  - Coordinates are close enough, keeping original`);
        }
      } else {
        errorCount++;
        console.log(`  ✗ Failed to geocode`);
      }

      // Rate limiting: wait 1 second between requests (Nominatim requires this)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Write corrected CSV
  if (records.length === 0) {
    console.log('No records to write');
    return;
  }

  const headers = Object.keys(records[0]);
  const csvLines: string[] = [];

  // Add header row
  csvLines.push(headers.map(h => escapeCSVField(h)).join(','));

  // Add data rows
  for (const record of records) {
    const row = headers.map(header => {
      const value = record[header] || '';
      return escapeCSVField(value);
    });
    csvLines.push(row.join(','));
  }

  fs.writeFileSync(outputFile, csvLines.join('\n'));
  console.log(`\n✓ Written corrected CSV to: ${outputFile}`);

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total rows processed: ${records.length}`);
  console.log(`Rows with invalid coordinates: ${corrections.length + errorCount}`);
  console.log(`Coordinates corrected: ${correctedCount}`);
  console.log(`Rows skipped (no coordinates): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (corrections.length > 0) {
    console.log('\n=== CORRECTIONS MADE ===');
    corrections.forEach((correction) => {
      console.log(`\nRow ${correction.row}: ${correction.property}`);
      console.log(`  Address: ${correction.address}`);
      console.log(`  Old: ${correction.oldCoords}`);
      console.log(`  New: ${correction.newCoords}`);
      console.log(`  Distance: ${correction.distance.toFixed(2)} km`);
    });
  }
}

// Main execution
const inputFile = process.argv[2] || path.join(__dirname, '../csv/Sage Database_ Glamping Sites  - Work In Progress (1).csv');
const outputFile = process.argv[3] || path.join(__dirname, '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_CORRECTED.csv');
const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  console.log('\nℹ INFO: No Google Maps API key found.');
  console.log('Using OpenStreetMap Nominatim (free) for geocoding.');
  console.log('Set GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Google Maps geocoding.\n');
}

validateAndCorrectCoordinates(inputFile, outputFile, apiKey)
  .then(() => {
    console.log('\n✓ Validation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error:', error);
    process.exit(1);
  });

