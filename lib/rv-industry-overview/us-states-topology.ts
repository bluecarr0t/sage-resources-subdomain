/**
 * US states TopoJSON for react-simple-maps. Inlined after first fetch so html2canvas
 * can rasterize maps without cross-origin taint from cdn.jsdelivr.net.
 */

export const US_STATES_TOPO_URL =
  'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

let cachedTopology: object | null = null;
let fetchPromise: Promise<object> | null = null;

export async function fetchUsStatesTopology(): Promise<object> {
  if (cachedTopology) return cachedTopology;
  if (!fetchPromise) {
    fetchPromise = fetch(US_STATES_TOPO_URL, { cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load US states topology (${res.status})`);
        return res.json() as Promise<object>;
      })
      .then((topo) => {
        cachedTopology = topo;
        return topo;
      });
  }
  return fetchPromise;
}

export type UsStatesGeographySource = string | object;

/** URL until fetched, then embedded TopoJSON object. */
export async function resolveUsStatesGeography(): Promise<UsStatesGeographySource> {
  return fetchUsStatesTopology();
}
