/**
 * Hydrate live professionalization scores on Sage Data list anchors
 * and persist the integer onto all sibling rows after writes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { siblingFilterSpecFromAnchor } from '@/lib/admin/glamping-property-siblings';
import {
  GLAMPING_PROFESSIONALIZATION_BREAKDOWN_KEY,
  GLAMPING_PROFESSIONALIZATION_SCORE_COLUMN,
  scoreProfessionalizedGlamping,
  type GlampingProfessionalizationRow,
  type GlampingProfessionalizationScore,
} from '@/lib/admin/glamping-professionalization-score';

export const PROFESSIONALIZATION_SIBLING_COLUMNS = [
  'id',
  'property_id',
  'slug',
  'property_name',
  'city',
  'state',
  'unit_type',
  'quantity_of_units',
  'property_total_sites',
  'unit_private_bathroom',
  'unit_air_conditioning',
  'unit_wifi',
  'unit_hot_tub',
  'property_hot_tub',
  'property_restaurant',
  'property_food_on_site',
  'property_pool',
  'property_sauna',
  'rate_avg_retail_daily_rate',
  'url',
  'lat',
  'lon',
  'is_open',
  'research_status',
  'property_type',
  'glamping_service_tier',
].join(',');

const TABLE = 'all_sage_data';
const IN_CHUNK = 80;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function groupKeyForSpec(
  spec: ReturnType<typeof siblingFilterSpecFromAnchor>
): string {
  if (spec.mode === 'property_id') return `pid:${spec.propertyId}`;
  if (spec.mode === 'slug') return `slug:${spec.slug.toLowerCase()}`;
  return `legacy:${spec.propertyName.toLowerCase()}|${(spec.city ?? '').toLowerCase()}|${(spec.state ?? '').toLowerCase()}`;
}

function rowGroupKey(row: Record<string, unknown>): string {
  return groupKeyForSpec(siblingFilterSpecFromAnchor(row));
}

async function fetchRowsByPropertyIds(
  supabase: SupabaseClient,
  propertyIds: string[]
): Promise<Record<string, unknown>[]> {
  const collected: Record<string, unknown>[] = [];
  for (const ids of chunk(propertyIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(PROFESSIONALIZATION_SIBLING_COLUMNS)
      .in('property_id', ids);
    if (error) throw new Error(error.message);
    collected.push(...((data ?? []) as unknown as Record<string, unknown>[]));
  }
  return collected;
}

async function fetchRowsBySlugs(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<Record<string, unknown>[]> {
  const collected: Record<string, unknown>[] = [];
  for (const values of chunk(slugs, IN_CHUNK)) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(PROFESSIONALIZATION_SIBLING_COLUMNS)
      .in('slug', values);
    if (error) throw new Error(error.message);
    collected.push(...((data ?? []) as unknown as Record<string, unknown>[]));
  }
  return collected;
}

function applyScoreToAnchor(
  anchor: Record<string, unknown>,
  siblings: Record<string, unknown>[]
): Record<string, unknown> {
  const rows =
    siblings.length > 0
      ? (siblings as GlampingProfessionalizationRow[])
      : ([anchor] as GlampingProfessionalizationRow[]);
  const scored = scoreProfessionalizedGlamping(rows);
  return {
    ...anchor,
    [GLAMPING_PROFESSIONALIZATION_SCORE_COLUMN]: scored.total,
    [GLAMPING_PROFESSIONALIZATION_BREAKDOWN_KEY]: scored,
  };
}

/**
 * Attach a live score + breakdown to each list-anchor row using sibling inventory.
 * Falls back to scoring the anchor alone when siblings cannot be loaded.
 */
