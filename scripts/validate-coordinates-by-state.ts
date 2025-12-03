import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  [key: string]: string;
}

interface CoordinateMismatch {
  row: number;
  propertyName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  expectedState: string;
  issue: string;
}

// State boundaries (approximate center points and rough boundaries)
// USA states - rough latitude/longitude bounds
const US_STATE_BOUNDS: { [key: string]: { lat: [number, number]; lon: [number, number] } } = {
  'AL': { lat: [30.1, 35.0], lon: [-88.5, -84.9] },
  'AK': { lat: [51.0, 71.6], lon: [-179.0, -130.0] },
  'AZ': { lat: [31.3, 37.0], lon: [-114.8, -109.0] },
  'AR': { lat: [33.0, 36.5], lon: [-94.6, -89.6] },
  'CA': { lat: [32.5, 42.0], lon: [-124.5, -114.1] },
  'CO': { lat: [37.0, 41.0], lon: [-109.1, -102.0] },
  'CT': { lat: [40.9, 42.1], lon: [-73.7, -71.8] },
  'DE': { lat: [38.4, 39.7], lon: [-75.8, -75.0] },
  'FL': { lat: [24.4, 31.0], lon: [-87.6, -80.0] },
  'GA': { lat: [30.3, 35.0], lon: [-85.6, -80.8] },
  'HI': { lat: [18.9, 22.2], lon: [-160.3, -154.8] },
  'ID': { lat: [41.9, 49.0], lon: [-117.2, -111.0] },
  'IL': { lat: [36.9, 42.5], lon: [-91.5, -87.0] },
  'IN': { lat: [37.7, 41.7], lon: [-88.1, -84.8] },
  'IA': { lat: [40.3, 43.5], lon: [-96.6, -90.1] },
  'KS': { lat: [37.0, 40.0], lon: [-102.0, -94.6] },
  'KY': { lat: [36.4, 39.1], lon: [-89.5, -81.9] },
  'LA': { lat: [28.9, 33.0], lon: [-94.0, -88.8] },
  'ME': { lat: [43.0, 47.5], lon: [-71.1, -66.9] },
  'MD': { lat: [37.9, 39.7], lon: [-79.5, -75.0] },
  'MA': { lat: [41.2, 42.9], lon: [-73.5, -69.9] },
  'MI': { lat: [41.7, 48.3], lon: [-90.4, -82.4] },
  'MN': { lat: [43.5, 49.4], lon: [-97.2, -89.5] },
  'MS': { lat: [30.1, 35.0], lon: [-91.7, -88.1] },
  'MO': { lat: [36.0, 40.6], lon: [-95.8, -89.1] },
  'MT': { lat: [44.3, 49.0], lon: [-116.1, -104.0] },
  'NE': { lat: [40.0, 43.0], lon: [-104.1, -95.3] },
  'NV': { lat: [35.0, 42.0], lon: [-120.0, -114.0] },
  'NH': { lat: [42.7, 45.3], lon: [-72.6, -70.6] },
  'NJ': { lat: [38.9, 41.4], lon: [-75.6, -73.9] },
  'NM': { lat: [31.3, 37.0], lon: [-109.1, -103.0] },
  'NY': { lat: [40.5, 45.0], lon: [-79.8, -71.8] },
  'NC': { lat: [33.8, 36.6], lon: [-84.3, -75.4] },
  'ND': { lat: [45.9, 49.0], lon: [-104.1, -96.6] },
  'OH': { lat: [38.4, 42.0], lon: [-84.8, -80.5] },
  'OK': { lat: [33.6, 37.0], lon: [-103.0, -94.4] },
  'OR': { lat: [41.9, 46.3], lon: [-124.6, -116.5] },
  'PA': { lat: [39.7, 42.3], lon: [-80.5, -74.7] },
  'RI': { lat: [41.1, 42.0], lon: [-71.9, -71.1] },
  'SC': { lat: [32.0, 35.2], lon: [-83.4, -78.5] },
  'SD': { lat: [42.4, 45.9], lon: [-104.1, -96.4] },
  'TN': { lat: [35.0, 36.7], lon: [-90.3, -81.6] },
  'TX': { lat: [25.8, 36.5], lon: [-106.7, -93.5] },
  'UT': { lat: [36.9, 42.0], lon: [-114.1, -109.0] },
  'VT': { lat: [42.7, 45.0], lon: [-73.4, -71.5] },
  'VA': { lat: [36.5, 39.5], lon: [-83.7, -75.2] },
  'WA': { lat: [45.5, 49.0], lon: [-124.8, -116.9] },
  'WV': { lat: [37.2, 40.6], lon: [-82.7, -77.7] },
  'WI': { lat: [42.4, 47.1], lon: [-92.9, -86.8] },
  'WY': { lat: [41.0, 45.0], lon: [-111.1, -104.0] },
};

