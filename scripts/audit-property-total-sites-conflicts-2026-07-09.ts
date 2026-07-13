#!/usr/bin/env npx tsx
/**
 * Audit property_total_sites conflicts within property_id groups.
 * Run: npx tsx scripts/audit-property-total-sites-conflicts-2026-07-09.ts
 */
import { resolve } from 'path';
import {
  createP1AuditClient,
  csvEscape,
  parsePositiveNumber,
  writeCsv,
  OUTPUT_DIR,
} from '@/lib/sage-data-p1-audit';

type Row = {
  id: number;
  property_id: string | null;
  property_name: string | null;
  city: string | null;
  state: string | null;
  site_name: string | null;
  unit_type: string | null;
  quantity_of_units: unknown;
  property_total_sites: unknown;
};

function groupKey(r: Row): string {
  if (r.property_id?.trim()) return `pid:${r.property_id.trim()}`;
  return `ncs:${(r.property_name ?? '').trim().toLowerCase()}|${(r.city ?? '').trim().toLowerCase()}|${(r.state ?? '').trim().toLowerCase()}`;
}

async function main() {
  const supabase = createP1AuditClient();
  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(
        'id,property_id,property_name,city,state,site_name,unit_type,quantity_of_units,property_total_sites'
      )
      .order('id')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  const byGroup = new Map<string, Row[]>();
  for (const r of all) {
    const k = groupKey(r);
    const list = byGroup.get(k) ?? [];
    list.push(r);
    byGroup.set(k, list);
  }

  const csvLines: string[] = [];
  let conflictGroups = 0;
  let qtyMismatchGroups = 0;

  console.log('\n=== property_total_sites conflicts ===\n');

  for (const [key, rows] of [...byGroup.entries()].sort((a, b) =>
    (a[1][0]?.property_name ?? '').localeCompare(b[1][0]?.property_name ?? '')
  )) {
    const totals = new Set<number>();
    for (const r of rows) {
      const t = parsePositiveNumber(r.property_total_sites);
      if (t != null) totals.add(t);
    }
    const sumQty = rows.reduce(
      (s, r) => s + (parsePositiveNumber(r.quantity_of_units) ?? 0),
      0
    );
    const maxTotal = totals.size ? Math.max(...totals) : null;
    const hasTotalConflict = totals.size > 1;
    const hasQtyMismatch =
      maxTotal != null &&
      sumQty > 0 &&
      Math.abs(sumQty - maxTotal) > 0.01;

    if (!hasTotalConflict && !hasQtyMismatch) continue;
    if (hasTotalConflict) conflictGroups += 1;
    if (hasQtyMismatch) qtyMismatchGroups += 1;

    const sample = rows[0]!;
    console.log(
      `${sample.property_name} (${sample.city}, ${sample.state}) — totals: ${[...totals].join(', ') || 'none'}; sum(qty)=${sumQty}`
    );
    for (const r of rows.sort((a, b) => a.id - b.id)) {
      console.log(
        `  id=${r.id} site=${r.site_name ?? '—'} type=${r.unit_type ?? '—'} qty=${r.quantity_of_units ?? '—'} total=${r.property_total_sites ?? '—'}`
      );
    }
    console.log('');

    csvLines.push(
      [
        csvEscape(key),
        String(rows.length),
        csvEscape([...totals].join('|')),
        String(sumQty),
        String(hasTotalConflict),
        String(hasQtyMismatch),
        csvEscape(sample.property_name ?? ''),
        csvEscape(sample.city ?? ''),
        csvEscape(sample.state ?? ''),
        csvEscape(rows.map((r) => String(r.id)).join('|')),
      ].join(',')
    );
  }

  const outPath = resolve(
    OUTPUT_DIR,
    'property-total-sites-conflicts.csv'
  );
  writeCsv(
    outPath,
    'group_key,row_count,distinct_totals,sum_qty,total_conflict,qty_mismatch,property_name,city,state,ids',
    csvLines
  );

  console.log(`Conflicting total groups: ${conflictGroups}`);
  console.log(`Sum(qty) ≠ max(total) groups: ${qtyMismatchGroups}`);
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
