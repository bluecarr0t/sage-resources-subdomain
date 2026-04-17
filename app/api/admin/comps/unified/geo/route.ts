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
 *     points: Array<[lat, lon, sourceIndex, id, name, avgAdr, website, totalSites, numUnits]>,
 *     sources: string[],                    // index → source key lookup
 *     total: number,                        // points returned
 *     geocoded_by_source: Record<string, number>, // marker counts per source (after collapse)
 *     capped: boolean,                      // true when hit the hard limit
 *     limit: number
 *   }
 *   Tuple tail: avg_adr (nullable), website_url (nullable), total_sites (nullable), num_units (nullable).
 *
 * Performance:
 *  - Columns: id, name, source, lat, lon + popup fields + `address_key`.
 *  - The matview is site/unit–centric: multiple rows per property. Rows are collapsed to
 *    **one marker per property per source** using `source` + `address_key` (not `address_key`
 *    alone — overlapping listings across sources must stay visible). Merged metrics:
 *    max sites, sum units, mean ADR.
 *  - Source names are de-duplicated into an index array so each point
 *    carries a small int rather than repeating `"all_glamping_properties"`.
 *  - Hard-capped at MAX_POINTS to bound worst-case payload size.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  parseUnifiedFilterOptions,
  applyUnifiedBaseFilters,
  applyUnifiedFtsFilter,
  applyUnifiedIlikeSearch,
} from '@/lib/comps-unified/apply-filters';

const MAX_POINTS = 150_000;
const CHUNK_SIZE = 10_000;

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
  address_key: string | null;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Dedupe key for map markers: `source` + `address_key`.
 * Never merge across sources — the same coordinates can appear in Hipcamp and
 * Campspot (or Sage) with identical `unified_address_key` geo hashes; merging
 * only by address_key would keep whichever row sorts first by `id` (often
 * `camp:` before `glamp:` / `hip:`), hiding other sources on the map.
 */
function addressKeyGroupKey(r: GeoRow): string {
  const k = r.address_key?.trim();
  if (k) return `${r.source}\u0001${k}`;
  return `${r.source}\u0001__row:${r.id}`;
}

/** One map marker per matview property (`address_key`); merge site/unit rows. */
function mergePropertyGroup(rows: GeoRow[]): GeoRow {
  if (rows.length === 1) return rows[0];
  const first = rows[0];
  let maxSites: number | null = null;
  let sumUnits = 0;
  let anyUnit = false;
  const adrs: number[] = [];
  let website: string | null = null;

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
    total_sites: maxSites,
    num_units: anyUnit ? sumUnits : null,
  };
}

function collapseToOneRowPerProperty(rows: GeoRow[]): GeoRow[] {
  const groups = new Map<string, GeoRow[]>();
  for (const r of rows) {
    const k = addressKeyGroupKey(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  const out: GeoRow[] = [];
  for (const group of groups.values()) {
    out.push(group.length === 1 ? group[0] : mergePropertyGroup(group));
  }
  return out;
}

export const GET = withAdminAuth(async (request) => {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const opts = parseUnifiedFilterOptions(searchParams);

    const baseSelect = () =>
      supabase
        .from('unified_comps')
        .select(
          'id,property_name,source,state,country,lat,lon,avg_adr,website_url,total_sites,num_units,address_key'
        )
        .not('lat', 'is', null)
        .not('lon', 'is', null);

    // PostgREST caps per-request rows (commonly 1000–10000). Page in chunks
    // up to MAX_POINTS so we can serve large filtered sets without requiring
    // an RPC. Each chunk reuses the same filter set.
    const collected: GeoRow[] = [];
    let offset = 0;
    let capped = false;
    let usedIlikeFallback = false;

    const fetchChunk = async (
      from: number,
      to: number,
      useIlike: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<{ data: GeoRow[] | null; error: any }> => {
      let q = applyUnifiedBaseFilters(baseSelect(), opts);
      q = useIlike ? applyUnifiedIlikeSearch(q, opts) : applyUnifiedFtsFilter(q, opts);
      const res = await q.order('id', { ascending: true }).range(from, to);
      return { data: (res.data as GeoRow[]) ?? null, error: res.error };
    };

    // PostgREST often enforces max-rows (commonly 1000) per request even when
    // `.range(from, to)` asks for more. Do not treat `chunk.length < batchSize`
    // as end-of-data — only an empty chunk means there are no more rows.
    while (collected.length < MAX_POINTS) {
      const remaining = MAX_POINTS - collected.length;
      const batchSize = Math.min(CHUNK_SIZE, remaining);
      const to = offset + batchSize - 1;

      const { data, error } = await fetchChunk(offset, to, usedIlikeFallback);

      if (error) {
        console.error('[comps/unified/geo] query error:', error);
        throw error;
      }

      const chunk = data ?? [];

      // On the very first chunk, if FTS returned nothing AND there were
      // search terms, retry with the ILIKE fallback (matches list endpoint).
      if (
        offset === 0 &&
        chunk.length === 0 &&
        opts.searchTerms.length > 0 &&
        !usedIlikeFallback
      ) {
        usedIlikeFallback = true;
        continue;
      }

      if (chunk.length === 0) break;

      collected.push(...chunk);
      offset += chunk.length;

      if (collected.length >= MAX_POINTS) {
        capped = true;
        break;
      }
    }

    const forPoints = collapseToOneRowPerProperty(collected);

    // Build compact payload: source name → index table to compress repeats.
    const sourceIndex = new Map<string, number>();
    const sources: string[] = [];
    const points: Array<
      [
        number,
        number,
        number,
        string,
        string,
        number | null,
        string | null,
        number | null,
        number | null,
      ]
    > = [];
    /** Plotted markers per source after collapse (for legend vs cluster confusion). */
    const geocodedBySource: Record<string, number> = {};
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
      geocodedBySource[r.source] = (geocodedBySource[r.source] ?? 0) + 1;
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
      ]);
    }

    return NextResponse.json({
      success: true,
      points,
      sources,
      total: points.length,
      geocoded_by_source: geocodedBySource,
      capped,
      limit: MAX_POINTS,
    });
  } catch (err) {
    console.error('[comps/unified/geo] error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch comps geo points' },
      { status: 500 }
    );
  }
});
