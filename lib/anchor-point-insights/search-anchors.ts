/**
 * Lightweight anchor name search for Proximity Insights typeahead.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAnchorPointAnchorType, type AnchorPointAnchorType } from './anchor-type';

export interface AnchorSearchResult {
  anchor_id?: number;
  anchor_name: string;
  anchor_slug?: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function searchAnchorsByName(
  supabase: SupabaseClient,
  anchorType: AnchorPointAnchorType,
  query: string,
  limit = DEFAULT_LIMIT
): Promise<AnchorSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const capped = Math.min(Math.max(1, limit), MAX_LIMIT);
  const pattern = `%${q.replace(/[%_]/g, '')}%`;

  if (anchorType === 'national-parks') {
    const { data, error } = await supabase
      .from('national-parks')
      .select('id, name, slug')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .ilike('name', pattern)
      .order('name')
      .limit(capped);

    if (error) throw error;
    return (data ?? []).map((r) => ({
      anchor_id: r.id,
      anchor_name: String(r.name),
      anchor_slug: r.slug ? String(r.slug).trim() : undefined,
    }));
  }

  if (anchorType === 'wineries') {
    const { data, error } = await supabase
      .from('wineries')
      .select('id, name')
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .ilike('name', pattern)
      .order('name')
      .limit(capped);

    if (error) throw error;
    return (data ?? []).map((r) => ({
      anchor_id: r.id,
      anchor_name: String(r.name),
    }));
  }

  const { data, error } = await supabase
    .from('ski_resorts')
    .select('id, name')
    .not('lat', 'is', null)
    .not('lon', 'is', null)
    .ilike('name', pattern)
    .order('name')
    .limit(capped);

  if (error) throw error;
  return (data ?? []).map((r) => ({
    anchor_id: r.id,
    anchor_name: String(r.name),
  }));
}

export function parseAnchorSearchTypeParam(value: string | null): AnchorPointAnchorType {
  return parseAnchorPointAnchorType(value || 'ski');
}
