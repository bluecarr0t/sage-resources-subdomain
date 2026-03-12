#!/usr/bin/env npx tsx
/**
 * Export data from legacy campings DB to CSV files.
 * Writes to scripts/migrate-legacy-to-supabase/data/
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-to-supabase/export-data.ts [--tables=table1,table2] [--exclude-large]
 *
 * --tables: comma-separated list of tables to export (default: all)
 * --exclude-large: skip sites table (88M campspot, 28M hipcamp)
 *
 * Run: npx tsx scripts/migrate-legacy-to-supabase/export-data.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { query, getClient, closeLegacyCampingPool } from '../../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

const DATA_DIR = resolve(process.cwd(), 'scripts/migrate-legacy-to-supabase/data');
const BATCH_SIZE = 10000;

const LARGE_TABLES = ['hipcamp.sites', 'campspot.sites', 'hipcamp.propertys'];

// Order: smaller tables first (imports, scrapings, then propertydetails, etc.)
const TABLES_BY_SCHEMA: Record<string, string[]> = {
  hipcamp: ['imports', 'scrapings', 'propertydetails', 'importedsites', 'sitedetails', 'siteseasonals', 'old_data_table', 'propertys', 'sites'],
  campspot: ['scrapings', 'propertydetails', 'sitedetails', 'siteseasonals', 'old_data_table', 'propertys', 'sites'],
};

function parseArgs(): { tables?: string[]; excludeLarge: boolean } {
  const args = process.argv.slice(2);
  let tables: string[] | undefined;
  let excludeLarge = false;
  for (const a of args) {
    if (a.startsWith('--tables=')) {
      tables = a.slice(9).split(',').map((t) => t.trim());
    } else if (a === '--exclude-large') {
      excludeLarge = true;
    }
  }
  return { tables, excludeLarge };
}

function toCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

async function exportTable(schema: string, table: string): Promise<number> {
  const { rows: colRows } = await query<{ column_name: string; udt_name: string }>(`
    SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schema, table]);

  const columns = (colRows || []).map((r) => r.column_name);
  const geomCols = (colRows || []).filter((r) => r.udt_name === 'geometry').map((r) => r.column_name);

  const selectCols = columns.map((c) => {
    if (geomCols.includes(c)) return `ST_AsText(${c})::text as ${c}`;
    return c;
  });

  const fullTable = `${schema}.${table}`;
  const selectList = selectCols.join(', ');

  const { rows } = await query<Record<string, unknown>>(`SELECT ${selectList} FROM ${fullTable}`);
  const count = rows?.length ?? 0;

  if (count > 0) {
    const outRows = (rows || []).map((row) => {
      const out: Record<string, string> = {};
      for (const col of columns) {
        out[col] = toCsvValue(row[col]);
      }
      return out;
    });
    const csv = stringify(outRows, { header: true, columns });
    const outPath = resolve(DATA_DIR, `${schema}_${table}.csv`);
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(outPath, csv, 'utf-8');
    console.log(`  ${fullTable}: ${count} rows exported.`);
  }
  return count;
}

async function main() {
  const { tables: filterTables, excludeLarge } = parseArgs();
  console.log('Exporting data from legacy campings DB...\n');

  const toExport: { schema: string; table: string }[] = [];
  for (const [schema, tables] of Object.entries(TABLES_BY_SCHEMA)) {
    for (const table of tables) {
      const key = `${schema}.${table}`;
      if (excludeLarge && LARGE_TABLES.includes(key)) {
        console.log(`Skipping ${key} (--exclude-large)`);
        continue;
      }
      if (filterTables && filterTables.length > 0) {
        const match = filterTables.some((t) => t === table || t === key);
        if (!match) continue;
      }
      toExport.push({ schema, table });
    }
  }

  let total = 0;
  for (const { schema, table } of toExport) {
    try {
      const n = await exportTable(schema, table);
      total += n;
    } catch (err) {
      console.error(`Failed to export ${schema}.${table}:`, err instanceof Error ? err.message : err);
    }
  }

  await closeLegacyCampingPool();
  console.log(`\nExported ${total} total rows to ${DATA_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
