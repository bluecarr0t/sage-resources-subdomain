/**
 * API Route: Get current auth status
 * Returns authenticated user if session is valid and user is in managed_users
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
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error('[auth/status] Error:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
