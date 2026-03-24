#!/usr/bin/env npx tsx
/**
 * One-shot: insert feasibility_comparables from existing feasibility_property_scores
 * for reports that have Best Comps data but no comparables rows (e.g. legacy 2023 uploads).
 *
 * Uses the same mapping as parseWorkbook synthesis:
 *   lib/parsers/best-comps-to-comparables.ts → dbPropertyScoreRowsToSyntheticComparables
 *
 * Usage:
 *   npx tsx scripts/backfill-comparables-from-property-scores.ts --dry-run
 *   npx tsx scripts/backfill-comparables-from-property-scores.ts --limit=50
 *   npx tsx scripts/backfill-comparables-from-property-scores.ts --study-prefix=23-
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { dbPropertyScoreRowsToSyntheticComparables } from '@/lib/parsers/best-comps-to-comparables';
import type { FeasibilityPropertyScore } from '@/lib/types/feasibility';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1] || '200', 10)) : 500;
  const prefixArg = process.argv.find((a) => a.startsWith('--study-prefix='));
  const studyPrefix = prefixArg ? prefixArg.split('=')[1] ?? '' : '';
  return { dryRun, limit, studyPrefix };
}

async function loadScoresByReport(supabase: SupabaseClient): Promise<Map<string, FeasibilityPropertyScore[]>> {
  const map = new Map<string, FeasibilityPropertyScore[]>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('feasibility_property_scores')
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const batch = (data || []) as FeasibilityPropertyScore[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!row.report_id) continue;
      const list = map.get(row.report_id) || [];
      list.push(row);
      map.set(row.report_id, list);
    }

    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

async function loadReportIdsWithComparables(supabase: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('feasibility_comparables')
      .select('report_id')
      .not('report_id', 'is', null)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const batch = data || [];
    if (batch.length === 0) break;
    for (const r of batch) {
      if (r.report_id) ids.add(r.report_id);
    }
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

async function main() {
  const { dryRun, limit, studyPrefix } = parseArgs();

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log(
    `Backfill comparables from property_scores (dryRun=${dryRun}, limit=${limit}, studyPrefix=${studyPrefix || '(any)'})`
  );

  const [scoresByReport, compReportIds] = await Promise.all([
    loadScoresByReport(supabase),
    loadReportIdsWithComparables(supabase),
  ]);

  const { data: reportsMeta, error: repErr } = await supabase
    .from('reports')
    .select('id, study_id')
    .is('deleted_at', null);

  if (repErr) throw repErr;

  const studyByReportId = new Map<string, string | null>();
  for (const r of reportsMeta || []) {
    studyByReportId.set(r.id, r.study_id ?? null);
  }

  let processed = 0;
  let insertedTotal = 0;

  for (const [reportId, scoreRows] of scoresByReport) {
    if (processed >= limit) break;
    if (compReportIds.has(reportId)) continue;
    if (scoreRows.length === 0) continue;

    const studyId = studyByReportId.get(reportId) ?? scoreRows[0]?.study_id ?? null;
    if (studyPrefix && (!studyId || !studyId.startsWith(studyPrefix))) continue;

    const comparables = dbPropertyScoreRowsToSyntheticComparables(scoreRows);
    if (comparables.length === 0) continue;

    const inserts = comparables.map((c) => ({
      report_id: reportId,
      study_id: studyId,
      comp_name: c.comp_name,
      overview: c.overview,
      state: c.state,
      amenities: c.amenities,
      amenity_keywords: c.amenity_keywords?.length ? c.amenity_keywords : null,
      distance_miles: c.distance_miles,
      total_sites: c.total_sites,
      quality_score: c.quality_score,
      property_type: c.property_type,
    }));

    console.log(
      `${dryRun ? '[dry-run] ' : ''}${studyId || reportId}: insert ${inserts.length} comparables from ${scoreRows.length} score rows`
    );

    if (!dryRun) {
      const { error: insErr } = await supabase.from('feasibility_comparables').insert(inserts);
      if (insErr) {
        console.error(`  Failed: ${insErr.message}`);
        continue;
      }

      const { error: upErr } = await supabase
        .from('reports')
        .update({
          has_comparables: true,
          comp_count: inserts.length,
        })
        .eq('id', reportId);

      if (upErr) console.error(`  Report update failed: ${upErr.message}`);
    }

    insertedTotal += inserts.length;
    processed += 1;
    compReportIds.add(reportId);
  }

  console.log(`Done. Reports processed: ${processed}, comparables ${dryRun ? 'would insert' : 'inserted'}: ${insertedTotal}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
