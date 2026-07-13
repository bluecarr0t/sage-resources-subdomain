#!/usr/bin/env npx tsx
/**
 * Merge/delete exact 5-tuple duplicate rows; keep lowest id per group.
 *
 * Run: npx tsx scripts/apply-exact-duplicate-rows-2026-07-09.ts
 * Apply: npx tsx scripts/apply-exact-duplicate-rows-2026-07-09.ts --apply
 */
import { resolve } from 'path';
import {
  createP1AuditClient,
  csvEscape,
  normKey,
  TODAY,
  writeCsv,
  OUTPUT_DIR,
  appendNote,
} from '@/lib/sage-data-p1-audit';

type Row = Record<string, unknown> & {
  id: number;
  property_name: string | null;
  city: string | null;
  state: string | null;
  unit_type: string | null;
  site_name: string | null;
  notes: string | null;
};

const DRY_RUN = !process.argv.includes('--apply');

const MERGE_FIELDS = [
  'url',
  'rate_avg_retail_daily_rate',
  'description',
  'google_place_id',
  'brand_id',
  'lat',
  'lon',
] as const;

function tupleKey(r: Row): string {
  return [
    normKey(r.property_name),
    normKey(r.city),
    normKey(r.state),
    normKey(r.unit_type),
    normKey(r.site_name),
  ].join('\t');
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

async function repointReportAnchors(
  supabase: ReturnType<typeof createP1AuditClient>,
  fromId: number,
  toId: number
): Promise<number> {
  const { data, error } = await supabase
    .schema('reports')
    .from('reports')
    .update({ sage_data_anchor_id: toId })
    .eq('sage_data_anchor_id', fromId)
    .select('id');
  if (error) {
    if (error.message.includes('schema') || error.code === 'PGRST106') return 0;
    throw error;
  }
  return data?.length ?? 0;
}

async function repointOrDropGeocodeEmbedding(
  supabase: ReturnType<typeof createP1AuditClient>,
  table: 'property_geocode' | 'property_embeddings',
  fromId: number,
  toId: number
): Promise<void> {
  const { data: keeperRow } = await supabase
    .from(table)
    .select('property_id')
    .eq('property_id', toId)
    .maybeSingle();
  const { data: loserRow } = await supabase
    .from(table)
    .select('property_id')
    .eq('property_id', fromId)
    .maybeSingle();
  if (!loserRow) return;
  if (keeperRow) {
    await supabase.from(table).delete().eq('property_id', fromId);
    return;
  }
  const { error } = await supabase
    .from(table)
    .update({ property_id: toId })
    .eq('property_id', fromId);
  if (error) throw error;
}

async function repointImages(
  supabase: ReturnType<typeof createP1AuditClient>,
  fromId: number,
  toId: number
): Promise<void> {
  const { error } = await supabase
    .from('glamping_property_images')
    .update({ property_id: toId })
    .eq('property_id', fromId);
  if (error) throw error;
}

async function main() {
  const supabase = createP1AuditClient();
  const select =
    'id,property_name,city,state,unit_type,site_name,notes,url,rate_avg_retail_daily_rate,description,google_place_id,brand_id,lat,lon';
  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(select)
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

  const csvLines: string[] = [];
  let deleteCount = 0;

  for (const group of [...byTuple.values()].filter((g) => g.length > 1)) {
    const sorted = [...group].sort((a, b) => a.id - b.id);
    const keeper = sorted[0]!;
    const losers = sorted.slice(1);

    const mergePatch: Record<string, unknown> = {};
    for (const field of MERGE_FIELDS) {
      if (!isEmpty(keeper[field])) continue;
      for (const loser of losers) {
        if (!isEmpty(loser[field])) {
          mergePatch[field] = loser[field];
          break;
        }
      }
    }

    const mergeNote = `[${TODAY}] P1 dedupe: merged fields from ids ${losers.map((r) => r.id).join(', ')}.`;
    if (Object.keys(mergePatch).length > 0 || losers.length > 0) {
      mergePatch.notes = appendNote(
        keeper.notes,
        mergeNote
      );
      mergePatch.date_updated = TODAY;
    }

    if (!DRY_RUN && Object.keys(mergePatch).length > 0) {
      const { error } = await supabase
        .from('all_sage_data')
        .update(mergePatch)
        .eq('id', keeper.id);
      if (error) throw error;
    }

    for (const loser of losers) {
      csvLines.push(
        [
          String(loser.id),
          String(keeper.id),
          'delete',
          csvEscape(`${keeper.property_name}|${keeper.site_name}`),
        ].join(',')
      );

      if (!DRY_RUN) {
        await repointReportAnchors(supabase, loser.id, keeper.id);
        await repointImages(supabase, loser.id, keeper.id);
        await repointOrDropGeocodeEmbedding(
          supabase,
          'property_geocode',
          loser.id,
          keeper.id
        );
        await repointOrDropGeocodeEmbedding(
          supabase,
          'property_embeddings',
          loser.id,
          keeper.id
        );
        const { error } = await supabase
          .from('all_sage_data')
          .delete()
          .eq('id', loser.id);
        if (error) throw error;
      }
      deleteCount += 1;
    }
  }

  const outPath = resolve(OUTPUT_DIR, 'exact-duplicate-deletes.csv');
  writeCsv(outPath, 'id,keeper_id,action,reason', csvLines);

  console.log(
    DRY_RUN
      ? `[DRY RUN] Would delete ${deleteCount} duplicate rows`
      : `Deleted ${deleteCount} duplicate rows`
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
