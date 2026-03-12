/**
 * API Route: Campspot ADR and occupancy benchmarks
 * GET /api/admin/site-design/campspot-premiums
 *
 * Query params: state (optional, e.g. NY, AZ)
 * Returns: { pullThru: { adr, occupancy, count }, backIn: { adr, occupancy, count } }
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { fetchCampspotPremiums } from '@/lib/site-design/campspot-premiums';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const stateFilter = searchParams.get('state')?.trim().toUpperCase() || null;

    const supabase = createServerClient();
    const result = await fetchCampspotPremiums(supabase, stateFilter);

    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'No Campspot data available',
      });
    }

    const hasData = result.pullThru.count > 0 || result.backIn.count > 0;
    if (!hasData) {
      return NextResponse.json({
        success: false,
        message: 'No Campspot data available',
      });
    }

    return NextResponse.json({
      success: true,
      pullThru: result.pullThru,
      backIn: result.backIn,
    });
  } catch (err) {
    console.error('[site-design/campspot-premiums] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to load Campspot data' },
      { status: 500 }
    );
  }
});
