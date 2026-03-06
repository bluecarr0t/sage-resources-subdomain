/**
 * API Route: List all clients (org-wide for internal Sage users)
 * GET /api/admin/clients
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';

export async function GET() {
  try {
    const supabase = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    const { data, error } = await supabase
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
}
