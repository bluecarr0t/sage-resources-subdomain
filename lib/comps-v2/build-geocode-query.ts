/**
 * Build a single-line address string for client-side preview geocoding on Comps v2.
 */
export function buildCompsV2GeocodeQuery(locationLine: string): string | null {
  const line = locationLine.trim();
  return line.length >= 3 ? line : null;
}
