#!/usr/bin/env npx tsx
/**
 * Export schema DDL from legacy campings DB for hipcamp and campspot.
 * Writes schema-hipcamp.sql and schema-campspot.sql.
 *
 * Uses pg_dump if available (preferred), otherwise builds DDL from information_schema.
 *
 * Run: npx tsx scripts/migrate-legacy-to-supabase/export-legacy-schema.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { query, closeLegacyCampingPool } from '../../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_DIR = resolve(process.cwd(), 'scripts/migrate-legacy-to-supabase');

type ColumnRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
};

type PkRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
};

function tryPgDump(schema: string): string | null {
  const host = process.env.LEGACY_CAMPING_DB_HOST;
  const user = process.env.LEGACY_CAMPING_DB_USER;
  const db = process.env.LEGACY_CAMPING_DB_NAME || 'campings';
  const password = process.env.LEGACY_CAMPING_DB_PASSWORD;
  if (!host || !user || !password) return null;

  try {
    const env = { ...process.env, PGPASSWORD: password };
    const out = execSync(
      `pg_dump -h ${host} -U ${user} -d ${db} --schema=${schema} --schema-only --no-owner --no-privileges 2>/dev/null`,
      { encoding: 'utf-8', env, timeout: 30000 }
    );
    return out;
  } catch {
    return null;
  }
}

function mapType(udtName: string, dataType: string): string {
  if (udtName === 'geometry') return 'geometry(Point, 4326)';
  if (udtName === 'int4') return 'INTEGER';
  if (udtName === 'int8') return 'BIGINT';
  if (udtName === 'float8') return 'DOUBLE PRECISION';
  if (udtName === 'numeric') return 'NUMERIC';
  if (udtName === 'bool') return 'BOOLEAN';
  if (udtName === 'timestamp') return 'TIMESTAMP WITH TIME ZONE';
  if (udtName === 'timestamptz') return 'TIMESTAMP WITH TIME ZONE';
  if (udtName === 'uuid') return 'UUID';
  if (udtName === 'varchar' || udtName === 'character varying') return 'VARCHAR';
  if (udtName === 'json' || udtName === 'jsonb') return udtName.toUpperCase();
  return dataType.toUpperCase();
}

async function buildDdlFromSchema(schema: string): Promise<string> {
  const tables = await query<{ table_name: string; table_type: string }>(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `, [schema]);

  const { rows: columns } = await query<ColumnRow>(`
    SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = $1
    ORDER BY table_name, ordinal_position
  `, [schema]);

  const { rows: pks } = await query<PkRow>(`
    SELECT tc.table_schema, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = $1 AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY tc.table_name, kcu.ordinal_position
  `, [schema]);

  const pkByTable = new Map<string, string[]>();
  for (const pk of pks || []) {
    const key = `${pk.table_schema}.${pk.table_name}`;
    if (!pkByTable.has(key)) pkByTable.set(key, []);
    pkByTable.get(key)!.push(pk.column_name);
  }

  const colsByTable = new Map<string, ColumnRow[]>();
  for (const col of columns || []) {
    const key = `${col.table_name}`;
    if (!colsByTable.has(key)) colsByTable.set(key, []);
    colsByTable.get(key)!.push(col);
  }

  const lines: string[] = [`CREATE SCHEMA IF NOT EXISTS ${schema};`, ''];

  for (const t of tables.rows || []) {
    const tableCols = colsByTable.get(t.table_name) || [];
    if (tableCols.length === 0) continue;

    const colDefs = tableCols.map((c) => {
      const typ = mapType(c.udt_name, c.data_type);
      const nullStr = c.is_nullable === 'YES' ? '' : ' NOT NULL';
      let def = '';
      if (c.column_default && !c.column_default.includes('nextval')) {
        def = ` DEFAULT ${c.column_default}`;
      } else if (c.column_default?.includes('now()')) {
        def = ' DEFAULT now()';
      }
      return `  ${c.column_name} ${typ}${nullStr}${def}`;
    });

    const pkCols = pkByTable.get(`${schema}.${t.table_name}`);
    if (pkCols?.length) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }

    lines.push(`CREATE TABLE IF NOT EXISTS ${schema}.${t.table_name} (`);
    lines.push(colDefs.join(',\n'));
    lines.push(');');
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  console.log('Exporting legacy schema (hipcamp, campspot)...\n');
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const usePgDump = process.env.USE_PG_DUMP === '1';
  for (const schema of ['hipcamp', 'campspot']) {
    let ddl: string;
    if (usePgDump) {
      const pgOut = tryPgDump(schema);
      if (pgOut && pgOut.length > 100) {
        ddl = `-- Exported via pg_dump\nCREATE SCHEMA IF NOT EXISTS ${schema};\n\n` + pgOut;
        ddl = ddl.replace(/\bOWNER TO .+;/g, '');
        ddl = ddl.replace(/\bTABLESPACE .+/g, '');
      } else {
        console.log(`pg_dump failed, building from information_schema for ${schema}...`);
        ddl = await buildDdlFromSchema(schema);
      }
    } else {
      console.log(`Building DDL from information_schema for ${schema}...`);
      ddl = await buildDdlFromSchema(schema);
    }

    const outPath = resolve(OUTPUT_DIR, `schema-${schema}.sql`);
    writeFileSync(outPath, ddl, 'utf-8');
    console.log(`Wrote ${outPath}`);
  }

  await closeLegacyCampingPool();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
