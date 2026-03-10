/**
 * Fetch anchors (ski resorts or national parks) from Supabase
 */

import type { Anchor } from './types';
import { parseCoord } from './utils';

import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchAnchors(
  supabase: SupabaseClient,
  isNationalParks: boolean
): Promise<Anchor[]> {
  const anchors: Anchor[] = [];

  if (isNationalParks) {
    const { data: parkRows, error: parkError } = await supabase
      .from('national-parks')
      .select('id, name, latitude, longitude, slug')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (parkError) throw parkError;
    for (const r of parkRows || []) {
      const lat = parseCoord(r.latitude);
      const lon = parseCoord(r.longitude);
      if (lat !== null && lon !== null && r.name) {
        anchors.push({
          id: r.id,
          name: r.name,
          lat,
          lon,
          slug: r.slug ? String(r.slug).trim() : undefined,
        });
      }
    }
  } else {
    const { data: skiRows, error: skiError } = await supabase
      .from('ski_resorts')
      .select('id, name, lat, lon')
      .not('lat', 'is', null)
      .not('lon', 'is', null);

    if (skiError) throw skiError;
    for (const r of skiRows || []) {
      const lat = parseCoord(r.lat);
      const lon = parseCoord(r.lon);
      if (lat !== null && lon !== null && r.name) {
        anchors.push({ id: r.id, name: r.name, lat, lon });
      }
    }
  }

  return anchors;
}
