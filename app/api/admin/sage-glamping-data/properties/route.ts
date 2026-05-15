/**
 * API Route: all_glamping_properties CRUD for the Sage Data admin editor.
 * GET   /api/admin/sage-glamping-data/properties
 *   Query params:
 *     q            — case-insensitive search across property_name, city, state, country
 *     research_status — exact match (e.g. 'in_progress', 'published', 'new')
 *     country      — case-insensitive exact match (ilike) on `country`
 *     page         — 1-based (default 1)
 *     pageSize     — default 50, max 200
 *     sortBy       — column name (default 'date_updated')
 *     sortDir      — 'asc' | 'desc' (default 'desc')
 *     missing      — optional: 'city' | 'rates' | 'website' | 'lat_lng' | 'total_sites' — gap filters
 *                    (city/url: null or empty string; rates: rate_avg_retail_daily_rate null or 0 — numeric, no `eq.''`);
 *                    lat_lng: lat or lon null; total_sites: property_total_sites null or 0)
 *     siblingOf    — optional: when set (row id), returns all sibling rows for the multi-site editor:
 *                    `{ success, anchorId, rows, capped? }` (same slug, or property_name+city+state if slug empty).
 *                    Max 50 rows (`capped: true` if more exist).
 *
 * PATCH /api/admin/sage-glamping-data/properties
 *   Body: { id: string | number, updates: Record<string, unknown> }
 *   Updates are restricted to the editable column allowlist below.
 *
 * DELETE /api/admin/sage-glamping-data/properties
 *   Body: { id: string | number } — delete one row (backward compatible), or
 *         { ids: (string|number)[] } — delete multiple rows; every id must belong to the same
 *         sibling group as `ids[0]` (slug / name+city+state rule). Max 50 ids.
 *
 * POST /api/admin/sage-glamping-data/properties
 *   Body: fields for a new row (see EDITABLE_COLUMNS). Required: property_name, city, state, url.
 *   Defaults: research_status in_progress, is_glamping_property Yes, is_open Yes, source Sage,
 *   date_added / date_updated today (YYYY-MM-DD).
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  idsBelongToSiblingGroup,
  MAX_GLAMPING_SIBLING_ROWS,
  siblingFilterSpecFromAnchor,
  sortSiblingPropertyRows,
} from '@/lib/admin/glamping-property-siblings';
import { ALL_GLAMPING_PROPERTY_COLUMNS } from '@/lib/sage-ai/all-glamping-properties-columns';
import { isValidLandOperatorCategory } from '@/lib/glamping-land-operator-category';

export const dynamic = 'force-dynamic';

const TABLE = 'all_glamping_properties';

// Columns the admin editor is NOT allowed to overwrite via PATCH.
// id / created_at / updated_at are managed by Postgres; quality_score is derived.
const READ_ONLY_COLUMNS = new Set<string>([
  'id',
  'created_at',
  'updated_at',
  'quality_score',
]);

const EDITABLE_COLUMNS = new Set<string>(
  ALL_GLAMPING_PROPERTY_COLUMNS.filter((c) => !READ_ONLY_COLUMNS.has(c))
);

const REQUIRED_CREATE_FIELDS = [
  'property_name',
  'city',
  'state',
  'url',
] as const;

function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function parseIntParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function escapeIlikeTerm(term: string): string {
  // Strip wildcards / commas that would break PostgREST `or` filters.
  return term.replace(/[%,()]/g, '').trim();
}

async function fetchSiblingRowsForAnchor(
  supabase: ReturnType<typeof createServerClient>,
  anchor: Record<string, unknown>
): Promise<{ rows: Record<string, unknown>[]; capped: boolean }> {
  const spec = siblingFilterSpecFromAnchor(anchor);
  let q = supabase.from(TABLE).select('*');
  if (spec.mode === 'slug') {
    q = q.eq('slug', spec.slug);
  } else {
    q = q.eq('property_name', spec.propertyName);
    if (spec.city == null || spec.city === '') {
      q = q.or('city.is.null,city.eq.');
    } else {
      q = q.eq('city', spec.city);
    }
    if (spec.state == null || spec.state === '') {
      q = q.or('state.is.null,state.eq.');
    } else {
      q = q.eq('state', spec.state);
    }
  }
  const { data, error } = await q.limit(MAX_GLAMPING_SIBLING_ROWS + 1);
  if (error) {
    throw new Error(error.message);
  }
  const raw = data ?? [];
  const capped = raw.length > MAX_GLAMPING_SIBLING_ROWS;
  const slice = capped ? raw.slice(0, MAX_GLAMPING_SIBLING_ROWS) : raw;
  return {
    rows: sortSiblingPropertyRows(slice),
    capped,
  };
}

export const POST = withAdminAuth(async (request) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const insertRow: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
      if (key === 'id' || !EDITABLE_COLUMNS.has(key)) continue;
      insertRow[key] =
        typeof value === 'string' && value.trim() === '' ? null : value;
    }

    for (const key of REQUIRED_CREATE_FIELDS) {
      const raw = body[key];
      if (typeof raw !== 'string' || !raw.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: `${key} is required`,
          },
          { status: 400 }
        );
      }
      insertRow[key] = raw.trim();
    }

    insertRow.url = normalizeWebsiteUrl(String(insertRow.url ?? ''));

    insertRow.research_status =
      typeof insertRow.research_status === 'string' &&
      insertRow.research_status.trim() !== ''
        ? insertRow.research_status.trim()
        : 'in_progress';
    insertRow.is_glamping_property =
      typeof insertRow.is_glamping_property === 'string' &&
      insertRow.is_glamping_property.trim() !== ''
        ? insertRow.is_glamping_property.trim()
        : 'Yes';
    insertRow.is_open =
      typeof insertRow.is_open === 'string' && insertRow.is_open.trim() !== ''
        ? insertRow.is_open.trim()
        : 'Yes';
    insertRow.source =
      typeof insertRow.source === 'string' && insertRow.source.trim() !== ''
        ? insertRow.source.trim()
        : 'Sage';

    const today = new Date().toISOString().split('T')[0];
    if (
      insertRow.date_added == null ||
      insertRow.date_added === ''
    ) {
      insertRow.date_added = today;
    }
    if (
      insertRow.date_updated == null ||
      insertRow.date_updated === ''
    ) {
      insertRow.date_updated = today;
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .insert(insertRow)
      .select('*')
      .single();

    if (error) {
      console.error('[admin/sage-data/properties] POST error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      property: data,
    });
  } catch (err) {
    console.error('[admin/sage-data/properties] POST unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to create property' },
      { status: 500 }
    );
  }
});

export const GET = withAdminAuth(async (request) => {
  try {
    const params = request.nextUrl.searchParams;
    const siblingOf = params.get('siblingOf')?.trim();

    const supabase = createServerClient();

    if (siblingOf) {
      const { data: anchor, error: anchorError } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', siblingOf)
        .maybeSingle();

      if (anchorError) {
        console.error('[admin/sage-data/properties] GET sibling anchor error:', anchorError);
        return NextResponse.json(
          { success: false, error: anchorError.message },
          { status: 500 }
        );
      }
      if (!anchor) {
        return NextResponse.json(
          { success: false, error: 'Property not found' },
          { status: 404 }
        );
      }

      try {
        const { rows, capped } = await fetchSiblingRowsForAnchor(supabase, anchor);
        return NextResponse.json({
          success: true,
          anchorId: String(anchor.id),
          rows,
          capped: capped ? true : undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load sibling rows';
        console.error('[admin/sage-data/properties] GET sibling rows error:', err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
      }
    }

    const q = (params.get('q') ?? '').trim();
    const researchStatus = params.get('research_status');
    const country = params.get('country');
    const page = parseIntParam(params.get('page'), 1);
    const pageSize = Math.min(
      parseIntParam(params.get('pageSize'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const sortByRaw = params.get('sortBy') ?? 'date_updated';
    const sortBy = ALL_GLAMPING_PROPERTY_COLUMNS.includes(
      sortByRaw as (typeof ALL_GLAMPING_PROPERTY_COLUMNS)[number]
    )
      ? sortByRaw
      : 'date_updated';
    const sortDir = params.get('sortDir') === 'asc' ? 'asc' : 'desc';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    // `exact` counts can be very slow on large tables (full scan). Planned count is
    // enough for admin pagination UX while keeping the list endpoint responsive.
    let query = supabase
      .from(TABLE)
      .select('*', { count: 'planned' })
      .order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false })
      .range(from, to);

    if (q.length > 0) {
      const term = escapeIlikeTerm(q);
      if (term.length > 0) {
        const pattern = `%${term}%`;
        query = query.or(
          [
            `property_name.ilike.${pattern}`,
            `city.ilike.${pattern}`,
            `state.ilike.${pattern}`,
            `country.ilike.${pattern}`,
          ].join(',')
        );
      }
    }

    if (researchStatus && researchStatus !== 'all') {
      query = query.eq('research_status', researchStatus);
    }
    if (country && country !== 'all') {
      // Case-insensitive match on the full stored value (no wildcards in param — country comes from the admin list).
      query = query.ilike('country', country);
    }

    const missing = params.get('missing');
    if (missing === 'city') {
      query = query.or('city.is.null,city.eq.');
    } else if (missing === 'website') {
      query = query.or('url.is.null,url.eq.');
    } else if (missing === 'rates') {
      // Numeric column: `col.eq.` (empty string) is invalid for Postgres numeric — use null or 0.
      query = query.or(
        'rate_avg_retail_daily_rate.is.null,rate_avg_retail_daily_rate.eq.0'
      );
    } else if (missing === 'lat_lng') {
      // Missing either coordinate (numeric — do not use eq.'').
      query = query.or('lat.is.null,lon.is.null');
    } else if (missing === 'total_sites') {
      query = query.or(
        'property_total_sites.is.null,property_total_sites.eq.0'
      );
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[admin/sage-data/properties] GET error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const rows = data ?? [];
    let total = typeof count === 'number' && !Number.isNaN(count) ? count : 0;
    if (count == null && rows.length > 0) {
      total = Math.max(total, from + rows.length);
    }

    return NextResponse.json({
      success: true,
      properties: rows,
      total,
      page,
      pageSize,
      sortBy,
      sortDir,
    });
  } catch (err) {
    console.error('[admin/sage-data/properties] GET unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
});

export const PATCH = withAdminAuth(async (request) => {
  try {
    const body = (await request.json()) as {
      id?: string | number;
      updates?: Record<string, unknown>;
    };
    const { id: rawId, updates } = body;

    if (rawId === undefined || rawId === null || rawId === '') {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }
    // PostgREST / Supabase return numeric `id` from JSON; only strings passed the old check and caused 400.
    const id = String(rawId).trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'updates object is required' },
        { status: 400 }
      );
    }

    const sanitized: Record<string, unknown> = {};
    const rejected: string[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (!EDITABLE_COLUMNS.has(key)) {
        rejected.push(key);
        continue;
      }
      sanitized[key] =
        typeof value === 'string' && value.trim() === '' ? null : value;
    }

    if (
      'land_operator_category' in sanitized &&
      sanitized.land_operator_category != null
    ) {
      const cat = sanitized.land_operator_category;
      if (typeof cat !== 'string' || !isValidLandOperatorCategory(cat)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'land_operator_category must be private_commercial, state_park, federal_public, or other_public',
          },
          { status: 400 },
        );
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No editable fields provided',
          rejected,
        },
        { status: 400 }
      );
    }

    sanitized.date_updated = new Date().toISOString().split('T')[0];

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .update(sanitized)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[admin/sage-data/properties] PATCH error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      property: data,
      rejected: rejected.length > 0 ? rejected : undefined,
    });
  } catch (err) {
    console.error('[admin/sage-data/properties] PATCH unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update property' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdminAuth(async (request) => {
  try {
    const body = (await request.json()) as {
      id?: string | number;
      ids?: (string | number)[];
    };

    let ids: string[];
    if (Array.isArray(body?.ids)) {
      ids = [
        ...new Set(
          body.ids
            .map((x) => String(x).trim())
            .filter((x) => x.length > 0)
        ),
      ];
    } else {
      const rawId = body?.id;
      if (rawId === undefined || rawId === null || rawId === '') {
        return NextResponse.json(
          { success: false, error: 'id or ids is required' },
          { status: 400 }
        );
      }
      const id = String(rawId).trim();
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'id is required' },
          { status: 400 }
        );
      }
      ids = [id];
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'id or ids is required' },
        { status: 400 }
      );
    }
    if (ids.length > MAX_GLAMPING_SIBLING_ROWS) {
      return NextResponse.json(
        {
          success: false,
          error: `At most ${MAX_GLAMPING_SIBLING_ROWS} rows can be deleted at once`,
        },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const anchorId = ids[0];
    const { data: anchor, error: anchorError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', anchorId)
      .maybeSingle();

    if (anchorError) {
      console.error('[admin/sage-data/properties] DELETE anchor error:', anchorError);
      return NextResponse.json(
        { success: false, error: anchorError.message },
        { status: 500 }
      );
    }
    if (!anchor) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    let siblingRows: Record<string, unknown>[];
    try {
      const { rows } = await fetchSiblingRowsForAnchor(supabase, anchor);
      siblingRows = rows;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve sibling group';
      console.error('[admin/sage-data/properties] DELETE sibling fetch error:', err);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }

    if (!idsBelongToSiblingGroup(ids, siblingRows)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Every id must belong to the same sibling group as the first id',
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.from(TABLE).delete().in('id', ids);

    if (error) {
      console.error('[admin/sage-data/properties] DELETE error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedIds: ids });
  } catch (err) {
    console.error('[admin/sage-data/properties] DELETE unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to delete property' },
      { status: 500 }
    );
  }
});
