#!/usr/bin/env npx tsx
/**
 * Audit published glamping properties for brand_id gaps and name-based chain matches.
 * Run: npm run audit:brands
 * Optional: npx tsx scripts/audit-glamping-brand-assignments.ts --write-json scripts/.tmp-brand-audit.json
 * Apply backfill: npx tsx scripts/audit-glamping-brand-assignments.ts --apply
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import {
  applyBrandBackfill,
  buildBrandAssignmentAudit,
  fetchPropertiesForBrandAudit,
} from '@/lib/brand-assignment-audit';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}

async function fetchBrands() {
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('glamping_brands')
    .select('id, slug, display_name, legacy_chain_key, parent_brand_id');
  if (error) throw error;
  return data ?? [];
}

async function main() {
  const writeJson = process.argv.includes('--write-json');
  const jsonPath = process.argv[process.argv.indexOf('--write-json') + 1];
  const apply = process.argv.includes('--apply');

  const [brands, rows] = await Promise.all([fetchBrands(), fetchPropertiesForBrandAudit('published')]);
  const report = buildBrandAssignmentAudit(brands, rows);

  console.log('\n=== PUBLISHED BRAND COVERAGE (deduped properties) ===');
  console.log(`Total published anchors: ${report.published.totalAnchors}`);
  console.log(`With brand_id: ${report.published.withBrand}`);
  console.log(`Missing brand_id: ${report.published.missingBrand}`);

  console.log('\n=== BACKFILL: match existing brand via property name (published) ===');
  console.log(`Groups: ${report.backfillCandidates.length}`);
  for (const g of report.backfillCandidates.slice(0, 25)) {
    console.log(
      `  ${g.chainKey} → ${g.brandDisplayName} (${g.brandSlug}): ${g.unassignedRowCount} unassigned`
    );
  }

  console.log('\n=== NEW BRAND CANDIDATES (2+ published) ===');
  for (const g of report.newBrandCandidates.slice(0, 20)) {
    console.log(`  ${g.chainKey}: ${g.propertyCount} properties`);
  }

  if (writeJson && jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\nWrote ${jsonPath}`);
  }

  if (apply) {
    const result = await applyBrandBackfill({ dryRun: false });
    console.log('\n=== APPLIED BACKFILL ===');
    console.log(`Updated ${result.updatedRowCount} rows`);
    for (const b of result.byBrand) {
      console.log(`  ${b.brandSlug}: ${b.rowCount}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
