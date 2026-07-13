#!/usr/bin/env npx tsx
/**
 * Unify slugs per property_id to anchor (lowest id); prefer published anchor slug.
 * Phase 2: fill NULL/blank slugs via slugifyPropertyName + city disambiguation.
 *
 * Run: npx tsx scripts/apply-slug-repair-2026-07-09.ts
 * Apply: npx tsx scripts/apply-slug-repair-2026-07-09.ts --apply
 */
import { resolve } from 'path';
import { resolvePublicSlugForAnchor } from '@/lib/published-property-pages';
import {
  createP1AuditClient,
  csvEscape,
  TODAY,
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

const DRY_RUN = !process.argv.includes('--apply');

function normSlug(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}

function resolveCanonicalSlug(rows: Row[]): string | null {
  const published = rows
    .filter((r) => r.research_status === 'published')
    .sort((a, b) => a.id - b.id)
    .find((r) => normSlug(r.slug));
  if (published?.slug?.trim()) return published.slug.trim();

  const anchor = [...rows].sort((a, b) => a.id - b.id)[0]!;
  return normSlug(anchor.slug);
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

  const usedSlugs = new Set<string>();
  for (const r of all) {
    const s = normSlug(r.slug);
    if (s) usedSlugs.add(s);
  }

  const csvLines: string[] = [];
  let phase1 = 0;
  let phase2 = 0;

  for (const [, rows] of byPid) {
    const canon = resolveCanonicalSlug(rows);
    if (!canon) continue;

    for (const r of rows) {
      const current = normSlug(r.slug);
      if (current === canon) continue;
      phase1 += 1;
      csvLines.push(
        [
          String(r.id),
          csvEscape(r.property_id ?? ''),
          csvEscape(current ?? ''),
          csvEscape(canon),
          'unify_siblings',
        ].join(',')
      );
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('all_sage_data')
          .update({ slug: canon, date_updated: TODAY })
          .eq('id', r.id);
        if (error) throw error;
      }
      if (current) usedSlugs.delete(current);
      usedSlugs.add(canon);
    }
  }

  for (const r of all) {
    if (normSlug(r.slug)) continue;
    const name = r.property_name?.trim();
    if (!name) continue;

    const newSlug = resolvePublicSlugForAnchor(
      {
        id: r.id,
        property_name: r.property_name,
        slug: r.slug,
        property_id: r.property_id,
        city: r.city,
        state: r.state,
      },
      usedSlugs
    );
    if (!newSlug) continue;

    phase2 += 1;
    csvLines.push(
      [
        String(r.id),
        csvEscape(r.property_id ?? ''),
        '',
        csvEscape(newSlug),
        'fill_missing',
      ].join(',')
    );

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('all_sage_data')
        .update({ slug: newSlug, date_updated: TODAY })
        .eq('id', r.id);
      if (error) throw error;
    }
    usedSlugs.add(newSlug);
  }

  const outPath = resolve(OUTPUT_DIR, 'slug-repair.csv');
  writeCsv(outPath, 'id,property_id,old_slug,new_slug,action', csvLines);

  console.log(
    DRY_RUN
      ? `[DRY RUN] Phase 1 unify: ${phase1}; Phase 2 fill: ${phase2}`
      : `Applied Phase 1 unify: ${phase1}; Phase 2 fill: ${phase2}`
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
