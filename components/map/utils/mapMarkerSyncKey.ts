/** Stable key for map marker effects — avoids re-running when array reference changes but ids are unchanged. */
export function mapMarkerPropertySyncKey(
  properties: ReadonlyArray<{ id: string | number }>
): string {
  if (properties.length === 0) return '';
  return properties
    .map((p) => String(p.id))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join(',');
}
