/**
 * API Route: Get all reports with location for client map (org-wide for internal Sage users)
 * GET /api/admin/client-map/reports
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { parseLocationStringField } from '@/lib/parse-csv-location';
import { reportYearFromStudyId } from '@/lib/report-year-from-study-id';
import { canonicalReportService } from '@/lib/report-service-display';
import {
  DEFAULT_CENTER,
  STATE_CENTERS,
  isLikelyStateCenterPlaceholder,
  resolveUsStateAbbr,
} from '@/lib/us-state-centers';

/** Prefer `state` column; else parse `location` so OR centroids match rows with empty state. */
function stateHintForReport(report: { state?: unknown; location?: unknown }): string | null {
  const s = String(report.state ?? '').trim();
  if (s) return s;
  const p = parseLocationStringField(String(report.location ?? '').trim());
  return p?.stateRaw ?? null;
}

function formatAddress(report: Record<string, unknown>): string {
  const parts: string[] = [];
  if (report.address_1) parts.push(String(report.address_1));
  if (report.city) parts.push(String(report.city));
  if (report.state) parts.push(String(report.state));
  if (report.zip_code) parts.push(String(report.zip_code));
  if (parts.length > 0) return parts.join(', ');
  if (report.location) return String(report.location);
  return 'Address not specified';
}

/** Bucket precision: identical geocode results (same city center) land in one bucket. */
const COORD_BUCKET_DECIMALS = 5;

/**
 * Spread markers that share the same coordinates (common for "City, ST" geocoding).
 * Uses a meter-based spiral so separation is meaningful when zoomed to metro/state level.
 */
function jitterDuplicateMarkerPositions<
  T extends { id: string; lat: number; lng: number },
>(items: T[]): T[] {
  const indexInBucket = new Map<string, number>();
  return items.map((r) => {
    const key = `${r.lat.toFixed(COORD_BUCKET_DECIMALS)},${r.lng.toFixed(COORD_BUCKET_DECIMALS)}`;
    const i = indexInBucket.get(key) ?? 0;
    indexInBucket.set(key, i + 1);
    if (i === 0) return r;

    const golden = ((i * 137.508) * Math.PI) / 180;
    let h = 0;
    for (let k = 0; k < r.id.length; k++) h = (h * 31 + r.id.charCodeAt(k)) >>> 0;
    const angle = golden + ((h % 360) * Math.PI) / 180;

    const meters = 650 + 420 * Math.sqrt(i);
    const cosLat = Math.cos((r.lat * Math.PI) / 180);
    const dLat = (meters * Math.cos(angle)) / 111_320;
    const dLng = (meters * Math.sin(angle)) / (111_320 * Math.max(0.25, Math.abs(cosLat)));

    return {
      ...r,
      lat: r.lat + dLat,
      lng: r.lng + dLng,
    };
  });
}

/**
 * One map pin per logical job number. CSV import uses study_id suffixes like JOB__2 for
 * duplicate rows; strip those so they share a key with JOB.
 */
function studyIdMapDedupeKey(studyId: string | null | undefined): string {
  const s = String(studyId ?? '').trim();
  if (!s) return '';
  const u = s.toUpperCase();
  const stripped = u.replace(/__\d+$/, '');
  return stripped;
}

function reportRowScore(r: Record<string, unknown>): number {
  let s = 0;
  if (r.has_docx) s += 100;
  if (r.has_xlsx) s += 100;
  const um = r.unit_mix;
  if (um != null && JSON.stringify(um) !== '[]') s += 50;
  const du = r.dropbox_url;
  if (du && String(du) !== '' && String(du) !== '#') s += 50;
  if (r.narrative_file_path) s += 30;

  const lat = r.latitude != null ? Number(r.latitude) : null;
  const lng = r.longitude != null ? Number(r.longitude) : null;
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    if (
      !isLikelyStateCenterPlaceholder(
        lat,
        lng,
        stateHintForReport({
          state: r.state as string | null | undefined,
          location: r.location as string | null | undefined,
        })
      )
    ) {
      s += 25;
    }
  }

  if (r.report_date) s += 5;
  return s;
}

function pickRicherReport(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): Record<string, unknown> {
  const sa = reportRowScore(a);
  const sb = reportRowScore(b);
  if (sb !== sa) return sb > sa ? b : a;
  const ta = String(a.updated_at ?? a.created_at ?? a.processed_at ?? '');
  const tb = String(b.updated_at ?? b.created_at ?? b.processed_at ?? '');
  if (tb !== ta) return tb > ta ? b : a;
  return String(a.id) <= String(b.id) ? a : b;
}

