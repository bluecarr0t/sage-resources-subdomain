#!/usr/bin/env npx tsx
/**
 * Live analysis: cce_component_costs vs outdoor-hospitality scope tiers.
 * Run: npm run analyze:cce-component-scope
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (same as app server).
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createServerClient } from '@/lib/supabase';
import {
  COMPONENT_SCOPE_SUSPICIOUS_KEYWORDS,
  isOutdoorHospitalityOccupancyName,
  rowPassesOutdoorHospitalityComponentScope,
  rowPassesOutdoorHospitalityComponentScopeStrict,
} from '@/lib/cce-outdoor-hospitality-scope';

type Row = { section_name: string | null; item_name: string | null; occupancy_id: string | null };

async function fetchAllComponentRows(supabase: ReturnType<typeof createServerClient>): Promise<Row[]> {
  const pageSize = 1000;
  const out: Row[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('cce_component_costs')
      .select('section_name, item_name, occupancy_id')
      .range(from, from + pageSize - 1);
    if (error) {
      if (error.code === '42P01') {
        console.error('Table cce_component_costs does not exist.');
        return [];
      }
      throw error;
    }
    if (!data?.length) break;
    out.push(...(data as Row[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

/** Mirrors API: standard/strict predicates + hospitality occupancy OR null. */
function rowMatchesApiScope(
  row: Row,
  mode: 'standard' | 'strict',
  allowedOccupancyIds: Set<string>
): boolean {
  const base =
    mode === 'strict'
      ? rowPassesOutdoorHospitalityComponentScopeStrict(row.section_name, row.item_name)
      : rowPassesOutdoorHospitalityComponentScope(row.section_name, row.item_name);
  if (!base) return false;
  if (allowedOccupancyIds.size === 0) return true;
  if (row.occupancy_id == null || !String(row.occupancy_id).trim()) return true;
  return allowedOccupancyIds.has(row.occupancy_id);
}

function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local — skipping live analysis.'
    );
    process.exit(2);
  }

  return (async () => {
    const supabase = createServerClient();
    const rows = await fetchAllComponentRows(supabase);
    if (rows.length === 0) {
      console.log('No rows returned.');
      return;
    }

    const { data: occRows } = await supabase.from('cce_occupancies').select('id, occupancy_name');
    const allowedOccupancyIds = new Set(
      (occRows || [])
        .filter((o) => isOutdoorHospitalityOccupancyName(o.occupancy_name))
        .map((o) => o.id as string)
    );

    const inStandard = rows.filter((r) => rowMatchesApiScope(r, 'standard', allowedOccupancyIds));
    const inStrict = rows.filter((r) => rowMatchesApiScope(r, 'strict', allowedOccupancyIds));

    const bySection = new Map<string, number>();
    for (const r of inStandard) {
      const k = (r.section_name ?? '(null)').trim() || '(empty)';
      bySection.set(k, (bySection.get(k) ?? 0) + 1);
    }
    const topSections = [...bySection.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40);

    const suspicious = inStandard.filter((r) => {
      const blob = `${r.section_name ?? ''} ${r.item_name ?? ''}`.toUpperCase();
      return COMPONENT_SCOPE_SUSPICIOUS_KEYWORDS.some((kw) => blob.includes(kw));
    });

    const nullSection = rows.filter((r) => r.section_name == null || !String(r.section_name).trim());
    const nullItem = rows.filter((r) => r.item_name == null || !String(r.item_name).trim());

    console.log('\n=== CCE component costs — outdoor hospitality scope analysis ===\n');
    console.log(`Total rows:                    ${rows.length}`);
    console.log(
      `Standard scope (API parity):   ${inStandard.length} (${((inStandard.length / rows.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `Strict scope (API parity):     ${inStrict.length} (${((inStrict.length / rows.length) * 100).toFixed(1)}%)`
    );
    console.log(`Hospitality occupancy IDs:     ${allowedOccupancyIds.size}`);
    console.log(`Rows with null/empty section:  ${nullSection.length}`);
    console.log(`Rows with null/empty item:     ${nullItem.length}`);
    console.log('\n--- Top section_name among STANDARD in-scope rows ---\n');
    for (const [name, n] of topSections) {
      console.log(`${String(n).padStart(5)}  ${name}`);
    }
    console.log(
      `\n--- Rows matching COMPONENT_SCOPE_SUSPICIOUS_KEYWORDS (${suspicious.length}) — watchlist ---\n`
    );
    const sample = suspicious.slice(0, 35);
    for (const r of sample) {
      const item = (r.item_name ?? '').replace(/\s+/g, ' ').slice(0, 100);
      console.log(`  [${r.section_name}] ${item}`);
    }
    if (suspicious.length > sample.length) {
      console.log(`  ... and ${suspicious.length - sample.length} more`);
    }
    console.log('\n=== Done ===\n');
  })();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
