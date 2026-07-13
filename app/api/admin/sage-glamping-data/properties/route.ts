/**
 * API Route: all_sage_data CRUD for the Sage Data admin editor.
 * GET   /api/admin/sage-glamping-data/properties
 *   Query params:
 *     q            — case-insensitive search across property_name, city, state, country
 *     research_status — exact match (e.g. 'in_progress', 'published', 'new')
 *     country      — case-insensitive exact match (ilike) on `country`
 *     state        — USPS code (e.g. VT); matches abbrev or full state name on `state`
 *     is_open      — exact match on `is_open` when value is Yes | Under Construction | Proposed Development | Cancelled | Temporarily closed | Closed
 *     discovery_source — exact match on `discovery_source` (Sage Data table "Source" column)
 *     page         — 1-based (default 1)
 *     pageSize     — default 50, max 200
 *     sortBy       — column name (default 'date_updated')
 *     sortDir      — 'asc' | 'desc' (default 'desc')
 *     glamping_service_tier — exact match (luxury | upscale | midscale | rustic)
 *     missing      — optional: 'city' | 'rates' | 'website' | 'lat_lng' | 'total_sites' — gap filters
 *                    (applied to anchor rows only when the list-anchors view is installed)
 *                    (city/url: null or empty string; rates: rate_avg_retail_daily_rate null or 0 — numeric, no `eq.''`);
 *                    lat_lng: lat or lon null; total_sites: property_total_sites null or 0)
 *     siblingOf    — optional: when set (row id), returns all sibling rows for the multi-site editor:
 *                    `{ success, anchorId, rows, capped? }` (same `property_id`; slug/name+city+state fallback only if unset).
 *                    Max 50 rows (`capped: true` if more exist).
 *   List response: `total` = property count from `all_sage_data_list_anchors`
 *   (one row per logical property). Falls back to site-level rows only if the view is missing.
 *
 * PATCH /api/admin/sage-glamping-data/properties
 *   Body: { id: string | number, updates: Record<string, unknown> }
 *   Updates are restricted to the editable column allowlist below.
 *
 * DELETE /api/admin/sage-glamping-data/properties
 *   Body: { id: string | number } — delete one row (backward compatible), or
 *         { ids: (string|number)[] } — delete multiple rows; every id must belong to the same
 *         sibling group as `ids[0]` (same `property_id`; slug/name+city+state fallback if unset). Max 50 ids.
 *
 * POST /api/admin/sage-glamping-data/properties
 *   Body: fields for a new row (see EDITABLE_COLUMNS). Required: property_name, city, state, and url or an OTA listing URL.
 *   Defaults: research_status in_progress, is_glamping_property Yes, is_open Yes, source Sage,
 *   date_added / date_updated today (YYYY-MM-DD).
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { applySageDataGlampingListFilters } from '@/lib/admin/glamping-sage-data-list';
import { dedupeRowsToPropertyAnchors } from '@/lib/admin/glamping-list-anchor-key';
import {
  idsBelongToSiblingGroup,
  MAX_GLAMPING_SIBLING_ROWS,
  siblingFilterSpecFromAnchor,
  sortSiblingPropertyRows,
} from '@/lib/admin/glamping-property-siblings';
import { ALL_GLAMPING_PROPERTY_COLUMNS } from '@/lib/sage-ai/all-glamping-properties-columns';
import { isValidLandOperatorCategory } from '@/lib/glamping-land-operator-category';
import {
  applyOtaFieldSanitization,
  hasOfficialWebsiteOrOtaListing,
  THIRD_PARTY_PROPAGATE_KEYS,
} from '@/lib/property-ota-fields';
import {
  GLAMPING_IS_OPEN_VALUES,
  type GlampingIsOpenValue,
} from '@/lib/glamping-is-open';
import { normalizeAllGlampingPropertiesCountryForDb } from '@/lib/all-glamping-properties-country';
import { isValidGlampingBrandId } from '@/lib/glamping-brands';
import { isGlampingServiceTier } from '@/lib/glamping-service-tier';
import { applyGlampingRatesToUsd } from '@/lib/glamping-rates-usd';
import { sanitizePlannedOpenDatePatch } from '@/lib/glamping-planned-open';
import {
  CANCELLED_REASON_PROPAGATE_KEYS,
  sanitizeCancelledReasonPatch,
} from '@/lib/cancelled-project-reason';
import { sanitizeGlampingSeasonRateUpdates } from '@/lib/glamping-seasonal-rate';
import { applyIsOpenChangeWithHistory } from '@/lib/glamping-pipeline/status-history';

export const dynamic = 'force-dynamic';

const TABLE = 'all_sage_data';

/**
 * Read-only view: one row per logical property (same grouping as sibling editor).
 * If missing in a database, the list GET falls back to `all_sage_data` and logs a warning.
 */
