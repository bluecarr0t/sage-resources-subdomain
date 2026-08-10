/**
 * Park visitation helpers for feasibility Excel + Word tables.
 * Same payload feeds Nat. Parks / State Parks sheets and Combined NPS Visitation
 * native Word tables (replacing broken OLE paste-links).
 */

import type { DemandDriversBlock } from './types';

export interface ParkVisitationRow {
  name: string;
  state: string | null;
  distance_miles: number;
  visitors: number | null;
  site_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Approximate highway drive-time label from straight-line miles (completed-study style). */
export function formatDriveTimeFromMiles(miles: number): string {
  if (!Number.isFinite(miles) || miles < 0) return 'n/a';
  if (miles < 15) return `${Math.round(miles)} miles`;
  // ~50 mph average for rural interstate / US highway corridors
  const hours = miles / 50;
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${Math.max(15, mins)} - ${mins + 15} min`;
  }
  const low = Math.floor(hours * 2) / 2;
  const high = Math.round((low + 0.5) * 10) / 10;
  const fmt = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));
  return `${fmt(low)} - ${fmt(high)} Hours`;
}

export function formatMilesLabel(miles: number): string {
  if (!Number.isFinite(miles)) return 'n/a';
  return `${Math.round(miles)} Miles`;
}

export function formatVisitorCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'n/a';
  return Math.round(n).toLocaleString('en-US');
}

/** National parks with visitor counts for Combined NPS Visitation (closest first). */
export function selectNationalParkRows(
  demandDrivers: DemandDriversBlock | null | undefined,
  limit = 6
): ParkVisitationRow[] {
  if (!demandDrivers?.national_parks?.items?.length) return [];
  return [...demandDrivers.national_parks.items]
    .filter((i) => i.name)
    .sort((a, b) => {
      if (a.distance_miles !== b.distance_miles) return a.distance_miles - b.distance_miles;
      return (b.visitors ?? 0) - (a.visitors ?? 0);
    })
    .slice(0, limit)
    .map((i) => ({
      name: i.name,
      state: i.state,
      distance_miles: i.distance_miles,
      visitors: i.visitors,
      site_type: i.site_type,
      latitude: i.latitude ?? null,
      longitude: i.longitude ?? null,
    }));
}

/** State parks from outdoor recreation sites (or web-researched fallbacks). */
export function selectStateParkRows(
  demandDrivers: DemandDriversBlock | null | undefined,
  limit = 6
): ParkVisitationRow[] {
  if (!demandDrivers?.major_outdoor_sites?.items?.length) return [];
  return demandDrivers.major_outdoor_sites.items
    .filter((i) => {
      const t = (i.site_type || '').toLowerCase();
      const n = i.name.toLowerCase();
      return t.includes('state_park') || t.includes('state park') || n.includes('state park');
    })
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, limit)
    .map((i) => ({
      name: i.name,
      state: i.state,
      distance_miles: i.distance_miles,
      visitors: i.visitors,
      site_type: i.site_type,
      latitude: i.latitude ?? null,
      longitude: i.longitude ?? null,
    }));
}

export function sumVisitors(rows: ParkVisitationRow[]): number {
  return rows.reduce((sum, r) => sum + (r.visitors && Number.isFinite(r.visitors) ? r.visitors : 0), 0);
}

export function buildCombinedNpsTableRows(rows: ParkVisitationRow[]): {
  headers: string[];
  body: string[][];
  totalVisitors: number;
} {
  const headers = ['Name', 'Time to Subject', 'Annual Visitors'];
  const body = rows.map((r) => [
    r.name,
    formatDriveTimeFromMiles(r.distance_miles),
    formatVisitorCount(r.visitors),
  ]);
  const totalVisitors = sumVisitors(rows);
  if (rows.length > 0) {
    body.push(['Total', '', formatVisitorCount(totalVisitors)]);
  }
  return { headers, body, totalVisitors };
}

export function buildStateParksTableRows(rows: ParkVisitationRow[]): {
  headers: string[];
  body: string[][];
  totalVisitors: number;
} {
  const headers = ['#', 'State Park Name', 'Miles from Subject', 'Annual Visitors'];
  const body = rows.map((r, i) => [
    String(i + 1),
    r.name,
    formatMilesLabel(r.distance_miles),
    formatVisitorCount(r.visitors),
  ]);
  const totalVisitors = sumVisitors(rows);
  if (rows.length > 0) {
    body.push(['', 'Total', '', formatVisitorCount(totalVisitors)]);
  }
  return { headers, body, totalVisitors };
}
