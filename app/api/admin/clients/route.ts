/**
 * API Route: List clients for current user
 * GET /api/admin/clients
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

export async function GET() {
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
      .from('clients')
      .select('id, name, company')
      .eq('user_id', session.user.id)
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
}
