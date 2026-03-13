#!/usr/bin/env npx tsx
/**
 * Import data from CSV files into Supabase.
 * Reads from scripts/migrate-legacy-to-supabase/data/
 *
 * Prerequisites:
 *   1. Run 01-enable-postgis.sql in Supabase SQL Editor
 *   2. Run schema-hipcamp.sql and schema-campspot.sql
 *   3. Run export-data.ts to generate CSV files
 *   4. Set SUPABASE_DB_URL in .env.local
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-to-supabase/import-data.ts [--tables=table1,table2] [--truncate]
 *
 * Run: npx tsx scripts/migrate-legacy-to-supabase/import-data.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, readdirSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const DATA_DIR = resolve(process.cwd(), 'scripts/migrate-legacy-to-supabase/data');
const BATCH_SIZE = 1000;

function getSupabasePool(): Pool {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL is required. Add it to .env.local (Dashboard > Project Settings > Database)');
  }
  return new Pool({ connectionString: url });
}

function parseArgs(): { tables?: string[]; truncate?: boolean } {
  const args = process.argv.slice(2);
  let tables: string[] | undefined;
  let truncate = false;
  for (const a of args) {
    if (a.startsWith('--tables=')) {
      tables = a.slice(9).split(',').map((t) => t.trim());
    } else if (a === '--truncate') {
      truncate = true;
    }
  }
  return { tables, truncate };
}

function parseCsvValue(val: string, col: string): unknown {
  if (val === '' || val === 'null') return null;
  if (col.includes('_id') || col === 'id' || col === 'scraping_id' || col === 'import_id') {
    const n = parseInt(val, 10);
    return isNaN(n) ? val : n;
  }
  if (col === 'year' || col === 'camp_available' || col === 'camp_count') {
    const n = parseInt(val, 10);
    return isNaN(n) ? val : n;
  }
  if (col === 'status' && /^\d+$/.test(val)) return parseInt(val, 10);
  if (col === 'price' || col === 'total_price' || col === 'avg_occupancy' || col === 'avg_price' ||
      col === 'avg_total_price' || col === 'revpar' || col === 'min_price' || col === 'max_price' || col === 'acres') {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  if (val === 'true' || val === 't') return true;
  if (val === 'false' || val === 'f') return false;
  if (col === 'coordinates' && val && val.startsWith('POINT')) {
    return val;
  }
  if (val.startsWith('{') || val.startsWith('[')) {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

async function importTable(pool: Pool, schema: string, table: string, truncateFirst: boolean): Promise<number> {
  const filePath = resolve(DATA_DIR, `${schema}_${table}.csv`);
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    console.log(`  ${schema}.${table}: file not found, skipping.`);
    return 0;
  }

  const fullTable = `${schema}.${table}`;
  if (truncateFirst) {
    const client = await pool.connect();
    try {
      await client.query(`TRUNCATE TABLE ${fullTable}`);
      console.log(`  ${fullTable}: truncated.`);
    } finally {
      client.release();
    }
  }

  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }) as Record<string, string>[];
  if (records.length === 0) {
    console.log(`  ${schema}.${table}: 0 rows (empty file).`);
    return 0;
  }

  const columns = Object.keys(records[0]);
  const geomCols = columns.filter((c) => c === 'coordinates');
  const colList = columns.join(', ');

  let imported = 0;
  const client = await pool.connect();
  try {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const values: unknown[] = [];
      const rowPlaceholders: string[] = [];

      batch.forEach((row, rowIdx) => {
        const base = rowIdx * columns.length;
        const ph = columns.map((c, colIdx) => {
          const paramNum = base + colIdx + 1;
          values.push(parseCsvValue(row[c] ?? '', c));
          return geomCols.includes(c) ? `ST_GeomFromText($${paramNum}, 4326)::geometry` : `$${paramNum}`;
        }).join(', ');
        rowPlaceholders.push(`(${ph})`);
      });

      const sql = `INSERT INTO ${fullTable} (${colList}) VALUES ${rowPlaceholders.join(', ')}`;
      await client.query(sql, values);
      imported += batch.length;
      process.stdout.write(`\r  ${fullTable}: ${imported}/${records.length} rows...`);
    }
  } finally {
    client.release();
  }
  console.log(`\r  ${fullTable}: ${imported} rows imported.`);
  return imported;
}

async function main() {
  const { tables: filterTables, truncate } = parseArgs();
  const pool = getSupabasePool();

  console.log('Importing data to Supabase...\n');

  const files = readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith('.csv'))
    .map((f) => {
      const base = f.name.slice(0, -4);
      const idx = base.indexOf('_');
      if (idx <= 0) return null;
      return { schema: base.slice(0, idx), table: base.slice(idx + 1) };
    })
    .filter((x): x is { schema: string; table: string } => x !== null);

  if (filterTables?.length) {
    const filtered = files.filter((f) =>
      filterTables.some((t) => t === f.table || `${f.schema}.${f.table}` === t)
    );
    if (filtered.length === 0) {
      console.log('No matching tables found.');
      return;
    }
  }

  const toImport = filterTables?.length ? files.filter((f) => filterTables.some((t) => t === f.table || `${f.schema}.${f.table}` === t)) : files;

  let total = 0;
  for (const { schema, table } of toImport) {
    try {
      const n = await importTable(pool, schema, table, truncate ?? false);
      total += n;
    } catch (err) {
      console.error(`Failed to import ${schema}.${table}:`, err instanceof Error ? err.message : err);
    }
  }

  await pool.end();
  console.log(`\nImported ${total} total rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
