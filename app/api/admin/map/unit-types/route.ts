/**
 * API Route: Get distinct unit types for filter dropdown
 * GET /api/admin/map/unit-types
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';

export async function GET() {
  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('unit_type')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .not('unit_type', 'is', null);

    if (error) throw error;

    const types = new Set<string>();
    (data || []).forEach((r) => {
      const t = String(r.unit_type || '').trim();
      if (t) types.add(t);
    });

    const unit_types = Array.from(types).sort();

    return NextResponse.json({
      success: true,
      unit_types,
    });
  } catch (err) {
    console.error('[api/admin/map/unit-types] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unit types' },
      { status: 500 }
    );
  }
}
