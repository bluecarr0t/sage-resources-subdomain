/**
 * API Route: List reports for current user
 * GET /api/admin/reports
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        clients (
          id,
          name,
          company
        )
      `)
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
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
}
