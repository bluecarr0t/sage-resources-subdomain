#!/usr/bin/env npx tsx
/**
 * Apply managed_users admin/author role migration.
 * Run: npm run migrate:managed-user-roles
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_FILE = 'scripts/migrations/managed-users-role-admin-author-2026-06-23.sql';

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    console.error(`\nOr run ${MIGRATION_FILE} manually in Supabase SQL Editor.`);
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const sql = readFileSync(resolve(process.cwd(), MIGRATION_FILE), 'utf-8');
    await client.query(sql);
    console.log(`✓ ${MIGRATION_FILE}`);
    console.log('✓ Managed user role migration applied');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
