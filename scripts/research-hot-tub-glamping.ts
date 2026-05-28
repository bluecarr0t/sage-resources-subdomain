#!/usr/bin/env npx tsx
/**
 * Web research hot tub / sauna tagging for published US glamping cohort.
 *
 * Usage:
 *   npx tsx scripts/research-hot-tub-glamping.ts --dry-run --limit 25
 *   npx tsx scripts/research-hot-tub-glamping.ts --limit 50 --only-null
 *   npx tsx scripts/research-hot-tub-glamping.ts --property-id <uuid>
 *   npx tsx scripts/research-hot-tub-glamping.ts --export-sql --limit 100
 *   npx tsx scripts/research-hot-tub-glamping.ts --report
 *
 * Env: FIRECRAWL_API_KEY, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { FirecrawlThrottleState } from '@/lib/comps-v2/scrape-url';
import {
  fetchCohortByProperty,
  pickScrapeUrl,
  HOT_TUB_TABLE,
} from '@/lib/glamping-hot-tub-research/cohort';
import { scrapePropertyPages } from '@/lib/glamping-hot-tub-research/scrape';
import { extractHotTubFromMarkdown } from '@/lib/glamping-hot-tub-research/extract';
import {
  buildApplyResult,
  applyResultToSqlUpdates,
} from '@/lib/glamping-hot-tub-research/apply';
import type {
  HotTubConflict,
  PropertyResearchResult,
} from '@/lib/glamping-hot-tub-research/types';
import { todayIsoDate } from '@/lib/glamping-hot-tub-research/normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!openaiKey) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const openai = new OpenAI({ apiKey: openaiKey });

const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-hot-tub-review');
const CONFLICTS_CSV = join(OUT_DIR, 'conflicts.csv');
const RESULTS_JSONL = join(OUT_DIR, 'results.jsonl');

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? '', 10) : undefined;
  const propIdx = args.indexOf('--property-id');
  const propertyId = propIdx >= 0 ? args[propIdx + 1] : undefined;
  return {
    dryRun: args.includes('--dry-run'),
    onlyNull: args.includes('--only-null'),
    skipResearched: !args.includes('--include-researched'),
    exportSql: args.includes('--export-sql'),
    report: args.includes('--report'),
    limit: Number.isFinite(limit) && limit! > 0 ? limit : undefined,
    propertyId,
  };
}

function ensureOutDir() {
  mkdirSync(OUT_DIR, { recursive: true });
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function appendConflictCsv(conflicts: HotTubConflict[]) {
  if (conflicts.length === 0) return;
  const header =
    'kind,property_id,property_name,row_id,field,existing_value,proposed_value,confidence,evidence,source_url\n';
  const rows = conflicts
    .map(
      (c) =>
        [
          c.kind,
          c.property_id,
          c.property_name ?? '',
          c.row_id ?? '',
          c.field,
          c.existing_value ?? '',
          c.proposed_value ?? '',
          c.confidence,
          c.evidence,
          c.source_url ?? '',
        ]
          .map((v) => escapeCsv(String(v)))
          .join(',')
    )
    .join('\n');
  if (!existsSync(CONFLICTS_CSV)) {
    writeFileSync(CONFLICTS_CSV, header + rows + '\n');
  } else {
    appendFileSync(CONFLICTS_CSV, rows + '\n');
  }
}

function runReport() {
  console.log('Run queries/hot_tub_tagging_audit.sql in Supabase for coverage metrics.');
  console.log(`Review artifacts: ${OUT_DIR}`);
}

async function processProperty(
  propertyId: string,
  rows: import('@/lib/glamping-hot-tub-research/types').HotTubCohortRow[],
  throttle: FirecrawlThrottleState,
  dryRun: boolean
): Promise<PropertyResearchResult> {
  const propertyName = rows[0]?.property_name ?? null;
  const scrapeUrl = pickScrapeUrl(rows[0]!);

  if (!scrapeUrl) {
    return {
      property_id: propertyId,
      property_name: propertyName,
      row_count: rows.length,
      extraction: null,
      apply: {
        applied: [],
        conflicts: [],
        unmatched_row_ids: rows.map((r) => r.id),
        scrape_url: null,
        skip_reason: 'no_url',
      },
      markdown_chars: 0,
    };
  }

  const scraped = await scrapePropertyPages(scrapeUrl, throttle);
  if ('error' in scraped) {
    return {
      property_id: propertyId,
      property_name: propertyName,
      row_count: rows.length,
      extraction: null,
      apply: {
        applied: [],
        conflicts: [],
        unmatched_row_ids: rows.map((r) => r.id),
        scrape_url: scrapeUrl,
        skip_reason: scraped.error,
      },
      markdown_chars: 0,
    };
  }

  const extraction = await extractHotTubFromMarkdown(
    openai,
    rows,
    scraped.markdown,
    scraped.sources
  );

  if (!extraction) {
    return {
      property_id: propertyId,
      property_name: propertyName,
      row_count: rows.length,
      extraction: null,
      apply: {
        applied: [],
        conflicts: [],
        unmatched_row_ids: rows.map((r) => r.id),
        scrape_url: scrapeUrl,
        skip_reason: 'extraction_failed',
      },
      markdown_chars: scraped.markdown.length,
    };
  }

  const apply = buildApplyResult(rows, extraction, scrapeUrl, todayIsoDate());

  if (!dryRun) {
    for (const payload of apply.applied) {
      const { error } = await supabase
        .from(HOT_TUB_TABLE)
        .update(payload.updates)
        .eq('id', payload.id);
      if (error) {
        console.error(`  Update failed id=${payload.id}: ${error.message}`);
      }
    }
  }

  return {
    property_id: propertyId,
    property_name: propertyName,
    row_count: rows.length,
    extraction,
    apply,
    markdown_chars: scraped.markdown.length,
  };
}

async function main() {
  const opts = parseArgs();

  if (opts.report) {
    await runReport();
    return;
  }

  ensureOutDir();

  const byProperty = await fetchCohortByProperty(supabase, {
    onlyNull: opts.onlyNull,
    propertyId: opts.propertyId,
    limitProperties: opts.limit,
    skipAlreadyResearched: opts.skipResearched,
  });

  const propertyIds = [...byProperty.keys()];
  console.log(
    `Processing ${propertyIds.length} properties (${opts.dryRun ? 'DRY RUN' : 'LIVE'})...`
  );

  const throttle: FirecrawlThrottleState = { lastCall: 0 };
  const sqlChunks: string[] = [];
  let totalApplied = 0;
  let totalConflicts = 0;
  let skipped = 0;

  for (let i = 0; i < propertyIds.length; i++) {
    const pid = propertyIds[i]!;
    const rows = byProperty.get(pid)!;
    const label = rows[0]?.property_name ?? pid;
    console.log(`[${i + 1}/${propertyIds.length}] ${label} (${rows.length} rows)`);

    try {
      const result = await processProperty(pid, rows, throttle, opts.dryRun);
      appendFileSync(RESULTS_JSONL, JSON.stringify(result) + '\n');

      if (result.apply.skip_reason) {
        console.log(`  Skipped: ${result.apply.skip_reason}`);
        skipped++;
      } else {
        console.log(
          `  Applied ${result.apply.applied.length} row updates, ${result.apply.conflicts.length} conflicts, ${result.markdown_chars} chars scraped`
        );
        totalApplied += result.apply.applied.length;
        totalConflicts += result.apply.conflicts.length;
        appendConflictCsv(result.apply.conflicts);

        if (opts.exportSql && result.apply.applied.length > 0) {
          sqlChunks.push(applyResultToSqlUpdates(result.apply.applied));
        }
      }
    } catch (err) {
      console.error(`  Error: ${(err as Error).message}`);
      skipped++;
    }
  }

  if (opts.exportSql && sqlChunks.length > 0) {
    const sqlPath = join(
      OUT_DIR,
      `backfill-hot-tub-${todayIsoDate()}.sql`
    );
    writeFileSync(sqlPath, sqlChunks.join('\n'));
    console.log(`\nWrote SQL: ${sqlPath}`);
  }

  console.log(
    `\nDone. Row updates: ${totalApplied}, conflicts logged: ${totalConflicts}, skipped properties: ${skipped}`
  );
  console.log(`Artifacts: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
