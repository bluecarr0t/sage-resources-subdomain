#!/usr/bin/env npx tsx
/**
 * Discover fragmented property_id groups and optionally apply consolidation SQL.
 *
 * Usage:
 *   npx tsx scripts/apply-property-id-consolidation-2026-07-09.ts
 *   npx tsx scripts/apply-property-id-consolidation-2026-07-09.ts --apply
 *   npx tsx scripts/apply-property-id-consolidation-2026-07-09.ts --only "Douglas Lake Ranch"
 *
 * Exports scripts/output/property-id-fragments.csv (and pre-apply snapshot when --apply).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_DIR = resolve(process.cwd(), 'scripts/output');
const FRAGMENTS_CSV = resolve(OUTPUT_DIR, 'property-id-fragments.csv');
const PRE_APPLY_CSV = resolve(OUTPUT_DIR, 'property-id-pre-apply.csv');
const CONSOLIDATE_SQL = resolve(
  process.cwd(),
  'scripts/migrations/consolidate-property-id-fragments-2026-07-09.sql'
);

type FragmentGroup = {
  property_name: string;
  city: string | null;
  state: string | null;
  row_count: number;
  distinct_pids: number;
  anchor_id: number;
  property_ids: string[];
  row_ids: number[];
};

function parseArgs() {
  let apply = false;
  let onlyFilter: string | null = null;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--apply') apply = true;
    else if (a === '--only' && process.argv[i + 1]) {
      onlyFilter = process.argv[i + 1].trim().toLowerCase();
      i++;
    }
  }
  return { apply, onlyFilter };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function fetchFragmentGroups(
  supabase: ReturnType<typeof createClient>,
  onlyFilter: string | null
): Promise<FragmentGroup[]> {
  const pageSize = 1000;
  let offset = 0;
  const allRows: Array<{
    id: number;
    property_id: string;
    property_name: string;
    city: string | null;
    state: string | null;
  }> = [];

  for (;;) {
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select('id, property_id, property_name, city, state')
      .not('property_name', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;
    allRows.push(...(data as typeof allRows));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  const byKey = new Map<string, typeof allRows>();
  for (const row of allRows) {
    const name = (row.property_name ?? '').trim();
    if (!name) continue;
    const key = [
      name.toLowerCase(),
      (row.city ?? '').trim().toLowerCase(),
      (row.state ?? '').trim().toLowerCase(),
    ].join('|');
    const bucket = byKey.get(key) ?? [];
    bucket.push(row);
    byKey.set(key, bucket);
  }

  const groups: FragmentGroup[] = [];
  for (const rows of byKey.values()) {
    const distinctPids = new Set(rows.map((r) => r.property_id));
    if (distinctPids.size <= 1) continue;

    const anchorId = Math.min(...rows.map((r) => r.id));
    const sample = rows[0]!;
    const group: FragmentGroup = {
      property_name: sample.property_name,
      city: sample.city,
      state: sample.state,
      row_count: rows.length,
      distinct_pids: distinctPids.size,
      anchor_id: anchorId,
      property_ids: [...distinctPids].sort(),
      row_ids: rows.map((r) => r.id).sort((a, b) => a - b),
    };

    if (
      onlyFilter &&
      !group.property_name.toLowerCase().includes(onlyFilter)
    ) {
      continue;
    }
    groups.push(group);
  }

  groups.sort((a, b) => b.distinct_pids - a.distinct_pids || b.row_count - a.row_count);
  return groups;
}

async function exportPreApplySnapshot(
  supabase: ReturnType<typeof createClient>,
  groups: FragmentGroup[]
) {
  const ids = new Set<number>();
  for (const g of groups) {
    for (const id of g.row_ids) ids.add(id);
  }
  if (ids.size === 0) return;

  const idList = [...ids];
  const snapshots: Array<{ id: number; property_id: string }> = [];
  for (let i = 0; i < idList.length; i += 500) {
    const chunk = idList.slice(i, i + 500);
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select('id, property_id')
      .in('id', chunk);
    if (error) throw error;
    snapshots.push(...((data ?? []) as typeof snapshots));
  }

  snapshots.sort((a, b) => a.id - b.id);
  const lines = [
    'id,property_id',
    ...snapshots.map((s) => `${s.id},${s.property_id}`),
  ];
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(PRE_APPLY_CSV, lines.join('\n') + '\n');
  console.log(`Wrote pre-apply snapshot: ${PRE_APPLY_CSV}`);
}

async function applyConsolidationSql() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required in .env.local for --apply');
    process.exit(1);
  }
  const sql = readFileSync(CONSOLIDATE_SQL, 'utf-8');
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log(`Applying ${CONSOLIDATE_SQL}...`);
    const result = await client.query(sql);
    console.log(`✓ Consolidation applied (rowCount=${result.rowCount ?? 'n/a'}).`);
  } finally {
    await client.end();
  }
}

async function main() {
  const { apply, onlyFilter } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const groups = await fetchFragmentGroups(supabase, onlyFilter);

  console.log(`\n=== FRAGMENTED property_id GROUPS ===`);
  console.log(`Total groups: ${groups.length}`);
  for (const g of groups.slice(0, 25)) {
    console.log(
      `  ${g.property_name} (${g.city ?? ''}, ${g.state ?? ''}): ${g.distinct_pids} UUIDs, ${g.row_count} rows, anchor=${g.anchor_id}`
    );
  }
  if (groups.length > 25) {
    console.log(`  … and ${groups.length - 25} more`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const header =
    'property_name,city,state,row_count,distinct_pids,anchor_id,property_ids,row_ids';
  const lines = groups.map((g) =>
    [
      csvEscape(g.property_name),
      csvEscape(g.city ?? ''),
      csvEscape(g.state ?? ''),
      g.row_count,
      g.distinct_pids,
      g.anchor_id,
      csvEscape(g.property_ids.join(';')),
      csvEscape(g.row_ids.join(';')),
    ].join(',')
  );
  writeFileSync(FRAGMENTS_CSV, [header, ...lines].join('\n') + '\n');
  console.log(`\nWrote ${FRAGMENTS_CSV}`);

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to execute consolidation SQL.');
    return;
  }

  await exportPreApplySnapshot(supabase, groups);
  await applyConsolidationSql();

  const after = await fetchFragmentGroups(supabase, onlyFilter);
  console.log(`\nPost-apply fragmented groups: ${after.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
