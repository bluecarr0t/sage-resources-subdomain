#!/usr/bin/env npx tsx
/**
 * Bulk upload past reports from an absolute directory (e.g. Downloads/reports),
 * skipping study_ids that already exist in `reports` (no duplicate rows).
 *
 * Usage:
 *   npx tsx scripts/bulk-upload-absolute-path.ts /Users/me/Downloads/reports
 *   npx tsx scripts/bulk-upload-absolute-path.ts /Users/me/Downloads/reports --force
 *
 * --force: re-process existing study_ids (still updates the same report row; no second insert)
 *
 * Requires: ADMIN_INTERNAL_API_KEY, running app at BULK_UPLOAD_URL (default http://localhost:3003)
 */

import { config } from 'dotenv';
import { resolve, basename, extname } from 'path';
import { readdir, readFile, mkdir, symlink, lstat, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { extractStudyId } from '../lib/csv/feasibility-parser';

config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.BULK_UPLOAD_URL || 'http://localhost:3003';
const internalKey = process.env.ADMIN_INTERNAL_API_KEY;
const args = process.argv.slice(2).filter((a) => a !== '--force');
const force = process.argv.includes('--force');
const sourceDir = args[0];

const XLSX_EXT = new Set(['.xlsx', '.xlsm', '.xlsxm']);
const DOCX_EXT = new Set(['.docx', '.doc']);

function looksLikeStudyFilename(name: string): boolean {
  const base = name.replace(/\.[^.]+$/u, '');
  if (/\b\d{2}-\d{3}[A-Z]?-\d{2}\b/u.test(base)) return true;
  if (/(?:^|\b)\d{2}-\d{4,}[A-Z]?-\d{2}\b/u.test(base)) return true;
  return false;
}

async function main() {
  if (!sourceDir) {
    console.error('Usage: npx tsx scripts/bulk-upload-absolute-path.ts <absolute-dir> [--force]');
    process.exit(1);
  }
  if (!internalKey) {
    console.error('ADMIN_INTERNAL_API_KEY not set in .env.local');
    process.exit(1);
  }

  const abs = resolve(sourceDir);
  if (!existsSync(abs)) {
    console.error(`Directory not found: ${abs}`);
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const entries = await readdir(abs);
  const studyIds = new Set<string>();
  for (const name of entries) {
    if (!looksLikeStudyFilename(name)) continue;
    const ext = extname(name).toLowerCase();
    if (!XLSX_EXT.has(ext) && !DOCX_EXT.has(ext)) continue;
    const sid = extractStudyId(name);
    if (sid) studyIds.add(sid);
  }

  const ids = [...studyIds].sort();
  if (!ids.length) {
    console.error(`No study-id files found in ${abs}`);
    process.exit(1);
  }

  console.log(`Found ${ids.length} study IDs in ${abs}`);
  const { data: existingRows, error } = await supabase
    .from('reports')
    .select('id, study_id, has_docx, has_xlsx, city, state')
    .in('study_id', ids)
    .is('deleted_at', null);
  if (error) {
    console.error('Failed to query reports:', error.message);
    process.exit(1);
  }

  const existingByStudy = new Map<string, NonNullable<typeof existingRows>[number][]>();
  for (const row of existingRows ?? []) {
    const list = existingByStudy.get(row.study_id) ?? [];
    list.push(row);
    existingByStudy.set(row.study_id, list);
  }

  // Soft-delete extra duplicate report rows for the same study_id
  // Prefer: has_xlsx+has_docx, then has either, then newest created_at
  let softDeleted = 0;
  for (const [studyId, rows] of existingByStudy) {
    if (rows.length <= 1) continue;
    const score = (r: (typeof rows)[number]) =>
      (r.has_xlsx ? 2 : 0) + (r.has_docx ? 2 : 0);
    const sorted = [...rows].sort((a, b) => {
      const ds = score(b) - score(a);
      if (ds !== 0) return ds;
      return String(b.id).localeCompare(String(a.id));
    });
    const keep = sorted[0];
    const extras = sorted.slice(1);
    console.log(
      `  Dedup ${studyId}: keeping ${keep.id.slice(0, 8)}… (docx=${keep.has_docx} xlsx=${keep.has_xlsx}), soft-deleting ${extras.length} extra`
    );
    for (const extra of extras) {
      const { error: delErr } = await supabase
        .from('reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', extra.id);
      if (delErr) {
        console.warn(`    Failed soft-delete ${extra.id}: ${delErr.message}`);
      } else {
        softDeleted += 1;
      }
    }
    existingByStudy.set(studyId, [keep]);
  }

  const toUpload: string[] = [];
  const skipped: string[] = [];
  for (const id of ids) {
    const rows = existingByStudy.get(id) ?? [];
    const primary = rows[0];
    // Skip only when narrative is present (has_docx). XLSX comps may exist without the flag.
    // --force always re-uploads. Incomplete (no docx) gets refreshed into the same study_id.
    const complete = !!(primary && primary.has_docx);
    if (complete && !force) {
      skipped.push(id);
      console.log(
        `  SKIP ${id} (already in DB: docx=${primary.has_docx} xlsx=${primary.has_xlsx} ${primary.city || ''}, ${primary.state || ''})`
      );
    } else {
      toUpload.push(id);
      if (primary && force) {
        console.log(`  RE-UPLOAD ${id} (force; will update existing report row)`);
      } else if (primary && !complete) {
        console.log(
          `  UPLOAD ${id} (incomplete existing row — refreshing into same study_id)`
        );
      } else {
        console.log(`  UPLOAD ${id} (new)`);
      }
    }
  }

  if (!toUpload.length) {
    console.log('');
    console.log(`Nothing to upload. Skipped ${skipped.length}; soft-deleted ${softDeleted} duplicate rows.`);
    return;
  }

  // Symlink only the files for studies we need into a staging folder under local_data
  const stamp = new Date().toISOString().slice(0, 10);
  const relativePath = `past_reports/abs-upload-${stamp}`;
  const staging = resolve(process.cwd(), 'local_data', relativePath);
  await mkdir(staging, { recursive: true });

  // Clear prior staging contents for this path
  for (const name of await readdir(staging)) {
    await rm(resolve(staging, name), { force: true });
  }

  const uploadIdSet = new Set(toUpload);
  let linked = 0;
  for (const name of entries) {
    if (!looksLikeStudyFilename(name)) continue;
    const ext = extname(name).toLowerCase();
    if (!XLSX_EXT.has(ext) && !DOCX_EXT.has(ext)) continue;
    const sid = extractStudyId(name);
    if (!sid || !uploadIdSet.has(sid)) continue;
    const target = resolve(staging, name);
    const source = resolve(abs, name);
    try {
      const st = await lstat(target).catch(() => null);
      if (st) await rm(target, { force: true });
      await symlink(source, target);
      linked += 1;
    } catch {
      // Fallback: copy via read/write if symlink fails
      const buf = await readFile(source);
      const { writeFile } = await import('fs/promises');
      await writeFile(target, buf);
      linked += 1;
    }
  }

  console.log('');
  console.log(`Staged ${linked} files → local_data/${relativePath}`);
  console.log(`Uploading ${toUpload.length} studies (skipped ${skipped.length})…`);
  console.log(`POST ${BASE_URL}/api/admin/reports/bulk-upload`);
  console.log('');

  const allResults: Array<{
    study_id: string;
    success: boolean;
    xlsx_processed?: boolean;
    docx_processed?: boolean;
    error?: string;
  }> = [];
  let batchIndex = 0;
  let batchCount = 999;

  while (batchIndex < batchCount) {
    const res = await fetch(`${BASE_URL}/api/admin/reports/bulk-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': internalKey,
      },
      body: JSON.stringify({
        fromLocalData: true,
        relativePath,
        batchIndex,
      }),
    });
    const json = (await res.json()) as {
      success?: boolean;
      message?: string;
      batch_index?: number;
      batch_count?: number;
      results?: typeof allResults;
    };
    if (!res.ok || json.success === false) {
      // success:false can mean partial batch failure; still advance if results present
      if (!json.results?.length) {
        console.error(`Batch ${batchIndex} failed:`, json.message || res.statusText);
        process.exit(1);
      }
    }
    batchCount = json.batch_count ?? 1;
    console.log(`  Batch ${(json.batch_index ?? batchIndex) + 1}/${batchCount}: ${json.message || 'ok'}`);
    for (const r of json.results ?? []) {
      allResults.push(r);
      const mark = r.success ? '✓' : '✗';
      const parts = [
        r.xlsx_processed ? 'XLSX' : null,
        r.docx_processed ? 'DOCX' : null,
      ]
        .filter(Boolean)
        .join(' + ');
      console.log(
        `    ${mark} ${r.study_id}${parts ? ` (${parts})` : ''}${r.error ? `: ${r.error}` : ''}`
      );
    }
    batchIndex += 1;
    if (batchIndex < batchCount) {
      await new Promise((r) => setTimeout(r, 8000));
    }
  }

  const ok = allResults.filter((r) => r.success).length;
  const fail = allResults.filter((r) => !r.success).length;
  console.log('');
  console.log(
    `Done: ${ok} succeeded, ${fail} failed, ${skipped.length} skipped (already present), ${softDeleted} duplicate rows soft-deleted`
  );
  console.log(`Source: ${abs}`);
  void basename;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
