#!/usr/bin/env npx tsx
/**
 * Audit exact duplicate rows (same property_name, city, state, unit_type, site_name).
 * Run: npx tsx scripts/audit-exact-duplicate-rows-2026-07-09.ts
 */
import { resolve } from 'path';
import {
  createP1AuditClient,
  csvEscape,
  normKey,
  writeCsv,
  OUTPUT_DIR,
} from '@/lib/sage-data-p1-audit';

type Row = {
  id: number;
  property_name: string | null;
  city: string | null;
  state: string | null;
  unit_type: string | null;
  site_name: string | null;
  research_status: string | null;
};

function tupleKey(r: Row): string {
  return [
    normKey(r.property_name),
    normKey(r.city),
    normKey(r.state),
    normKey(r.unit_type),
    normKey(r.site_name),
  ].join('\t');
}

async function countFkChildren(
  supabase: ReturnType<typeof createP1AuditClient>,
  id: number
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const tables: Array<{ table: string; col: string }> = [
    { table: 'glamping_property_images', col: 'property_id' },
    { table: 'property_geocode', col: 'property_id' },
    { table: 'property_embeddings', col: 'property_id' },
  ];
  for (const { table, col } of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(col, id);
    if (error) {
      counts[table] = -1;
    } else {
      counts[table] = count ?? 0;
    }
  }
  const { count: reportCount, error: reportErr } = await supabase
    .schema('reports')
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('sage_data_anchor_id', id);
  counts['reports.sage_data_anchor_id'] = reportErr ? -1 : (reportCount ?? 0);
  return counts;
}

async function main() {
  const supabase = createP1AuditClient();
  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(
        'id,property_name,city,state,unit_type,site_name,research_status'
      )
      .order('id')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  const byTuple = new Map<string, Row[]>();
  for (const r of all) {
    const k = tupleKey(r);
    const list = byTuple.get(k) ?? [];
    list.push(r);
    byTuple.set(k, list);
  }

  const dupGroups = [...byTuple.values()].filter((g) => g.length > 1);
  const csvLines: string[] = [];

  console.log(`\n=== Exact duplicate groups: ${dupGroups.length} ===\n`);

  for (const group of dupGroups.sort(
    (a, b) => (a[0]?.property_name ?? '').localeCompare(b[0]?.property_name ?? '')
  )) {
    const sorted = [...group].sort((a, b) => a.id - b.id);
    const keeper = sorted[0]!;
    const losers = sorted.slice(1);
    console.log(
      `${keeper.property_name} | ${keeper.city}, ${keeper.state} | ${keeper.unit_type} | ${keeper.site_name}`
    );
    console.log(`  keep id=${keeper.id}; delete ${losers.map((r) => r.id).join(', ')}`);

    const fkParts: string[] = [];
    for (const loser of losers) {
      const fk = await countFkChildren(supabase, loser.id);
      fkParts.push(
        `id${loser.id}:img=${fk['glamping_property_images']},geo=${fk['property_geocode']},emb=${fk['property_embeddings']},rpt=${fk['reports.sage_data_anchor_id']}`
      );
    }
    console.log(`  FK: ${fkParts.join('; ')}`);
    console.log('');

    csvLines.push(
      [
        String(keeper.id),
        csvEscape(losers.map((r) => String(r.id)).join('|')),
        String(group.length),
        csvEscape(keeper.property_name ?? ''),
        csvEscape(keeper.city ?? ''),
        csvEscape(keeper.state ?? ''),
        csvEscape(keeper.unit_type ?? ''),
        csvEscape(keeper.site_name ?? ''),
        csvEscape(fkParts.join('; ')),
      ].join(',')
    );
  }

  const outPath = resolve(OUTPUT_DIR, 'exact-duplicate-groups.csv');
  writeCsv(
    outPath,
    'keeper_id,loser_ids,group_size,property_name,city,state,unit_type,site_name,fk_counts',
    csvLines
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
