/**
 * API Route: Lean geocoded point list for the unified_comps map view.
 * GET /api/admin/comps/unified/geo
 *
 * Accepts the same filter query params as `/api/admin/comps/unified`
 * (search, source, state, unit_category, keywords, min_adr, max_adr) and
 * returns only geocoded rows (`lat`, `lon` NOT NULL) with a minimal payload
 * so the client can cluster 100k+ markers on a Leaflet map without blowing
 * the JSON budget.
 *
 * Response shape:
 *   {
 *     success: true,
 *     points: Array<[lat, lon, sourceIndex, id, name, avgAdr, website, totalSites, numUnits, isGlamping1, unitTypesEncoded, studyId, reportYear]>,
 *     — or with `?format=cols`, columnar arrays (`lat`, `lon`, `si`, `id`, …) instead of `points`
 *     sources: string[],                    // index → source key lookup
 *     total: number,                        // geocoded markers (DB-exact via RPC when deployed)
 *     geocoded_by_source: Record<string, number>, // per-source marker counts (same as `total` split)
 *     capped: boolean,                      // true when the coordinate payload hit the row cap
 *     limit: number
 *   }
 *   Tuple tail: avg_adr (nullable), website_url (nullable), total_sites (nullable), num_units (nullable),
 *   is_glamping_1 (0|1) — num_units in radius scorecard counts only rows where this is 1.
 *   unit_types_encoded (string|null) — distinct matview unit_type values joined with GEO_MAP_UNIT_TYPES_SEP.
 *   study_id (string|null) — feasibility study id for Past Reports detail link.
 *   report_year (string|null) — display year (study-id prefix or report_date).
 *
 * Performance:
 *  - Columns: id, name, source, lat, lon + popup fields + `address_key` + `is_glamping_property`.
 *  - The matview is site/unit–centric: multiple rows per property. Rows are collapsed to
 *    **one marker per property per source** using `source` + `address_key` (not `address_key`
 *    alone — overlapping listings across sources must stay visible). Merged metrics:
 *    max sites, sum units, mean ADR.
 *  - Source names are de-duplicated into an index array so each point
 *    carries a small int rather than repeating `"all_glamping_properties"`.
 *  - Hard-capped at MAX_POINTS to bound worst-case payload size.
 *  - Rows are fetched **per source** with an even budget (`MAX_POINTS / N`).
 *    Ordering only by synthetic `id` would otherwise return every `camp:` row
 *    first (lexicographically before `glamp:`, `hip:`, etc.) and hide other
 *    sources on the map once the cap is hit.
 */

import { NextResponse } from 'next/server';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  adminCompsCohortRpcParams,
  withAdminCompsCohortFilters,
} from '@/lib/comps-unified/admin-comps-cohort';
import {
  parseUnifiedFilterOptions,
  applyUnifiedBaseFilters,
  applyUnifiedFtsFilter,
  applyUnifiedIlikeSearch,
} from '@/lib/comps-unified/apply-filters';
import { filterGeoRowsToPublishedSageIds } from '@/lib/comps-unified/filter-sage-published-geo-rows';
import {
  attachSagePropertyIds,
  unifiedPropertyGroupKey,
} from '@/lib/comps-unified/sage-property-group-key';
import { UNIFIED_SOURCES } from '@/lib/comps-unified/build-row';
import { collectMergedUnitTypes } from '@/lib/comps-unified/collapse-property-rows';
import { encodeGeoMapUnitTypes } from '@/lib/comps-unified/geo-map-unit-types';
import { resolveReportYear } from '@/lib/report-year-from-study-id';
import {
  buildGeoMapColumnarFromTuples,
  type GeoMapTupleRow,
} from '@/lib/comps-unified/geo-map-columnar';
import {
  canonicalGeoQueryKey,
  geoApiCacheHeaders,
  geoApiNotModifiedHeaders,
  geoResponseWeakEtag,
} from '@/lib/comps-unified/geo-api-cache';

const MAX_POINTS = 150_000;
const CHUNK_SIZE = 10_000;

/** Full matview row shape (see `scripts/migrations/unified-comps-matview.sql`). */
const GEO_SELECT_WITH_GLAMP =
  'id,property_name,source,state,country,lat,lon,avg_adr,website_url,total_sites,num_units,unit_type,study_id,address_key,is_glamping_property';

