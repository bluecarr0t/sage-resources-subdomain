#!/usr/bin/env npx tsx
/**
 * Bulk upload archived feasibility files from local_data/past_reports/{year}
 *
 * Folder layout (example: local_data/past_reports/2023):
 *   Flat directory of .xlsx / .docx / .doc files named with study ids (e.g. 23-101A-01 ...).
 *   Pairs match the same rules as reports/{year} bulk upload (prefers non-"(1)" duplicates).
 *
 * Not uploaded (by design — same as the web app):
 *   - .pdf only (no parser in unified-upload)
 *   - Files whose names do not contain a recognizable study id (e.g. generic workbooks)
 *
 * Usage:
 *   npx tsx scripts/bulk-upload-past-reports.ts           # year 2023
 *   npx tsx scripts/bulk-upload-past-reports.ts 2026
 *   npx tsx scripts/bulk-upload-past-reports-2026.ts    # same as above for 2026
 *   PAST_REPORTS_BULK_YEAR=2026 npx tsx scripts/bulk-upload-past-reports.ts
 *
 * Requires:
 *   - Dev (or deployed) server reachable at BULK_UPLOAD_URL (default http://localhost:3001)
 *   - ADMIN_INTERNAL_API_KEY in .env.local
 *   - At least one active row in managed_users
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.BULK_UPLOAD_URL || 'http://localhost:3001';
const yearRaw = process.env.PAST_REPORTS_BULK_YEAR || process.argv[2] || '2023';
const year = yearRaw.replace(/[^\d]/g, '') || '2023';
const relativePath = `past_reports/${year}`;
const internalKey = process.env.ADMIN_INTERNAL_API_KEY;
const BATCH_DELAY_MS = 8000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(timeout);
  return res;
}

async function main() {
  if (!internalKey) {
    console.error('Error: ADMIN_INTERNAL_API_KEY not set in .env.local');
    process.exit(1);
  }

  const localDir = resolve(process.cwd(), 'local_data', relativePath);
  if (!existsSync(localDir)) {
    console.error(`Error: folder not found: ${localDir}`);
    process.exit(1);
  }

  console.log(`Bulk uploading from local_data/${relativePath}...`);
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
    const res = await fetchWithTimeout(
      `${BASE_URL}/api/admin/reports/bulk-upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': internalKey,
        },
        body: JSON.stringify({ fromLocalData: true, relativePath, batchIndex }),
      },
      4 * 60 * 1000
    );

    const data = await res.json();

    if (!res.ok) {
      console.error(`Batch ${batchIndex + 1} error:`, data.message || res.statusText);
      process.exit(1);
    }

    batchCount = data.batch_count ?? batchCount;
    console.log(`  Batch ${batchIndex + 1}/${batchCount}: ${data.message}`);

    const results = data.results || [];
    allResults.push(...results);

    for (const r of results.filter((r: { success: boolean }) => r.success)) {
      const parts = [];
      if (r.xlsx_processed) parts.push('XLSX');
      if (r.docx_processed) parts.push('DOCX');
      console.log(`    ✓ ${r.study_id} (${parts.join(' + ')})`);
    }
    for (const r of results.filter((r: { success: boolean }) => !r.success)) {
      console.log(`    ✗ ${r.study_id}: ${r.error || 'Unknown error'}`);
    }

    batchIndex++;
    if (batchIndex < batchCount) {
      console.log(`  Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  const success = allResults.filter((r) => r.success);
  const failed = allResults.filter((r) => !r.success);

  console.log('');
  console.log(`Done: ${success.length} succeeded, ${failed.length} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
