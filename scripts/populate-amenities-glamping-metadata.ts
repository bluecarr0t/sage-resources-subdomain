#!/usr/bin/env npx tsx
/**
 * Fill amenities.glamping_fields and dataset-only rows from glamping-properties-amenity-columns.
 * Run after: scripts/migrations/create-amenities-table.sql (and catalog seed / legacy copy).
 *
 *   npx tsx scripts/populate-amenities-glamping-metadata.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import { syncAmenitiesGlampingMetadata } from '../lib/site-builder/amenities-glamping-metadata-sync';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL required in .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await syncAmenitiesGlampingMetadata(client);
    console.log('✓ amenities glamping metadata synced');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
