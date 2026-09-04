#!/usr/bin/env npx tsx
/**
 * Compute and persist glamping_professionalization_score for every all_sage_data row.
 * Groups sibling inventory (same rule as the Sage Data editor) and writes one
 * score onto all rows in the group.
 *
 * Usage:
 *   npx tsx scripts/backfill-glamping-professionalization-scores-2026-09-04.ts
 *   npx tsx scripts/backfill-glamping-professionalization-scores-2026-09-04.ts --skip-existing
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { propertyListGroupKey } from '../lib/admin/glamping-list-anchor-key';
import { PROFESSIONALIZATION_SIBLING_COLUMNS } from '../lib/admin/attach-glamping-professionalization-scores';
import { scoreProfessionalizedGlamping } from '../lib/admin/glamping-professionalization-score';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const skipExisting = process.argv.includes('--skip-existing');

if (!supabaseUrl || !secretKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local');
  process.exit(1);
}

const TABLE = 'all_sage_data';
const PAGE_SIZE = 1000;
const UPDATE_CHUNK = 80;

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAllRows(): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const query = supabase
      .from(TABLE)
      .select(`${PROFESSIONALIZATION_SIBLING_COLUMNS}, glamping_professionalization_score`)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    console.log(`  fetched ${rows.length} rows…`);
  }
  return rows;
}

async function main() {
  console.log(
    skipExisting
      ? 'Backfilling rows with a null professionalization score…\n'
      : 'Backfilling professionalization scores for all rows…\n'
  );

  const rows = await fetchAllRows();
  console.log(`Loaded ${rows.length} rows\n`);

  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = propertyListGroupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let updated = 0;
  let errors = 0;
  const scoreById: Array<{ ids: string[]; score: number }> = [];

  for (const groupRows of groups.values()) {
    const scored = scoreProfessionalizedGlamping(groupRows);
    const ids = groupRows
      .filter((row) => {
        if (!skipExisting) return true;
        return row.glamping_professionalization_score == null;
      })
      .map((row) => String(row.id ?? '').trim())
      .filter((id) => id.length > 0);
    if (ids.length > 0) {
      scoreById.push({ ids, score: scored.total });
    }
  }

  for (const item of scoreById) {
    for (let i = 0; i < item.ids.length; i += UPDATE_CHUNK) {
      const chunk = item.ids.slice(i, i + UPDATE_CHUNK);
      const { error } = await supabase
        .from(TABLE)
        .update({ glamping_professionalization_score: item.score })
        .in('id', chunk);
      if (error) {
        errors += chunk.length;
        console.warn(`Update failed for ${chunk.length} ids: ${error.message}`);
      } else {
        updated += chunk.length;
      }
    }
  }

  console.log(`✓ Updated ${updated} rows across ${groups.size} properties`);
  if (errors > 0) {
    console.error(`Failed to update ${errors} rows`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