/** Collapse multiple DB rows that share the same job / study (after normalizing __N suffixes). */
function dedupeReportsForClientMap(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();

  for (const r of rows) {
    const jobKey = studyIdMapDedupeKey(r.study_id as string | null | undefined);
    const key = jobKey ? jobKey : `__row:${String(r.id)}`;

    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, r);
      continue;
    }
    byKey.set(key, pickRicherReport(prev, r));
  }

  return Array.from(byKey.values());
}

function formatMarketType(marketType: string | null | undefined): string {
  const map: Record<string, string> = {
    rv: 'RV',
    rv_glamping: 'RV & Glamping',
    glamping: 'Glamping',
    marina: 'Marina',
    landscape_hotel: 'Landscape Hotel',
  };
  return map[(marketType || '').toLowerCase()] || 'Glamping';
}

export const GET = withAdminAuth(async (_request, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('reports')
      .select(`
        *,
        clients (
          id,
          name,
          company
        )
      `)
      .is('deleted_at', null);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, reports: [] });
      }
      throw error;
    }

    const rows = dedupeReportsForClientMap((data || []) as Record<string, unknown>[]);

    // Use only Past Report uploaded Report details (unit_descriptions, unit_mix) — not comparables
    const unitTypesByReport = new Map<string, string[]>();
    for (const r of rows) {
      const reportId = String(r.id ?? '');
      const types: string[] = [];
      const ud = r.unit_descriptions as Array<{ type?: string }> | null;
      if (ud && Array.isArray(ud)) {
        for (const d of ud) {
          const t = String(d.type || '').trim();
          if (t && !types.includes(t)) types.push(t);
        }
      }
      const um = r.unit_mix as Array<{ type?: string }> | null;
      if (um && Array.isArray(um)) {
        for (const m of um) {
          const t = String(m.type || '').trim();
          if (t && !types.includes(t)) types.push(t);
        }
      }
      if (types.length > 0 && reportId) unitTypesByReport.set(reportId, types);
    }

    const rawReports = rows.map((r) => {
      const stateAbbr =
        resolveUsStateAbbr(r.state as string | null | undefined) ??
        resolveUsStateAbbr(stateHintForReport(r));
      const hasStoredCoords = r.latitude != null && r.longitude != null;
      let lat: number;
      let lng: number;

      if (hasStoredCoords) {
        lat = Number(r.latitude);
        lng = Number(r.longitude);
      } else {
        [lat, lng] = (stateAbbr && STATE_CENTERS[stateAbbr]) || DEFAULT_CENTER;
      }

      const coordsArePlaceholder =
        hasStoredCoords &&
        isLikelyStateCenterPlaceholder(lat, lng, stateHintForReport(r));

      const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;

      return {
        id: String(r.id ?? ''),
        studyId: r.study_id ?? null,
        propertyName: r.property_name || 'Unnamed Property',
        reportNumber: r.title || `Report-${String(r.id).slice(0, 8)}`,
        address: formatAddress(r),
        lat,
        lng,
        type: formatMarketType(r.market_type as string | null | undefined),
        marketType: String(r.market_type ?? '').toLowerCase() || null,
        reportDate: r.report_date ?? null,
        reportYear:
          reportYearFromStudyId(r.study_id as string | null | undefined) ??
          (r.report_date ? String(r.report_date).slice(0, 4) : null),
        unitTypes: unitTypesByReport.get(String(r.id ?? '')) || [],
        totalSites: r.total_sites ?? 'N/A',
        dropboxLink: r.dropbox_url || '#',
        status: r.status || 'draft',
        hasExactCoordinates: hasStoredCoords && !coordsArePlaceholder,
        clientId: r.client_id ?? null,
        clientName: client?.name ?? null,
        clientCompany: client?.company ?? null,
        service: canonicalReportService(r.service as string | null | undefined),
        hasDocx: Boolean(r.has_docx),
        hasXlsx: Boolean(r.has_xlsx),
      };
    });

    const reports = jitterDuplicateMarkerPositions(rawReports);

    return NextResponse.json({ success: true, reports });
  } catch (err) {
    console.error('[api/admin/client-map/reports] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
});
