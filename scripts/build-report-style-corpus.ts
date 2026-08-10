#!/usr/bin/env npx tsx
/**
 * Build redacted style corpus (+ embeddings) from has_docx past reports.
 *
 * Usage:
 *   npx tsx scripts/build-report-style-corpus.ts
 *   npx tsx scripts/build-report-style-corpus.ts --limit 20
 *   npx tsx scripts/build-report-style-corpus.ts --limit 2 --require-xlsx
 *   npx tsx scripts/build-report-style-corpus.ts --study-ids=26-113,26-126
 *   npx tsx scripts/build-report-style-corpus.ts --force
 *   npx tsx scripts/build-report-style-corpus.ts --dry-run
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           AI_GATEWAY_API_KEY or OPENAI_API_KEY
 * Apply migration first: scripts/migrations/create-report-section-corpus-2026-08-10.sql
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import {
  createStyleCorpusEmbeddingClient,
  upsertStyleCorpusFromDocxBuffer,
} from '../lib/ai-report-builder/style-corpus-ingest';
import { isHoldoutStudyId } from '../lib/ai-report-builder/style-corpus-extract';
import { DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS } from '../lib/ai-report-builder/style-corpus-types';

config({ path: resolve(process.cwd(), '.env.local') });

const BUCKET = 'report-uploads';

function getDocxPath(r: {
  docx_file_path: string | null;
  narrative_file_path: string | null;
}): string | null {
  if (r.docx_file_path) return r.docx_file_path;
  const n = r.narrative_file_path ?? '';
  if (n.toLowerCase().endsWith('.docx') || n.toLowerCase().endsWith('.doc')) return n;
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const requireXlsx = args.includes('--require-xlsx');
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0 ? Math.max(1, parseInt(args[limitIdx + 1] || '500', 10) || 500) : 500;
  const studyIdsArg = args.find((a) => a.startsWith('--study-ids='));
  const studyIds = studyIdsArg
    ? studyIdsArg
        .slice('--study-ids='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const openai = createStyleCorpusEmbeddingClient();
  if (!openai && !dryRun) {
    console.error('Missing AI_GATEWAY_API_KEY or OPENAI_API_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: reports, error } = await (() => {
    let q = supabase
      .from('reports')
      .select(
        'id, study_id, market_type, client_name, client_entity, property_name, docx_file_path, narrative_file_path, has_docx, has_xlsx'
      )
      .is('deleted_at', null)
      .eq('has_docx', true)
      .order('created_at', { ascending: false })
      .limit(studyIds.length > 0 ? Math.max(studyIds.length * 3, 20) : limit * 2);

    if (requireXlsx) q = q.eq('has_xlsx', true);
    if (studyIds.length > 0) q = q.in('study_id', studyIds);
    return q;
  })();

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }

  const withPath = (reports ?? [])
    .filter((r) => getDocxPath(r) && !/^DRAFT-/i.test(r.study_id ?? ''))
    .filter((r) => (requireXlsx ? r.has_xlsx === true : true))
    .filter((r) => (studyIds.length > 0 ? studyIds.includes(r.study_id ?? '') : true))
    .slice(0, limit);

  console.log(
    `Found ${withPath.length} reports (limit=${limit}, force=${force}, requireXlsx=${requireXlsx}${
      studyIds.length ? `, studyIds=${studyIds.join(',')}` : ''
    })\n`
  );

  if (dryRun) {
    for (const r of withPath) {
      const holdout = isHoldoutStudyId(r.study_id, DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS);
      console.log(`  ${r.study_id ?? r.id}  holdout=${holdout}  ${getDocxPath(r)}`);
    }
    return;
  }

  const qa = {
    scanned: withPath.length,
    upserted: 0,
    skipped: 0,
    dropped: 0,
    holdoutStudies: new Set<string>(),
    sectionCounts: {} as Record<string, number>,
    errors: [] as string[],
  };

  for (let i = 0; i < withPath.length; i++) {
    const report = withPath[i];
    const docxPath = getDocxPath(report)!;
    const label = `[${i + 1}/${withPath.length}] ${report.study_id ?? report.id}`;

    const { data: fileData, error: dlError } = await supabase.storage
      .from(BUCKET)
      .download(docxPath);

    if (dlError || !fileData) {
      console.error(`${label} download failed: ${dlError?.message ?? 'no data'}`);
      qa.errors.push(`${report.study_id}:download`);
      continue;
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const result = await upsertStyleCorpusFromDocxBuffer({
      supabase,
      openai: openai!,
      report,
      buffer,
      filename: docxPath.split('/').pop() ?? undefined,
      force,
    });

    qa.upserted += result.upserted;
    qa.skipped += result.skipped;
    qa.dropped += result.dropped;
    for (const s of result.sections) {
      qa.sectionCounts[s] = (qa.sectionCounts[s] ?? 0) + 1;
    }
    if (isHoldoutStudyId(report.study_id, DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS)) {
      qa.holdoutStudies.add(report.study_id ?? report.id);
    }
    for (const e of result.errors) qa.errors.push(`${report.study_id}:${e}`);

    console.log(
      `${label} upserted=${result.upserted} skipped=${result.skipped} dropped=${result.dropped} sections=${result.sections.join(',') || '-'}`
    );
  }

  const reportOut = {
    generated_at: new Date().toISOString(),
    scanned: qa.scanned,
    upserted: qa.upserted,
    skipped: qa.skipped,
    dropped: qa.dropped,
    holdout_study_count: qa.holdoutStudies.size,
    holdout_studies: Array.from(qa.holdoutStudies),
    section_counts: qa.sectionCounts,
    error_count: qa.errors.length,
    errors_sample: qa.errors.slice(0, 40),
  };

  mkdirSync(resolve(process.cwd(), 'tmp'), { recursive: true });
  const outPath = resolve(
    process.cwd(),
    `tmp/style-corpus-qa-${Date.now()}.json`
  );
  writeFileSync(outPath, JSON.stringify(reportOut, null, 2));
  console.log(`\nQA report: ${outPath}`);
  console.log(
    `Done. upserted=${qa.upserted} skipped=${qa.skipped} dropped=${qa.dropped} holdouts=${qa.holdoutStudies.size}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
