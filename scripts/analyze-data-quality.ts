import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  [key: string]: string;
}

interface DataQualityIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  examples: Array<{ row: number; value: string; field: string }>;
  count: number;
}

const issues: DataQualityIssue[] = [];

function addIssue(
  type: string,
  severity: 'high' | 'medium' | 'low',
  description: string,
  row: number,
  value: string,
  field: string
) {
  let issue = issues.find((i) => i.type === type);
  if (!issue) {
    issue = {
      type,
      severity,
      description,
      examples: [],
      count: 0,
    };
    issues.push(issue);
  }
  issue.count++;
  if (issue.examples.length < 5) {
    issue.examples.push({ row, value, field });
  }
}

async function analyzeDataQuality(inputFile: string) {
  console.log(`Analyzing data quality for: ${inputFile}\n`);

  const fileContent = fs.readFileSync(inputFile, 'utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim());

  // Combine header lines
  const headerLine1 = lines[0].trim();
  const headerLine2 = lines[1]?.trim() || '';
  const cleanHeader1 = headerLine1.replace(/,$/, '');
  const combinedHeader = cleanHeader1 + (headerLine2 ? ',' + headerLine2 : '');

  const dataLines = lines.slice(2);
  const reconstructedContent = combinedHeader + '\n' + dataLines.join('\n');

  const records: CSVRow[] = parse(reconstructedContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  });

  console.log(`Total rows: ${records.length}\n`);

  // Track various issues
  const emptyFields: { [key: string]: number } = {};
  const inconsistentCountryCodes: Set<string> = new Set();
  const inconsistentStateCodes: { [key: string]: Set<string> } = {};
  let priceFormatIssues: number = 0;
  let urlFormatIssues: number = 0;
  let missingCoordinates: number = 0;
  const duplicateEntries: Map<string, number[]> = new Map();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNumber = i + 3; // +3 for header lines and 1-indexed

    // Check for empty critical fields
    const criticalFields = [
      'Property Name',
      'Address',
      'City',
      'State',
      'Country',
      'Latitude',
      'Longitude',
    ];

    for (const field of criticalFields) {
      const value = (row[field] || '').trim();
      if (!value || value === '') {
        if (!emptyFields[field]) emptyFields[field] = 0;
        emptyFields[field]++;
        addIssue(
          `Missing ${field}`,
          field === 'Latitude' || field === 'Longitude' ? 'high' : 'medium',
          `${field} is empty or missing`,
          rowNumber,
          '',
          field
        );
      }
    }

    // Check Country field consistency
    const country = (row.Country || '').trim();
    if (country) {
      const normalized = country.toUpperCase();
      if (
        !normalized.includes('USA') &&
        !normalized.includes('UNITED STATES') &&
        !normalized.includes('CANADA') &&
        !normalized.includes('US')
      ) {
        inconsistentCountryCodes.add(country);
        addIssue(
          'Inconsistent Country Format',
          'medium',
          `Country value "${country}" may need standardization`,
          rowNumber,
          country,
          'Country'
        );
      }
    }

    // Check State field for trailing spaces or inconsistencies
    const state = (row.State || '').trim();
    if (state && state !== row.State) {
      addIssue(
        'State Field Has Trailing Spaces',
        'low',
        'State field has leading/trailing whitespace',
        rowNumber,
        `"${row.State}"`,
        'State'
      );
    }

    // Check for inconsistent state abbreviations
    if (state && state.length > 2) {
      // Full state name instead of abbreviation
      addIssue(
        'State Not Abbreviated',
        'low',
        'State should be abbreviated (e.g., CA not California)',
        rowNumber,
        state,
        'State'
      );
    }

    // Check Address field for issues
    const address = (row.Address || '').trim();
    if (address) {
      // Check for trailing commas or spaces
      if (address.endsWith(',') || address.endsWith(' ')) {
        addIssue(
          'Address Has Trailing Characters',
          'low',
          'Address field has trailing comma or space',
          rowNumber,
          address,
          'Address'
        );
      }
      // Check for empty address values like ", "
      if (address === ',' || address.match(/^,\s*$/)) {
        addIssue(
          'Address Field Empty',
          'medium',
          'Address field contains only comma/whitespace',
          rowNumber,
          address,
          'Address'
        );
      }
    }

    // Check URL format
    const url = (row.Url || '').trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      addIssue(
        'URL Missing Protocol',
        'medium',
        'URL should start with http:// or https://',
        rowNumber,
        url,
        'Url'
      );
    }

    // Check price formatting
    const priceFields = [
      'Retail Daily Rate 2024',
      'Retail Daily Rate(+fees) 2024',
      '2024 - Fall Weekday',
      '2024 - Fall Weekend',
      '2025 - Winter Weekday',
      '2025 - Winter Weekend',
      '2025 - Spring Weekday',
      '2025 - Spring Weekend',
      '2025 - Summer Weekday',
      '2025 - Summer Weekend',
    ];

    for (const field of priceFields) {
      const value = (row[field] || '').trim();
      if (value && value !== '') {
        // Check for inconsistent price formats
        if (
          value.includes('$') &&
          !value.match(/^\$[\d,]+(\.\d{2})?$/) &&
          !value.match(/^\$[\d,]+-\$[\d,]+$/)
        ) {
          addIssue(
            'Inconsistent Price Format',
            'low',
            `Price format may be inconsistent: ${value}`,
            rowNumber,
            value,
            field
          );
        }
      }
    }

    // Check coordinates
    const lat = parseFloat(row.Latitude || '');
    const lon = parseFloat(row.Longitude || '');
    if (isNaN(lat) || isNaN(lon)) {
      missingCoordinates++;
    }

    // Check for duplicate entries (same property name, address, and site name)
    const key = `${row['Property Name']}|${row.Address}|${row['Site Name']}`;
    if (!duplicateEntries.has(key)) {
      duplicateEntries.set(key, []);
    }
    duplicateEntries.get(key)!.push(rowNumber);
  }

  // Find actual duplicates
  for (const [key, rows] of duplicateEntries.entries()) {
    if (rows.length > 1) {
      addIssue(
        'Potential Duplicate Entry',
        'high',
        `Same property/address/site name appears ${rows.length} times`,
        rows[0],
        key.split('|')[0],
        'Property Name'
      );
    }
  }

  // Check for empty Site Name
  let emptySiteNames = 0;
  for (let i = 0; i < records.length; i++) {
    const siteName = (records[i]['Site Name'] || '').trim();
    if (!siteName) {
      emptySiteNames++;
      if (emptySiteNames <= 5) {
        addIssue(
          'Empty Site Name',
          'medium',
          'Site Name field is empty',
          i + 3,
          '',
          'Site Name'
        );
      }
    }
  }
  if (emptySiteNames > 5) {
    const issue = issues.find((i) => i.type === 'Empty Site Name');
    if (issue) {
      issue.count = emptySiteNames;
    }
  }

  // Check for inconsistent Unit Type values
  const unitTypes = new Set<string>();
  for (const row of records) {
    const unitType = (row['Unit Type'] || '').trim();
    if (unitType) unitTypes.add(unitType);
  }

  // Check for inconsistent Property Type values
  const propertyTypes = new Set<string>();
  for (const row of records) {
    const propType = (row['Property Type'] || '').trim();
    if (propType) propertyTypes.add(propType);
  }

  // Print summary
  console.log('=== DATA QUALITY ANALYSIS SUMMARY ===\n');

  // Group by severity
  const highIssues = issues.filter((i) => i.severity === 'high');
  const mediumIssues = issues.filter((i) => i.severity === 'medium');
  const lowIssues = issues.filter((i) => i.severity === 'low');

  if (highIssues.length > 0) {
    console.log('🔴 HIGH PRIORITY ISSUES:\n');
    highIssues.forEach((issue) => {
      console.log(`  ${issue.type}: ${issue.count} occurrences`);
      issue.examples.forEach((ex) => {
        console.log(`    - Row ${ex.row}: ${ex.value || '(empty)'} (${ex.field})`);
      });
      console.log('');
    });
  }

  if (mediumIssues.length > 0) {
    console.log('🟡 MEDIUM PRIORITY ISSUES:\n');
    mediumIssues.forEach((issue) => {
      console.log(`  ${issue.type}: ${issue.count} occurrences`);
      if (issue.examples.length > 0) {
        issue.examples.slice(0, 3).forEach((ex) => {
          console.log(`    - Row ${ex.row}: ${ex.value || '(empty)'} (${ex.field})`);
        });
        if (issue.examples.length > 3) {
          console.log(`    ... and ${issue.count - 3} more`);
        }
      }
      console.log('');
    });
  }

  if (lowIssues.length > 0) {
    console.log('🟢 LOW PRIORITY ISSUES:\n');
    lowIssues.forEach((issue) => {
      console.log(`  ${issue.type}: ${issue.count} occurrences`);
      if (issue.examples.length > 0 && issue.count <= 10) {
        issue.examples.forEach((ex) => {
          console.log(`    - Row ${ex.row}: ${ex.value || '(empty)'} (${ex.field})`);
        });
      }
      console.log('');
    });
  }

  // Additional statistics
  console.log('=== ADDITIONAL STATISTICS ===\n');
  console.log(`Total unique Unit Types: ${unitTypes.size}`);
  console.log(`  Examples: ${Array.from(unitTypes).slice(0, 10).join(', ')}`);
  console.log('');
  console.log(`Total unique Property Types: ${propertyTypes.size}`);
  console.log(`  Examples: ${Array.from(propertyTypes).slice(0, 10).join(', ')}`);
  console.log('');
  console.log(`Rows with missing coordinates: ${missingCoordinates}`);
  console.log(`Inconsistent country codes found: ${inconsistentCountryCodes.size}`);
  if (inconsistentCountryCodes.size > 0) {
    console.log(`  Examples: ${Array.from(inconsistentCountryCodes).slice(0, 5).join(', ')}`);
  }
  console.log('');

  // Recommendations
  console.log('=== RECOMMENDATIONS ===\n');
  const recommendations: string[] = [];

  if (highIssues.length > 0) {
    recommendations.push(
      '1. Fix high-priority issues first (missing coordinates, duplicates)'
    );
  }

  if (missingCoordinates > 0) {
    recommendations.push(
      `2. Geocode ${missingCoordinates} rows with missing coordinates`
    );
  }

  if (inconsistentCountryCodes.size > 0) {
    recommendations.push(
      '3. Standardize country field values (use "USA" or "United States" for US, "Canada" for Canada)'
    );
  }

  const stateIssues = issues.filter((i) => i.type.includes('State'));
  if (stateIssues.length > 0) {
    recommendations.push(
      '4. Standardize state abbreviations (use 2-letter codes: CA, NY, TX, etc.)'
    );
  }

  const addressIssues = issues.filter((i) => i.type.includes('Address'));
  if (addressIssues.length > 0) {
    recommendations.push('5. Clean up address fields (remove trailing commas/spaces)');
  }

  const urlIssues = issues.filter((i) => i.type.includes('URL'));
  if (urlIssues.length > 0) {
    recommendations.push('6. Add http:// or https:// protocol to URLs missing them');
  }

  const priceIssues = issues.filter((i) => i.type.includes('Price'));
  if (priceIssues.length > 0) {
    recommendations.push('7. Standardize price formatting (use $XXX.XX format)');
  }

  if (emptySiteNames > 0) {
    recommendations.push(
      `8. Fill in ${emptySiteNames} empty Site Name fields (or use Property Name as default)`
    );
  }

  recommendations.forEach((rec, idx) => {
    console.log(`  ${rec}`);
  });

  console.log('\n=== ANALYSIS COMPLETE ===\n');
}

// Main execution
const inputFile =
  process.argv[2] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_CORRECTED.csv'
  );

analyzeDataQuality(inputFile)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

