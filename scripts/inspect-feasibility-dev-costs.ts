#!/usr/bin/env npx tsx
/**
 * Inspect feasibility_development_costs to find amenity-related line items.
 * Run: npx tsx scripts/inspect-feasibility-dev-costs.ts
 *
 * Outputs distinct line_item, category, and cost stats for amenity mapping.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

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

    const { rows } = await client.query<{
      line_item: string;
      category: string;
      count: number;
      report_count: number;
      avg_per_unit: number;
      avg_total: number;
      min_per_unit: number;
      max_per_unit: number;
    }>(`
      SELECT
        line_item,
        category,
        COUNT(*) AS count,
        COUNT(DISTINCT report_id)::int AS report_count,
        ROUND(AVG(per_unit_cost)::numeric, 0)::float AS avg_per_unit,
        ROUND(AVG(total_cost)::numeric, 0)::float AS avg_total,
        ROUND(MIN(per_unit_cost)::numeric, 0)::float AS min_per_unit,
        ROUND(MAX(per_unit_cost)::numeric, 0)::float AS max_per_unit
      FROM feasibility_development_costs
      GROUP BY line_item, category
      ORDER BY category, report_count DESC, line_item
    `);

    console.log('\n=== feasibility_development_costs: distinct line_item by category (report_count = # of reports) ===\n');
    const byCategory = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!byCategory.has(r.category)) byCategory.set(r.category, []);
      byCategory.get(r.category)!.push(r);
    }
    for (const [cat, items] of byCategory) {
      console.log(`\n--- ${cat} (${items.length} line items) ---`);
      for (const r of items) {
        const perUnit = r.avg_per_unit != null ? `$${r.avg_per_unit.toLocaleString()}` : '—';
        const total = r.avg_total != null ? `$${r.avg_total.toLocaleString()}` : '—';
        const reports = r.report_count != null ? ` | reports=${r.report_count}` : '';
        console.log(`  ${r.line_item} | n=${r.count}${reports} | per_unit=${perUnit} | total=${total}`);
      }
    }
    console.log('\n');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
