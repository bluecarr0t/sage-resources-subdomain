/**
 * Scan safari tent properties ranked 16+ for inflation signals.
 * Run: npx tsx scripts/scan-safari-tent-tier-2026-07-08.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { isGlampingOperatingForAnalytics } from '../lib/glamping-is-open';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '../lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '../lib/glamping-market-snapshot-region';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Row = {
  id: number;
  property_name: string | null;
  state: string | null;
  unit_type: string | null;
  quantity_of_units: string | number | null;
  is_open: string | null;
  site_name: string | null;
  property_total_sites: string | number | null;
  url: string | null;
  notes: string | null;
};

function parseQty(value: unknown): number {
  if (value == null) return 0;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function main() {
  const rows: Row[] = [];
  let offset = 0;
  const PAGE = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(
        'id,property_name,state,unit_type,quantity_of_units,is_open,site_name,property_total_sites,url,notes'
      )
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .in('country', [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN])
      .ilike('unit_type', '%safari%tent%')
      .order('id')
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    rows.push(...batch.filter((r) => isGlampingOperatingForAnalytics(r.is_open)));
    if (batch.length < PAGE) break;
    offset += PAGE;
  }

  const byProp = new Map<
    string,
    { name: string; state: string; sum: number; max: number; rows: Row[] }
  >();

  for (const r of rows) {
    const name = String(r.property_name ?? '').trim();
    const state = String(r.state ?? '').trim();
    if (!name) continue;
    const key = `${name}|${state}`;
    const qty = parseQty(r.quantity_of_units);
    const cur = byProp.get(key) ?? { name, state, sum: 0, max: 0, rows: [] };
    cur.sum += qty;
    cur.max = Math.max(cur.max, qty);
    cur.rows.push(r);
    byProp.set(key, cur);
  }

  const ranked = [...byProp.values()].sort((a, b) => b.sum - a.sum);

  console.log('RANK\tSUM\tMAX\tGAP\tROWS\tproperty\tstate');
  for (const [i, p] of ranked.slice(0, 50).entries()) {
    const gap = p.sum - p.max;
    const flag = gap > 5 || p.rows.some((r) => r.quantity_of_units == null) ? '*' : '';
    console.log(
      [i + 1, p.sum, p.max, gap, p.rows.length, p.name, p.state].join('\t') + flag
    );
  }

  console.log('\n--- TIER 16-40 DETAIL (* = possible inflation signal) ---');
  for (const p of ranked.slice(15, 40)) {
    const nullQty = p.rows.filter((r) => r.quantity_of_units == null).length;
    const totalSites = p.rows.map((r) => r.property_total_sites).find((v) => v != null);
    console.log(
      `\n## #${ranked.indexOf(p) + 1} ${p.name} | ${p.state} | sum=${p.sum} max=${p.max} rows=${p.rows.length} null_qty=${nullQty} property_total_sites=${totalSites ?? '—'}`
    );
    for (const r of p.rows.sort((a, b) => a.id - b.id)) {
      console.log(
        `  id=${r.id} | ${r.site_name ?? '-'} | ${r.unit_type} | qty=${r.quantity_of_units ?? 'NULL'}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
