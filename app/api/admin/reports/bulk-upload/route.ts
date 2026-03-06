/**
 * API Route: Bulk upload feasibility reports from local reports/ directory
 * POST /api/admin/reports/bulk-upload
 *
 * Body: { sourceDir?: string; batchIndex?: number }  - subdir (default "2025"), optional batch index for chunked processing
 * Header: x-internal-api-key (required)
 *
 * Reads .xlsx, .xlsm, .xlsxm, .docx, .doc from reports/{sourceDir},
 * pairs by study ID, and processes via unified-upload in batches.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import type { Dirent } from 'fs';
import { join, resolve } from 'path';
import { extractStudyId } from '@/lib/csv/feasibility-parser';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min for bulk

/** Never log or expose ADMIN_INTERNAL_API_KEY. Rotate if compromised. */
const INTERNAL_API_KEY = process.env.ADMIN_INTERNAL_API_KEY;
const MAX_FILES_PER_BATCH = 6;
const BATCH_DELAY_MS = 10000;
const BUCKET_NAME = 'report-uploads';

const XLSX_EXT = ['.xlsx', '.xlsm', '.xlsxm'];
const DOCX_EXT = ['.docx', '.doc'];

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function isXlsx(name: string): boolean {
  return XLSX_EXT.includes(getExt(name));
}

function isDocx(name: string): boolean {
  return DOCX_EXT.includes(getExt(name));
}

export async function POST(request: NextRequest) {
  try {
    const internalKey = request.headers.get('x-internal-api-key');
    if (!INTERNAL_API_KEY || !internalKey || internalKey !== INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing x-internal-api-key' },
        { status: 401 }
      );
    }

    // Rate limit internal-key requests (30/hour per IP) to allow ~12 batches per run
    const rlKey = `bulk-upload-internal:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, 30, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many bulk upload requests. Try again later.' },
        { status: 429 }
      );
    }

    let sourceDir = '2025';
    let batchIndex: number | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.sourceDir && typeof body.sourceDir === 'string') {
        sourceDir = body.sourceDir.replace(/^\/+|\/+$/g, '').replace(/\.\./g, '');
      }
      if (typeof body?.batchIndex === 'number' && body.batchIndex >= 0) {
        batchIndex = body.batchIndex;
      }
    } catch {
      // use default
    }

    const reportsRoot = resolve(process.cwd(), 'reports');
    const dirPath = resolve(reportsRoot, sourceDir);

    if (!dirPath.startsWith(reportsRoot)) {
      return NextResponse.json(
        { success: false, message: 'Invalid sourceDir: must be under reports/' },
        { status: 400 }
      );
    }

    let entries: Dirent[];
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to read directory';
      return NextResponse.json(
        { success: false, message: `Cannot read reports/${sourceDir}: ${msg}` },
        { status: 400 }
      );
    }

    const xlsxFiles: Array<{ name: string; path: string }> = [];
    const docxFiles: Array<{ name: string; path: string }> = [];

    for (const e of entries) {
      if (!e.isFile()) continue;
      const p = join(dirPath, e.name);
      if (isXlsx(e.name)) xlsxFiles.push({ name: e.name, path: p });
      else if (isDocx(e.name)) docxFiles.push({ name: e.name, path: p });
    }

    const studyMap = new Map<string, { xlsx: typeof xlsxFiles[0] | null; docx: typeof docxFiles[0] | null }>();

    // Prefer xlsx without "(1)" or similar duplicate suffix; prefer .xlsx over .xlsm
    const preferXlsx = (a: typeof xlsxFiles[0], b: typeof xlsxFiles[0] | null) => {
      if (!b) return a;
      const aDup = /\(\d+\)/.test(a.name);
      const bDup = /\(\d+\)/.test(b.name);
      if (aDup !== bDup) return aDup ? b : a;
      return a.name.endsWith('.xlsx') && !b.name.endsWith('.xlsx') ? a : b;
    };
    for (const f of xlsxFiles) {
      const sid = extractStudyId(f.name);
      const pair = studyMap.get(sid) || { xlsx: null, docx: null };
      pair.xlsx = preferXlsx(f, pair.xlsx);
      studyMap.set(sid, pair);
    }
    // Prefer docx without "(1)" or -report suffix
    const preferDocx = (a: typeof docxFiles[0], b: typeof docxFiles[0] | null) => {
      if (!b) return a;
      const aDup = /\(\d+\)|-report\.(docx?)$/i.test(a.name);
      const bDup = /\(\d+\)|-report\.(docx?)$/i.test(b.name);
      if (aDup !== bDup) return aDup ? b : a;
      return a.name.endsWith('.docx') && b.name.endsWith('.doc') ? a : b;
    };
    for (const f of docxFiles) {
      const sid = extractStudyId(f.name);
      const pair = studyMap.get(sid) || { xlsx: null, docx: null };
      pair.docx = preferDocx(f, pair.docx);
      studyMap.set(sid, pair);
    }

    const pairs = Array.from(studyMap.entries())
      .filter(([, p]) => p.xlsx || p.docx)
      .map(([studyId, p]) => ({ studyId, ...p }));

    if (pairs.length === 0) {
      return NextResponse.json(
        { success: false, message: `No .xlsx/.xlsm/.xlsxm or .docx/.doc files found in reports/${sourceDir}` },
        { status: 400 }
      );
    }

    const origin =
      (typeof request.url === 'string' ? new URL(request.url).origin : null) ||
      (request.headers.get('x-forwarded-host') ? `https://${request.headers.get('x-forwarded-host')}` : null) ||
      'http://localhost:3000';

    // Precompute batches
    const batches: Array<{ files: Array<{ path: string; name: string; type: 'xlsx' | 'docx' }>; pairs: typeof pairs }> = [];
    let batchFiles: Array<{ path: string; name: string; type: 'xlsx' | 'docx' }> = [];
    const batchPairs: typeof pairs = [];

    for (const pair of pairs) {
      const files: Array<{ path: string; name: string; type: 'xlsx' | 'docx' }> = [];
      if (pair.xlsx) files.push({ path: pair.xlsx.path, name: pair.xlsx.name, type: 'xlsx' });
      if (pair.docx) files.push({ path: pair.docx.path, name: pair.docx.name, type: 'docx' });

      if (batchFiles.length + files.length > MAX_FILES_PER_BATCH) {
        batches.push({ files: [...batchFiles], pairs: [...batchPairs] });
        batchFiles = [];
        batchPairs.length = 0;
      }
      batchFiles.push(...files);
      batchPairs.push(pair);
    }
    if (batchFiles.length > 0) {
      batches.push({ files: batchFiles, pairs: batchPairs });
    }

    const results: Array<{
      study_id: string;
      success: boolean;
      xlsx_processed: boolean;
      docx_processed: boolean;
      error?: string;
      warnings?: string[];
    }> = [];

    if (batchIndex !== undefined) {
      if (batchIndex >= batches.length) {
        return NextResponse.json({
          success: true,
          message: `Batch ${batchIndex} out of range (0-${batches.length - 1})`,
          results: [],
          batch_index: batchIndex,
          batch_count: batches.length,
        });
      }
      const batch = batches[batchIndex];
      const batchResults = await processBatch(origin, batch.files, batch.pairs, internalKey!);
      const successCount = batchResults.filter((r) => r.success).length;
      return NextResponse.json({
        success: successCount > 0,
        message: `Batch ${batchIndex + 1}/${batches.length}: ${successCount}/${batch.pairs.length} processed`,
        results: batchResults,
        batch_index: batchIndex,
        batch_count: batches.length,
      });
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await processBatch(origin, batch.files, batch.pairs, internalKey!);
      results.push(...batchResults);
      if (i < batches.length - 1) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const allSuccess = results.every((r) => r.success);

    return NextResponse.json({
      success: successCount > 0,
      message: allSuccess
        ? `All ${results.length} studies processed successfully`
        : `${successCount} of ${results.length} studies processed`,
      results,
      batch_count: batches.length,
    });
  } catch (err) {
    console.error('[bulk-upload] Error:', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Bulk upload failed' },
      { status: 500 }
    );
  }
}

