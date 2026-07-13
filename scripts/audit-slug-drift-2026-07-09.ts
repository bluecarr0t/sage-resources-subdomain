#!/usr/bin/env npx tsx
/**
 * Audit slug drift within property_id groups and cross-property_id slug collisions.
 * Run: npx tsx scripts/audit-slug-drift-2026-07-09.ts
 */
import { resolve } from 'path';
import {
  createP1AuditClient,
  csvEscape,
  writeCsv,
  OUTPUT_DIR,
} from '@/lib/sage-data-p1-audit';

type Row = {
  id: number;
  property_id: string | null;
  slug: string | null;
  property_name: string | null;
  city: string | null;
  state: string | null;
  research_status: string | null;
};

function normSlug(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

async function main() {
  const supabase = createP1AuditClient();
  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(
        'id,property_id,slug,property_name,city,state,research_status'
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

  const bySlug = new Map<string, Row[]>();
  for (const r of all) {
    const slug = normSlug(r.slug);
    if (!slug) continue;
    const list = bySlug.get(slug) ?? [];
    list.push(r);
    bySlug.set(slug, list);
  }

  const csvLines: string[] = [];
  let driftGroups = 0;

  console.log('\n=== Slug drift per property_id ===\n');

  for (const [pid, rows] of [...byPid.entries()].sort((a, b) =>
    (a[1][0]?.property_name ?? '').localeCompare(b[1][0]?.property_name ?? '')
  )) {
    const slugs = new Set(
      rows.map((r) => normSlug(r.slug)).filter((s): s is string => s != null)
    );
    if (slugs.size <= 1) continue;
    driftGroups += 1;
    const anchor = [...rows].sort((a, b) => a.id - b.id)[0]!;
    const publishedAnchor = rows.find(
      (r) => r.research_status === 'published' && normSlug(r.slug)
    );
    const canonicalSlug =
      publishedAnchor?.slug?.trim() ?? normSlug(anchor.slug) ?? '';
    const doNotChange =
      publishedAnchor != null &&
      publishedAnchor.slug?.trim() === canonicalSlug;

    console.log(
      `${anchor.property_name} (${anchor.city}, ${anchor.state}) — slugs: ${[...slugs].join(', ')}`
    );
    console.log(
      `  canonical: ${canonicalSlug}${doNotChange ? ' [published — do not change]' : ''}`
    );

    csvLines.push(
      [
        csvEscape(pid),
        String(rows.length),
        String(slugs.size),
        csvEscape(canonicalSlug),
        String(doNotChange),
        csvEscape([...slugs].join('|')),
        csvEscape(rows.map((r) => String(r.id)).join('|')),
        csvEscape(anchor.property_name ?? ''),
      ].join(',')
    );
  }

  console.log('\n=== Slugs shared across property_ids ===\n');
  let crossPid = 0;
  for (const [slug, rows] of [...bySlug.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const pids = new Set(
      rows.map((r) => r.property_id?.trim()).filter(Boolean)
    );
    if (pids.size <= 1) continue;
    crossPid += 1;
    console.log(`  slug=${slug} property_ids=${pids.size} rows=${rows.length}`);
    csvLines.push(
      [
        'cross_pid',
        String(rows.length),
        String(pids.size),
        csvEscape(slug),
        'false',
        csvEscape([...pids].join('|')),
        csvEscape(rows.map((r) => String(r.id)).join('|')),
        csvEscape(rows[0]?.property_name ?? ''),
      ].join(',')
    );
  }

  const outPath = resolve(OUTPUT_DIR, 'slug-drift.csv');
  writeCsv(
    outPath,
    'group_key,row_count,distinct_slugs,canonical_slug,do_not_change,slugs_or_pids,ids,property_name',
    csvLines
  );

  console.log(`\nDrift groups: ${driftGroups}`);
  console.log(`Cross-property_id slugs: ${crossPid}`);
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
