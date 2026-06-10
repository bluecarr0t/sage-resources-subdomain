#!/usr/bin/env npx tsx
/**
 * Weekly USA outdoor-hospitality pipeline sync (glamping + RV/campground segments, combined run).
 *
 * Usage:
 *   npx tsx scripts/discover-glamping-pipeline.ts
 *   npx tsx scripts/discover-glamping-pipeline.ts --dry-run
 *   npx tsx scripts/discover-glamping-pipeline.ts --limit 3
 *   npx tsx scripts/discover-glamping-pipeline.ts --force
 *
 * First run: npm run migrate:glamping-pipeline
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { runWeeklyPipelineSync } from '../lib/glamping-pipeline';

config({ path: resolve(process.cwd(), '.env.local') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const limitIdx = args.indexOf('--limit');
const limitPerQuery =
  limitIdx >= 0 && args[limitIdx + 1]
    ? parseInt(args[limitIdx + 1], 10)
    : undefined;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const tavilyKey = process.env.TAVILY_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}
if (!tavilyKey) {
  console.error('Missing TAVILY_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const openai = new OpenAI({ apiKey: openaiApiKey });

async function main() {
  console.log(
    `Starting pipeline sync (glamping + RV/campground)${dryRun ? ' (dry run)' : ''}${force ? ' (force)' : ''}...`
  );

  const { metrics, error } = await runWeeklyPipelineSync(supabase, openai, tavilyKey, {
    dryRun,
    force,
    limitPerQuery,
  });

  console.log(JSON.stringify(metrics, null, 2));

  if (error) {
    console.error('Pipeline sync failed:', error);
    process.exit(1);
  }

  console.log('Done.');
}

main();
