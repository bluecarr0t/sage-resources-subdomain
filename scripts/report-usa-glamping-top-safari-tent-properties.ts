/**
 * Top properties by Safari Tent units (operating inventory only).
 * Sums sibling SKU rows per property; excludes cancelled / proposed / pre-opening.
 *
 * Run: npx tsx scripts/report-usa-glamping-top-safari-tent-properties.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { isGlampingOperatingForAnalytics } from '../lib/glamping-is-open';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '../lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '../lib/glamping-market-snapshot-region';

config({ path: resolve(process.cwd(), '.env.local') });
config();

const PAGE_SIZE = 1000;
const TOP = 15;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase service key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Row = {
  property_name: string | null;
  state: string | null;
  unit_type: string | null;
  quantity_of_units: string | number | null;
  is_open: string | null;
};

function parsePositiveNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function main() {
  const countryIn = [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];
  const byProperty = new Map<string, { property_name: string; state: string; total: number }>();
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select('property_name, state, unit_type, quantity_of_units, is_open')
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .in('country', countryIn)
      .ilike('unit_type', '%safari%tent%')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }

    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!isGlampingOperatingForAnalytics(row.is_open)) continue;
      const name = String(row.property_name ?? '').trim();
      const state = String(row.state ?? '').trim();
      if (!name) continue;
      const key = `${name}|${state}`;
      const qty = parsePositiveNumber(row.quantity_of_units);
      const cur = byProperty.get(key) ?? { property_name: name, state, total: 0 };
      cur.total += qty;
      byProperty.set(key, cur);
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const ranked = [...byProperty.values()].sort((a, b) => b.total - a.total).slice(0, TOP);
  console.log('Top properties by Safari Tent units (operating, summed SKUs):\n');
  console.log('property_name\tstate\ttotal_units');
  for (const row of ranked) {
    console.log(`${row.property_name}\t${row.state}\t${row.total}`);
  }
}

main();
