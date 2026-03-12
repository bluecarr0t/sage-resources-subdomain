/**
 * API Route: Get all reports with location for client map (org-wide for internal Sage users)
 * GET /api/admin/client-map/reports
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { withAdminAuth } from '@/lib/require-admin-auth';

// Geographic centers for all US states + DC (fallback when report has no coordinates)
const STATE_CENTERS: Record<string, [number, number]> = {
  AL: [32.3182, -86.9023],
  AK: [61.3707, -152.4044],
  AZ: [34.0489, -111.0937],
  AR: [34.9697, -92.3731],
  CA: [36.7783, -119.4179],
  CO: [39.113, -105.3119],
  CT: [41.6032, -73.0877],
  DE: [38.9108, -75.5277],
  DC: [38.9072, -77.0369],
  FL: [27.7663, -82.6404],
  GA: [32.1574, -82.9071],
  HI: [19.8968, -155.5828],
  ID: [44.0682, -114.742],
  IL: [40.6331, -89.3985],
  IN: [40.2672, -86.1349],
  IA: [41.878, -93.0977],
  KS: [38.5266, -96.7265],
  KY: [37.6681, -84.6701],
  LA: [31.1695, -91.8678],
  ME: [45.2538, -69.4455],
  MD: [39.0458, -76.6413],
  MA: [42.4072, -71.3824],
  MI: [43.3266, -84.5361],
  MN: [46.7296, -94.6859],
  MS: [32.3547, -89.3985],
  MO: [37.9643, -91.8318],
  MT: [46.8797, -110.3626],
  NE: [41.4925, -99.9018],
  NV: [38.8026, -116.4194],
  NH: [43.1939, -71.5724],
  NJ: [40.0583, -74.4057],
  NM: [34.5199, -105.8701],
  NY: [43.2994, -74.2179],
  NC: [35.7596, -79.0193],
  ND: [47.5515, -101.002],
  OH: [40.4173, -82.9071],
  OK: [35.0078, -97.0929],
  OR: [43.8041, -120.5542],
  PA: [41.2033, -77.1945],
  RI: [41.5801, -71.4774],
  SC: [33.8361, -81.1637],
  SD: [43.9695, -99.9018],
  TN: [35.5175, -86.5804],
  TX: [31.9686, -99.9018],
  UT: [39.321, -111.0937],
  VT: [44.5588, -72.5778],
  VA: [37.4316, -78.6569],
  WA: [47.7511, -120.7401],
  WV: [38.5976, -80.4549],
  WI: [43.7844, -89.6165],
  WY: [43.076, -107.2903],
};

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];

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

    // Use only Past Report uploaded Report details (unit_descriptions, unit_mix) — not comparables
    const unitTypesByReport = new Map<string, string[]>();
    for (const r of data || []) {
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
      if (types.length > 0) unitTypesByReport.set(r.id, types);
    }

    const rawReports = (data || []).map((r) => {
      const hasCoords = r.latitude != null && r.longitude != null;
      let lat: number;
      let lng: number;

      if (hasCoords) {
        lat = Number(r.latitude);
        lng = Number(r.longitude);
      } else {
        const state = (r.state || '').toString().toUpperCase();
        [lat, lng] = STATE_CENTERS[state] || DEFAULT_CENTER;
      }

      const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;

      return {
        id: r.id,
        studyId: r.study_id ?? null,
        propertyName: r.property_name || 'Unnamed Property',
        reportNumber: r.title || `Report-${String(r.id).slice(0, 8)}`,
        address: formatAddress(r),
        lat,
        lng,
        type: formatMarketType(r.market_type),
        marketType: (r.market_type || '').toLowerCase() || null,
        reportDate: r.report_date ?? null,
        reportYear: r.report_date ? String(r.report_date).slice(0, 4) : null,
        unitTypes: unitTypesByReport.get(r.id) || [],
        totalSites: r.total_sites ?? 'N/A',
        dropboxLink: r.dropbox_url || '#',
        status: r.status || 'draft',
        hasExactCoordinates: hasCoords,
        clientId: r.client_id ?? null,
        clientName: client?.name ?? null,
        clientCompany: client?.company ?? null,
      };
    });

    // Add small offsets for reports that share the same lat/lng (e.g. no coords + same state center)
    // so all markers are visible instead of stacking on top of each other
    const posCount = new Map<string, number>();
    const reports = rawReports.map((r, idx) => {
      const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      const count = posCount.get(key) ?? 0;
      posCount.set(key, count + 1);
      if (count > 0) {
        const offset = 0.03 * count; // ~3 km per stacked report
        const angle = (idx * 137.5) * (Math.PI / 180); // golden angle for even spread
        return {
          ...r,
          lat: r.lat + Math.cos(angle) * offset,
          lng: r.lng + Math.sin(angle) * offset,
        };
      }
      return r;
    });

    return NextResponse.json({ success: true, reports });
  } catch (err) {
    console.error('[api/admin/client-map/reports] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
});
