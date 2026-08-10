/**
 * API Route: Missing-fields breakdown for admin dashboard
 * GET /api/admin/sage-glamping-data/missing-fields
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('get_missing_fields_breakdown');

    if (error) {
      console.error('[api/admin/sage-glamping-data/missing-fields] RPC error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      breakdown: {
        total_count: Number(data?.total_count ?? 0),
        missing_site_name: Number(data?.missing_site_name ?? 0),
        missing_rate_avg_retail_daily_rate: Number(
          data?.missing_rate_avg_retail_daily_rate ?? 0
        ),
        missing_unit_type: Number(data?.missing_unit_type ?? 0),
        missing_unit_private_bathroom: Number(
          data?.missing_unit_private_bathroom ?? 0
        ),
        missing_url: Number(data?.missing_url ?? 0),
        missing_description: Number(data?.missing_description ?? 0),
      },
    });
  } catch (err) {
    console.error('[api/admin/sage-glamping-data/missing-fields] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch missing-fields breakdown' },
      { status: 500 }
    );
  }
});
