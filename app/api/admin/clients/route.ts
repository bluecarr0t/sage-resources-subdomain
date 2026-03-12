/**
 * API Route: List all clients (org-wide for internal Sage users)
 * GET /api/admin/clients
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const GET = withAdminAuth(async (_request, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('clients')
      .select('id, name, company')
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, clients: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, clients: data || [] });
  } catch (err) {
    console.error('[api/admin/clients] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
});