async function processBatch(
  origin: string,
  files: Array<{ path: string; name: string; type: 'xlsx' | 'docx' }>,
  pairs: Array<{ studyId: string; xlsx: { name: string; path: string } | null; docx: { name: string; path: string } | null }>,
  internalKey: string
): Promise<
  Array<{
    study_id: string;
    success: boolean;
    xlsx_processed: boolean;
    docx_processed: boolean;
    error?: string;
    warnings?: string[];
  }>
> {
  const formData = new FormData();

  for (const f of files) {
    const buf = await readFile(f.path);
    const blob = new Blob([buf]);
    const mime =
      f.type === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    formData.append('files', new File([blob], f.name, { type: mime }));
  }

  const res = await fetch(`${origin}/api/admin/reports/unified-upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'x-internal-api-key': internalKey,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    return pairs.map((p) => ({
      study_id: p.studyId,
      success: false,
      xlsx_processed: false,
      docx_processed: false,
      error: json.message || `Upload failed (${res.status})`,
    }));
  }

  const byStudy = new Map<string, (typeof json.results)[0]>();
  for (const r of json.results || []) {
    byStudy.set(r.study_id, r);
  }

  return pairs.map((p) => {
    const r = byStudy.get(p.studyId);
    if (r) return r;
    return {
      study_id: p.studyId,
      success: false,
      xlsx_processed: false,
      docx_processed: false,
      error: 'Not in batch response',
    };
  });
}
