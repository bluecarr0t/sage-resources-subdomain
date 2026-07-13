#!/usr/bin/env npx tsx
/**
 * Audit Mixed unit_type rows in all_sage_data.
 *   npx tsx scripts/audit-mixed-unit-type-2026-07-13.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function fetchAllMixed() {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select(
        'id, property_name, site_name, unit_type, property_type, quantity_of_units, discovery_source, research_status, country, state, city, description, notes, url, property_total_sites, rate_avg_retail_daily_rate'
      )
      .eq('unit_type', 'Mixed')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return rows;
}

async function main() {
  const all = await fetchAllMixed();
  const bySource = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byPropType = new Map<string, number>();
  const byState = new Map<string, number>();
  const propCounts = new Map<string, number>();
  let withSite = 0;
  let withQty = 0;
  let withRate = 0;
  let withUrl = 0;
  let nameImpliesType = 0;

  const nameHints: [RegExp, string][] = [
    [/\btipi|teepee\b/i, 'Tipi'],
    [/\byurt\b/i, 'Yurt'],
    [/\bdome\b/i, 'Dome'],
    [/\btreehouse|tree house\b/i, 'Treehouse'],
    [/\bsafari\b/i, 'Safari Tent'],
    [/\bbell tent\b/i, 'Bell Tent'],
    [/\bairstream\b/i, 'Airstream'],
    [/\bcabin\b/i, 'Cabin'],
    [/\blodge\b/i, 'Lodge'],
    [/\brv\b/i, 'RV Site'],
    [/\bglamping\b/i, 'Glamping (generic)'],
  ];
  const hintCounts = new Map<string, number>();

  for (const r of all) {
    bump(bySource, String(r.discovery_source ?? '(null)'));
    bump(byStatus, String(r.research_status ?? '(null)'));
    bump(byCountry, String(r.country ?? '(null)'));
    bump(byPropType, String(r.property_type ?? '(null)'));
    bump(byState, String(r.state ?? '(null)'));
    bump(propCounts, String(r.property_name ?? ''));
    if (r.site_name) withSite++;
    if (r.quantity_of_units != null && String(r.quantity_of_units).trim() !== '') withQty++;
    if (r.rate_avg_retail_daily_rate != null) withRate++;
    if (r.url) withUrl++;
    const blob = `${r.property_name ?? ''} ${r.site_name ?? ''} ${r.description ?? ''}`;
    let hit = false;
    for (const [re, label] of nameHints) {
      if (re.test(blob)) {
        bump(hintCounts, label);
        hit = true;
        break;
      }
    }
    if (hit) nameImpliesType++;
  }

  // Sibling analysis for unique properties
  const uniqueNames = [...propCounts.keys()].filter(Boolean);
  let singleRowOnly = 0;
  let multiMixedOnly = 0;
  let hasNonMixedSibling = 0;
  const siblingTypeCounts = new Map<string, number>();

  // Check in batches of property names
  for (let i = 0; i < uniqueNames.length; i += 50) {
    const batch = uniqueNames.slice(i, i + 50);
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select('property_name, unit_type, site_name')
      .in('property_name', batch);
    if (error) throw new Error(error.message);
    const byProp = new Map<string, { types: Set<string>; rows: number }>();
    for (const row of data ?? []) {
      const pn = String(row.property_name);
      const cur = byProp.get(pn) ?? { types: new Set(), rows: 0 };
      cur.rows++;
      if (row.unit_type) cur.types.add(String(row.unit_type));
      byProp.set(pn, cur);
    }
    for (const name of batch) {
      const cur = byProp.get(name);
      if (!cur) continue;
      const nonMixed = [...cur.types].filter((t) => t !== 'Mixed');
      if (cur.rows === 1 && cur.types.has('Mixed')) singleRowOnly++;
      else if (nonMixed.length === 0) multiMixedOnly++;
      else {
        hasNonMixedSibling++;
        for (const t of nonMixed) bump(siblingTypeCounts, t);
      }
    }
  }

  const sample = all.slice(0, 25).map((r) => ({
    id: r.id,
    property_name: r.property_name,
    site_name: r.site_name,
    property_type: r.property_type,
    qty: r.quantity_of_units,
    status: r.research_status,
    source: r.discovery_source,
    loc: [r.city, r.state, r.country].filter(Boolean).join(', '),
    url: r.url,
    desc: String(r.description ?? '').slice(0, 160),
  }));

  const out = {
    total: all.length,
    uniqueProperties: uniqueNames.length,
    withSite,
    withQty,
    withRate,
    withUrl,
    nameImpliesType,
    bySource: [...bySource.entries()].sort((a, b) => b[1] - a[1]),
    byStatus: [...byStatus.entries()].sort((a, b) => b[1] - a[1]),
    byCountry: [...byCountry.entries()].sort((a, b) => b[1] - a[1]),
    byPropType: [...byPropType.entries()].sort((a, b) => b[1] - a[1]),
    byStateTop: [...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    topDuplicateNames: [...propCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    inventoryShape: { singleRowOnly, multiMixedOnly, hasNonMixedSibling },
    siblingTypes: [...siblingTypeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
    hintCounts: [...hintCounts.entries()].sort((a, b) => b[1] - a[1]),
    sample,
  };

  writeFileSync('/tmp/mixed-audit.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    total: out.total,
    uniqueProperties: out.uniqueProperties,
    withSite,
    withQty,
    withRate,
    withUrl,
    nameImpliesType,
    byStatus: out.byStatus,
    bySourceTop: out.bySource.slice(0, 12),
    byCountry: out.byCountry.slice(0, 8),
    byPropType: out.byPropType.slice(0, 8),
    inventoryShape: out.inventoryShape,
    hintCounts: out.hintCounts,
    siblingTypes: out.siblingTypes.slice(0, 10),
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
