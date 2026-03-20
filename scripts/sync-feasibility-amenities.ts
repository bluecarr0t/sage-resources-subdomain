#!/usr/bin/env npx tsx
/**
 * Sync amenity costs from feasibility_development_costs into site_builder_amenity_costs.
 * Run: npx tsx scripts/sync-feasibility-amenities.ts
 *
 * Extracts amenity line items from unit_detail (uploaded .xlsx/.docx feasibility studies),
 * maps to slugs, computes median per_unit_cost, and upserts into site_builder_amenity_costs.
 * NO mock or fallback data—only real feasibility study data.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import { extractFromFeasibilityRows } from '@/lib/site-builder/feasibility-amenity-sync';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL required in .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();

    const rvRes = await client.query<{ name: string }>(
      `SELECT name FROM site_builder_rv_site_types`
    );
    const rvSiteTypeNames = rvRes.rows.map((r) => r.name);

    const costRes = await client.query<{
      line_item: string;
      per_unit_cost: number | null;
      report_id: string | null;
      study_id: string | null;
      report_title: string | null;
    }>(`
      SELECT fdc.line_item, fdc.per_unit_cost, fdc.report_id, fdc.study_id, r.title AS report_title
      FROM feasibility_development_costs fdc
      LEFT JOIN reports r ON r.id = fdc.report_id
      WHERE fdc.category = 'unit_detail'
        AND fdc.per_unit_cost IS NOT NULL
        AND fdc.per_unit_cost >= 100
        AND fdc.per_unit_cost <= 100000
    `);

    const extracted = extractFromFeasibilityRows(costRes.rows, rvSiteTypeNames);

    if (extracted.length === 0) {
      console.log('No amenity line items found in feasibility_development_costs (unit_detail).');
      console.log('Upload feasibility studies (.xlsx/.docx) and re-run this script to populate amenities.');
      return;
    }

    console.log(`Extracted ${extracted.length} amenities from feasibility studies:\n`);
    for (const a of extracted) {
      const reportCount = new Set(a.sources.map((s) => s.report_id)).size;
      const reportInfo = reportCount > 1 ? ` [${reportCount} reports]` : '';
      console.log(`  ${a.slug}: $${a.cost_per_unit.toLocaleString()} (n=${a.sample_count}${reportInfo}) from: ${a.source_line_items.join(', ')}`);
    }

    for (const a of extracted) {
      const sourcesJson = JSON.stringify(a.sources);
      await client.query(
        `INSERT INTO site_builder_amenity_costs (slug, name, cost_per_unit, applies_to, sources)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           cost_per_unit = EXCLUDED.cost_per_unit,
           applies_to = EXCLUDED.applies_to,
           sources = EXCLUDED.sources`,
        [a.slug, a.name, a.cost_per_unit, a.applies_to, sourcesJson]
      );
    }

    console.log(`\n✓ Upserted ${extracted.length} amenities into site_builder_amenity_costs`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
