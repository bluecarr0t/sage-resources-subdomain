import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  [key: string]: string;
}

interface CleaningStats {
  stateTrimmed: number;
  addressTrimmed: number;
  urlsFixed: number;
  pricesStandardized: number;
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
 * Trim whitespace from state field
 */
function cleanState(state: string): { cleaned: string; changed: boolean } {
  const trimmed = state.trim();
  return {
    cleaned: trimmed,
    changed: trimmed !== state,
  };
}

/**
 * Remove trailing commas and spaces from address field
 */
function cleanAddress(address: string): { cleaned: string; changed: boolean } {
  let cleaned = address.trim();
  const original = cleaned;

  // Remove trailing commas
  cleaned = cleaned.replace(/,\s*$/, '');

  // Remove trailing spaces
  cleaned = cleaned.trimEnd();

  return {
    cleaned,
    changed: cleaned !== original,
  };
}

/**
 * Add https:// protocol to URL if missing
 */
function cleanUrl(url: string): { cleaned: string; changed: boolean } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { cleaned: trimmed, changed: false };
  }

  // Skip if already has protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { cleaned: trimmed, changed: false };
  }

  // Skip if it's clearly not a URL (e.g., just a domain without TLD)
  if (!trimmed.includes('.') && !trimmed.startsWith('www.')) {
    return { cleaned: trimmed, changed: false };
  }

  // Add https://
  return { cleaned: `https://${trimmed}`, changed: true };
}

/**
 * Standardize price format
 */
function cleanPrice(price: string): { cleaned: string; changed: boolean } {
  const trimmed = price.trim();
  if (!trimmed) {
    return { cleaned: trimmed, changed: false };
  }

  // Skip if already properly formatted or contains text
  if (
    trimmed.includes('Not Available') ||
    trimmed.includes('No Available') ||
    trimmed.includes('unavailable') ||
    trimmed.includes('N/F') ||
    trimmed.includes('Checked by') ||
    !trimmed.includes('$')
  ) {
    return { cleaned: trimmed, changed: false };
  }

  const original = trimmed;

  // Handle price ranges like $1150-1450 or $200-220
  if (trimmed.match(/^\$[\d,]+-[\d,]+$/)) {
    const match = trimmed.match(/^\$([\d,]+)-([\d,]+)$/);
    if (match) {
      const price1 = match[1].replace(/,/g, '');
      const price2 = match[2].replace(/,/g, '');

      // Format with commas for thousands
      const formatted1 = formatPrice(price1);
      const formatted2 = formatPrice(price2);

      return {
        cleaned: `$${formatted1} - $${formatted2}`,
        changed: true,
      };
    }
  }

  // Handle single prices - ensure proper comma formatting
  if (trimmed.match(/^\$[\d,]+$/)) {
    const numericPart = trimmed.replace(/[$,]/g, '');
    const numValue = parseFloat(numericPart);
    if (!isNaN(numValue)) {
      const formatted = formatPrice(numericPart);
      if (formatted !== numericPart) {
        return {
          cleaned: `$${formatted}`,
          changed: true,
        };
      }
    }
  }

  // Handle prices with decimals
  if (trimmed.match(/^\$[\d,]+\.[\d]+$/)) {
    const match = trimmed.match(/^\$([\d,]+)\.([\d]+)$/);
    if (match) {
      const wholePart = match[1].replace(/,/g, '');
      const decimalPart = match[2];
      const formatted = formatPrice(wholePart);
      return {
        cleaned: `$${formatted}.${decimalPart}`,
        changed: true,
      };
    }
  }

  return { cleaned: trimmed, changed: false };
}

/**
 * Format price with comma separators for thousands
 */
function formatPrice(priceStr: string): string {
  const num = parseFloat(priceStr.replace(/,/g, ''));
  if (isNaN(num)) return priceStr;

  // Add commas for thousands
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function cleanDataFormatting(inputFile: string, outputFile: string) {
  console.log(`Reading CSV file: ${inputFile}`);

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

  const stats: CleaningStats = {
    stateTrimmed: 0,
    addressTrimmed: 0,
    urlsFixed: 0,
    pricesStandardized: 0,
  };

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

  // Clean each row
  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    // Clean State field
    if (row.State) {
      const { cleaned, changed } = cleanState(row.State);
      if (changed) {
        row.State = cleaned;
        stats.stateTrimmed++;
      }
    }

    // Clean Address field
    if (row.Address) {
      const { cleaned, changed } = cleanAddress(row.Address);
      if (changed) {
        row.Address = cleaned;
        stats.addressTrimmed++;
      }
    }

    // Clean URL field
    if (row.Url) {
      const { cleaned, changed } = cleanUrl(row.Url);
      if (changed) {
        row.Url = cleaned;
        stats.urlsFixed++;
      }
    }

    // Clean price fields
    for (const field of priceFields) {
      if (row[field]) {
        const { cleaned, changed } = cleanPrice(row[field]);
        if (changed) {
          row[field] = cleaned;
          stats.pricesStandardized++;
        }
      }
    }
  }

  // Write cleaned CSV
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
  console.log(`✓ Written cleaned CSV to: ${outputFile}\n`);

  // Print summary
  console.log('=== CLEANING SUMMARY ===\n');
  console.log(`State fields trimmed: ${stats.stateTrimmed}`);
  console.log(`Address fields cleaned: ${stats.addressTrimmed}`);
  console.log(`URLs fixed (https:// added): ${stats.urlsFixed}`);
  console.log(`Price fields standardized: ${stats.pricesStandardized}`);
  console.log('\n✓ Data cleaning complete!\n');
}

// Main execution
const inputFile =
  process.argv[2] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_CORRECTED.csv'
  );
const outputFile =
  process.argv[3] ||
  path.join(
    __dirname,
    '../csv/Sage Database_ Glamping Sites  - Work In Progress (1)_CLEANED.csv'
  );

cleanDataFormatting(inputFile, outputFile)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

