/**
 * Build public "Client Work" map pins from `reports` rows — same dedupe, coords, and jitter
 * as the admin Client Map (`/api/admin/client-map/reports`), without property names or job IDs.
 * Omits rows without a valid `reports.city` (same rule as the admin API).
 */

import { clientMapReportDedupeKey } from '@/lib/client-map-report-dedupe-key';
import { hasValidClientMapCity } from '@/lib/report-location-quality';
import { parseLocationStringField } from '@/lib/parse-csv-location';
import { canonicalReportService, reportServiceLabel } from '@/lib/report-service-display';
import {
  DEFAULT_CENTER,
  STATE_CENTERS,
  isLikelyStateCenterPlaceholder,
  resolveUsStateAbbr,
} from '@/lib/us-state-centers';
import type { ClientWorkMapPoint } from '@/lib/map/client-work-locations';

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

/** City, ST for public card; avoids leading street when city exists. */
function formatPublicClientWorkLocation(r: Record<string, unknown>): string {
  const city = String(r.city ?? '').trim();
  const state = String(r.state ?? '').trim();
  if (city && state) return `${city}, ${state}`;
  const loc = String(r.location ?? '').trim();
  if (loc) return loc;
  return formatAddress(r);
}

const COORD_BUCKET_DECIMALS = 5;

function jitterDuplicateMarkerPositions<T extends { id: string; lat: number; lng: number }>(
  items: T[]
): T[] {
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

function pickRicherReport(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const sa = reportRowScore(a);
  const sb = reportRowScore(b);
  if (sb !== sa) return sb > sa ? b : a;
  const ta = String(a.updated_at ?? a.created_at ?? a.processed_at ?? '');
  const tb = String(b.updated_at ?? b.created_at ?? b.processed_at ?? '');
  if (tb !== ta) return tb > ta ? b : a;
  return String(a.id) <= String(b.id) ? a : b;
}

function dedupeReportsForClientMap(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();

  for (const r of rows) {
    const jobKey = clientMapReportDedupeKey(r.study_id as string | null | undefined);
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

export function buildClientWorkMapPointsFromReportRows(
  rows: Record<string, unknown>[]
): ClientWorkMapPoint[] {
  const deduped = dedupeReportsForClientMap(rows).filter((r) =>
    hasValidClientMapCity(r.city as string | null | undefined)
  );

  const raw: ClientWorkMapPoint[] = deduped.map((r) => {
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

    const canon = canonicalReportService(r.service as string | null | undefined);
    const serviceLabel = reportServiceLabel(canon, '—');

    return {
      id: String(r.id),
      lat,
      lng,
      location: formatPublicClientWorkLocation(r),
      resortType: formatMarketType(r.market_type as string | null | undefined),
      service: serviceLabel,
    };
  });

  return jitterDuplicateMarkerPositions(raw);
}
