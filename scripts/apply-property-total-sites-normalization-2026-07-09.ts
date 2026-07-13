#!/usr/bin/env npx tsx
/**
 * Normalize property_total_sites across sibling rows (same property_id).
 * Canonical: MAX across siblings when multiple totals exist; else sum(qty) when no total set.
 *
 * Run: npx tsx scripts/apply-property-total-sites-normalization-2026-07-09.ts
 * Apply: npx tsx scripts/apply-property-total-sites-normalization-2026-07-09.ts --apply
 */
import { resolve } from 'path';
import {
  createP1AuditClient,
  csvEscape,
  parsePositiveNumber,
  TODAY,
  writeCsv,
  OUTPUT_DIR,
  appendNote,
} from '@/lib/sage-data-p1-audit';

type Row = {
  id: number;
  property_id: string | null;
  property_name: string | null;
  city: string | null;
  state: string | null;
  quantity_of_units: unknown;
  property_total_sites: unknown;
  notes: string | null;
};

const DRY_RUN = !process.argv.includes('--apply');

function canonicalTotal(rows: Row[]): number | null {
  const totals = rows
    .map((r) => parsePositiveNumber(r.property_total_sites))
    .filter((n): n is number => n != null);
  if (totals.length > 0) return Math.max(...totals);
  const sumQty = rows.reduce(
    (s, r) => s + (parsePositiveNumber(r.quantity_of_units) ?? 0),
    0
  );
  return sumQty > 0 ? sumQty : null;
}

async function main() {
  const supabase = createP1AuditClient();
  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(
        'id,property_id,property_name,city,state,quantity_of_units,property_total_sites,notes'
      )
      .order('id')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  const byPid = new Map<string, Row[]>();
  for (const r of all) {
    const pid = r.property_id?.trim();
    if (!pid) continue;
    const list = byPid.get(pid) ?? [];
    list.push(r);
    byPid.set(pid, list);
  }

  const csvLines: string[] = [];
  let updateCount = 0;

  for (const [pid, rows] of byPid) {
    const totals = new Set(
      rows
        .map((r) => parsePositiveNumber(r.property_total_sites))
        .filter((n): n is number => n != null)
    );
    const canon = canonicalTotal(rows);
    if (canon == null) continue;
    const needsUpdate = rows.some(
      (r) => parsePositiveNumber(r.property_total_sites) !== canon
    );
    if (totals.size <= 1 && !needsUpdate) continue;

    const sample = rows[0]!;
    const note = `[${TODAY}] P1 property_total_sites normalized to ${canon} across ${rows.length} sibling rows.`;

    for (const r of rows) {
      const current = parsePositiveNumber(r.property_total_sites);
      if (current === canon) continue;
      updateCount += 1;
      csvLines.push(
        [
          String(r.id),
          csvEscape(pid),
          String(current ?? ''),
          String(canon),
          csvEscape(sample.property_name ?? ''),
          DRY_RUN ? 'dry_run' : 'update',
        ].join(',')
      );

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('all_sage_data')
          .update({
            property_total_sites: canon,
            notes: appendNote(r.notes, note),
            date_updated: TODAY,
          })
          .eq('id', r.id);
        if (error) throw error;
      }
    }
  }

  const outPath = resolve(
    OUTPUT_DIR,
    'property-total-sites-normalization.csv'
  );
  writeCsv(
    outPath,
    'id,property_id,old_total,new_total,property_name,action',
    csvLines
  );

  console.log(
    DRY_RUN
      ? `[DRY RUN] Would update ${updateCount} rows`
      : `Updated ${updateCount} rows`
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