// Canada provinces - rough boundaries
const CANADA_PROVINCE_BOUNDS: { [key: string]: { lat: [number, number]; lon: [number, number] } } = {
  'AB': { lat: [49.0, 60.0], lon: [-120.0, -110.0] }, // Alberta
  'BC': { lat: [48.0, 60.0], lon: [-139.0, -114.0] }, // British Columbia
  'MB': { lat: [49.0, 60.0], lon: [-102.0, -89.0] }, // Manitoba
  'NB': { lat: [44.5, 48.0], lon: [-69.0, -63.0] }, // New Brunswick
  'NL': { lat: [46.5, 60.0], lon: [-67.8, -52.6] }, // Newfoundland and Labrador
  'NS': { lat: [43.4, 47.0], lon: [-66.3, -59.7] }, // Nova Scotia
  'NT': { lat: [60.0, 70.0], lon: [-136.0, -102.0] }, // Northwest Territories
  'NU': { lat: [60.0, 83.0], lon: [-95.0, -61.0] }, // Nunavut
  'ON': { lat: [41.7, 57.0], lon: [-95.2, -74.3] }, // Ontario
  'PE': { lat: [46.0, 47.1], lon: [-64.4, -62.0] }, // Prince Edward Island
  'QC': { lat: [45.0, 62.0], lon: [-79.8, -57.1] }, // Quebec
  'SK': { lat: [49.0, 60.0], lon: [-110.0, -101.0] }, // Saskatchewan
  'YT': { lat: [60.0, 70.0], lon: [-141.0, -123.0] }, // Yukon
};

/**
 * Check if coordinates are within state/province bounds
 */
function isCoordinateInState(
  lat: number,
  lon: number,
  state: string,
  country: string
): { valid: boolean; expectedState?: string; issue?: string } {
  const stateUpper = state.trim().toUpperCase();

  // Handle USA states
  if (
    country?.toUpperCase().includes('USA') ||
    country?.toUpperCase().includes('UNITED STATES') ||
    country?.toUpperCase().includes('US')
  ) {
    // Check if state code exists
    if (US_STATE_BOUNDS[stateUpper]) {
      const bounds = US_STATE_BOUNDS[stateUpper];
      if (
        lat >= bounds.lat[0] &&
        lat <= bounds.lat[1] &&
        lon >= bounds.lon[0] &&
        lon <= bounds.lon[1]
      ) {
        return { valid: true };
      }

      // Find which state these coordinates actually belong to
      for (const [stateCode, stateBounds] of Object.entries(US_STATE_BOUNDS)) {
        if (
          lat >= stateBounds.lat[0] &&
          lat <= stateBounds.lat[1] &&
          lon >= stateBounds.lon[0] &&
          lon <= stateBounds.lon[1]
        ) {
          return {
            valid: false,
            expectedState: stateCode,
            issue: `Coordinates point to ${stateCode}, but state field says ${stateUpper}`,
          };
        }
      }

      return {
        valid: false,
        issue: `Coordinates (${lat}, ${lon}) are not within bounds of ${stateUpper}`,
      };
    }
  }

  // Handle Canada provinces
  if (country?.toUpperCase().includes('CANADA')) {
    if (CANADA_PROVINCE_BOUNDS[stateUpper]) {
      const bounds = CANADA_PROVINCE_BOUNDS[stateUpper];
      if (
        lat >= bounds.lat[0] &&
        lat <= bounds.lat[1] &&
        lon >= bounds.lon[0] &&
        lon <= bounds.lon[1]
      ) {
        return { valid: true };
      }

      // Find which province these coordinates actually belong to
      for (const [provinceCode, provinceBounds] of Object.entries(CANADA_PROVINCE_BOUNDS)) {
        if (
          lat >= provinceBounds.lat[0] &&
          lat <= provinceBounds.lat[1] &&
          lon >= provinceBounds.lon[0] &&
          lon <= provinceBounds.lon[1]
        ) {
          return {
            valid: false,
            expectedState: provinceCode,
            issue: `Coordinates point to ${provinceCode}, but state field says ${stateUpper}`,
          };
        }
      }

      return {
        valid: false,
        issue: `Coordinates (${lat}, ${lon}) are not within bounds of ${stateUpper}`,
      };
    }
  }

  // If we can't validate (unknown state code or country), assume valid
  return { valid: true };
}

