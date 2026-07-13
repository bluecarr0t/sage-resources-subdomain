#!/usr/bin/env npx tsx
/**
 * Audit published glamping properties for brand_id gaps and name/domain/sibling matches.
 * Run: npm run audit:brands
 * Apply backfill: npm run audit:brands:apply
 * Dry-run apply: npx tsx scripts/audit-glamping-brand-assignments.ts --dry-run
 * Filter brands: npx tsx scripts/audit-glamping-brand-assignments.ts --brand-slugs=autocamp,koa
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { resolve } from 'path';
import {
  applyBrandBackfill,
  buildBrandAssignmentAudit,
  buildUnbrandedMultiUnitChains,
  createBrandAuditSupabaseClient,
  fetchPropertiesForBrandAudit,
} from '@/lib/brand-assignment-audit';
import { csvEscape, OUTPUT_DIR, writeCsv } from '@/lib/sage-data-p1-audit';

dotenv.config({ path: '.env.local' });
dotenv.config();

function parseBrandSlugs(): string[] | undefined {
  const arg = process.argv.find((a) => a.startsWith('--brand-slugs='));
  if (!arg) return undefined;
  const raw = arg.split('=')[1]?.trim();
  if (!raw) return undefined;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const writeJson = process.argv.includes('--write-json');
  const jsonPath = process.argv[process.argv.indexOf('--write-json') + 1];
  const apply = process.argv.includes('--apply');
  const dryRun = process.argv.includes('--dry-run') || !apply;
  const brandSlugs = parseBrandSlugs();

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY'
    );
    process.exit(1);
  }

  const rows = await fetchPropertiesForBrandAudit('published');
  const brands = await createBrandAuditSupabaseClient()
    .from('glamping_brands')
    .select('id, slug, display_name, legacy_chain_key, parent_brand_id, website_url')
    .then(({ data, error }) => {
      if (error) throw error;
      return data ?? [];
    });
  const report = buildBrandAssignmentAudit(brands, rows);
  const unbrandedChains = buildUnbrandedMultiUnitChains(rows);

  console.log('\n=== PUBLISHED BRAND COVERAGE (deduped properties) ===');
  console.log(`Total published anchors: ${report.published.totalAnchors}`);
  console.log(`With brand_id: ${report.published.withBrand}`);
  console.log(`Missing brand_id: ${report.published.missingBrand}`);
  const pct =
    report.published.totalAnchors > 0
      ? ((report.published.withBrand / report.published.totalAnchors) * 100).toFixed(1)
      : '0';
  console.log(`Coverage: ${pct}%`);

  console.log('\n=== BACKFILL CANDIDATES (name + domain) ===');
  console.log(`Groups: ${report.backfillCandidates.length}`);
  for (const g of report.backfillCandidates.slice(0, 25)) {
    console.log(
      `  [${g.matchSource}] ${g.chainKey} → ${g.brandDisplayName} (${g.brandSlug}): ${g.unassignedRowCount} unassigned`
    );
  }

  console.log('\n=== NEW BRAND CANDIDATES (2+ published) ===');
  for (const g of report.newBrandCandidates.slice(0, 20)) {
    console.log(`  ${g.chainKey}: ${g.propertyCount} properties`);
  }

  console.log('\n=== UNBRANDED MULTI-UNIT CHAINS (manual pass) ===');
  for (const c of unbrandedChains.slice(0, 20)) {
    console.log(
      `  ${c.chainKey}: ${c.totalUnitRows} unit rows, ${c.anchorCount} anchors`
    );
  }

  const chainCsv = unbrandedChains.map((c) =>
    [
      csvEscape(c.chainKey),
      String(c.anchorCount),
      String(c.totalUnitRows),
      csvEscape(c.samplePropertyNames.join(' | ')),
    ].join(',')
  );
  const chainPath = resolve(OUTPUT_DIR, 'unbranded-multi-unit-chains.csv');
  writeCsv(
    chainPath,
    'chain_key,anchor_count,total_unit_rows,sample_names',
    chainCsv
  );
  console.log(`\nWrote ${chainPath}`);

  if (writeJson && jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`Wrote ${jsonPath}`);
  }

  if (apply || dryRun) {
    const result = await applyBrandBackfill({
      dryRun: dryRun && !apply,
      brandSlugs,
    });
    console.log(`\n=== ${result.dryRun ? 'DRY RUN' : 'APPLIED'} BACKFILL ===`);
    console.log(`Updated ${result.updatedRowCount} rows`);
    for (const b of result.byBrand.slice(0, 30)) {
      console.log(`  [${b.matchSource}] ${b.brandSlug}: ${b.rowCount}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
