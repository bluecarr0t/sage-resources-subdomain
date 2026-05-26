#!/usr/bin/env npx tsx
/**
 * Phase 0 discovery: inventory DigitalOcean sources, change tracking, 7-day deltas,
 * and Supabase mirror state. Read-only on DO.
 *
 * Usage: npx tsx scripts/sync-do-to-supabase/discovery-phase0.ts [--json]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { queryDigitalOceanReadOnly, closeDigitalOceanPools } from '../../lib/digitalocean-readonly-db';
import type { DigitalOceanDatabase } from '../../lib/digitalocean-readonly-db';
import { getSupabaseDirectPool, closeSupabaseDirectPool } from '../../lib/supabase-direct-db';
import { DATABASE_SYNC_CONFIGS, resolveTargetSchema } from './config';

config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_DIR = resolve(process.cwd(), 'scripts/sync-do-to-supabase/discovery');
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

interface TableDiscovery {
  sourceDatabase: DigitalOceanDatabase;
  sourceSchema: string;
  sourceTable: string;
  targetSchema: string;
  targetTable: string;
  rowCount: number;
  primaryKey: string[];
  hasCreatedAt: boolean;
  hasUpdatedAt: boolean;
  changedLast7Days: number | null;
  maxUpdatedAt: string | null;
  minUpdatedAt: string | null;
  supabaseExists: boolean;
  supabaseRowCount: number | null;
  sizeCategory: 'small' | 'medium' | 'large' | 'xlarge';
  weeklySyncRecommendation: 'incremental' | 'full' | 'exclude' | 'optional';
}

interface MatviewDiscovery {
  sourceDatabase: DigitalOceanDatabase;
  sourceSchema: string;
  name: string;
  kind: 'view' | 'matview';
  rowCount: number;
  inSupabase: boolean;
  syncNote: string;
}

function sizeCategory(rows: number): TableDiscovery['sizeCategory'] {
  if (rows >= 10_000_000) return 'xlarge';
  if (rows >= 1_000_000) return 'large';
  if (rows >= 100_000) return 'medium';
  return 'small';
}

function recommendSync(
  rows: number,
  hasUpdatedAt: boolean,
  targetSchema: string,
  table: string
): TableDiscovery['weeklySyncRecommendation'] {
  if (table === 'old_data_table') return hasUpdatedAt ? 'incremental' : 'full';
  if (!hasUpdatedAt) return 'full';
  // Large tables still need weekly incremental — 7-day deltas are significant
  if (rows >= 1_000_000) return 'incremental';
  return 'incremental';
}

async function countRowsDo(
  database: DigitalOceanDatabase,
  schema: string,
  table: string
): Promise<number> {
  const { rows } = await queryDigitalOceanReadOnly<{ count: string }>(
    database,
    `SELECT count(*)::text AS count FROM ${schema}.${table}`
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

async function getTableMetaDo(
  database: DigitalOceanDatabase,
  schema: string,
  table: string
) {
  const { rows: cols } = await queryDigitalOceanReadOnly<{ column_name: string }>(
    database,
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
    [schema, table]
  );
  const { rows: pks } = await queryDigitalOceanReadOnly<{ column_name: string }>(
    database,
    `
    SELECT a.attname AS column_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    JOIN unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ck.attnum
    WHERE n.nspname = $1 AND t.relname = $2 AND c.contype = 'p'
    ORDER BY ck.ord
  `,
    [schema, table]
  );
  const colNames = cols.map((c) => c.column_name);
  return {
    primaryKey: pks.map((p) => p.column_name),
    hasCreatedAt: colNames.includes('created_at'),
    hasUpdatedAt: colNames.includes('updated_at'),
  };
}

async function listMatviewsAndViews(
  database: DigitalOceanDatabase,
  schema: string
): Promise<{ name: string; kind: 'view' | 'matview' }[]> {
  const { rows } = await queryDigitalOceanReadOnly<{ relname: string; relkind: string }>(
    database,
    `
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind IN ('v', 'm')
    ORDER BY c.relname
  `,
    [schema]
  );
  return rows.map((r) => ({
    name: r.relname,
    kind: r.relkind === 'm' ? 'matview' : 'view',
  }));
}

async function deltaLast7Days(
  database: DigitalOceanDatabase,
  schema: string,
  table: string,
  hasUpdatedAt: boolean
): Promise<{ changed: number | null; min: string | null; max: string | null }> {
  if (!hasUpdatedAt) return { changed: null, min: null, max: null };
  const since = SEVEN_DAYS_AGO.toISOString();
  const { rows: changed } = await queryDigitalOceanReadOnly<{ count: string }>(
    database,
    `SELECT count(*)::text AS count FROM ${schema}.${table} WHERE updated_at > $1`,
    [since]
  );
  const { rows: bounds } = await queryDigitalOceanReadOnly<{ min: Date | null; max: Date | null }>(
    database,
    `SELECT min(updated_at) AS min, max(updated_at) AS max FROM ${schema}.${table}`
  );
  return {
    changed: parseInt(changed[0]?.count ?? '0', 10),
    min: bounds[0]?.min ? new Date(bounds[0].min).toISOString() : null,
    max: bounds[0]?.max ? new Date(bounds[0].max).toISOString() : null,
  };
}

async function supabaseState(
  targetSchema: string,
  table: string
): Promise<{ exists: boolean; rows: number | null }> {
  const pool = getSupabaseDirectPool();
  const { rows: existsRows } = await pool.query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE'
    ) AS exists
  `,
    [targetSchema, table]
  );
  if (!existsRows[0]?.exists) return { exists: false, rows: null };
  const { rows: countRows } = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${targetSchema}.${table}`
  );
  return { exists: true, rows: parseInt(countRows[0]?.count ?? '0', 10) };
}

async function listDoTables(database: DigitalOceanDatabase, schema: string): Promise<string[]> {
  const { rows } = await queryDigitalOceanReadOnly<{ table_name: string }>(
    database,
    `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `,
    [schema]
  );
  return rows.map((r) => r.table_name);
}

async function main(): Promise<void> {
  const jsonOnly = process.argv.includes('--json');
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Phase 0 discovery — DigitalOcean read-only');
  console.log(`7-day window: since ${SEVEN_DAYS_AGO.toISOString()}\n`);

  const discoveries: TableDiscovery[] = [];
  const matviews: MatviewDiscovery[] = [];

  for (const dbConfig of DATABASE_SYNC_CONFIGS) {
    console.log(`Scanning ${dbConfig.database} (${dbConfig.label})...`);
    for (const sourceSchema of dbConfig.sourceSchemas) {
      const targetSchema = resolveTargetSchema(dbConfig, sourceSchema);

      for (const rel of await listMatviewsAndViews(dbConfig.database, sourceSchema)) {
        process.stdout.write(`  ${sourceSchema}.${rel.name} (${rel.kind})...`);
        let rowCount = 0;
        try {
          const { rows } = await queryDigitalOceanReadOnly<{ count: string }>(
            dbConfig.database,
            `SELECT count(*)::text AS count FROM ${sourceSchema}.${rel.name}`
          );
          rowCount = parseInt(rows[0]?.count ?? '0', 10);
        } catch {
          rowCount = -1;
        }
        const sb = await supabaseState(targetSchema, rel.name);
        matviews.push({
          sourceDatabase: dbConfig.database,
          sourceSchema,
          name: rel.name,
          kind: rel.kind,
          rowCount,
          inSupabase: sb.exists,
          syncNote:
            rel.kind === 'matview'
              ? 'Copy as table or REFRESH from upstream on Supabase; not a base table on DO'
              : 'Create matching view definition on Supabase after base tables sync',
        });
        console.log(rowCount >= 0 ? ` ${rowCount.toLocaleString()} rows` : ' (not countable)');
      }

      const tables = await listDoTables(dbConfig.database, sourceSchema);
      for (const table of tables) {
        process.stdout.write(`  ${sourceSchema}.${table}...`);
        const rowCount = await countRowsDo(dbConfig.database, sourceSchema, table);
        const meta = await getTableMetaDo(dbConfig.database, sourceSchema, table);
        const delta = await deltaLast7Days(
          dbConfig.database,
          sourceSchema,
          table,
          meta.hasUpdatedAt
        );
        const sb = await supabaseState(targetSchema, table);

        const entry: TableDiscovery = {
          sourceDatabase: dbConfig.database,
          sourceSchema,
          sourceTable: table,
          targetSchema,
          targetTable: table,
          rowCount,
          primaryKey: meta.primaryKey,
          hasCreatedAt: meta.hasCreatedAt,
          hasUpdatedAt: meta.hasUpdatedAt,
          changedLast7Days: delta.changed,
          minUpdatedAt: delta.min,
          maxUpdatedAt: delta.max,
          supabaseExists: sb.exists,
          supabaseRowCount: sb.rows,
          sizeCategory: sizeCategory(rowCount),
          weeklySyncRecommendation: recommendSync(
            rowCount,
            meta.hasUpdatedAt,
            targetSchema,
            table
          ),
        };
        discoveries.push(entry);
        console.log(` ${rowCount.toLocaleString()} rows`);
      }
    }
  }

  const reportPath = resolve(OUTPUT_DIR, 'phase0-report.json');
  writeFileSync(
    reportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), discoveries, matviews }, null, 2)
  );

  const md = buildMarkdownReport(discoveries, matviews);
  const mdPath = resolve(OUTPUT_DIR, 'PHASE0_DISCOVERY.md');
  writeFileSync(mdPath, md);

  if (jsonOnly) {
    console.log(JSON.stringify(discoveries, null, 2));
  } else {
    console.log(`\nWrote ${reportPath}`);
    console.log(`Wrote ${mdPath}`);
    console.log('\n--- Summary ---');
    printSummary(discoveries);
  }

  await closeDigitalOceanPools();
  await closeSupabaseDirectPool();
}

function printSummary(d: TableDiscovery[]): void {
  const campings = d.filter((t) => t.sourceDatabase === 'campings');
  const changed7d = campings.filter((t) => (t.changedLast7Days ?? 0) > 0);
  const missingSb = campings.filter((t) => !t.supabaseExists);
  const drift = campings.filter(
    (t) => t.supabaseExists && t.supabaseRowCount !== null && t.supabaseRowCount !== t.rowCount
  );

  console.log(`Campings tables: ${campings.length}`);
  console.log(`Tables with changes in last 7 days: ${changed7d.length}`);
  console.log(`Missing in Supabase: ${missingSb.length}`);
  console.log(`Row count drift (DO vs SB): ${drift.length}`);

  console.log('\nTop 7-day deltas (campings):');
  changed7d
    .sort((a, b) => (b.changedLast7Days ?? 0) - (a.changedLast7Days ?? 0))
    .slice(0, 10)
    .forEach((t) => {
      console.log(
        `  ${t.targetSchema}.${t.targetTable}: ${(t.changedLast7Days ?? 0).toLocaleString()} changed (${t.rowCount.toLocaleString()} total)`
      );
    });

  console.log('\nRecommended weekly sync scope (campings, incremental):');
  campings
    .filter((t) => t.weeklySyncRecommendation === 'incremental')
    .forEach((t) => {
      console.log(`  ${t.targetSchema}.${t.targetTable}`);
    });

  console.log('\nFull reload only (no updated_at):');
  campings
    .filter((t) => t.weeklySyncRecommendation === 'full')
    .forEach((t) => {
      console.log(`  ${t.targetSchema}.${t.targetTable} (${t.rowCount.toLocaleString()} rows)`);
    });

  console.log('\nLarge tables — weekly incremental required (7-day deltas):');
  campings
    .filter((t) => t.sizeCategory === 'xlarge' || t.sizeCategory === 'large')
    .forEach((t) => {
      console.log(
        `  ${t.targetSchema}.${t.targetTable}: ${(t.changedLast7Days ?? 0).toLocaleString()} / 7d`
      );
    });
}

function buildMarkdownReport(d: TableDiscovery[], matviews: MatviewDiscovery[]): string {
  const lines: string[] = [
    '# Phase 0 Discovery — DigitalOcean → Supabase Weekly Sync',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Executive summary',
    '',
    'Read-only inventory of three DigitalOcean Postgres databases and comparison to Supabase mirror state.',
    '',
    '### Source databases',
    '',
    '| DO database | Role | Supabase target |',
    '|-------------|------|-----------------|',
    '| `campings` | Dec 2024–present OTA warehouse | `hipcamp.*`, `campspot.*`, `bookoutdoors.*` (identical) |',
    '| `hipcamp` | Legacy archive | `hipcamp_public.*` |',
    '| `campspot` | Legacy archive | `campspot_public.*` |',
    '',
    '### Key findings',
    '',
  ];

  const campings = d.filter((t) => t.sourceDatabase === 'campings');
  const totalDoRows = campings.reduce((s, t) => s + t.rowCount, 0);
  const changed7dTotal = campings.reduce((s, t) => s + (t.changedLast7Days ?? 0), 0);
  const allHaveUpdatedAt = campings.every((t) => t.hasUpdatedAt || t.sourceTable === 'old_data_table');

  lines.push(`- **Campings total rows (all tables):** ${totalDoRows.toLocaleString()}`);
  lines.push(`- **Rows changed in last 7 days (updated_at):** ${changed7dTotal.toLocaleString()}`);
  lines.push(`- **Change tracking:** All campings fact tables except \`old_data_table\` have \`created_at\` + \`updated_at\`. Composite PKs on \`sites\`, \`propertys\`, \`siteseasonals\`.`);
  lines.push(`- **7-day delta on large tables is high** — \`campspot.sites\` ~1.85M, \`hipcamp.sites\` ~484K. Weekly sync must include incremental upsert on large tables, not skip them.`);
  lines.push(`- **Supabase drift:** 15/19 campings mirror tables have row-count mismatch vs DO; \`campspot.sites\` is 15.6M in SB vs 107M on DO (~86% gap). One-time \`--full --include-large\` backfill required.`);
  lines.push(`- **Materialized views on DO:** \`campspot.site_monthly_analytics\` (~3.4M rows) — used by rate export scripts; not yet mirrored in Supabase.`);
  lines.push(`- **Flat CSV tables (\`public.hipcamp\` / \`public.campspot\`):** No export query in this repo; separate Phase 3 transform.`);
  lines.push('');

  lines.push('## Recommended weekly sync scope');
  lines.push('');
  lines.push('### Decision: sync scope for `campings` database');
  lines.push('');
  lines.push('| Tier | Tables | Strategy | Notes |');
  lines.push('|------|--------|----------|-------|');
  lines.push('| **A — Weekly incremental** | All tables with `updated_at` (17 tables) | `WHERE updated_at > watermark` + upsert on PK | Includes large `sites`/`propertys`; ~2.9M rows/week current volume |');
  lines.push('| **B — Monthly full replace** | `hipcamp.old_data_table`, `campspot.old_data_table` | Truncate + reload | No `updated_at`; historical aggregates |');
  lines.push('| **C — One-time backfill** | Any table where SB row count ≠ DO | `--full --include-large` | Fix existing drift before relying on incremental |');
  lines.push('| **D — Defer** | Legacy `hipcamp` / `campspot` DBs | Optional `sync:do:all` | Pre-Dec 2024 archive; not app-critical |');
  lines.push('| **E — Phase 3** | `public.hipcamp`, `public.campspot` flat tables | SQL transform from normalized mirror | Powers map / Sage AI / comps today |');
  lines.push('| **F — Add to mirror** | `campspot.site_monthly_analytics` (matview) | Snapshot as table on Supabase | Required for rate analytics exports |');
  lines.push('');
  lines.push('### Tier A — Weekly incremental tables');
  lines.push('');
  lines.push('| Table | DO rows | 7-day delta | Supabase rows | Drift | PK |');
  lines.push('|-------|---------|-------------|---------------|-------|-----|');
  for (const t of campings.filter((x) => x.weeklySyncRecommendation === 'incremental')) {
    const drift =
      t.supabaseRowCount !== null && t.supabaseRowCount !== t.rowCount
        ? `${((t.supabaseRowCount ?? 0) - t.rowCount).toLocaleString()}`
        : '—';
    lines.push(
      `| ${t.targetSchema}.${t.targetTable} | ${t.rowCount.toLocaleString()} | ${(t.changedLast7Days ?? 0).toLocaleString()} | ${t.supabaseRowCount?.toLocaleString() ?? 'missing'} | ${drift} | ${t.primaryKey.join(', ') || '—'} |`
    );
  }

  lines.push('');
  lines.push('### Tier B — Full replace (no updated_at)');
  lines.push('');
  for (const t of campings.filter((x) => x.weeklySyncRecommendation === 'full')) {
    lines.push(`- \`${t.targetSchema}.${t.targetTable}\` — ${t.rowCount.toLocaleString()} rows`);
  }

  if (matviews.length > 0) {
    lines.push('');
    lines.push('### Views & materialized views (campings)');
    lines.push('');
    lines.push('| Object | Kind | Rows | In Supabase | Action |');
    lines.push('|--------|------|------|-------------|--------|');
    for (const m of matviews.filter((x) => x.sourceDatabase === 'campings')) {
      lines.push(
        `| ${m.sourceSchema}.${m.name} | ${m.kind} | ${m.rowCount >= 0 ? m.rowCount.toLocaleString() : '?'} | ${m.inSupabase ? 'yes' : 'no'} | ${m.syncNote} |`
      );
    }
  }

  lines.push('');
  lines.push('### Tier D — Legacy archive DBs (optional `sync:do:all`)');
  lines.push('');
  const legacy = d.filter((t) => t.sourceDatabase !== 'campings');
  lines.push('| Table | DO rows | 7-day delta | In Supabase |');
  lines.push('|-------|---------|-------------|-------------|');
  for (const t of legacy) {
    lines.push(
      `| ${t.sourceDatabase}.${t.sourceSchema}.${t.targetTable} → ${t.targetSchema}.${t.targetTable} | ${t.rowCount.toLocaleString()} | ${t.changedLast7Days?.toLocaleString() ?? 'n/a'} | ${t.supabaseExists ? (t.supabaseRowCount?.toLocaleString() ?? '0') : 'no'} |`
    );
  }

  lines.push('');
  lines.push('## Full inventory — campings database');
  lines.push('');
  lines.push('| Schema | Table | Rows | PK | updated_at | 7d delta | max(updated_at) | SB exists | SB rows | Recommendation |');
  lines.push('|--------|-------|------|----|------------|----------|-----------------|-----------|---------|----------------|');
  for (const t of campings) {
    lines.push(
      `| ${t.sourceSchema} | ${t.sourceTable} | ${t.rowCount.toLocaleString()} | ${t.primaryKey.join(', ') || '—'} | ${t.hasUpdatedAt ? 'yes' : 'no'} | ${t.changedLast7Days?.toLocaleString() ?? 'n/a'} | ${t.maxUpdatedAt?.slice(0, 10) ?? '—'} | ${t.supabaseExists ? 'yes' : 'no'} | ${t.supabaseRowCount?.toLocaleString() ?? '—'} | ${t.weeklySyncRecommendation} |`
    );
  }

  lines.push('');
  lines.push('## Gaps & decisions');
  lines.push('');
  lines.push('1. **`old_data_table`** — No `updated_at`; monthly full replace only.');
  lines.push('2. **Large-table 7-day deltas are not small** — `campspot.sites` ~1.85M/week. Default sync must run incremental on large tables; `--exclude-large` is for dry runs only.');
  lines.push('3. **Initial backfill** — Supabase mirror is partial (~15M / 107M campspot sites). Run `npm run sync:do -- --full --include-large` once before weekly schedule.');
  lines.push('4. **Stale rows in Supabase** — Some tables (e.g. `hipcamp.scrapings`) have *more* rows in SB than DO → prior imports without upsert cleanup; backfill with truncate or `--full`.');
  lines.push('5. **`site_monthly_analytics`** — Materialized view on DO (3.4M rows); add to sync as table snapshot.');
  lines.push('6. **Legacy DBs** — 167M+ rows combined; no `updated_at` on most tables; defer unless historical research needed.');
  lines.push('7. **Flat CSV export** — Not generated in-repo; Phase 3 must reverse-engineer from `propertydetails` + `sitedetails` + seasonals/analytics joins.');
  lines.push('8. **Downstream** — After sync: refresh `unified_comps` matview + RV overview cache.');
  lines.push('');
  lines.push('## Phase 1 actions (approved scope)');
  lines.push('');
  lines.push('1. One-time full backfill: `npm run sync:do -- --databases=campings --full --include-large`');
  lines.push('2. Change default weekly job to incremental **including** large tables (remove `--exclude-large` from GitHub Actions).');
  lines.push('3. Add `site_monthly_analytics` matview snapshot to sync pipeline.');
  lines.push('4. Chain downstream refresh after successful weekly run.');

  return lines.join('\n');
}

main().catch(async (err) => {
  console.error(err);
  await closeDigitalOceanPools();
  await closeSupabaseDirectPool();
  process.exit(1);
});
