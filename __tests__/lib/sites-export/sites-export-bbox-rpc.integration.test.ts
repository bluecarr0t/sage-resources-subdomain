/**
 * Live Supabase smoke test for sites_export_campspot_bbox_ids / sites_export_hipcamp_bbox_ids
 * after migrations. Skips when NEXT_PUBLIC_SUPABASE_URL and service key are unset.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getBoundingBox } from '@/lib/comps-v2/geo';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? '';
const runLive = Boolean(url && key);

const describeLive = runLive ? describe : describe.skip;

function extractIds(data: unknown): number[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      if (typeof row === 'number' && Number.isFinite(row)) return row;
      if (row && typeof row === 'object' && 'id' in row) {
        const n = Number((row as { id: unknown }).id);
        return Number.isFinite(n) ? n : NaN;
      }
      return NaN;
    })
    .filter((n) => Number.isFinite(n));
}

describeLive('sites export bbox RPCs (live Supabase)', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(url!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  /** Northern California box — should hit indexed lat/lon without scanning the world. */
  const bb = getBoundingBox(41.423, -122.384, 50);

  it('sites_export_campspot_bbox_ids succeeds and returns at most p_limit rows', async () => {
    const { data, error } = await supabase.rpc('sites_export_campspot_bbox_ids', {
      p_min_lat: bb.minLat,
      p_max_lat: bb.maxLat,
      p_min_lng: bb.minLng,
      p_max_lng: bb.maxLng,
      p_after: 0,
      p_limit: 5,
      p_countries: null,
      p_states: null,
      p_unit_types: null,
    });
    expect(error).toBeNull();
    expect(data).toBeDefined();
    const ids = extractIds(data);
    expect(ids.length).toBeLessThanOrEqual(5);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it('sites_export_campspot_bbox_ids pages with p_after', async () => {
    const { data: first, error: e1 } = await supabase.rpc('sites_export_campspot_bbox_ids', {
      p_min_lat: bb.minLat,
      p_max_lat: bb.maxLat,
      p_min_lng: bb.minLng,
      p_max_lng: bb.maxLng,
      p_after: 0,
      p_limit: 3,
      p_countries: null,
      p_states: null,
      p_unit_types: null,
    });
    expect(e1).toBeNull();
    const ids1 = extractIds(first);
    if (ids1.length === 0) return;

    const lastId = Math.max(...ids1);
    const { data: second, error: e2 } = await supabase.rpc('sites_export_campspot_bbox_ids', {
      p_min_lat: bb.minLat,
      p_max_lat: bb.maxLat,
      p_min_lng: bb.minLng,
      p_max_lng: bb.maxLng,
      p_after: lastId,
      p_limit: 3,
      p_countries: null,
      p_states: null,
      p_unit_types: null,
    });
    expect(e2).toBeNull();
    for (const id of extractIds(second)) {
      expect(id).toBeGreaterThan(lastId);
    }
  });

  it('sites_export_hipcamp_bbox_ids succeeds and returns at most p_limit rows', async () => {
    const { data, error } = await supabase.rpc('sites_export_hipcamp_bbox_ids', {
      p_min_lat: bb.minLat,
      p_max_lat: bb.maxLat,
      p_min_lng: bb.minLng,
      p_max_lng: bb.maxLng,
      p_after: 0,
      p_limit: 5,
      p_countries: null,
      p_states: null,
      p_unit_types: null,
    });
    expect(error).toBeNull();
    expect(data).toBeDefined();
    const ids = extractIds(data);
    expect(ids.length).toBeLessThanOrEqual(5);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});
