/**
 * Zip + mile-radius export: verifies SQL bbox RPC is used for Campspot/Hipcamp and Haversine
 * drops rows outside the circle (rectangle from RPC can be wider than the mile radius).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getBoundingBox } from '@/lib/comps-v2/geo';
import { runSitesExportCount } from '@/lib/sites-export/run-export';
import type { SitesExportParsed } from '@/lib/sites-export/types';

jest.mock('@/lib/redis', () => ({
  setCache: jest.fn().mockResolvedValue(true),
  getCache: jest.fn(),
}));

const CENTER_96094 = { lat: 41.423, lng: -122.384 };

function parsedZip200mi(over?: Partial<SitesExportParsed>): SitesExportParsed {
  return {
    sources: ['campspot'],
    countries: [],
    states: [],
    unitTypes: [],
    zip: '96094',
    radiusMiles: 200,
    format: 'csv',
    centerLat: CENTER_96094.lat,
    centerLng: CENTER_96094.lng,
    radiusMilesResolved: 200,
    ...over,
  };
}

/** Minimal row shape for count scan + site expansion. */
function row(
  id: number,
  lat: string,
  lon: string,
  quantity: string = '1'
): Record<string, unknown> {
  return {
    id,
    lat,
    lon,
    quantity_of_units: quantity,
    property_total_sites: null,
  };
}

function createCampspotZipMock(rowsById: Record<number, Record<string, unknown>>): SupabaseClient {
  const rpc = jest.fn(async (fn: string, args: Record<string, unknown>) => {
    expect(fn).toBe('sites_export_campspot_bbox_ids');
    const after = Number(args.p_after ?? 0);
    const ids = Object.keys(rowsById)
      .map(Number)
      .filter((id) => id > after)
      .sort((a, b) => a - b)
      .slice(0, 3);
    return {
      data: ids.map((id) => ({ id })),
      error: null,
    };
  });

  const from = jest.fn(() => ({
    select: (_cols: string) => ({
      in: async (_col: string, ids: number[]) => {
        const data = ids.map((id) => rowsById[id]).filter(Boolean);
        return { data, error: null };
      },
    }),
  }));

  return { rpc, from } as unknown as SupabaseClient;
}

describe('zip + mile radius sites export (Campspot)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls bbox RPC with Haversine-sized rectangle around geocoded center', async () => {
    const rowsById: Record<number, Record<string, unknown>> = {
      1: row(1, '41.5', '-122.45'),
    };
    const client = createCampspotZipMock(rowsById);
    const p = parsedZip200mi();
    const bb = getBoundingBox(p.centerLat!, p.centerLng!, 200);

    const result = await runSitesExportCount(client, p, 'test-user-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.count).toBe(1);

    expect(client.rpc).toHaveBeenCalled();
    const [, args] = (client.rpc as jest.Mock).mock.calls[0] as [string, Record<string, unknown>];
    expect(args.p_min_lat).toBeCloseTo(bb.minLat, 5);
    expect(args.p_max_lat).toBeCloseTo(bb.maxLat, 5);
    expect(args.p_min_lng).toBeCloseTo(bb.minLng, 5);
    expect(args.p_max_lng).toBeCloseTo(bb.maxLng, 5);
    expect(args.p_limit).toBeGreaterThan(0);
    expect(args.p_countries).toBeNull();
    expect(args.p_states).toBeNull();
    expect(args.p_unit_types).toBeNull();
  });

  it('excludes rows returned inside SQL bbox but outside mile radius (Haversine)', async () => {
    const rowsById: Record<number, Record<string, unknown>> = {
      10: row(10, '41.5', '-122.45'),
      20: row(20, '29.0', '-95.0'),
    };
    const client = createCampspotZipMock(rowsById);
    const result = await runSitesExportCount(client, parsedZip200mi(), 'u1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.count).toBe(1);
  });

  it('parses RPC rows when PostgREST returns bare numeric ids (not { id } objects)', async () => {
    const rpc = jest.fn(async () => ({
      data: [101, 102],
      error: null,
    }));
    const from = jest.fn(() => ({
      select: () => ({
        in: async (_c: string, ids: number[]) => {
          const data = ids.map((id) => row(id, '41.5', '-122.45'));
          return { data, error: null };
        },
      }),
    }));
    const client = { rpc, from } as unknown as SupabaseClient;
    const result = await runSitesExportCount(client, parsedZip200mi(), 'u1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.count).toBe(2);
  });

  it('applies unit_type filter args to RPC when unit types selected', async () => {
    const rowsById: Record<number, Record<string, unknown>> = {
      1: { ...row(1, '41.5', '-122.45'), unit_type: 'RV Site' },
    };
    const client = createCampspotZipMock(rowsById);
    const p = parsedZip200mi({ unitTypes: ['RV Site'] });
    await runSitesExportCount(client, p, 'u1');

    const [, args] = (client.rpc as jest.Mock).mock.calls[0] as [string, Record<string, unknown>];
    expect(args.p_unit_types).toEqual(expect.arrayContaining(['RV Site', 'RV Sites']));
  });
});
