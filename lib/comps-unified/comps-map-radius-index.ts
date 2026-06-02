import { distanceMiles } from '@/lib/geo/haversine';
import type { CompsMapGeoPointRow } from '@/lib/comps-unified/comps-map-types';

/** ~17 mi per cell at mid-latitudes — balances index size vs candidate set. */
export const COMPS_MAP_RADIUS_CELL_DEG = 0.25;

const MILES_PER_DEG_LAT = 69;

export interface CompsMapRadiusStats {
  count: number;
  sumUnits: number;
  sumSites: number;
  avgAdr: number | null;
  bySource: Record<string, number>;
}

export interface CompsMapRadiusExportRow {
  id: string;
  name: string;
  sourceKey: string;
}

interface RadiusPoint {
  lat: number;
  lng: number;
  sourceIdx: number;
  totalSites: number | null;
  numUnits: number | null;
  avgAdr: number | null;
  isGlamping: boolean;
  id: string;
  name: string;
}

function cellKey(lat: number, lng: number, cellDeg = COMPS_MAP_RADIUS_CELL_DEG): string {
  return `${Math.floor(lat / cellDeg)}:${Math.floor(lng / cellDeg)}`;
}

function milesToLatDelta(miles: number): number {
  return miles / MILES_PER_DEG_LAT;
}

function milesToLngDelta(miles: number, lat: number): number {
  const cos = Math.cos((lat * Math.PI) / 180);
  return miles / (MILES_PER_DEG_LAT * Math.max(cos, 0.01));
}

function emptyStats(): CompsMapRadiusStats {
  return { count: 0, sumUnits: 0, sumSites: 0, avgAdr: null, bySource: {} };
}

/**
 * Uniform grid index for O(cells + candidates) radius queries over geocoded comps.
 */
export class CompsMapRadiusSpatialIndex {
  private readonly points: RadiusPoint[];
  private readonly cells: Map<string, number[]>;

  private constructor(points: RadiusPoint[], cells: Map<string, number[]>) {
    this.points = points;
    this.cells = cells;
  }

  static fromGeoRows(rows: CompsMapGeoPointRow[]): CompsMapRadiusSpatialIndex {
    const points: RadiusPoint[] = [];
    const cells = new Map<string, number[]>();

    for (const row of rows) {
      if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue;
      const idx = points.length;
      points.push({
        lat: row.lat,
        lng: row.lng,
        sourceIdx: row.leaf.sourceIdx,
        totalSites: row.leaf.totalSites,
        numUnits: row.leaf.numUnits,
        avgAdr: row.leaf.avgAdr,
        isGlamping: row.leaf.isGlamping,
        id: row.leaf.id,
        name: row.leaf.name,
      });
      const key = cellKey(row.lat, row.lng);
      const bucket = cells.get(key);
      if (bucket) bucket.push(idx);
      else cells.set(key, [idx]);
    }

    return new CompsMapRadiusSpatialIndex(points, cells);
  }

  get size(): number {
    return this.points.length;
  }

  query(
    centerLat: number,
    centerLng: number,
    radiusMiles: number,
    sourceKeys: string[]
  ): CompsMapRadiusStats {
    if (radiusMiles <= 0 || this.points.length === 0) return emptyStats();

    const dLat = milesToLatDelta(radiusMiles) * 1.02;
    const dLng = milesToLngDelta(radiusMiles, centerLat) * 1.02;
    const latMin = centerLat - dLat;
    const latMax = centerLat + dLat;
    const lngMin = centerLng - dLng;
    const lngMax = centerLng + dLng;

    const latCellMin = Math.floor(latMin / COMPS_MAP_RADIUS_CELL_DEG);
    const latCellMax = Math.floor(latMax / COMPS_MAP_RADIUS_CELL_DEG);
    const lngCellMin = Math.floor(lngMin / COMPS_MAP_RADIUS_CELL_DEG);
    const lngCellMax = Math.floor(lngMax / COMPS_MAP_RADIUS_CELL_DEG);

    let count = 0;
    let sumUnits = 0;
    let sumSites = 0;
    let adrSum = 0;
    let adrCount = 0;
    const bySource: Record<string, number> = {};

    for (let latCell = latCellMin; latCell <= latCellMax; latCell++) {
      for (let lngCell = lngCellMin; lngCell <= lngCellMax; lngCell++) {
        const bucket = this.cells.get(`${latCell}:${lngCell}`);
        if (!bucket) continue;
        for (const i of bucket) {
          const p = this.points[i];
          if (p.lat < latMin || p.lat > latMax || p.lng < lngMin || p.lng > lngMax) continue;
          const d = distanceMiles(centerLat, centerLng, p.lat, p.lng);
          if (d > radiusMiles) continue;

          count += 1;
          if (p.isGlamping && p.numUnits != null && Number.isFinite(p.numUnits)) {
            sumUnits += p.numUnits;
          }
          if (p.totalSites != null && Number.isFinite(p.totalSites)) {
            sumSites += p.totalSites;
          }
          if (p.avgAdr != null && Number.isFinite(p.avgAdr)) {
            adrSum += p.avgAdr;
            adrCount += 1;
          }
          const srcKey = sourceKeys[p.sourceIdx] ?? 'unknown';
          bySource[srcKey] = (bySource[srcKey] ?? 0) + 1;
        }
      }
    }

    return {
      count,
      sumUnits,
      sumSites,
      avgAdr: adrCount > 0 ? adrSum / adrCount : null,
      bySource,
    };
  }

  exportRowsInRadius(
    centerLat: number,
    centerLng: number,
    radiusMiles: number,
    sourceKeys: string[]
  ): CompsMapRadiusExportRow[] {
    if (radiusMiles <= 0 || this.points.length === 0) return [];

    const dLat = milesToLatDelta(radiusMiles) * 1.02;
    const dLng = milesToLngDelta(radiusMiles, centerLat) * 1.02;
    const latMin = centerLat - dLat;
    const latMax = centerLat + dLat;
    const lngMin = centerLng - dLng;
    const lngMax = centerLng + dLng;

    const latCellMin = Math.floor(latMin / COMPS_MAP_RADIUS_CELL_DEG);
    const latCellMax = Math.floor(latMax / COMPS_MAP_RADIUS_CELL_DEG);
    const lngCellMin = Math.floor(lngMin / COMPS_MAP_RADIUS_CELL_DEG);
    const lngCellMax = Math.floor(lngMax / COMPS_MAP_RADIUS_CELL_DEG);

    const out: CompsMapRadiusExportRow[] = [];

    for (let latCell = latCellMin; latCell <= latCellMax; latCell++) {
      for (let lngCell = lngCellMin; lngCell <= lngCellMax; lngCell++) {
        const bucket = this.cells.get(`${latCell}:${lngCell}`);
        if (!bucket) continue;
        for (const i of bucket) {
          const p = this.points[i];
          if (p.lat < latMin || p.lat > latMax || p.lng < lngMin || p.lng > lngMax) continue;
          if (distanceMiles(centerLat, centerLng, p.lat, p.lng) > radiusMiles) continue;
          out.push({
            id: p.id,
            name: p.name,
            sourceKey: sourceKeys[p.sourceIdx] ?? '',
          });
        }
      }
    }

    return out;
  }
}
