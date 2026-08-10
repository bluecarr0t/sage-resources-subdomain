#!/usr/bin/env npx tsx
/**
 * Audit past-report corpus coverage for Report Builder accuracy.
 *
 * Checks:
 *   - reports with study_id + lat/lng (true-distance ranking)
 *   - feasibility_comparables / feasibility_comp_units per study
 *   - report_embeddings coverage (RAG)
 *
 * Usage:
 *   npx tsx scripts/verify-past-report-corpus.ts
 *   npx tsx scripts/verify-past-report-corpus.ts --json
 *   npx tsx scripts/verify-past-report-corpus.ts --limit 200
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SECRET/ANON)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Math.max(1, parseInt(args[limitIdx + 1] || '500', 10) || 500) : 500;

type ReportRow = {
  id: string;
  study_id: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  executive_summary: string | null;
  market_type: string | null;
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase service/anon key');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select('id, study_id, city, state, latitude, longitude, executive_summary, market_type')
    .not('study_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (reportsError) {
    console.error('Failed to load reports:', reportsError.message);
    process.exit(1);
  }

  const rows = (reports ?? []) as ReportRow[];
  const studyIds = [...new Set(rows.map((r) => r.study_id).filter(Boolean))] as string[];

  const compsByStudy = new Map<string, number>();
  const unitsByStudy = new Map<string, number>();

  // Batch study_id lookups (PostgREST .in has practical size limits)
  const CHUNK = 80;
  for (let i = 0; i < studyIds.length; i += CHUNK) {
    const chunk = studyIds.slice(i, i + CHUNK);
    const { data: comps } = await supabase
      .from('feasibility_comparables')
      .select('study_id')
      .in('study_id', chunk);
    for (const c of comps ?? []) {
      const sid = (c as { study_id: string }).study_id;
      compsByStudy.set(sid, (compsByStudy.get(sid) ?? 0) + 1);
    }

    const { data: units } = await supabase
      .from('feasibility_comp_units')
      .select('study_id')
      .in('study_id', chunk);
    for (const u of units ?? []) {
      const sid = (u as { study_id: string }).study_id;
      unitsByStudy.set(sid, (unitsByStudy.get(sid) ?? 0) + 1);
    }
  }

  const reportIds = rows.map((r) => r.id);
  const embeddedIds = new Set<string>();
  for (let i = 0; i < reportIds.length; i += CHUNK) {
    const chunk = reportIds.slice(i, i + CHUNK);
    const { data: embeds } = await supabase
      .from('report_embeddings')
      .select('report_id')
      .eq('section', 'executive_summary')
      .in('report_id', chunk);
    for (const e of embeds ?? []) {
      embeddedIds.add((e as { report_id: string }).report_id);
    }
  }

  const detail = rows.map((r) => {
    const sid = r.study_id ?? '';
    const geocoded =
      r.latitude != null &&
      r.longitude != null &&
      Number.isFinite(r.latitude) &&
      Number.isFinite(r.longitude);
    const comps = sid ? compsByStudy.get(sid) ?? 0 : 0;
    const units = sid ? unitsByStudy.get(sid) ?? 0 : 0;
    const hasSummary = !!(r.executive_summary && r.executive_summary.trim().length >= 50);
    const embedded = embeddedIds.has(r.id);
    return {
      study_id: sid,
      city: r.city,
      state: r.state,
      market_type: r.market_type,
      geocoded,
      comps,
      units,
      has_executive_summary: hasSummary,
      embedded,
      ready_for_radius: geocoded && comps > 0,
    };
  });

  const summary = {
    reports_scanned: detail.length,
    unique_study_ids: studyIds.length,
    geocoded: detail.filter((d) => d.geocoded).length,
    missing_geocode: detail.filter((d) => !d.geocoded).length,
    with_comps: detail.filter((d) => d.comps > 0).length,
    missing_comps: detail.filter((d) => d.comps === 0).length,
    with_units: detail.filter((d) => d.units > 0).length,
    with_exec_summary: detail.filter((d) => d.has_executive_summary).length,
    embedded: detail.filter((d) => d.embedded).length,
    ready_for_radius: detail.filter((d) => d.ready_for_radius).length,
    needs_attention: detail.filter((d) => !d.geocoded || d.comps === 0).slice(0, 40),
  };

  if (asJson) {
    console.log(JSON.stringify({ summary, detail }, null, 2));
    return;
  }

  console.log('Past-report corpus coverage');
  console.log('---------------------------');
  console.log(`Reports scanned:        ${summary.reports_scanned}`);
  console.log(`Unique study IDs:       ${summary.unique_study_ids}`);
  console.log(`Geocoded (lat/lng):     ${summary.geocoded}`);
  console.log(`Missing geocode:        ${summary.missing_geocode}`);
  console.log(`With comps:             ${summary.with_comps}`);
  console.log(`Missing comps:          ${summary.missing_comps}`);
  console.log(`With comp units:        ${summary.with_units}`);
  console.log(`With exec summary:      ${summary.with_exec_summary}`);
  console.log(`RAG embeddings:         ${summary.embedded}`);
  console.log(`Ready for radius reuse: ${summary.ready_for_radius}`);
  console.log('');
  if (summary.needs_attention.length) {
    console.log('Needs attention (up to 40):');
    for (const row of summary.needs_attention) {
      const issues = [
        !row.geocoded ? 'no-geocode' : null,
        row.comps === 0 ? 'no-comps' : null,
      ]
        .filter(Boolean)
        .join(', ');
      console.log(`  ${row.study_id || '(no study_id)'}  ${row.city}, ${row.state}  [${issues}]`);
    }
  }
  console.log('');
  console.log('Next: npm run bulk-upload:past -- 2026  then  npm run embed:reports');
  console.log('      npm run verify:past-report-corpus');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