/** Older deployments before `is_glamping_property` was added to `unified_comps`. */
const GEO_SELECT_LEGACY =
  'id,property_name,source,state,country,lat,lon,avg_adr,website_url,total_sites,num_units,unit_type,study_id,address_key';

/** Bump when `GEO_SELECT_*` column lists change so dev hot-reload does not serve stale selects. */
const GEO_SELECT_CACHE_REV = 4;

type GeoSelectMeta = { rev: number; selectList: string; includeGlampColumn: boolean };

function getCachedGeoSelectMeta(): GeoSelectMeta | undefined {
  const cached = (globalThis as unknown as { __unifiedCompsGeoSelect?: GeoSelectMeta })
    .__unifiedCompsGeoSelect;
  if (cached?.rev === GEO_SELECT_CACHE_REV) return cached;
  return undefined;
}

function setCachedGeoSelectMeta(meta: GeoSelectMeta): void {
  (globalThis as unknown as { __unifiedCompsGeoSelect?: GeoSelectMeta }).__unifiedCompsGeoSelect = meta;
}

/**
 * Detect whether `unified_comps` exposes `is_glamping_property` (older matviews do not).
 * Result is cached per Node process so we only probe once per `GEO_SELECT_CACHE_REV`.
 */
async function resolveGeoRowSelect(supabase: SupabaseClient): Promise<GeoSelectMeta> {
  const cached = getCachedGeoSelectMeta();
  if (cached) return cached;

  const { error } = await supabase.from('unified_comps').select('is_glamping_property').limit(1);
  const meta: GeoSelectMeta =
    error?.code === '42703'
      ? { rev: GEO_SELECT_CACHE_REV, selectList: GEO_SELECT_LEGACY, includeGlampColumn: false }
      : { rev: GEO_SELECT_CACHE_REV, selectList: GEO_SELECT_WITH_GLAMP, includeGlampColumn: true };
  setCachedGeoSelectMeta(meta);
  return meta;
}

interface GeoRow {
  id: string;
  property_name: string | null;
  source: string;
  state: string | null;
  country: string | null;
  lat: number | string | null;
  lon: number | string | null;
  avg_adr: number | string | null;
  website_url: string | null;
  total_sites: number | string | null;
  num_units: number | string | null;
  unit_type: string | null;
  study_id: string | null;
  address_key: string | null;
  /** Yes/No from underlying sources (Sage, RoverPass); OTAs/reports default Yes in matview. */
  is_glamping_property?: string | null;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function isGlampingYesValue(v: string | null | undefined): boolean {
  return String(v ?? '').trim().toLowerCase() === 'yes';
}

/** Map marker glamping flag: use DB column when present; else match matview defaults (Yes for all sources). */
function flagGlampingForMarker(r: GeoRow, includeGlampColumn: boolean): boolean {
  if (includeGlampColumn) return isGlampingYesValue(r.is_glamping_property);
  return true;
}

/**
 * Dedupe key for map markers: `source` + `address_key`.
 * Never merge across sources — the same coordinates can appear in Hipcamp and
 * Campspot (or Sage) with identical `unified_address_key` geo hashes; merging
 * only by address_key would keep whichever row sorts first by `id` (often
 * `camp:` before `glamp:` / `hip:`), hiding other sources on the map.
 */
function addressKeyGroupKey(
  r: GeoRow & { sage_property_id?: string | null }
): string {
  return unifiedPropertyGroupKey(r);
}

/** One map marker per matview property (`address_key`); merge site/unit rows. */
function mergePropertyGroup(rows: GeoRow[], includeGlampColumn: boolean): GeoRow {
  if (rows.length === 1) return rows[0];
  const first = rows[0];
  let maxSites: number | null = null;
  let sumUnits = 0;
  let anyUnit = false;
  const adrs: number[] = [];
  let website: string | null = null;
  let studyId: string | null = null;
  let glampingYes = false;

  for (const r of rows) {
    const ts = numOrNull(r.total_sites);
    if (ts !== null) {
      maxSites = maxSites === null ? ts : Math.max(maxSites, ts);
    }
    const nu = numOrNull(r.num_units);
    if (nu !== null) {
      sumUnits += nu;
      anyUnit = true;
    }
    const adr = numOrNull(r.avg_adr);
    if (adr !== null) adrs.push(adr);
    if (!website && r.website_url?.trim()) {
      website = r.website_url.trim();
    }
    if (!studyId && r.study_id?.trim()) {
      studyId = r.study_id.trim();
    }
    if (flagGlampingForMarker(r, includeGlampColumn)) glampingYes = true;
  }

  const avgAdr =
    adrs.length > 0
      ? adrs.reduce((a, b) => a + b, 0) / adrs.length
      : null;

  return {
    ...first,
    id: first.id,
    avg_adr: avgAdr,
    website_url: website,
    study_id: studyId ?? first.study_id,
    total_sites: maxSites,
    num_units: anyUnit ? sumUnits : null,
    is_glamping_property: glampingYes ? 'Yes' : 'No',
  };
}

/** Same tsquery shape as `lib/comps-unified/apply-filters` + list route. */
function buildTsQuery(terms: string[]): string {
  return terms
    .map((t) => t.replace(/[^a-z0-9]/gi, ' ').trim())
    .filter(Boolean)
    .map((t) => `${t}:*`)
    .join(' & ');
}

function parseGeoMarkerCountRpc(data: unknown): Record<string, number> | null {
  if (!Array.isArray(data)) return null;
  const out: Record<string, number> = {};
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const src = r.source;
    const raw = r.marker_count ?? r.markerCount;
    if (typeof src !== 'string' || !src) continue;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n)) out[src] = n;
  }
  return out;
}

