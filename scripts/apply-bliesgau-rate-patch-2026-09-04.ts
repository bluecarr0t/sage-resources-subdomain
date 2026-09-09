#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  try {
    await client.query(
      readFileSync(
        resolve(
          process.cwd(),
          'scripts/migrations/patch-bliesgau-rates-2026-09-04.sql'
        ),
        'utf8'
      )
    );
    const { rows } = await client.query(
      `SELECT id, rate_summer_weekday, rate_summer_weekend,
              rate_winter_weekday, rate_avg_retail_daily_rate, research_status
       FROM all_sage_data WHERE id = 10999`
    );
    console.table(rows);
  } finally {
    await client.end();
  }
}

main();
