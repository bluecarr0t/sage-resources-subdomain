/**
 * Columnar geo payload for `/api/admin/comps/unified/geo?format=cols`.
 * Same fields as tuple rows; typically smaller JSON than nested arrays.
 */
export interface GeoMapColumnarPayload {
  format: 'cols';
  sources: string[];
  lat: number[];
  lon: number[];
  si: number[];
  id: string[];
  name: string[];
  adr: Array<number | null>;
  web: Array<string | null>;
  sites: Array<number | null>;
  units: Array<number | null>;
  glamp: Array<0 | 1>;
  ut: Array<string | null>;
  study: Array<string | null>;
  year: Array<string | null>;
}

export type GeoMapTupleRow = [
  number,
  number,
  number,
  string,
  string,
  number | null,
  string | null,
  number | null,
  number | null,
  0 | 1,
  string | null,
  string | null,
  string | null,
];

export function buildGeoMapColumnarFromTuples(
  tuples: GeoMapTupleRow[],
  sources: string[]
): GeoMapColumnarPayload {
  const n = tuples.length;
  const lat: number[] = new Array(n);
  const lon: number[] = new Array(n);
  const si: number[] = new Array(n);
  const id: string[] = new Array(n);
  const name: string[] = new Array(n);
  const adr: Array<number | null> = new Array(n);
  const web: Array<string | null> = new Array(n);
  const sites: Array<number | null> = new Array(n);
  const units: Array<number | null> = new Array(n);
  const glamp: Array<0 | 1> = new Array(n);
  const ut: Array<string | null> = new Array(n);
  const study: Array<string | null> = new Array(n);
  const year: Array<string | null> = new Array(n);

  for (let i = 0; i < n; i++) {
    const t = tuples[i];
    lat[i] = t[0];
    lon[i] = t[1];
    si[i] = t[2];
    id[i] = t[3];
    name[i] = t[4];
    adr[i] = t[5];
    web[i] = t[6];
    sites[i] = t[7];
    units[i] = t[8];
    glamp[i] = t[9];
    ut[i] = t[10] ?? null;
    study[i] = t[11] ?? null;
    year[i] = t[12] ?? null;
  }

  return { format: 'cols', sources, lat, lon, si, id, name, adr, web, sites, units, glamp, ut, study, year };
}

export function geoMapColumnarRowCount(payload: GeoMapColumnarPayload): number {
  return payload.lat.length;
}

export function isGeoMapColumnarPayload(v: unknown): v is GeoMapColumnarPayload {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return o.format === 'cols' && Array.isArray(o.lat) && Array.isArray(o.lon);
}