type CollapsedGeoRow = GeoRow & { mergedUnitTypes: string[] };

function collapseToOneRowPerProperty(
  rows: GeoRow[],
  includeGlampColumn: boolean
): CollapsedGeoRow[] {
  const groups = new Map<string, GeoRow[]>();
  for (const r of rows) {
    const k = addressKeyGroupKey(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  const out: CollapsedGeoRow[] = [];
  for (const group of groups.values()) {
    const mergedUnitTypes = collectMergedUnitTypes(
      group.map((r) => ({ unit_type: r.unit_type ?? null }))
    );
    const row =
      group.length === 1 ? group[0] : mergePropertyGroup(group, includeGlampColumn);
    out.push({ ...row, mergedUnitTypes });
  }
  return out;
}

/** One calendar year per study_id for Past Reports map popups. */
async function buildReportYearByStudyId(
  supabase: SupabaseClient,
  rows: CollapsedGeoRow[]
): Promise<Map<string, string | null>> {
  const studyIds = [
    ...new Set(
      rows
        .filter((r) => r.source === 'reports')
        .map((r) => r.study_id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const out = new Map<string, string | null>();
  if (studyIds.length === 0) return out;

  const { data, error } = await supabase
    .from('reports')
    .select('study_id, report_date')
    .in('study_id', studyIds);

  if (error) {
    console.warn('[comps/unified/geo] report year lookup failed:', error.message);
    for (const sid of studyIds) out.set(sid, resolveReportYear(sid));
    return out;
  }

  const reportDateByStudy = new Map<string, string | null>();
  for (const row of data ?? []) {
    const sid =
      row && typeof row === 'object' && typeof (row as { study_id?: unknown }).study_id === 'string'
        ? (row as { study_id: string }).study_id.trim()
        : '';
    if (!sid || reportDateByStudy.has(sid)) continue;
    const rd = (row as { report_date?: string | null }).report_date;
    reportDateByStudy.set(sid, rd ?? null);
  }

  for (const sid of studyIds) {
    out.set(sid, resolveReportYear(sid, reportDateByStudy.get(sid)));
  }
  return out;
}

export const GET = withAdminAuth(async (request) => {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const useColumnar = searchParams.get('format') === 'cols';
    const canonicalQuery = canonicalGeoQueryKey(searchParams);
    const ifNoneMatch = request.headers.get('if-none-match');
    const opts = withAdminCompsCohortFilters(parseUnifiedFilterOptions(searchParams));
    const cohortRpc = adminCompsCohortRpcParams();

    const { selectList, includeGlampColumn } = await resolveGeoRowSelect(supabase);

    const baseSelect = () =>
      supabase
        .from('unified_comps')
        .select(selectList)
        .not('lat', 'is', null)
        .not('lon', 'is', null);

    // PostgREST caps per-request rows (commonly 1000–10000). Page in chunks
    // up to MAX_POINTS so we can serve large filtered sets without requiring
    // an RPC. Each chunk reuses the same filter set.
    const sourceList =
      opts.sources.length > 0 ? opts.sources : [...UNIFIED_SOURCES];
    const capPerSource = Math.max(1, Math.ceil(MAX_POINTS / sourceList.length));

    const fetchChunkForSource = async (
      source: string,
      from: number,
      to: number,
      useIlike: boolean
    ): Promise<{ data: GeoRow[] | null; error: PostgrestError | null }> => {
      let q = applyUnifiedBaseFilters(baseSelect(), opts);
      q = q.eq('source', source);
      q = useIlike ? applyUnifiedIlikeSearch(q, opts) : applyUnifiedFtsFilter(q, opts);
      const res = await q.order('id', { ascending: true }).range(from, to);
      return { data: (res.data as GeoRow[]) ?? null, error: res.error };
    };

    const collectWithSearchMode = async (
      useIlike: boolean
    ): Promise<{ rows: GeoRow[]; capped: boolean }> => {
      const collected: GeoRow[] = [];
      let capped = false;

      outer: for (const source of sourceList) {
        let offset = 0;
        let sourceRowCount = 0;

        while (sourceRowCount < capPerSource && collected.length < MAX_POINTS) {
          const remainingGlobal = MAX_POINTS - collected.length;
          const remainingSource = capPerSource - sourceRowCount;
          const batchSize = Math.min(CHUNK_SIZE, remainingGlobal, remainingSource);
          const to = offset + batchSize - 1;

          const { data, error } = await fetchChunkForSource(source, offset, to, useIlike);

          if (error) {
            console.error('[comps/unified/geo] query error:', error);
            throw error;
          }

          const chunk = data ?? [];
          if (chunk.length === 0) break;

          collected.push(...chunk);
          offset += chunk.length;
          sourceRowCount += chunk.length;

          if (collected.length >= MAX_POINTS) {
            capped = true;
            break outer;
          }
          if (sourceRowCount >= capPerSource) {
            capped = true;
            break;
          }
        }
      }

      return { rows: collected, capped };
    };

    let collected: GeoRow[] = [];
    let capped = false;
    let usedIlikeForData = false;

    const firstPass = await collectWithSearchMode(false);
    collected = firstPass.rows;
    capped = firstPass.capped;

    if (collected.length === 0 && opts.searchTerms.length > 0) {
      const secondPass = await collectWithSearchMode(true);
      collected = secondPass.rows;
      capped = secondPass.capped;
      usedIlikeForData = true;
    }

    if (opts.sageResearchStatus) {
      collected = await filterGeoRowsToPublishedSageIds(supabase, collected, opts.sageResearchStatus);
    }

    const collectedWithSagePid = await attachSagePropertyIds(supabase, collected);

    const searchMode: 'none' | 'fts' | 'ilike' =
      opts.searchTerms.length === 0 ? 'none' : usedIlikeForData ? 'ilike' : 'fts';
    const tsq = buildTsQuery(opts.searchTerms);

    const { data: markerRpcData, error: markerRpcErr } = await supabase.rpc(
      'unified_comps_geo_marker_counts',
      {
        p_sources: opts.sources.length > 0 ? opts.sources : null,
        p_states: opts.expandedStateValues.length > 0 ? opts.expandedStateValues : null,
        p_countries: opts.expandedCountryValues.length > 0 ? opts.expandedCountryValues : null,
        p_keywords: opts.keywordFilters.length > 0 ? opts.keywordFilters : null,
        p_min_adr:
          opts.parsedMinAdr !== null && !Number.isNaN(opts.parsedMinAdr)
            ? opts.parsedMinAdr
            : null,
        p_max_adr:
          opts.parsedMaxAdr !== null && !Number.isNaN(opts.parsedMaxAdr)
            ? opts.parsedMaxAdr
            : null,
        p_unit_categories: opts.unitCategories.length > 0 ? opts.unitCategories : null,
        p_property_types: opts.propertyTypes.length > 0 ? opts.propertyTypes : null,
        p_is_open: opts.openStatuses.length > 0 ? opts.openStatuses : null,
        p_tsquery: searchMode === 'fts' ? tsq : null,
        p_ilike_terms: searchMode === 'ilike' ? opts.searchTerms : null,
        ...cohortRpc,
      }
    );

    if (markerRpcErr) {
      console.error('[comps/unified/geo] marker counts RPC error:', markerRpcErr);
    }
    const geocodedBySourceFromRpc = markerRpcErr ? null : parseGeoMarkerCountRpc(markerRpcData);

    const forPoints = collapseToOneRowPerProperty(collectedWithSagePid, includeGlampColumn);
    const reportYearByStudyId = await buildReportYearByStudyId(supabase, forPoints);

    // Build compact payload: source name → index table to compress repeats.
    const sourceIndex = new Map<string, number>();
    const sources: string[] = [];
    const points: GeoMapTupleRow[] = [];
    /** Exact per-source marker totals from DB when RPC is deployed; else derived from `points`. */
    const geocodedBySource: Record<string, number> =
      geocodedBySourceFromRpc != null ? { ...geocodedBySourceFromRpc } : {};
    let totalGeocodedExact = 0;
    if (geocodedBySourceFromRpc != null) {
      for (const v of Object.values(geocodedBySourceFromRpc)) {
        totalGeocodedExact += v;
      }
    }

    for (const r of forPoints) {
      const lat = typeof r.lat === 'string' ? parseFloat(r.lat) : r.lat;
      const lon = typeof r.lon === 'string' ? parseFloat(r.lon) : r.lon;
      if (
        lat === null ||
        lon === null ||
        Number.isNaN(lat) ||
        Number.isNaN(lon)
      )
        continue;
      let idx = sourceIndex.get(r.source);
      if (idx === undefined) {
        idx = sources.length;
        sourceIndex.set(r.source, idx);
        sources.push(r.source);
      }
      if (geocodedBySourceFromRpc == null) {
        geocodedBySource[r.source] = (geocodedBySource[r.source] ?? 0) + 1;
      }
      const w = r.website_url?.trim() || null;
      points.push([
        lat,
        lon,
        idx,
        r.id,
        r.property_name ?? '',
        numOrNull(r.avg_adr),
        w,
        numOrNull(r.total_sites),
        numOrNull(r.num_units),
        flagGlampingForMarker(r, includeGlampColumn) ? 1 : 0,
        encodeGeoMapUnitTypes(r.mergedUnitTypes),
        r.study_id?.trim() || null,
        r.source === 'reports' && r.study_id?.trim()
          ? reportYearByStudyId.get(r.study_id.trim()) ?? null
          : null,
      ]);
    }

    const totalMarkers =
      geocodedBySourceFromRpc != null ? totalGeocodedExact : points.length;

    const sampleIds: string[] = [];
    if (points.length > 0) {
      sampleIds.push(String(points[0][3]));
      if (points.length > 1) sampleIds.push(String(points[points.length - 1][3]));
      if (points.length > 2) sampleIds.push(String(points[Math.floor(points.length / 2)][3]));
    }

    const etag = geoResponseWeakEtag({
      canonicalQuery,
      pointCount: points.length,
      total: totalMarkers,
      capped,
      sampleIds,
    });

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: geoApiNotModifiedHeaders(etag),
      });
    }

    const cacheHeaders = geoApiCacheHeaders(etag);

    if (useColumnar) {
      const columnar = buildGeoMapColumnarFromTuples(points, sources);
      return NextResponse.json(
        {
          success: true,
          format: 'cols' as const,
          ...columnar,
          total: totalMarkers,
          geocoded_by_source: geocodedBySource,
          capped,
          limit: MAX_POINTS,
        },
        { headers: cacheHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        points,
        sources,
        total: totalMarkers,
        geocoded_by_source: geocodedBySource,
        capped,
        limit: MAX_POINTS,
      },
      { headers: cacheHeaders }
    );
  } catch (err) {
    console.error('[comps/unified/geo] error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch comps geo points' },
      { status: 500 }
    );
  }
});