export async function attachProfessionalizationScoresToAnchors(
  supabase: SupabaseClient,
  anchors: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (anchors.length === 0) return anchors;

  const byPid = new Map<string, Record<string, unknown>[]>();
  const bySlug = new Map<string, Record<string, unknown>[]>();
  const pidAnchors: Record<string, unknown>[] = [];
  const slugAnchors: Record<string, unknown>[] = [];
  const legacyAnchors: Record<string, unknown>[] = [];

  for (const anchor of anchors) {
    const spec = siblingFilterSpecFromAnchor(anchor);
    if (spec.mode === 'property_id') pidAnchors.push(anchor);
    else if (spec.mode === 'slug') slugAnchors.push(anchor);
    else legacyAnchors.push(anchor);
  }

  try {
    const propertyIds = [
      ...new Set(
        pidAnchors
          .map((a) => siblingFilterSpecFromAnchor(a))
          .filter((s): s is { mode: 'property_id'; propertyId: string } => s.mode === 'property_id')
          .map((s) => s.propertyId)
      ),
    ];
    if (propertyIds.length > 0) {
      const rows = await fetchRowsByPropertyIds(supabase, propertyIds);
      for (const row of rows) {
        const key = rowGroupKey(row);
        const list = byPid.get(key) ?? [];
        list.push(row);
        byPid.set(key, list);
      }
    }

    const slugs = [
      ...new Set(
        slugAnchors
          .map((a) => siblingFilterSpecFromAnchor(a))
          .filter((s): s is { mode: 'slug'; slug: string } => s.mode === 'slug')
          .map((s) => s.slug)
      ),
    ];
    if (slugs.length > 0) {
      const rows = await fetchRowsBySlugs(supabase, slugs);
      for (const row of rows) {
        const key = rowGroupKey(row);
        const list = bySlug.get(key) ?? [];
        list.push(row);
        bySlug.set(key, list);
      }
    }
  } catch (err) {
    console.warn(
      '[admin/sage-data] professionalization sibling fetch failed; scoring anchors only:',
      err instanceof Error ? err.message : err
    );
    return anchors.map((anchor) => applyScoreToAnchor(anchor, [anchor]));
  }

  return anchors.map((anchor) => {
    const spec = siblingFilterSpecFromAnchor(anchor);
    const key = groupKeyForSpec(spec);
    if (spec.mode === 'property_id') {
      return applyScoreToAnchor(anchor, byPid.get(key) ?? [anchor]);
    }
    if (spec.mode === 'slug') {
      return applyScoreToAnchor(anchor, bySlug.get(key) ?? [anchor]);
    }
    return applyScoreToAnchor(anchor, [anchor]);
  });
}

export async function persistProfessionalizationScoreForAnchor(
  supabase: SupabaseClient,
  anchor: Record<string, unknown>,
  siblingRows?: Record<string, unknown>[]
): Promise<GlampingProfessionalizationScore | null> {
  let rows = siblingRows;
  if (!rows) {
    const spec = siblingFilterSpecFromAnchor(anchor);
    try {
      if (spec.mode === 'property_id') {
        rows = await fetchRowsByPropertyIds(supabase, [spec.propertyId]);
      } else if (spec.mode === 'slug') {
        rows = await fetchRowsBySlugs(supabase, [spec.slug]);
      } else {
        rows = [anchor];
      }
    } catch (err) {
      console.warn(
        '[admin/sage-data] professionalization persist fetch failed:',
        err instanceof Error ? err.message : err
      );
      rows = [anchor];
    }
  }

  const scoredRows = rows.length > 0 ? rows : [anchor];
  const scored = scoreProfessionalizedGlamping(
    scoredRows as GlampingProfessionalizationRow[]
  );
  const ids = [
    ...new Set(
      [...scoredRows, anchor]
        .map((row) => String(row.id ?? '').trim())
        .filter((id) => id.length > 0)
    ),
  ];
  if (ids.length === 0) return scored;

  const { error } = await supabase
    .from(TABLE)
    .update({ [GLAMPING_PROFESSIONALIZATION_SCORE_COLUMN]: scored.total })
    .in('id', ids);
  if (error) {
    console.warn(
      '[admin/sage-data] professionalization persist write failed:',
      error.message
    );
  }
  return scored;
}

export function withLiveProfessionalizationScore<T extends Record<string, unknown>>(
  row: T,
  scored: GlampingProfessionalizationScore
): T {
  return {
    ...row,
    [GLAMPING_PROFESSIONALIZATION_SCORE_COLUMN]: scored.total,
    [GLAMPING_PROFESSIONALIZATION_BREAKDOWN_KEY]: scored,
  };
}

/** Used by backfill grouping — exported for scripts. */
export function scoreRowsAndCollectIds(rows: Record<string, unknown>[]): {
  score: GlampingProfessionalizationScore;
  ids: string[];
} {
  const score = scoreProfessionalizedGlamping(
    rows as GlampingProfessionalizationRow[]
  );
  const ids = rows
    .map((row) => String(row.id ?? '').trim())
    .filter((id) => id.length > 0);
  return { score, ids };
}
