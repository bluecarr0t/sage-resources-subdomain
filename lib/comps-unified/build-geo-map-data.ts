import type { PointFeature } from 'supercluster';
import { CompsMapRadiusSpatialIndex } from '@/lib/comps-unified/comps-map-radius-index';
import type { CompsMapGeoPointRow, CompsMapLeafProps } from '@/lib/comps-unified/comps-map-types';
import {
  isGeoMapColumnarPayload,
  type GeoMapColumnarPayload,
} from '@/lib/comps-unified/geo-map-columnar';
import { parseGeoMapTuple } from '@/lib/comps-unified/parse-geo-map-tuple';

export function isGlampingFromGeoTupleFlag(flag: unknown): boolean {
  if (flag === 0) return false;
  if (flag === 1) return true;
  return true;
}

function leafFromParsed(p: ReturnType<typeof parseGeoMapTuple>): CompsMapLeafProps {
  return {
    id: p.id,
    name: p.name,
    sourceIdx: p.sourceIdx,
    avgAdr: p.avgAdr,
    website: p.website,
    totalSites: p.totalSites,
    numUnits: p.numUnits,
    isGlamping: isGlampingFromGeoTupleFlag(p.isGlamping1),
    unitTypes: p.unitTypes,
    studyId: p.studyId,
    reportYear: p.reportYear,
  };
}

function buildFromParsedRows(
  parsed: ReturnType<typeof parseGeoMapTuple>[]
): {
  features: Array<PointFeature<CompsMapLeafProps>>;
  allGeoPoints: CompsMapGeoPointRow[];
  radiusIndex: CompsMapRadiusSpatialIndex;
} {
  const n = parsed.length;
  const features: Array<PointFeature<CompsMapLeafProps>> = new Array(n);
  const allGeoPoints: CompsMapGeoPointRow[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const p = parsed[i];
    const leaf = leafFromParsed(p);
    features[i] = {
      type: 'Feature',
      properties: leaf,
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    };
    allGeoPoints[i] = { lat: p.lat, lng: p.lon, leaf };
  }

  return {
    features,
    allGeoPoints,
    radiusIndex: CompsMapRadiusSpatialIndex.fromGeoRows(allGeoPoints),
  };
}

/** Single pass over geo tuples — avoids duplicate parseGeoMapTuple work on load. */
export function buildGeoMapDataFromTuples(tuples: unknown[][]): {
  features: Array<PointFeature<CompsMapLeafProps>>;
  allGeoPoints: CompsMapGeoPointRow[];
  radiusIndex: CompsMapRadiusSpatialIndex;
} {
  const parsed = tuples.map((tuple) => parseGeoMapTuple(tuple as unknown[]));
  return buildFromParsedRows(parsed);
}

/** Decode columnar geo payload (`?format=cols`) into map + radius structures. */
export function buildGeoMapDataFromColumnar(cols: GeoMapColumnarPayload): {
  features: Array<PointFeature<CompsMapLeafProps>>;
  allGeoPoints: CompsMapGeoPointRow[];
  radiusIndex: CompsMapRadiusSpatialIndex;
} {
  const n = cols.lat.length;
  const parsed: ReturnType<typeof parseGeoMapTuple>[] = new Array(n);
  for (let i = 0; i < n; i++) {
    parsed[i] = parseGeoMapTuple([
      cols.lat[i],
      cols.lon[i],
      cols.si[i],
      cols.id[i],
      cols.name[i],
      cols.adr[i],
      cols.web[i],
      cols.sites[i],
      cols.units[i],
      cols.glamp[i],
      cols.ut[i],
      cols.study[i],
      cols.year[i],
    ]);
  }
  return buildFromParsedRows(parsed);
}

export type BuiltGeoMapData = {
  features: Array<PointFeature<CompsMapLeafProps>>;
  allGeoPoints: CompsMapGeoPointRow[];
  radiusIndex: CompsMapRadiusSpatialIndex;
};

/** Append columnar format for smaller repeat filter payloads. */
export function geoMapQueryWithColumnarFormat(queryString: string): string {
  const params = new URLSearchParams(queryString);
  params.set('format', 'cols');
  return params.toString();
}

/** Tuple or columnar JSON body from `/api/admin/comps/unified/geo`. */
export function buildGeoMapDataFromApiBody(body: unknown): BuiltGeoMapData {
  if (isGeoMapColumnarPayload(body)) {
    return buildGeoMapDataFromColumnar(body);
  }
  const points = (body as { points?: unknown[][] })?.points;
  if (!Array.isArray(points)) {
    throw new Error('Invalid geo response: missing points or columnar arrays');
  }
  return buildGeoMapDataFromTuples(points);
}
