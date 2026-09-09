#!/usr/bin/env npx tsx
/**
 * Apply late-research corrections for the 2026-09-04 screenshot batch.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(
      readFileSync(
        resolve(
          process.cwd(),
          'scripts/migrations/patch-screenshot-batch-followup-2026-09-04.sql'
        ),
        'utf-8'
      )
    );
    const { rows } = await client.query(
      `SELECT id, property_name, site_name, quantity_of_units, property_total_sites,
              is_open, research_status, city, lat, lon, phone_number,
              year_site_opened, rate_summer_weekday, rate_avg_retail_daily_rate
       FROM all_sage_data
       WHERE id IN (10981, 13338, 11000, 11284, 11286, 13038, 13335, 11023, 13337, 142, 11261)
          OR property_id IN (
            '78a04039-ddd8-4307-b778-c290d74bdae3',
            'a5593883-eb00-4c3a-8bb0-4662d38749aa',
            'e3fca711-a1f7-4755-8c24-37652640a7e2',
            '33387855-ffc9-4b5c-a51c-52c18c93b495',
            '91d8006a-c6e9-4c74-8ec4-ca7b7929a8ac'
          )
       ORDER BY property_name, id`
    );
    console.log('✓ Screenshot-batch follow-up applied');
    console.table(rows);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
