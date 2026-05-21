#!/usr/bin/env tsx
/**
 * Phase 0 SEO instrumentation audit.
 *
 * Usage:
 *   npm run seo:audit-instrumentation
 *   SITE_URL=https://resources.sageoutdooradvisory.com npm run seo:audit-instrumentation
 *   npm run seo:audit-instrumentation -- --write-baseline
 */
import fs from 'fs';
import path from 'path';
import {
  buildSeoInstrumentationReport,
  SEO_SITE_URL,
  type SeoInstrumentationReport,
} from '../lib/seo-instrumentation';

const WRITE_BASELINE = process.argv.includes('--write-baseline');
const BASELINE_PATH = path.join(
  process.cwd(),
  'docs/seo/baselines/instrumentation-baseline.json'
);

function printReport(report: SeoInstrumentationReport): void {
  console.log('\n=== SEO Phase 0 Instrumentation Audit ===\n');
  console.log(`Site: ${report.siteUrl}`);
  console.log(`Checked: ${report.checkedAt}`);
  console.log(`Ready: ${report.ready ? 'YES' : 'NO'}\n`);

  console.log('Environment variables:');
  for (const e of report.env) {
    const mark = e.configured ? '✓' : e.required ? '✗' : '○';
    console.log(`  ${mark} ${e.name}${e.required ? ' (required)' : ''}`);
    if (e.notes) console.log(`      ${e.notes}`);
  }

  console.log('\nHTTP endpoints:');
  for (const h of report.http) {
    console.log(`  ${h.ok ? '✓' : '✗'} ${h.name} [${h.status ?? '—'}] ${h.url}`);
    if (h.detail) console.log(`      ${h.detail}`);
  }

  console.log('\nSitemap:');
  console.log(`  Index OK: ${report.sitemap.indexOk}`);
  console.log(`  Total URLs: ${report.sitemap.totalUrls}`);
  for (const child of report.sitemap.children) {
    const short = child.loc.replace(report.siteUrl, '');
    console.log(`    ${short}: ${child.urlCount}`);
  }

  console.log('\nGoogle Search Console:');
  console.log(`  HTML verification file in public/: ${report.googleSearchConsole.htmlFilePresent}`);
  console.log(`  Meta tag env configured: ${report.googleSearchConsole.metaTagConfigured}`);

  console.log('\nIndexNow:');
  console.log(`  INDEXNOW_KEY configured: ${report.indexNow.keyConfigured}`);
  console.log(`  Key file reachable: ${report.indexNow.keyFileOk}`);
  if (report.indexNow.keyFileUrl) console.log(`  Key URL: ${report.indexNow.keyFileUrl}`);

  console.log('\nGA4:');
  console.log(`  Measurement ID configured: ${report.ga4.measurementIdConfigured}`);

  if (report.blockers.length > 0) {
    console.log('\nBlockers:');
    for (const b of report.blockers) console.log(`  - ${b}`);
  }

  console.log('\n--- Manual steps (GSC / GA4 UI) ---');
  console.log('1. GSC → add property resources.sageoutdooradvisory.com');
  console.log('2. GSC → Sitemaps → submit https://resources.sageoutdooradvisory.com/sitemap.xml');
  console.log('3. GSC → Performance → export last 28 days (queries + pages)');
  console.log('4. GA4 → Admin → register custom dimensions: seo_section, seo_content_slug');
  console.log('5. GA4 → Explore → duplicate "Organic by SEO section" report (see PHASE_0_INSTRUMENTATION.md)');
  console.log('');
}

async function main(): Promise<void> {
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '') || SEO_SITE_URL;
  const report = await buildSeoInstrumentationReport(siteUrl);
  printReport(report);

  if (WRITE_BASELINE) {
    const dir = path.dirname(BASELINE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Baseline written: ${BASELINE_PATH}`);
  }

  process.exit(report.ready ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
