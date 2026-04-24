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
 *
 * PATCH /api/admin/sage-glamping-data/properties
 *   Body: { id: string | number, updates: Record<string, unknown> }
 *   Updates are restricted to the editable column allowlist below.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { ALL_GLAMPING_PROPERTY_COLUMNS } from '@/lib/sage-ai/all-glamping-properties-columns';

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

export const GET = withAdminAuth(async (request) => {
  try {
    const params = request.nextUrl.searchParams;
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

    const supabase = createServerClient();
    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
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

    return NextResponse.json({
      success: true,
      properties: data ?? [],
      total: count ?? 0,
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
