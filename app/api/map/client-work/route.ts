/**
 * Public map: past report pins for "Client Work" layer (no auth).
 * Same dedupe/coords/jitter as admin client map; response omits property/job fields.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { buildClientWorkMapPointsFromReportRows } from '@/lib/map/build-client-work-map-points';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.from('reports').select('*').is('deleted_at', null);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, points: [] });
      }
      console.error('[api/map/client-work]', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load client work' },
        { status: 500 }
      );
    }

    const points = buildClientWorkMapPointsFromReportRows((data || []) as Record<string, unknown>[]);

    return NextResponse.json(
      { success: true, points },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('[api/map/client-work]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load client work' },
      { status: 500 }
    );
  }
}
