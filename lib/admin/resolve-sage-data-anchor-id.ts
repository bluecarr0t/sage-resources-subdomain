/**
 * Resolve a Sage Data row id to the anchor id for its logical property group.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { dedupeRowsToPropertyAnchors } from '@/lib/admin/glamping-list-anchor-key';
import { siblingFilterSpecFromAnchor } from '@/lib/admin/glamping-property-siblings';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

const MAX_SIBLING_ROWS = 50;

export type SageDataAnchorResolution =
  | { ok: true; anchorId: number }
  | { ok: false; error: string; status: 404 | 400 };

export async function resolveSageDataAnchorId(
  supabase: SupabaseClient,
  rawId: unknown
): Promise<SageDataAnchorResolution> {
  const rowId = Number(rawId);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    return { ok: false, error: 'Invalid sage_data_anchor_id', status: 400 };
  }

  const { data: row, error: rowError } = await supabase
    .from(ALL_SAGE_DATA_TABLE)
    .select('id, property_id, slug, property_name, city, state')
    .eq('id', rowId)
    .maybeSingle();

  if (rowError) {
    return { ok: false, error: rowError.message, status: 400 };
  }
  if (!row) {
    return { ok: false, error: 'Sage property not found', status: 404 };
  }

  const spec = siblingFilterSpecFromAnchor(row as Record<string, unknown>);
  let siblingQuery = supabase.from(ALL_SAGE_DATA_TABLE).select('id, property_id, slug, property_name, city, state');
  if (spec.mode === 'property_id') {
    siblingQuery = siblingQuery.eq('property_id', spec.propertyId);
  } else if (spec.mode === 'slug') {
    siblingQuery = siblingQuery.eq('slug', spec.slug);
  } else {
    siblingQuery = siblingQuery.eq('property_name', spec.propertyName);
    if (spec.city == null || spec.city === '') {
      siblingQuery = siblingQuery.or('city.is.null,city.eq.');
    } else {
      siblingQuery = siblingQuery.eq('city', spec.city);
    }
    if (spec.state == null || spec.state === '') {
      siblingQuery = siblingQuery.or('state.is.null,state.eq.');
    } else {
      siblingQuery = siblingQuery.eq('state', spec.state);
    }
  }

  const { data: siblings, error: siblingError } = await siblingQuery.limit(MAX_SIBLING_ROWS);
  if (siblingError) {
    return { ok: false, error: siblingError.message, status: 400 };
  }

  const group = dedupeRowsToPropertyAnchors(
    (siblings?.length ? siblings : [row]) as Record<string, unknown>[]
  );
  const anchor = group[0];
  const anchorId = Number(anchor?.id);
  if (!Number.isFinite(anchorId) || anchorId <= 0) {
    return { ok: false, error: 'Could not resolve Sage property anchor', status: 400 };
  }

  return { ok: true, anchorId };
}

export const SAGE_PROPERTY_SELECT_FIELDS =
  'id, property_name, address, city, state, zip_code, is_open, research_status, slug, property_id, property_type';

export type LinkedSageProperty = {
  id: number;
  property_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  is_open: string | null;
  research_status: string | null;
  slug: string | null;
  property_id: string | null;
  property_type: string | null;
};

export function flattenLinkedSageProperty(
  raw: LinkedSageProperty | LinkedSageProperty[] | null | undefined
): LinkedSageProperty | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}
