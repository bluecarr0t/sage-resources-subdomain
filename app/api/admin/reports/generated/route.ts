/**
 * API Route: List only AI-generated reports (created via Report Builder)
 * GET /api/admin/reports/generated
 *
 * Filters to reports where enrichment_metadata IS NOT NULL,
 * which is only set by the generate-draft pipeline.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const GET = withAdminAuth(async (_request, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('reports')
      .select('id, title, property_name, location, address_1, city, state, market_type, total_sites, created_at, study_id, has_docx, has_xlsx, service, enrichment_metadata')
      .is('deleted_at', null)
      .not('enrichment_metadata', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, reports: [] });
      }
      throw error;
    }

    const reports = (data || []).map((r) => ({
      id: r.id,
      title: r.title,
      property_name: r.property_name,
      location: r.location,
      city: r.city,
      state: r.state,
      market_type: r.market_type,
      total_sites: r.total_sites,
      created_at: r.created_at,
      study_id: r.study_id ?? null,
      has_docx: r.has_docx ?? false,
      has_xlsx: r.has_xlsx ?? false,
      service: r.service ?? null,
    }));

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error('[api/admin/reports/generated] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch generated reports' },
      { status: 500 }
    );
  }
});
