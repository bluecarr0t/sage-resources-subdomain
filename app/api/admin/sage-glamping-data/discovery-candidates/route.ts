/**
 * API Route: Discovery candidates (review queue)
 * GET: List candidates — query `status=pending` (default) or `status=approved`
 * POST: Approve or reject a candidate (body: { id, action: 'approve' | 'reject', rejectionReason?: string })
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

const CANDIDATES_TABLE = 'glamping_discovery_candidates';

export const GET = withAdminAuth(async (request) => {
  try {
    const raw = request.nextUrl.searchParams.get('status');
    const status = raw === 'approved' ? 'approved' : 'pending';

    const supabase = createServerClient();
    let query = supabase.from(CANDIDATES_TABLE).select('*').eq('status', status);
    query =
      status === 'approved'
        ? query.order('reviewed_at', { ascending: false, nullsFirst: false })
        : query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, candidates: [] });
      }
      console.error('[discovery-candidates] GET error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, candidates: data ?? [] });
  } catch (err) {
    console.error('[discovery-candidates] Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch candidates' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request) => {
  try {
    const body = await request.json();
    const { id, action, rejectionReason } = body as {
      id: string;
      action: 'approve' | 'reject';
      rejectionReason?: string;
    };
    if (!id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'id and action (approve|reject) required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: candidate, error: fetchError } = await supabase
      .from(CANDIDATES_TABLE)
      .select('*')
      .eq('id', id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json({ success: false, error: 'Candidate not found or already reviewed' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from(CANDIDATES_TABLE)
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason ?? candidate.rejection_reason,
          reviewed_at: now,
        })
        .eq('id', id);
      if (updateError) {
        console.error('[discovery-candidates] Reject error:', updateError);
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'rejected' });
    }

    if (action === 'approve') {
      const slugify = (name: string) =>
        name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      const row = {
        property_name: candidate.property_name,
        slug: slugify(candidate.property_name || ''),
        property_type: candidate.property_type ?? 'Glamping Resort',
        research_status: 'new',
        is_glamping_property: 'Yes',
        is_closed: 'No',
        source: 'Sage',
        discovery_source: candidate.discovery_source ?? 'Manual Article',
        date_added: now.split('T')[0],
        date_updated: now.split('T')[0],
        address: null,
        city: candidate.city ?? null,
        state: candidate.state ?? null,
        zip_code: null,
        country: candidate.country ?? 'USA',
        lat: null,
        lon: null,
        url: candidate.url ?? null,
        phone_number: null,
        description: candidate.description ?? null,
        unit_type: candidate.unit_type ?? null,
        quantity_of_units: candidate.number_of_units != null ? String(candidate.number_of_units) : null,
        year_site_opened: null,
        site_name: null,
      };

      const { error: insertError } = await supabase.from('all_glamping_properties').insert(row);
      if (insertError) {
        console.error('[discovery-candidates] Insert error:', insertError);
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      const { error: updateError } = await supabase
        .from(CANDIDATES_TABLE)
        .update({ status: 'approved', reviewed_at: now })
        .eq('id', id);
      if (updateError) {
        console.warn('[discovery-candidates] Approved but failed to update candidate status:', updateError);
      }
      return NextResponse.json({ success: true, action: 'approved' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[discovery-candidates] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to process' }, { status: 500 });
  }
});
