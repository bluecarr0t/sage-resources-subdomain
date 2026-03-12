#!/usr/bin/env npx tsx
/**
 * Test legacy camping database connection (Hipcamp/Campspot old data)
 * Run with: npx tsx scripts/test-legacy-camping-db.ts
 *
 * Requires .env.local with:
 *   LEGACY_CAMPING_DB_HOST=146.190.212.63
 *   LEGACY_CAMPING_DB_PORT=5432
 *   LEGACY_CAMPING_DB_USER=rou
 *   LEGACY_CAMPING_DB_PASSWORD=<password>
 *   LEGACY_CAMPING_DB_NAME=campings
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import {
  query,
  closeLegacyCampingPool,
  getLegacyCampingPool,
} from '../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🔍 Testing Legacy Camping DB Connection...\n');

  const host = process.env.LEGACY_CAMPING_DB_HOST || '146.190.212.63';
  const db = process.env.LEGACY_CAMPING_DB_NAME || 'campings';
  console.log(`📋 Config: ${host} / ${db}`);
  console.log('');

  try {
    // 1. Basic connection test
    console.log('1️⃣  Testing connection...');
    const pool = getLegacyCampingPool();
    const client = await pool.connect();

    // 2. Simple query
    console.log('2️⃣  Running SELECT 1...');
    const { rows } = await query('SELECT 1');
    if (rows && rows.length > 0) {
      console.log('   ✅ Connection successful!\n');
    } else {
      console.log('   ⚠️  Unexpected result:', rows);
    }

    // 3. List tables/schemas
    console.log('3️⃣  Listing databases/schemas...');
    const schemaResult = await query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema') ORDER BY schema_name`
    );
    console.log(
      '   Schemas:',
      schemaResult.rows?.map((r) => r.schema_name).join(', ') || 'none'
    );

    // 4. List tables in public schema
    const tableResult = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 20`
    );
    console.log(
      '   Tables (public):',
      tableResult.rows?.map((r) => r.table_name).join(', ') || 'none'
    );

    client.release();

    console.log('\n🎉 Legacy camping DB connection is working!\n');
  } catch (err) {
    console.error('❌ Connection failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeLegacyCampingPool();
  }
}

main();
