#!/usr/bin/env npx tsx
/**
 * Examine all schemas and tables in the legacy camping database
 * Run with: npx tsx scripts/examine-legacy-db-schema.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { query, closeLegacyCampingPool } from '../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

type SchemaRow = { schema_name: string };
type TableRow = { schema_name: string; table_name: string; row_count?: string };

async function main() {
  console.log('📊 Legacy Camping DB - Schema & Table Examination\n');
  console.log('='.repeat(70));

  try {
    // 1. All schemas
    const schemas = await query<SchemaRow>(
      `SELECT schema_name FROM information_schema.schemata 
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') 
       ORDER BY schema_name`
    );
    console.log('\n📁 SCHEMAS:\n');
    for (const row of schemas.rows || []) {
      console.log(`   • ${row.schema_name}`);
    }

    // 2. All tables per schema with row counts
    const tables = await query<TableRow>(
      `SELECT table_schema as schema_name, table_name 
       FROM information_schema.tables 
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       AND table_type = 'BASE TABLE'
       ORDER BY table_schema, table_name`
    );

    console.log('\n📋 TABLES BY SCHEMA:\n');
    let currentSchema = '';
    for (const row of tables.rows || []) {
      if (row.schema_name !== currentSchema) {
        currentSchema = row.schema_name;
        console.log(`\n   ${currentSchema}:`);
      }
      console.log(`      - ${row.table_name}`);
    }

    // 3. Row counts for each table (approximate from pg_stat_user_tables)
    console.log('\n\n📈 ROW COUNTS (approximate):\n');
    const counts = await query<{ schemaname: string; relname: string; n_live_tup: string }>(
      `SELECT schemaname, relname, n_live_tup::text 
       FROM pg_stat_user_tables 
       WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
       ORDER BY schemaname, relname`
    );

    currentSchema = '';
    for (const row of counts.rows || []) {
      if (row.schemaname !== currentSchema) {
        currentSchema = row.schemaname;
        console.log(`   ${currentSchema}:`);
      }
      const count = parseInt(row.n_live_tup, 10).toLocaleString();
      console.log(`      ${row.relname}: ${count} rows`);
    }

    // 4. Column summary for key schemas (hipcamp, campspot)
    console.log('\n\n🔍 COLUMN DETAILS (hipcamp & campspot tables):\n');
    const columns = await query<{ table_schema: string; table_name: string; column_name: string; data_type: string }>(
      `SELECT table_schema, table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema IN ('hipcamp', 'campspot')
       ORDER BY table_schema, table_name, ordinal_position`
    );

    let currentTable = '';
    for (const col of columns.rows || []) {
      const tableKey = `${col.table_schema}.${col.table_name}`;
      if (tableKey !== currentTable) {
        currentTable = tableKey;
        console.log(`\n   ${currentTable}:`);
      }
      console.log(`      ${col.column_name}: ${col.data_type}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Examination complete.\n');
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeLegacyCampingPool();
  }
}

main();
