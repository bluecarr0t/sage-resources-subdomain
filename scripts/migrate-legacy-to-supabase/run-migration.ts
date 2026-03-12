#!/usr/bin/env npx tsx
/**
 * Orchestrate legacy campings DB to Supabase migration.
 *
 * Steps:
 *   1. Validate env vars (LEGACY_CAMPING_DB_*, SUPABASE_DB_URL)
 *   2. Export schema (export-legacy-schema.ts)
 *   3. Create tables in Supabase (run schema SQL)
 *   4. Export data (export-data.ts --exclude-large)
 *   5. Import data (import-data.ts)
 *
 * Prerequisites:
 *   - Run 01-enable-postgis.sql in Supabase SQL Editor manually first
 *   - Set SUPABASE_DB_URL in .env.local
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-to-supabase/run-migration.ts [--schema-only] [--skip-export] [--skip-import]
 *
 * Run: npx tsx scripts/migrate-legacy-to-supabase/run-migration.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { Pool } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const SCRIPT_DIR = resolve(process.cwd(), 'scripts/migrate-legacy-to-supabase');

function parseArgs(): { schemaOnly: boolean; skipExport: boolean; skipImport: boolean } {
  const args = process.argv.slice(2);
  return {
    schemaOnly: args.includes('--schema-only'),
    skipExport: args.includes('--skip-export'),
    skipImport: args.includes('--skip-import'),
  };
}

function validateEnv(): void {
  const required = [
    'LEGACY_CAMPING_DB_HOST',
    'LEGACY_CAMPING_DB_USER',
    'LEGACY_CAMPING_DB_PASSWORD',
  ];
  for (const k of required) {
    if (!process.env[k]) {
      throw new Error(`Missing ${k}. Add to .env.local`);
    }
  }
  if (!process.env.SUPABASE_DB_URL && !process.env.SKIP_SUPABASE) {
    console.warn('SUPABASE_DB_URL not set. Schema creation and import will be skipped.');
    console.warn('Add SUPABASE_DB_URL to .env.local for full migration.');
  }
}

async function runSchemaInSupabase(pool: Pool, schemaPath: string): Promise<void> {
  const sql = readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
}

async function main() {
  const { schemaOnly, skipExport, skipImport } = parseArgs();

  console.log('=== Legacy Campings DB to Supabase Migration ===\n');
  validateEnv();

  const supabaseUrl = process.env.SUPABASE_DB_URL;
  const hasSupabase = !!supabaseUrl;

  if (!skipExport) {
    console.log('Step 1: Export schema...');
    execSync('npx tsx scripts/migrate-legacy-to-supabase/export-legacy-schema.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('');
  }

  if (hasSupabase && (schemaOnly || !skipImport)) {
    console.log('Step 2: Create tables in Supabase...');
    const pool = new Pool({ connectionString: supabaseUrl });
    try {
      const postgisPath = resolve(SCRIPT_DIR, '01-enable-postgis.sql');
      if (existsSync(postgisPath)) {
        await pool.query(readFileSync(postgisPath, 'utf-8'));
        console.log('  PostGIS enabled.');
      }
      const hipcampPath = resolve(SCRIPT_DIR, 'schema-hipcamp.sql');
      const campspotPath = resolve(SCRIPT_DIR, 'schema-campspot.sql');
      if (existsSync(hipcampPath)) {
        await runSchemaInSupabase(pool, hipcampPath);
        console.log('  Created hipcamp schema and tables.');
      }
      if (existsSync(campspotPath)) {
        await runSchemaInSupabase(pool, campspotPath);
        console.log('  Created campspot schema and tables.');
      }
      await pool.end();
    } catch (err) {
      console.error('Schema creation failed:', err instanceof Error ? err.message : err);
      throw err;
    }
    console.log('');
  }

  if (schemaOnly) {
    console.log('Done (--schema-only).');
    return;
  }

  if (!skipExport) {
    console.log('Step 3: Export data (--exclude-large)...');
    execSync('npx tsx scripts/migrate-legacy-to-supabase/export-data.ts --exclude-large', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('');
  }

  if (hasSupabase && !skipImport) {
    console.log('Step 4: Import data to Supabase...');
    execSync('npx tsx scripts/migrate-legacy-to-supabase/import-data.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('');
  }

  console.log('=== Migration complete ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
