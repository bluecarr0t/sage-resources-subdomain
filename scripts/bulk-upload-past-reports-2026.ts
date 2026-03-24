#!/usr/bin/env npx tsx
/**
 * Bulk upload archived feasibility files from local_data/past_reports/2026
 *
 * Same pipeline as bulk-upload-past-reports.ts (unified-upload → comparables + docx;
 * Best Comps synthesis fills feasibility_comparables when Comps Summ/Grid is missing).
 *
 * Usage:
 *   BULK_UPLOAD_URL=http://localhost:3003 npx tsx scripts/bulk-upload-past-reports-2026.ts
 *   npm run bulk-upload:past-2026
 *
 * Requires:
 *   - Dev server reachable at BULK_UPLOAD_URL (this repo’s dev default is port 3003)
 *   - ADMIN_INTERNAL_API_KEY in .env.local
 *   - managed_users row
 */

import { spawnSync } from 'child_process';
import { join } from 'path';

const script = join(process.cwd(), 'scripts', 'bulk-upload-past-reports.ts');
const r = spawnSync('npx', ['tsx', script, '2026'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(r.status === null ? 1 : r.status);
