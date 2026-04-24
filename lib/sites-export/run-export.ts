import type { SupabaseClient } from '@supabase/supabase-js';
import { expandCandidatesForSiteExport } from '@/lib/comps-v2/export-expand';
import { compsV2ExportRowToSitesTemplate } from '@/lib/comps-v2/sites-template-export';
import {
  getBoundingBox,
  haversineDistanceMiles,
  parseRowLatLon,
  stateSqlValuesGlampingRoverpass,
} from '@/lib/comps-v2/geo';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import { expandSitesExportUnitTypesForQuery } from '@/lib/sites-export/campspot-unit-type-filter';
import {
  SITES_EXPORT_HYDRATE_CHUNK,
  SITES_EXPORT_PAGE_SIZE,
  sitesExportMaxExpandedRows,
  sitesExportMaxRefsToCache,
  sitesExportMaxRowsScanned,
  sitesExportUseLatLonNumericGeo,
  type SiteExportTable,
} from '@/lib/sites-export/constants';
import { buildSitesExportDownloadFilename } from '@/lib/sites-export/download-filename';
import { geocodeZipForSitesExport } from '@/lib/sites-export/geocode-zip';
import { sitesExportFingerprint } from '@/lib/sites-export/fingerprint';
import { mergeRawIntoTemplateRow } from '@/lib/sites-export/merge-raw-template';
import { parseSitesExportBody, sitesExportHasRegionScope } from '@/lib/sites-export/parse-body';
import { siteCountForPropertyExportFromRaw } from '@/lib/sites-export/property-site-count';
import {
  createSitesExportCacheKey,
  loadSitesExportRefs,
  saveSitesExportRefs,
  type SitesExportRowRef,
} from '@/lib/sites-export/refs-cache';
import { streamSitesExportBody } from '@/lib/sites-export/stream-export';
import { tableRowToCandidate } from '@/lib/sites-export/row-to-candidate';
import type {
  SitesExportCountResult,
  SitesExportErrorResult,
  SitesExportFileResult,
  SitesExportParsed,
  SitesExportRequestBody,
} from '@/lib/sites-export/types';

type AnyRow = Record<string, unknown>;

/** Minimal columns for count/ref scan (avoids transferring 100+ amenity columns per row). */
function sitesExportScanColumns(): string {
  const base = 'id,lat,lon,quantity_of_units,property_total_sites';
  return sitesExportUseLatLonNumericGeo() ? `${base},lat_num,lon_num` : base;
}

function isDbStatementTimeout(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('statement timeout') ||
    m.includes('canceling statement due to statement timeout') ||
    m.includes('query canceled') ||
    m.includes('query cancelled')
  );
}

function dbStatementTimeoutMessage(): string {
  return (
    'The database timed out while reading rows. Try a smaller zip radius or fewer filters. ' +
    'Hipcamp/Campspot zip exports require migrations add-hipcamp-campspot-lat-lon-numeric.sql and sites-export-hipcamp-campspot-bbox-rpc.sql.'
  );
}

function hipcampspotZipRpcRequiredMessage(): string {
  return (
    'Zip + mile-radius export for Hipcamp/Campspot requires database functions sites_export_hipcamp_bbox_ids and ' +
    'sites_export_campspot_bbox_ids. Run scripts/migrations/add-hipcamp-campspot-lat-lon-numeric.sql, then ' +
    'scripts/migrations/sites-export-hipcamp-campspot-bbox-rpc.sql in the Supabase SQL editor, then reload the schema cache. ' +
    'Without these, the app cannot safely filter by distance (a full-table export would be hundreds of MB).'
  );
}

function expandCountryLabels(countries: string[]): string[] {
  const out = new Set<string>();
  for (const c of countries) {
    const t = c.trim();
    if (!t) continue;
    out.add(t);
    if (
      /^united states$/i.test(t) ||
      /^united states of america$/i.test(t) ||
      t === 'US' ||
      t === 'USA'
    ) {
      out.add('United States');
      out.add('USA');
      out.add('US');
      out.add('United States of America');
    }
    if (/^canada$/i.test(t)) {
      out.add('Canada');
      out.add('CA');
    }
    if (/^mexico$/i.test(t)) {
      out.add('Mexico');
      out.add('MX');
    }
  }
  return [...out];
}

function passesGeo(row: AnyRow, centerLat: number, centerLng: number, radiusMiles: number): boolean {
  const ll = parseRowLatLon(row);
  if (!ll) return false;
  return haversineDistanceMiles(centerLat, centerLng, ll.lat, ll.lon) <= radiusMiles;
}

function coerceFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/** True when zip + mile radius export should apply bbox + Haversine (requires resolved center). */
function sitesExportZipRadiusGeoActive(parsed: SitesExportParsed): boolean {
  const z = parsed.zip.trim();
  const r = parsed.radiusMilesResolved ?? parsed.radiusMiles;
  const lat = coerceFiniteNumber(parsed.centerLat as unknown);
  const lng = coerceFiniteNumber(parsed.centerLng as unknown);
  return z.length > 0 && r != null && r > 0 && lat != null && lng != null;
}

function rowId(raw: AnyRow): number | null {
  const id = raw.id;
  if (id == null) return null;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

type SitesExportPageOpts = {
  /** Keyset cursor: next page uses rows with id greater than this (null = start). */
  afterId: number | null;
  limit: number;
  /** Default full row; use {@link SITES_EXPORT_SCAN_COLUMNS} for count/ref collection only. */
  selectColumns?: string;
};

function baseQuery(
  supabase: SupabaseClient,
  table: SiteExportTable,
  parsed: SitesExportParsed,
  page: SitesExportPageOpts
) {
  const sel = page.selectColumns ?? '*';
  let q = supabase.from(table as never).select(sel);

  if (table === 'all_glamping_properties') {
    q = q.eq('is_open', 'Yes').eq('is_glamping_property', 'Yes');
  }
  if (table === 'all_roverpass_data_new') {
    q = q.eq('is_open', 'Yes');
  }

  if (parsed.countries.length > 0) {
    const labels = expandCountryLabels(parsed.countries);
    q = q.in('country', labels);
  }

  if (parsed.states.length > 0) {
    const vals = stateSqlValuesGlampingRoverpass(parsed.states);
    if (vals.length > 0) q = q.in('state', vals);
  }

  if (parsed.unitTypes.length > 0) {
    const unitVals = expandSitesExportUnitTypesForQuery(parsed.unitTypes);
    if (unitVals.length > 0) q = q.in('unit_type', unitVals);
  }

  const geo = sitesExportZipRadiusGeoActive(parsed);
  const bboxMiles = geo ? (parsed.radiusMilesResolved ?? parsed.radiusMiles)! : 0;

  if (geo && (table === 'all_glamping_properties' || table === 'all_roverpass_data_new')) {
    const bb = getBoundingBox(parsed.centerLat!, parsed.centerLng!, bboxMiles);
    q = q
      .gte('lat', bb.minLat)
      .lte('lat', bb.maxLat)
      .gte('lon', bb.minLng)
      .lte('lon', bb.maxLng);
  }

  if (
    geo &&
    sitesExportUseLatLonNumericGeo() &&
    (table === 'hipcamp' || table === 'campspot')
  ) {
    const bb = getBoundingBox(parsed.centerLat!, parsed.centerLng!, bboxMiles);
    q = q
      .not('lat_num', 'is', null)
      .not('lon_num', 'is', null)
      .gte('lat_num', bb.minLat)
      .lte('lat_num', bb.maxLat)
      .gte('lon_num', bb.minLng)
      .lte('lon_num', bb.maxLng);
  }

  if (page.afterId != null && page.afterId > 0) {
    q = q.gt('id', page.afterId);
  }

  return q.order('id', { ascending: true }).limit(page.limit);
}

function isMissingPostgrestRpcError(err: { message?: string; code?: string }): boolean {
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  const mentionsOurs =
    msg.includes('sites_export_hipcamp_bbox') || msg.includes('sites_export_campspot_bbox');
  return (
    code === '42883' ||
    (code === 'PGRST202' && mentionsOurs) ||
    (msg.includes('could not find the function') && mentionsOurs) ||
    (msg.includes('does not exist') && mentionsOurs)
  );
}

/** PostgREST may return `[{ id: 1 }]` or, in edge builds, scalar rows — normalize to numeric ids. */
function normalizeRpcBBoxIdRows(data: unknown): number[] {
  if (!Array.isArray(data)) return [];
  const out: number[] = [];
  for (const item of data) {
    if (item != null && typeof item === 'object' && !Array.isArray(item)) {
      const raw = item as Record<string, unknown>;
      const v = raw.id ?? raw.Id;
      if (typeof v === 'bigint') {
        const n = Number(v);
        if (Number.isFinite(n)) out.push(n);
        continue;
      }
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) out.push(n);
      continue;
    }
    if (typeof item === 'number' && Number.isFinite(item)) {
      out.push(item);
      continue;
    }
    if (typeof item === 'string' && item.trim() !== '') {
      const n = Number(item);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}

type ExportPageLoad =
  | { kind: 'batch'; batch: AnyRow[]; lastId: number | null }
  | { kind: 'error'; result: SitesExportErrorResult };

async function loadExportTablePage(
  supabase: SupabaseClient,
  table: SiteExportTable,
  parsed: SitesExportParsed,
  afterId: number | null,
  selectColumns: string
): Promise<ExportPageLoad> {
  const geo = sitesExportZipRadiusGeoActive(parsed);
  const isHipcampspot = table === 'hipcamp' || table === 'campspot';

  if (geo && isHipcampspot) {
    const miles = (parsed.radiusMilesResolved ?? parsed.radiusMiles)!;
    const clat = coerceFiniteNumber(parsed.centerLat as unknown)!;
    const clng = coerceFiniteNumber(parsed.centerLng as unknown)!;
    const bb = getBoundingBox(clat, clng, miles);
    const rpc =
      table === 'campspot' ? 'sites_export_campspot_bbox_ids' : 'sites_export_hipcamp_bbox_ids';
    const { data, error } = await supabase.rpc(rpc, {
      p_min_lat: bb.minLat,
      p_max_lat: bb.maxLat,
      p_min_lng: bb.minLng,
      p_max_lng: bb.maxLng,
      p_after: afterId ?? 0,
      p_limit: SITES_EXPORT_PAGE_SIZE,
      p_countries: parsed.countries.length > 0 ? expandCountryLabels(parsed.countries) : null,
      p_states:
        parsed.states.length > 0 ? stateSqlValuesGlampingRoverpass(parsed.states) : null,
      p_unit_types:
        parsed.unitTypes.length > 0 ? expandSitesExportUnitTypesForQuery(parsed.unitTypes) : null,
    });
    if (error) {
      const msg = error.message || 'Database error while fetching sites';
      if (isDbStatementTimeout(msg)) {
        return {
          kind: 'error',
          result: { ok: false, status: 504, message: dbStatementTimeoutMessage() },
        };
      }
      if (isMissingPostgrestRpcError(error)) {
        return {
          kind: 'error',
          result: { ok: false, status: 503, message: hipcampspotZipRpcRequiredMessage() },
        };
      }
      return { kind: 'error', result: { ok: false, status: 500, message: msg } };
    }
    const ids = normalizeRpcBBoxIdRows(data);
    if (ids.length === 0) {
      return { kind: 'batch', batch: [], lastId: null };
    }
    const { data: rows, error: rowErr } = await supabase
      .from(table as never)
      .select(selectColumns)
      .in('id', ids);
    if (rowErr) {
      const msg = rowErr.message || 'Database error while fetching sites';
      if (isDbStatementTimeout(msg)) {
        return {
          kind: 'error',
          result: { ok: false, status: 504, message: dbStatementTimeoutMessage() },
        };
      }
      return { kind: 'error', result: { ok: false, status: 500, message: msg } };
    }
    const byId = new Map<number, AnyRow>();
    for (const r of rows ?? []) {
      const row = r as unknown as AnyRow;
      const id = rowId(row);
      if (id != null) byId.set(id, row);
    }
    const ordered = ids.map((id) => byId.get(id)).filter((x): x is AnyRow => x != null);
    const lastId = ids[ids.length - 1] ?? null;
    return { kind: 'batch', batch: ordered, lastId };
  }

  const { data, error } = await baseQuery(supabase, table, parsed, {
    afterId,
    limit: SITES_EXPORT_PAGE_SIZE,
    selectColumns,
  });
  if (error) {
    const msg = error.message || 'Database error while fetching sites';
    if (isDbStatementTimeout(msg)) {
      return {
        kind: 'error',
        result: { ok: false, status: 504, message: dbStatementTimeoutMessage() },
      };
    }
    return { kind: 'error', result: { ok: false, status: 500, message: msg } };
  }
  const batch = (data ?? []) as unknown as AnyRow[];
  const lastRow = batch[batch.length - 1];
  const lastId = lastRow ? rowId(lastRow) : null;
  return { kind: 'batch', batch, lastId };
}

export async function resolveSitesExportParsed(
  body: SitesExportRequestBody
): Promise<SitesExportParsed | SitesExportErrorResult> {
  let centerLat: number | null = null;
  let centerLng: number | null = null;
  let radiusMilesResolved: number | null = body.radiusMiles;

  if (body.zip && body.radiusMiles != null) {
    const g = await geocodeZipForSitesExport(body.zip, body.countries);
    if (!g) {
      return {
        ok: false,
        status: 400,
        message: 'Could not geocode zip code. Check the zip and country filters.',
      };
    }
    centerLat = coerceFiniteNumber(g.lat);
    centerLng = coerceFiniteNumber(g.lng);
    if (centerLat == null || centerLng == null) {
      return {
        ok: false,
        status: 502,
        message: 'Geocoding returned invalid coordinates. Try again or adjust zip/country filters.',
      };
    }
  }

  return {
    ...body,
    centerLat,
    centerLng,
    radiusMilesResolved,
  };
}

type Collected = {
  candidate: CompsV2Candidate;
  raw: AnyRow;
  table: SiteExportTable;
};

class SitesExportLimitError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Full scan: property-level refs + total expanded site count (no full row retention beyond refs list).
 */
async function collectRefsAndCount(
  supabase: SupabaseClient,
  parsed: SitesExportParsed
): Promise<{ ok: true; refs: SitesExportRowRef[]; count: number } | SitesExportErrorResult> {
  const maxRowsScanned = sitesExportMaxRowsScanned();
  const maxExpandedRows = sitesExportMaxExpandedRows();
  const geoActive = sitesExportZipRadiusGeoActive(parsed);
  const radiusMilesForGeo = parsed.radiusMilesResolved ?? parsed.radiusMiles;

  const refs: SitesExportRowRef[] = [];
  let scanned = 0;
  let expandedTotal = 0;

  const clat = coerceFiniteNumber(parsed.centerLat as unknown);
  const clng = coerceFiniteNumber(parsed.centerLng as unknown);

  for (const table of parsed.sources) {
    let afterId: number | null = null;
    for (;;) {
      const loaded = await loadExportTablePage(
        supabase,
        table,
        parsed,
        afterId,
        sitesExportScanColumns()
      );
      if (loaded.kind === 'error') return loaded.result;
      const batch = loaded.batch;
      if (batch.length === 0) break;

      for (const raw of batch) {
        scanned += 1;
        if (scanned > maxRowsScanned) {
          return {
            ok: false,
            status: 422,
            message: `Too many rows to process (>${maxRowsScanned}). Narrow your filters or raise SITES_EXPORT_MAX_ROWS_SCANNED.`,
          };
        }

        if (geoActive && clat != null && clng != null) {
          if (!passesGeo(raw, clat, clng, radiusMilesForGeo!)) {
            continue;
          }
        }

        const rid = rowId(raw);
        if (rid == null) continue;

        const add = siteCountForPropertyExportFromRaw(table, raw);
        expandedTotal += add;
        if (expandedTotal > maxExpandedRows) {
          return {
            ok: false,
            status: 422,
            message: `Too many site rows to export (>${maxExpandedRows}). Narrow your filters or raise SITES_EXPORT_MAX_EXPANDED_ROWS.`,
          };
        }

        refs.push({ t: table, id: rid });
      }

      if (batch.length < SITES_EXPORT_PAGE_SIZE) break;
      const nextCursor = loaded.lastId;
      if (nextCursor == null) break;
      afterId = nextCursor;
    }
  }

  return { ok: true, refs, count: expandedTotal };
}

async function hydrateSlice(
  supabase: SupabaseClient,
  slice: SitesExportRowRef[]
): Promise<Collected[]> {
  const byTable = new Map<SiteExportTable, number[]>();
  for (const r of slice) {
    if (!byTable.has(r.t)) byTable.set(r.t, []);
    byTable.get(r.t)!.push(r.id);
  }

  const rowMap = new Map<string, AnyRow>();
  for (const [t, ids] of byTable) {
    const uniqueIds = [...new Set(ids)];
    for (let j = 0; j < uniqueIds.length; j += 500) {
      const part = uniqueIds.slice(j, j + 500);
      const { data, error } = await supabase.from(t as never).select('*').in('id', part);
      if (error) {
        const msg = error.message || '';
        if (isDbStatementTimeout(msg)) {
          throw new SitesExportLimitError(504, dbStatementTimeoutMessage());
        }
        throw new Error(msg);
      }
      for (const raw of data ?? []) {
        const id = rowId(raw as AnyRow);
        if (id != null) rowMap.set(`${t}:${id}`, raw as AnyRow);
      }
    }
  }

  const out: Collected[] = [];
  for (const ref of slice) {
    const raw = rowMap.get(`${ref.t}:${ref.id}`);
    if (!raw) continue;
    const candidate = tableRowToCandidate(raw, ref.t);
    if (candidate) out.push({ candidate, raw, table: ref.t });
  }
  return out;
}

function* yieldTemplateRowsFromCollected(collected: Collected[], exportDate: Date): Generator<unknown[]> {
  const candidates = collected.map((c) => c.candidate);
  const rawByStableId = new Map<string, AnyRow>();
  const tableByStableId = new Map<string, SiteExportTable>();
  for (const { candidate, raw, table } of collected) {
    rawByStableId.set(candidate.stable_id, raw);
    tableByStableId.set(candidate.stable_id, table);
  }

  const expanded = expandCandidatesForSiteExport(candidates);
  for (const row of expanded) {
    const raw = rawByStableId.get(row.stable_id);
    const table = tableByStableId.get(row.stable_id);
    const tmpl = compsV2ExportRowToSitesTemplate(row, { exportDate });
    if (raw && table) {
      mergeRawIntoTemplateRow(tmpl, raw, table);
    }
    yield tmpl;
  }
}

async function* iterateRowsFromRefs(
  supabase: SupabaseClient,
  refs: SitesExportRowRef[],
  parsed: SitesExportParsed
): AsyncGenerator<unknown[]> {
  const exportDate = new Date();
  const maxExpandedRows = sitesExportMaxExpandedRows();
  let expandedYielded = 0;
  const zipGeo = sitesExportZipRadiusGeoActive(parsed);
  const radiusMilesForGeo = parsed.radiusMilesResolved ?? parsed.radiusMiles;
  const clat = coerceFiniteNumber(parsed.centerLat as unknown);
  const clng = coerceFiniteNumber(parsed.centerLng as unknown);

  for (let i = 0; i < refs.length; i += SITES_EXPORT_HYDRATE_CHUNK) {
    const slice = refs.slice(i, i + SITES_EXPORT_HYDRATE_CHUNK);
    let collected = await hydrateSlice(supabase, slice);
    if (zipGeo && clat != null && clng != null) {
      collected = collected.filter((c) =>
        passesGeo(c.raw, clat, clng, radiusMilesForGeo!)
      );
    }
    for (const tmpl of yieldTemplateRowsFromCollected(collected, exportDate)) {
      expandedYielded += 1;
      if (expandedYielded > maxExpandedRows) {
        throw new SitesExportLimitError(
          422,
          `Too many site rows to export (>${maxExpandedRows}). Narrow your filters or raise SITES_EXPORT_MAX_EXPANDED_ROWS.`
        );
      }
      yield tmpl;
    }
  }
}

async function* iterateRowsScanning(
  supabase: SupabaseClient,
  parsed: SitesExportParsed
): AsyncGenerator<unknown[]> {
  const exportDate = new Date();
  const maxRowsScanned = sitesExportMaxRowsScanned();
  const maxExpandedRows = sitesExportMaxExpandedRows();
  const geoActive = sitesExportZipRadiusGeoActive(parsed);
  const radiusMilesForGeo = parsed.radiusMilesResolved ?? parsed.radiusMiles;

  let scanned = 0;
  let expandedYielded = 0;

  const clat = coerceFiniteNumber(parsed.centerLat as unknown);
  const clng = coerceFiniteNumber(parsed.centerLng as unknown);

  for (const table of parsed.sources) {
    let afterId: number | null = null;
    for (;;) {
      const loaded = await loadExportTablePage(
        supabase,
        table,
        parsed,
        afterId,
        '*'
      );
      if (loaded.kind === 'error') {
        const r = loaded.result;
        if (r.status === 504) throw new SitesExportLimitError(504, r.message);
        throw new Error(r.message);
      }
      const batch = loaded.batch;
      if (batch.length === 0) break;

      for (const raw of batch) {
        scanned += 1;
        if (scanned > maxRowsScanned) {
          throw new SitesExportLimitError(
            422,
            `Too many rows to process (>${maxRowsScanned}). Narrow your filters or raise SITES_EXPORT_MAX_ROWS_SCANNED.`
          );
        }

        if (geoActive && clat != null && clng != null) {
          if (!passesGeo(raw, clat, clng, radiusMilesForGeo!)) {
            continue;
          }
        }

        const candidate = tableRowToCandidate(raw, table);
        if (!candidate) continue;

        const expanded = expandCandidatesForSiteExport([candidate]);
        for (const ex of expanded) {
          expandedYielded += 1;
          if (expandedYielded > maxExpandedRows) {
            throw new SitesExportLimitError(
              422,
              `Too many site rows to export (>${maxExpandedRows}). Narrow your filters or raise SITES_EXPORT_MAX_EXPANDED_ROWS.`
            );
          }
          const tmpl = compsV2ExportRowToSitesTemplate(ex, { exportDate });
          mergeRawIntoTemplateRow(tmpl, raw, table);
          yield tmpl;
        }
      }

      if (batch.length < SITES_EXPORT_PAGE_SIZE) break;
      const nextCursor = loaded.lastId;
      if (nextCursor == null) break;
      afterId = nextCursor;
    }
  }
}

/** Count and refs come from a single `collectRefsAndCount` scan (no second summation pass). */
export async function runSitesExportCount(
  supabase: SupabaseClient,
  parsed: SitesExportParsed,
  userId: string
): Promise<SitesExportCountResult | SitesExportErrorResult> {
  const got = await collectRefsAndCount(supabase, parsed);
  if (!got.ok) return got;

  const fingerprint = sitesExportFingerprint(parsed);
  const maxRefs = sitesExportMaxRefsToCache();
  if (got.refs.length > maxRefs) {
    return { ok: true, count: got.count, cacheKey: null };
  }

  const cacheKey = createSitesExportCacheKey();
  await saveSitesExportRefs(userId, cacheKey, {
    v: 1,
    fingerprint,
    refs: got.refs,
  });

  return { ok: true, count: got.count, cacheKey };
}

export async function runSitesExportFile(
  supabase: SupabaseClient,
  parsed: SitesExportParsed,
  userId: string,
  cacheKeyFromClient?: string
): Promise<SitesExportFileResult | SitesExportErrorResult> {
  const fingerprint = sitesExportFingerprint(parsed);
  const stamp = new Date().toISOString().slice(0, 10);

  async function buildFile(
    rows: AsyncIterable<unknown[]>
  ): Promise<SitesExportFileResult | SitesExportErrorResult> {
    try {
      const { body, contentType, ext } = await streamSitesExportBody(rows, parsed.format);
      return {
        ok: true,
        body,
        contentType,
        filename: buildSitesExportDownloadFilename(parsed, stamp, ext),
      };
    } catch (err) {
      if (err instanceof SitesExportLimitError) {
        return { ok: false, status: err.status, message: err.message };
      }
      const msg = err instanceof Error ? err.message : 'Export failed';
      return { ok: false, status: 500, message: msg };
    }
  }

  /** Zip + radius exports must not use count refs: cached path skips DB bbox and previously trusted refs without Haversine. */
  const zipRadiusExport = sitesExportZipRadiusGeoActive(parsed);

  if (cacheKeyFromClient && userId && !zipRadiusExport) {
    const cached = await loadSitesExportRefs(userId, cacheKeyFromClient);
    if (cached && cached.v === 1 && cached.fingerprint === fingerprint) {
      const cachedRefs = cached.refs;
      async function* rows() {
        yield* iterateRowsFromRefs(supabase, cachedRefs, parsed);
      }
      return buildFile(rows());
    }
  }

  async function* rows() {
    yield* iterateRowsScanning(supabase, parsed);
  }

  return buildFile(rows());
}

export async function sitesExportFromJsonBody(
  supabase: SupabaseClient,
  body: unknown,
  mode: 'count' | 'export',
  userId: string
): Promise<SitesExportCountResult | SitesExportFileResult | SitesExportErrorResult> {
  const parsed = parseSitesExportBody(body);
  if (!parsed) {
    return { ok: false, status: 400, message: 'Invalid request body.' };
  }
  if (!sitesExportHasRegionScope(parsed)) {
    return {
      ok: false,
      status: 400,
      message:
        'Select at least one country or state, or set zip code and range (miles). Without a geographic filter the export includes all markets.',
    };
  }
  const resolved = await resolveSitesExportParsed(parsed);
  if ('ok' in resolved && resolved.ok === false) return resolved;
  const p = resolved as SitesExportParsed;

  if (mode === 'count') {
    return runSitesExportCount(supabase, p, userId);
  }
  return runSitesExportFile(supabase, p, userId, parsed.cacheKey);
}
