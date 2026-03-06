/**
 * Script to upload Hipcamp CSV data to Supabase 'hipcamp' table
 *
 * Usage:
 *   npx tsx scripts/upload-hipcamp-csv.ts [path-to-csv]
 *
 * Default CSV path: csv/sites-Hipcamp-United States- (1).csv
 *
 * Prerequisites:
 *   1. Run scripts/migrations/create-hipcamp-table.sql in Supabase SQL Editor first
 *   2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'hipcamp';
const DEFAULT_CSV_PATH = 'csv/sites-Hipcamp-United States- (1).csv';

interface CSVRow {
  [key: string]: string | null;
}

/**
 * Sanitize CSV column name to valid PostgreSQL identifier
 */
function sanitizeColumnName(col: string): string {
  const sanitized = col
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return sanitized || 'col';
}

/**
 * Parse CSV file and return array of objects
 */
function parseCSV(filePath: string): CSVRow[] {
  try {
    console.log(`📖 Reading CSV file: ${filePath}`);
    const fileContent = readFileSync(filePath, 'utf-8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      cast: false,
    }) as CSVRow[];

    console.log(`✅ Parsed ${records.length} rows from CSV`);
    return records;
  } catch (error) {
    console.error(
      `❌ Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

/**
 * Map CSV row to table row - all columns as TEXT, empty strings to null
 */
function mapRowToTable(csvRow: CSVRow, headerToColumn: Map<string, string>): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  for (const [csvHeader, value] of Object.entries(csvRow)) {
    const columnName = headerToColumn.get(csvHeader);
    if (!columnName) continue;

    if (value === undefined || value === null) {
      row[columnName] = null;
    } else {
      const trimmed = String(value).trim();
      row[columnName] = trimmed === '' ? null : trimmed;
    }
  }
  return row;
}

/**
 * Upload data to Supabase in batches
 */
async function uploadData(
  supabase: ReturnType<typeof createClient>,
  data: Record<string, string | null>[]
): Promise<void> {
  const BATCH_SIZE = 500;
  console.log(`\n📤 Uploading ${data.length} rows to '${TABLE_NAME}' table...`);

  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);

    console.log(`  📦 Uploading batch ${batchNumber}/${totalBatches} (${batch.length} rows)...`);

    const { error } = await supabase.from(TABLE_NAME).insert(batch);

    if (error) {
      console.error(`  ❌ Error uploading batch ${batchNumber}: ${error.message}`);
      if (error.message.includes('invalid input syntax')) {
        console.error(`     Sample row:`, JSON.stringify(batch[0], null, 2));
      }
      errors += batch.length;
    } else {
      uploaded += batch.length;
      console.log(`  ✅ Batch ${batchNumber} uploaded successfully`);
    }
  }

  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Successfully uploaded: ${uploaded} rows`);
  if (errors > 0) {
    console.log(`   ❌ Failed: ${errors} rows`);
  }

  if (errors > 0) {
    throw new Error(`Failed to upload ${errors} rows`);
  }
}

async function main() {
  const csvPath = process.argv[2] || resolve(process.cwd(), DEFAULT_CSV_PATH);

  try {
    const csvData = parseCSV(csvPath);

    if (csvData.length === 0) {
      console.error('❌ CSV file is empty or has no data rows');
      process.exit(1);
    }

    const csvHeaders = Object.keys(csvData[0]);
    const headerToColumn = new Map<string, string>();
    for (const h of csvHeaders) {
      headerToColumn.set(h, sanitizeColumnName(h));
    }

    console.log(`\n📋 Detected ${csvHeaders.length} columns`);

    console.log('\n🔌 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify table exists
    const { error: tableError } = await supabase.from(TABLE_NAME).select('*').limit(0);
    if (tableError) {
      if (tableError.code === 'PGRST116' || tableError.message.includes('does not exist')) {
        console.error('\n❌ Table "hipcamp" does not exist.');
        console.error('Please run scripts/migrations/create-hipcamp-table.sql in Supabase SQL Editor first.');
        process.exit(1);
      }
      throw tableError;
    }
    console.log(`✅ Table '${TABLE_NAME}' exists`);

    // Map all rows
    const mappedData = csvData.map((row) => mapRowToTable(row, headerToColumn));

    await uploadData(supabase, mappedData);

    console.log('\n🎉 Upload completed successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`  1. Verify the data in Supabase Dashboard → Table Editor → ${TABLE_NAME}`);
  } catch (error) {
    console.error('\n❌ Upload failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