async function validateCoordinatesByState(inputFile: string) {
  console.log(`Analyzing coordinates by state/country: ${inputFile}\n`);

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

  const mismatches: CoordinateMismatch[] = [];
  let validCount = 0;
  let skippedCount = 0;

  // Validate each row
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNumber = i + 3; // +3 for header lines and 1-indexed

    const lat = parseFloat(row.Latitude || '');
    const lon = parseFloat(row.Longitude || '');
    const state = (row.State || '').trim();
    const country = (row.Country || '').trim();

    // Skip if no coordinates
    if (isNaN(lat) || isNaN(lon)) {
      skippedCount++;
      continue;
    }

    // Skip if no state
    if (!state) {
      skippedCount++;
      continue;
    }

    // Validate coordinates against state
    const validation = isCoordinateInState(lat, lon, state, country);

    if (!validation.valid) {
      const propertyName = (row['Property Name'] || '').trim();
      const address = [
        row.Address,
        row.City,
        row.State,
        row['Zip Code'],
        row.Country,
      ]
        .filter(Boolean)
        .join(', ');

      mismatches.push({
        row: rowNumber,
        propertyName,
        address,
        city: row.City || '',
        state,
        country,
        lat,
        lon,
        expectedState: validation.expectedState || 'Unknown',
        issue: validation.issue || 'Coordinate validation failed',
      });
    } else {
      validCount++;
    }
  }

  // Print results
  console.log('=== COORDINATE VALIDATION BY STATE ===\n');
  console.log(`Total rows analyzed: ${records.length}`);
  console.log(`Valid coordinates: ${validCount}`);
  console.log(`Coordinate mismatches: ${mismatches.length}`);
  console.log(`Rows skipped (missing data): ${skippedCount}\n`);

  if (mismatches.length > 0) {
    console.log(`\n🔴 FOUND ${mismatches.length} COORDINATE MISMATCHES:\n`);

    // Group by issue type
    const byState = new Map<string, CoordinateMismatch[]>();
    for (const mismatch of mismatches) {
      const key = `${mismatch.state} → ${mismatch.expectedState}`;
      if (!byState.has(key)) {
        byState.set(key, []);
      }
      byState.get(key)!.push(mismatch);
    }

    for (const [stateTransition, issues] of Array.from(byState.entries()).sort(
      (a, b) => b[1].length - a[1].length
    )) {
      console.log(`\n${stateTransition}: ${issues.length} occurrences`);
      issues.slice(0, 5).forEach((mismatch) => {
        console.log(`  Row ${mismatch.row}: ${mismatch.propertyName || 'Unknown'}`);
        console.log(`    Address: ${mismatch.address}`);
        console.log(`    Current: ${mismatch.state}, Coords: ${mismatch.lat}, ${mismatch.lon}`);
        console.log(`    Should be: ${mismatch.expectedState}`);
      });
      if (issues.length > 5) {
        console.log(`    ... and ${issues.length - 5} more`);
      }
    }

    // Save detailed report
    const reportFile = inputFile.replace('.csv', '_COORDINATE_MISMATCHES.txt');
    const reportLines = [
      'COORDINATE VALIDATION REPORT',
      '============================',
      `Generated: ${new Date().toISOString()}`,
      `Total mismatches: ${mismatches.length}\n`,
    ];

    for (const mismatch of mismatches) {
      reportLines.push(`Row ${mismatch.row}: ${mismatch.propertyName || 'Unknown'}`);
      reportLines.push(`  Address: ${mismatch.address}`);
      reportLines.push(`  State in CSV: ${mismatch.state}`);
      reportLines.push(`  Coordinates: ${mismatch.lat}, ${mismatch.lon}`);
      reportLines.push(`  Expected State: ${mismatch.expectedState}`);
      reportLines.push(`  Issue: ${mismatch.issue}`);
      reportLines.push('');
    }

    fs.writeFileSync(reportFile, reportLines.join('\n'));
    console.log(`\n✓ Detailed report saved to: ${reportFile}`);
  } else {
    console.log('✅ All coordinates match their states/countries!\n');
  }

  return mismatches;
}

// Main execution
const inputFile =
  process.argv[2] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_FINAL.csv'
  );

validateCoordinatesByState(inputFile)
  .then((mismatches) => {
    if (mismatches.length > 0) {
      console.log(`\n⚠ Found ${mismatches.length} coordinate mismatches that need fixing.`);
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

