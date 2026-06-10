/**
 * API Route: Get property markers for map (read-only from all_sage_data)
 * GET /api/admin/map/properties
 * Query params: property_type, unit_type, min_rate, max_rate, min_occupancy, max_occupancy, min_sites, max_sites, state, source[], north, south, east, west, limit
 *
 * Each marker includes `id` (all_sage_data.id) and optional `sage_hero_image_url`
 * when a row with kind `hero` exists in `glamping_property_images`.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const limitRaw = parseInt(searchParams.get('limit') || '1000', 10);
    const limit = Number.isNaN(limitRaw) || limitRaw < 1
      ? 1000
      : Math.min(limitRaw, 5000);
    const state = searchParams.get('state');
    const unitType = searchParams.get('unit_type');
    const minRate = searchParams.get('min_rate');
    const maxRate = searchParams.get('max_rate');

    const supabase = createServerClient();
    let query = supabase
      .from('all_sage_data')
      .select(
        'id, property_name, lat, lon, city, state, property_type, unit_type, avg__retail_daily_rate_2024, occupancy_rate_2024, property__total_sites'
      )
      .eq('is_glamping_property', 'Yes')
      .neq('is_open', 'Closed')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .limit(limit);

    if (state) query = query.eq('state', state);
    if (unitType) query = query.ilike('unit_type', `%${unitType}%`);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = data || [];
    const propertyIds = rows
      .map((p) => (p.id != null ? Number(p.id) : NaN))
      .filter((n) => Number.isFinite(n) && n > 0);

    const heroUrlByPropertyId = new Map<number, string>();
    if (propertyIds.length > 0) {
      const { data: heroRows, error: heroErr } = await supabase
        .from('glamping_property_images')
        .select('property_id, storage_bucket, storage_path')
        .eq('kind', 'hero')
        .in('property_id', propertyIds);

      if (heroErr) {
        console.warn('[api/admin/map/properties] hero images:', heroErr.message);
      } else {
        for (const h of heroRows ?? []) {
          const pid = Number((h as { property_id?: number }).property_id);
          if (!Number.isFinite(pid)) continue;
          const bucket = String((h as { storage_bucket?: string }).storage_bucket || 'glamping-media');
          const path = String((h as { storage_path?: string }).storage_path || '');
          if (!path) continue;
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          heroUrlByPropertyId.set(pid, pub.publicUrl);
        }
      }
    }

    let properties = rows
      .map((p) => {
        const rate =
          p.avg__retail_daily_rate_2024 != null ? Number(p.avg__retail_daily_rate_2024) : null;
        if (minRate && rate !== null && rate < parseFloat(minRate)) return null;
        if (maxRate && rate !== null && rate > parseFloat(maxRate)) return null;
        const pid = p.id != null ? Number(p.id) : NaN;
        return {
          id: Number.isFinite(pid) ? pid : null,
          property_name: p.property_name,
          lat: Number(p.lat),
          lon: Number(p.lon),
          city: p.city,
          state: p.state,
          property_type: p.property_type,
          unit_type: p.unit_type,
          avg_daily_rate: rate,
          occupancy_rate: p.occupancy_rate_2024 != null ? Number(p.occupancy_rate_2024) : null,
          total_sites: p.property__total_sites != null ? Number(p.property__total_sites) : null,
          source: 'Sage',
          marker_color: '#3b82f6',
          sage_hero_image_url:
            Number.isFinite(pid) && heroUrlByPropertyId.has(pid)
              ? heroUrlByPropertyId.get(pid) ?? null
              : null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      properties,
      total: properties.length,
    });
  } catch (err) {
    console.error('[api/admin/map/properties] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
});
