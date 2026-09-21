#!/usr/bin/env npx tsx
/**
 * Research the year a US glamping property opened.
 * Reads Supabase. Writes a queue CSV, reviewed SQL, and an unresolved CSV.
 * Does not update the database.
 *
 *   npx tsx scripts/research-year-opened-glamping.ts --export-queue
 *   npx tsx scripts/research-year-opened-glamping.ts --open-only --limit 25 --export-sql
 *
 * Env: FIRECRAWL_API_KEY, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { FirecrawlThrottleState } from '@/lib/comps-v2/scrape-url';
import {
  fetchYearOpenedQueue,
  toQueueCsv,
  type YearOpenedProperty,
} from '@/lib/glamping-year-opened-research/cohort';
import { extractYearOpened } from '@/lib/glamping-year-opened-research/extract';
import { scrapeYearOpenedPages } from '@/lib/glamping-year-opened-research/scrape';
import {
  yearOpenedUpdatesToSql,
  type YearOpenedSqlUpdate,
} from '@/lib/glamping-year-opened-research/sql';

config({ path: resolve(process.cwd(), '.env.local') });
config();

const QUEUE_PATH = 'docs/data/exports/year-opened-research-queue-2026-09-21.csv';
const SQL_PATH = 'scripts/migrations/year-opened-research-pilot-2026-09-21.sql';
const UNRESOLVED_PATH =
  'docs/data/exports/year-opened-research-pilot-unresolved-2026-09-21.csv';

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function selectPilot(properties: YearOpenedProperty[], limit: number): YearOpenedProperty[] {
  const openOnly = process.argv.includes('--open-only');
  const propertyId = argValue('--property-id');
  let list = properties.filter((property) => property.queue === 'fully_blank');
  if (openOnly) list = list.filter((property) => property.openStatus === 'open');
  if (propertyId) list = list.filter((property) => property.propertyId === propertyId);
  return list.slice(0, limit);
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const queue = await fetchYearOpenedQueue(supabase);
  const fullyBlank = queue.filter((property) => property.queue === 'fully_blank').length;
  const copyForward = queue.filter((property) => property.queue === 'copy_forward').length;
  console.log(`Queue: ${fullyBlank} fully blank, ${copyForward} copy-forward`);

  if (process.argv.includes('--export-queue')) {
    mkdirSync(resolve(process.cwd(), 'docs/data/exports'), { recursive: true });
    writeFileSync(resolve(process.cwd(), QUEUE_PATH), toQueueCsv(queue));
    console.log(`Wrote ${QUEUE_PATH}`);
    if (!process.argv.includes('--export-sql')) return;
  }

  const limit = Number(argValue('--limit') ?? '25');
  if (!Number.isFinite(limit) || limit < 1) {
    console.error('--limit must be a positive number');
    process.exit(1);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey: openaiKey });
  const throttle: FirecrawlThrottleState = { lastCall: 0 };
  const pilot = selectPilot(queue, limit);
  const updates: YearOpenedSqlUpdate[] = [];
  const unresolved: { property: YearOpenedProperty; reason: string }[] = [];

  for (const property of pilot) {
    if (!property.url) {
      unresolved.push({ property, reason: 'no_url' });
      console.log(`skip ${property.propertyName}: no_url`);
      continue;
    }
    const scraped = await scrapeYearOpenedPages(property.url, throttle);
    if ('error' in scraped) {
      unresolved.push({ property, reason: `scrape_${scraped.error}` });
      console.log(`skip ${property.propertyName}: scrape_${scraped.error}`);
      continue;
    }
    const decision = await extractYearOpened({
      openai,
      propertyName: property.propertyName,
      city: property.city,
      state: property.state,
      markdown: scraped.markdown,
    });
    if (!decision.ok) {
      unresolved.push({ property, reason: decision.reason });
      console.log(`unresolved ${property.propertyName}: ${decision.reason}`);
      continue;
    }
    updates.push({
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      year: decision.finding.year,
      openedOn: decision.finding.openedOn,
      quote: decision.finding.quote,
      sourceUrl: scraped.sources[0] ?? property.url,
    });
    console.log(`accept ${property.propertyName}: ${decision.finding.year}`);
  }

  const runDate = new Date().toISOString().slice(0, 10);
  const sql = yearOpenedUpdatesToSql(updates, runDate);
  mkdirSync(resolve(process.cwd(), 'scripts/migrations'), { recursive: true });
  mkdirSync(resolve(process.cwd(), 'docs/data/exports'), { recursive: true });
  writeFileSync(resolve(process.cwd(), SQL_PATH), sql);
  const unresolvedCsv = [
    'property_id,property_name,city,state,url,reason',
    ...unresolved.map(({ property, reason }) =>
      [property.propertyId, property.propertyName, property.city ?? '', property.state ?? '', property.url ?? '', reason]
        .map(csvCell)
        .join(',')
    ),
  ].join('\n');
  writeFileSync(resolve(process.cwd(), UNRESOLVED_PATH), `${unresolvedCsv}\n`);
  console.log(
    `Pilot ${pilot.length}: accepted ${updates.length}, unresolved ${unresolved.length}`
  );
  console.log(`Wrote ${SQL_PATH}`);
  console.log(`Wrote ${UNRESOLVED_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
