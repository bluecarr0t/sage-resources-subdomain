#!/usr/bin/env npx tsx
/**
 * Apply project_pipeline_jobs + sync run tables.
 * Run: npm run migrate:project-pipeline
 *
 * Requires SUPABASE_DB_URL in .env.local, or run the SQL manually in Supabase SQL Editor.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_FILES = [
  'scripts/migrations/create-project-pipeline-jobs-2026-06-23.sql',
  'scripts/migrations/add-project-pipeline-sheet-year-2026-06-23.sql',
  'scripts/migrations/add-project-pipeline-project-status-2026-06-24.sql',
  'scripts/migrations/add-project-pipeline-notes-2026-06-24.sql',
  'scripts/migrations/add-project-pipeline-review-notes-2026-06-24.sql',
  'scripts/migrations/create-project-pipeline-job-activity-2026-06-24.sql',
  'scripts/migrations/add-project-pipeline-job-notes-json-2026-06-26.sql',
] as const;

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    console.error(
      `\nOr run ${MIGRATION_FILES.join(' and ')} manually in Supabase SQL Editor.`
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    for (const file of MIGRATION_FILES) {
      const sql = readFileSync(resolve(process.cwd(), file), 'utf-8');
      await client.query(sql);
      console.log(`✓ ${file}`);
    }
    console.log('✓ Project pipeline jobs migrations applied');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
