#!/usr/bin/env npx tsx
/**
 * Bulk upload feasibility reports from reports/{sourceDir}
 *
 * Usage:
 *   npx tsx scripts/bulk-upload-reports.ts [sourceDir]
 *
 * Examples:
 *   npx tsx scripts/bulk-upload-reports.ts           # upload from reports/2025
 *   npx tsx scripts/bulk-upload-reports.ts 2025      # same
 *
 * Requires:
 *   - Dev server running (npm run dev) at localhost:3001
 *   - ADMIN_INTERNAL_API_KEY in .env.local
 *   - At least one managed user in the database
 *
 * Files: .xlsx, .xlsm, .xlsxm, .docx, .doc
 * Pairs by study ID (e.g. 25-100A-01) and uses same extraction/parser as web upload.
 * Processes in batches to avoid timeouts.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.BULK_UPLOAD_URL || 'http://localhost:3001';
const sourceDir = process.argv[2] || '2025';
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

  console.log(`Bulk uploading from reports/${sourceDir}...`);
  console.log(`POST ${BASE_URL}/api/admin/reports/bulk-upload`);
  console.log('');

  const allResults: Array<{ study_id: string; success: boolean; xlsx_processed?: boolean; docx_processed?: boolean; error?: string }> = [];
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
        body: JSON.stringify({ sourceDir, batchIndex }),
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