const LIST_ANCHORS_VIEW = 'all_sage_data_list_anchors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuidString(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

// Columns the admin editor is NOT allowed to overwrite via PATCH.
// id / created_at / updated_at are managed by Postgres; quality_score is derived.
const READ_ONLY_COLUMNS = new Set<string>([
  'id',
  'property_id',
  'created_at',
  'updated_at',
  'quality_score',
]);

const EDITABLE_COLUMNS = new Set<string>(
  ALL_GLAMPING_PROPERTY_COLUMNS.filter((c) => !READ_ONLY_COLUMNS.has(c))
);

const REQUIRED_CREATE_SCALAR_FIELDS = ['property_name', 'city', 'state'] as const;

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

async function fetchSiblingRowsForAnchor(
  supabase: ReturnType<typeof createServerClient>,
  anchor: Record<string, unknown>
): Promise<{ rows: Record<string, unknown>[]; capped: boolean }> {
  const spec = siblingFilterSpecFromAnchor(anchor);
  let q = supabase.from(TABLE).select('*');
  if (spec.mode === 'property_id') {
    q = q.eq('property_id', spec.propertyId);
  } else if (spec.mode === 'slug') {
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

    for (const key of REQUIRED_CREATE_SCALAR_FIELDS) {
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

    if ('url' in insertRow && insertRow.url != null) {
      const u = String(insertRow.url).trim();
      insertRow.url = u ? normalizeWebsiteUrl(u) : null;
    }
    applyOtaFieldSanitization(insertRow, { syncPlatformsFromUrls: true });

    if (!hasOfficialWebsiteOrOtaListing(insertRow)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Provide an official website (url) or at least one third-party listing URL (Hipcamp, Airbnb, Booking.com, or Vrbo)',
        },
        { status: 400 }
      );
    }

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

    insertRow.country = normalizeAllGlampingPropertiesCountryForDb(insertRow.country);

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

    const { row: insertRowUsd } = applyGlampingRatesToUsd(insertRow);
    Object.assign(insertRow, insertRowUsd);

    if (Object.prototype.hasOwnProperty.call(body, 'property_id')) {
      const rawPid = body.property_id;
      if (rawPid != null && String(rawPid).trim() !== '') {
        if (!isValidUuidString(rawPid)) {
          return NextResponse.json(
            { success: false, error: 'property_id must be a valid UUID when provided' },
            { status: 400 }
          );
        }
        insertRow.property_id = String(rawPid).trim();
      }
    }

    const supabase = createServerClient();

    // Sibling site rows must share the anchor property_id (avoid per-row gen_random_uuid()).
    if (
      !insertRow.property_id &&
      typeof insertRow.slug === 'string' &&
      insertRow.slug.trim() !== ''
    ) {
      const { data: slugSibling } = await supabase
        .from(TABLE)
        .select('property_id')
        .eq('slug', insertRow.slug.trim())
        .not('property_id', 'is', null)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (slugSibling?.property_id) {
        insertRow.property_id = slugSibling.property_id;
      }
    }

    if (
      !insertRow.property_id &&
      typeof insertRow.property_name === 'string' &&
      insertRow.property_name.trim() !== ''
    ) {
      const propertyName = insertRow.property_name.trim();
      let nameCityStateQuery = supabase
        .from(TABLE)
        .select('property_id')
        .eq('property_name', propertyName)
        .not('property_id', 'is', null)
        .order('id', { ascending: true })
        .limit(1);

      const cityRaw = insertRow.city;
      if (cityRaw == null || String(cityRaw).trim() === '') {
        nameCityStateQuery = nameCityStateQuery.or('city.is.null,city.eq.');
      } else {
        nameCityStateQuery = nameCityStateQuery.eq('city', String(cityRaw).trim());
      }

      const stateRaw = insertRow.state;
      if (stateRaw == null || String(stateRaw).trim() === '') {
        nameCityStateQuery = nameCityStateQuery.or('state.is.null,state.eq.');
      } else {
        nameCityStateQuery = nameCityStateQuery.eq('state', String(stateRaw).trim());
      }

      const { data: locationSibling } = await nameCityStateQuery.maybeSingle();
      if (locationSibling?.property_id) {
        insertRow.property_id = locationSibling.property_id;
      }
    }

    try {
      Object.assign(insertRow, sanitizeGlampingSeasonRateUpdates(insertRow));
    } catch (rateErr) {
      const message = rateErr instanceof Error ? rateErr.message : 'Invalid seasonal rate';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const cancelledInsertResult = sanitizeCancelledReasonPatch(insertRow);
    if (!cancelledInsertResult.ok) {
      return NextResponse.json(
        { success: false, error: cancelledInsertResult.error },
        { status: 400 }
      );
    }

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
    const state = params.get('state')?.trim() || undefined;
    const isOpenRaw = params.get('is_open')?.trim();
    const isOpenFilter: string | undefined =
      isOpenRaw &&
      (GLAMPING_IS_OPEN_VALUES as readonly string[]).includes(isOpenRaw)
        ? (isOpenRaw as GlampingIsOpenValue)
        : undefined;
    const discoverySourceRaw = params.get('discovery_source')?.trim();
    const discoverySourceFilter =
      discoverySourceRaw && discoverySourceRaw !== 'all'
        ? discoverySourceRaw
        : undefined;
    const missingParam = params.get('missing');
    const glampingServiceTierRaw = params.get('glamping_service_tier')?.trim();
    const glampingServiceTierFilter =
      glampingServiceTierRaw && isGlampingServiceTier(glampingServiceTierRaw)
        ? glampingServiceTierRaw
        : undefined;
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

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    const listFilters = {
      q,
      researchStatus: researchStatus ?? undefined,
      country: country ?? undefined,
      city: undefined,
      state,
      isOpen: isOpenFilter,
      discoverySource: discoverySourceFilter,
      missing: missingParam,
      glampingServiceTier: glampingServiceTierFilter,
    };

    const buildListQuery = (relation: string) => {
      let q = supabase
        .from(relation)
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false })
        .range(rangeFrom, rangeTo);
      q = applySageDataGlampingListFilters(q, listFilters);
      return q;
    };

    // Exact count so the admin footer matches the number of list rows for the active filters.
    let listRelation = LIST_ANCHORS_VIEW;
    let query = buildListQuery(listRelation);
    let { data, count, error } = await query;

    if (error) {
      const code = String((error as { code?: string }).code ?? '');
      const msg = String(error.message ?? '').toLowerCase();
      const missingListView =
        listRelation === LIST_ANCHORS_VIEW &&
        (code === '42P01' ||
          code === 'PGRST205' ||
          (code.startsWith('PGRST') && msg.includes('list_anchors')) ||
          msg.includes('list_anchors') ||
          msg.includes('does not exist') ||
          msg.includes('could not find the table'));

      if (missingListView) {
        console.warn(
          '[admin/sage-data/properties] LIST_ANCHORS_VIEW missing; falling back to unit-level rows. Apply scripts/migrations/create-all-glamping-properties-list-anchors-view.sql on Postgres.'
        );
        listRelation = TABLE;
        query = buildListQuery(TABLE);
        ({ data, count, error } = await query);
      }
    }

    if (error) {
      console.error('[admin/sage-data/properties] GET error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const rawRows = data ?? [];
    const rows =
      listRelation === TABLE ? dedupeRowsToPropertyAnchors(rawRows) : rawRows;
    let total = typeof count === 'number' && !Number.isNaN(count) ? count : 0;
    if (listRelation === TABLE && rows.length !== rawRows.length) {
      console.warn(
        '[admin/sage-data/properties] List used site-level fallback with in-page dedupe; apply scripts/migrations/refresh-all-glamping-properties-list-anchors-view-2026-05-18.sql for correct pagination.'
      );
    }
    if (count == null && rows.length > 0) {
      total = Math.max(total, rangeFrom + rows.length);
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

    if ('country' in sanitized) {
      sanitized.country = normalizeAllGlampingPropertiesCountryForDb(sanitized.country);
    }

    if ('url' in sanitized && sanitized.url != null) {
      const u = String(sanitized.url).trim();
      sanitized.url = u ? normalizeWebsiteUrl(u) : null;
    }

    const otaTouched = THIRD_PARTY_PROPAGATE_KEYS.some((k) => k in sanitized);
    if (otaTouched) {
      applyOtaFieldSanitization(sanitized, { syncPlatformsFromUrls: true });
    }

    if ('brand_id' in sanitized && sanitized.brand_id != null) {
      const bid = sanitized.brand_id;
      if (typeof bid !== 'string' || !isValidGlampingBrandId(bid)) {
        return NextResponse.json(
          { success: false, error: 'brand_id must be a valid UUID or empty to clear' },
          { status: 400 }
        );
      }
      sanitized.brand_id = bid.trim();
    }

    if ('glamping_service_tier' in sanitized && sanitized.glamping_service_tier != null) {
      const tier = sanitized.glamping_service_tier;
      if (typeof tier !== 'string' || !isGlampingServiceTier(tier)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'glamping_service_tier must be luxury, upscale, midscale, or rustic',
          },
          { status: 400 }
        );
      }
    }

    const tierManualEdit =
      'glamping_service_tier' in sanitized || 'glamping_service_tier_notes' in sanitized;
    if (tierManualEdit) {
      sanitized.glamping_service_tier_source = 'manual';
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

    const supabase = createServerClient();

    const needsIsOpenRow =
      'planned_open_date' in sanitized ||
      'is_open' in sanitized ||
      'cancelled_reason' in sanitized ||
      'cancelled_reason_notes' in sanitized ||
      'cancelled_year' in sanitized;

    let effectiveIsOpen: string | null | undefined;

    if (needsIsOpenRow) {
      const { data: currentRow, error: currentErr } = await supabase
        .from(TABLE)
        .select('slug, is_open')
        .eq('id', id)
        .maybeSingle();
      if (currentErr) {
        return NextResponse.json(
          { success: false, error: currentErr.message },
          { status: 500 }
        );
      }

      effectiveIsOpen = (currentRow?.is_open as string | null | undefined) ?? null;
      const isOpenTouched = 'is_open' in sanitized;

      if ('planned_open_date' in sanitized || isOpenTouched) {
        const plannedResult = sanitizePlannedOpenDatePatch(sanitized, effectiveIsOpen);
        if (!plannedResult.ok) {
          return NextResponse.json(
            { success: false, error: plannedResult.error },
            { status: 400 }
          );
        }

        if (isOpenTouched && sanitized.is_open != null) {
          const nextRaw = String(sanitized.is_open).trim();
          if (!(GLAMPING_IS_OPEN_VALUES as readonly string[]).includes(nextRaw)) {
            return NextResponse.json(
              {
                success: false,
                error: `is_open must be one of: ${GLAMPING_IS_OPEN_VALUES.join(', ')}`,
              },
              { status: 400 }
            );
          }
          const nextIsOpen = nextRaw as GlampingIsOpenValue;
          const currentIsOpen = (effectiveIsOpen ?? '').trim();
          const slug = (currentRow?.slug as string | null | undefined) ?? '';
          effectiveIsOpen = nextIsOpen;

          if (slug && currentIsOpen !== nextIsOpen) {
            try {
              await applyIsOpenChangeWithHistory(supabase, {
                propertyId: Number(id),
                slug,
                previousIsOpen: currentIsOpen,
                nextIsOpen,
                changeSource: 'admin_patch',
              });
            } catch (historyErr) {
              const message =
                historyErr instanceof Error ? historyErr.message : String(historyErr);
              console.error('[admin/sage-data/properties] is_open history:', message);
              return NextResponse.json(
                { success: false, error: message },
                { status: 500 }
              );
            }
          }

          delete sanitized.is_open;
        }
      }

      if (
        'cancelled_reason' in sanitized ||
        'cancelled_reason_notes' in sanitized ||
        'cancelled_year' in sanitized ||
        isOpenTouched
      ) {
        sanitized.is_open = effectiveIsOpen ?? null;
        const cancelledResult = sanitizeCancelledReasonPatch(sanitized);
        delete sanitized.is_open;
        if (!cancelledResult.ok) {
          return NextResponse.json(
            { success: false, error: cancelledResult.error },
            { status: 400 }
          );
        }
      }
    }

    sanitized.date_updated = new Date().toISOString().split('T')[0];

    let sanitizedRates: Record<string, unknown>;
    try {
      sanitizedRates = sanitizeGlampingSeasonRateUpdates(sanitized);
    } catch (rateErr) {
      const message = rateErr instanceof Error ? rateErr.message : 'Invalid seasonal rate';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    Object.assign(sanitized, sanitizedRates);

    const { row: sanitizedUsd } = applyGlampingRatesToUsd(sanitized);
    Object.assign(sanitized, sanitizedUsd);

    const tierPropagateKeys = [
      'glamping_service_tier',
      'glamping_service_tier_source',
      'glamping_service_tier_notes',
    ] as const;
    const tierPatch = Object.fromEntries(
      Object.entries(sanitized).filter(([k]) =>
        (tierPropagateKeys as readonly string[]).includes(k)
      )
    );

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

    const propagateToSiblings = async (patch: Record<string, unknown>, label: string) => {
      if (!data || Object.keys(patch).length === 0) return;
      try {
        const { rows } = await fetchSiblingRowsForAnchor(
          supabase,
          data as Record<string, unknown>
        );
        const siblingIds = rows
          .map((r) => String(r.id))
          .filter((sid) => sid !== id);
        if (siblingIds.length > 0) {
          const { error: sibErr } = await supabase
            .from(TABLE)
            .update(patch)
            .in('id', siblingIds);
          if (sibErr) {
            console.warn(`[admin/sage-data/properties] PATCH ${label} sibling propagate:`, sibErr.message);
          }
        }
      } catch (propErr) {
        console.warn(`[admin/sage-data/properties] PATCH ${label} propagate failed:`, propErr);
      }
    };

    if (Object.keys(tierPatch).length > 0) {
      await propagateToSiblings(tierPatch, 'tier');
    }

    if (otaTouched) {
      const otaPatch = Object.fromEntries(
        Object.entries(sanitized).filter(([k]) =>
          (THIRD_PARTY_PROPAGATE_KEYS as readonly string[]).includes(k)
        )
      );
      await propagateToSiblings(otaPatch, 'ota');
    }

    const cancelledPatch = Object.fromEntries(
      Object.entries(sanitized).filter(([k]) =>
        (CANCELLED_REASON_PROPAGATE_KEYS as readonly string[]).includes(
          k as (typeof CANCELLED_REASON_PROPAGATE_KEYS)[number]
        )
      )
    );
    if (Object.keys(cancelledPatch).length > 0) {
      await propagateToSiblings(cancelledPatch, 'cancelled_reason');
    }

    if ('property_total_sites' in sanitized) {
      await propagateToSiblings(
        { property_total_sites: sanitized.property_total_sites },
        'property_total_sites'
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
