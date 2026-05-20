import { unstable_cache } from 'next/cache';
import { fetchPublicMapPropertyRows } from '@/lib/fetch-public-map-properties';
import { computeMapDisplayedPropertyCount } from '@/lib/map-displayed-property-count';

async function loadPublicMapDisplayedPropertyCount(): Promise<number> {
  const rows = await fetchPublicMapPropertyRows();
  return computeMapDisplayedPropertyCount(rows);
}

/**
 * Cached count matching the map sidebar (unique properties with coordinates, no filters).
 * Invalidates with the `properties` cache tag when property data changes.
 */
export function getPublicMapDisplayedPropertyCount(): Promise<number> {
  return unstable_cache(
    loadPublicMapDisplayedPropertyCount,
    ['public-map-displayed-property-count'],
    { revalidate: 1800, tags: ['properties'] }
  )();
}
