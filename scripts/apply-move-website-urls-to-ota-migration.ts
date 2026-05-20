#!/usr/bin/env npx tsx
/**
 * Move Hipcamp/Airbnb/Booking.com URLs from `url` into OTA columns and clear `url`.
 * Run: npx tsx scripts/apply-move-website-urls-to-ota-migration.ts
 * Dry-run counts: npx tsx scripts/apply-move-website-urls-to-ota-migration.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/move-website-urls-to-ota-columns-2026-05-20.sql'),
  'utf-8'
);

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();

    if (DRY_RUN) {
      const { rows } = await client.query<{ platform: string; count: string }>(`
        SELECT 'hipcamp' AS platform, COUNT(*)::text AS count
        FROM public.all_glamping_properties
        WHERE url IS NOT NULL AND trim(url) <> ''
          AND (url ILIKE '%://%.hipcamp.%' OR url ILIKE '%://hipcamp.%')
        UNION ALL
        SELECT 'airbnb', COUNT(*)::text
        FROM public.all_glamping_properties
        WHERE url IS NOT NULL AND trim(url) <> ''
          AND (url ILIKE '%://%.airbnb.%' OR url ILIKE '%://airbnb.%')
        UNION ALL
        SELECT 'booking_com', COUNT(*)::text
        FROM public.all_glamping_properties
        WHERE url IS NOT NULL AND trim(url) <> ''
          AND url ILIKE '%booking.com%'
      `);
      console.log('Rows that would move (url → OTA column, url cleared):');
      for (const r of rows) {
        console.log(`  ${r.platform}: ${r.count}`);
      }
      return;
    }

    await client.query(MIGRATION_SQL);
    console.log('✓ Moved OTA website URLs to ota_url_* columns and cleared url');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
