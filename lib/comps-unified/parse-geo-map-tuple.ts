import { decodeGeoMapUnitTypes } from '@/lib/comps-unified/geo-map-unit-types';

/** Parsed fields from `/api/admin/comps/unified/geo` point tuples (variable length for deploy skew). */
export interface ParsedGeoMapPoint {
  lat: number;
  lon: number;
  sourceIdx: number;
  id: string;
  name: string;
  avgAdr: number | null;
  website: string | null;
  totalSites: number | null;
  numUnits: number | null;
  isGlamping1: unknown;
  unitTypes: string[];
  studyId: string | null;
  reportYear: string | null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

export function parseGeoMapTuple(tuple: unknown[]): ParsedGeoMapPoint {
  const unitTypesEncoded = tuple.length > 10 ? tuple[10] : null;
  return {
    lat: Number(tuple[0]),
    lon: Number(tuple[1]),
    sourceIdx: Number(tuple[2]),
    id: String(tuple[3] ?? ''),
    name: String(tuple[4] ?? ''),
    avgAdr: tuple[5] != null && Number.isFinite(Number(tuple[5])) ? Number(tuple[5]) : null,
    website: strOrNull(tuple[6]),
    totalSites:
      tuple[7] != null && Number.isFinite(Number(tuple[7])) ? Number(tuple[7]) : null,
    numUnits:
      tuple[8] != null && Number.isFinite(Number(tuple[8])) ? Number(tuple[8]) : null,
    isGlamping1: tuple[9],
    unitTypes: decodeGeoMapUnitTypes(strOrNull(unitTypesEncoded)),
    studyId: tuple.length > 11 ? strOrNull(tuple[11]) : null,
    reportYear: tuple.length > 12 ? strOrNull(tuple[12]) : null,
  };
}
