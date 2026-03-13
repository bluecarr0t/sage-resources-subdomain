/**
 * API Route: List all reports (org-wide for internal Sage users)
 * GET /api/admin/reports
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const GET = withAdminAuth(async (_request, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('reports')
      .select(`
        *,
        clients (
          id,
          name,
          company
        )
      `)
      .is('deleted_at', null)
      .is('enrichment_metadata', null)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          uploads: [],
          message: 'Reports table not yet created',
        });
      }
      throw error;
    }

    const uploads = (data || []).map((r) => {
      const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
      return {
        id: r.id,
        title: r.title,
        property_name: r.property_name,
        location: r.location,
        address_1: r.address_1,
        city: r.city,
        state: r.state,
        market_type: r.market_type,
        total_sites: r.total_sites,
        status: 'completed',
        created_at: r.created_at,
        dropbox_url: r.dropbox_url,
        client_id: r.client_id ?? null,
        client_name: client?.name ?? null,
        client_company: client?.company ?? null,
        study_id: r.study_id ?? null,
        executive_summary: r.executive_summary ?? null,
        has_docx: r.has_docx ?? false,
        has_comparables: r.has_comparables ?? false,
        report_date: r.report_date ?? null,
        service: r.service ?? null,
      };
    });

    return NextResponse.json({ success: true, uploads });
  } catch (error) {
    console.error('[api/admin/reports] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
});
