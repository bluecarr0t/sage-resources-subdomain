#!/usr/bin/env npx tsx
/**
 * Find published US glamping rows with no unit_type, fill canonical site names,
 * and research open property shells into reviewed SQL. Does not update the database.
 *
 *   npx tsx scripts/research-missing-unit-types.ts --export-queue --fill-canonical
 *   npx tsx scripts/research-missing-unit-types.ts --pilot shells
 *   npx tsx scripts/research-missing-unit-types.ts --pilot state-parks
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
  fetchMissingUnitRows,
  isOpenYes,
  missingUnitQueueCsv,
  type MissingUnitRow,
} from '@/lib/glamping-unit-type-research/cohort';
import { extractUnitTypes } from '@/lib/glamping-unit-type-research/extract';
import { scrapeUnitTypePages } from '@/lib/glamping-unit-type-research/scrape';
import {
  canonicalSiteNameUpdatesToSql,
  researchedUnitsToSql,
  type ResearchedUnitUpdate,
} from '@/lib/glamping-unit-type-research/sql';

config({ path: resolve(process.cwd(), '.env.local') });
config();

const QUEUE_PATH = 'docs/data/exports/missing-unit-type-queue-2026-09-21.csv';
const CANONICAL_SQL_PATH =
  'scripts/migrations/fill-canonical-site-name-unit-types-2026-09-21.sql';
const SHELL_SQL_PATH = 'scripts/migrations/unit-type-research-shells-2026-09-21.sql';
const STATE_PARK_SQL_PATH =
  'scripts/migrations/unit-type-research-state-parks-2026-09-21.sql';
const UNRESOLVED_PATH = 'docs/data/exports/unit-type-research-unresolved-2026-09-21.csv';

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function pilotRows(rows: MissingUnitRow[], mode: string): MissingUnitRow[] {
  const limit = Number(argValue('--limit') ?? (mode === 'state-parks' ? '76' : '40'));
  const openWithUrl = rows.filter((row) => isOpenYes(row.isOpen) && row.url);
  if (mode === 'state-parks') {
    return openWithUrl.filter((row) => row.queue === 'state_park_placeholder').slice(0, limit);
  }
  const shells = openWithUrl.filter((row) => row.queue === 'property_shell');
  const named = openWithUrl.filter(
    (row) => row.queue === 'named_site' && !row.canonicalFromSiteName
  );
  return [...shells, ...named].slice(0, limit);
}

async function researchRows(
  rows: MissingUnitRow[],
  openai: OpenAI,
  insertOnly: boolean
): Promise<{ updates: ResearchedUnitUpdate[]; unresolved: { row: MissingUnitRow; reason: string }[] }> {
  const throttle: FirecrawlThrottleState = { lastCall: 0 };
  const updates: ResearchedUnitUpdate[] = [];
  const unresolved: { row: MissingUnitRow; reason: string }[] = [];

  for (const row of rows) {
    if (!row.url) {
      unresolved.push({ row, reason: 'no_url' });
      continue;
    }
    const scraped = await scrapeUnitTypePages(row.url, throttle);
    if ('error' in scraped) {
      unresolved.push({ row, reason: `scrape_${scraped.error}` });
      console.log(`skip ${row.propertyName}: scrape_${scraped.error}`);
      continue;
    }
    const decision = await extractUnitTypes({
      openai,
      propertyName: row.propertyName,
      city: row.city,
      state: row.state,
      markdown: scraped.markdown,
    });
    if (!decision.ok) {
      unresolved.push({ row, reason: decision.reason });
      console.log(`unresolved ${row.propertyName}: ${decision.reason}`);
      continue;
    }
    updates.push({
      row,
      units: decision.units,
      sourceUrl: scraped.sources[0] ?? row.url,
      insertOnly,
    });
    console.log(
      `accept ${row.propertyName}: ${decision.units.map((unit) => unit.unitType).join(', ')}`
    );
  }

  return { updates, unresolved };
}

function writeUnresolved(
  unresolved: { row: MissingUnitRow; reason: string }[],
  path: string
): void {
  const lines = [
    'id,property_id,property_name,queue,url,reason',
    ...unresolved.map(({ row, reason }) =>
      [String(row.id), row.propertyId, row.propertyName, row.queue, row.url ?? '', reason]
        .map(csvCell)
        .join(',')
    ),
  ];
  writeFileSync(resolve(process.cwd(), path), `${lines.join('\n')}\n`);
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
  const rows = await fetchMissingUnitRows(supabase);
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.queue, (counts.get(row.queue) ?? 0) + 1);
  console.log(
    [...counts.entries()].map(([queue, count]) => `${queue}=${count}`).join(', ')
  );

  mkdirSync(resolve(process.cwd(), 'docs/data/exports'), { recursive: true });
  mkdirSync(resolve(process.cwd(), 'scripts/migrations'), { recursive: true });

  if (process.argv.includes('--export-queue')) {
    writeFileSync(resolve(process.cwd(), QUEUE_PATH), missingUnitQueueCsv(rows));
    console.log(`Wrote ${QUEUE_PATH}`);
  }
  if (process.argv.includes('--fill-canonical')) {
    const sql = canonicalSiteNameUpdatesToSql(rows);
    writeFileSync(resolve(process.cwd(), CANONICAL_SQL_PATH), sql);
    console.log(`Wrote ${CANONICAL_SQL_PATH}`);
  }

  const mode = argValue('--pilot');
  if (!mode) return;
  if (mode !== 'shells' && mode !== 'state-parks') {
    console.error('--pilot must be shells or state-parks');
    process.exit(1);
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }
  const selected = pilotRows(rows, mode);
  const { updates, unresolved } = await researchRows(
    selected,
    new OpenAI({ apiKey: openaiKey }),
    mode === 'state-parks'
  );
  const runDate = new Date().toISOString().slice(0, 10);
  const sqlPath = mode === 'state-parks' ? STATE_PARK_SQL_PATH : SHELL_SQL_PATH;
  const unresolvedPath =
    mode === 'state-parks'
      ? 'docs/data/exports/unit-type-research-state-parks-unresolved-2026-09-21.csv'
      : UNRESOLVED_PATH;
  writeFileSync(resolve(process.cwd(), sqlPath), researchedUnitsToSql(updates, runDate));
  writeUnresolved(unresolved, unresolvedPath);
  console.log(`Pilot ${selected.length}: accepted ${updates.length}, unresolved ${unresolved.length}`);
  console.log(`Wrote ${sqlPath}`);
  console.log(`Wrote ${unresolvedPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
