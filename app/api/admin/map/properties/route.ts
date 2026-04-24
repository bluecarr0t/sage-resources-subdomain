/**
 * API Route: Get property markers for map (read-only from all_glamping_properties)
 * GET /api/admin/map/properties
 * Query params: property_type, unit_type, min_rate, max_rate, min_occupancy, max_occupancy, min_sites, max_sites, state, source[], north, south, east, west, limit
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';

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
      .from('all_glamping_properties')
      .select('property_name, lat, lon, city, state, property_type, unit_type, avg__retail_daily_rate_2024, occupancy_rate_2024, property__total_sites')
      .eq('is_glamping_property', 'Yes')
      .neq('is_open', 'No')
      .eq('research_status', 'published')
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .limit(limit);

    if (state) query = query.eq('state', state);
    if (unitType) query = query.ilike('unit_type', `%${unitType}%`);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    let properties = (data || []).map((p) => {
      const rate = p.avg__retail_daily_rate_2024 != null ? Number(p.avg__retail_daily_rate_2024) : null;
      if (minRate && rate !== null && rate < parseFloat(minRate)) return null;
      if (maxRate && rate !== null && rate > parseFloat(maxRate)) return null;
      return {
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
      };
    }).filter(Boolean);

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
