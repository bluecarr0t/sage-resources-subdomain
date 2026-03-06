/**
 * API Route: Logout
 * Signs out the user and clears server-side session cookies.
 * Supabase SSR signOut() clears auth cookies via the cookie middleware.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClientWithCookies } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createServerClientWithCookies();
    await supabase.auth.signOut();
    return NextResponse.json({
      success: true,
      redirect: '/login',
    });
  } catch (error) {
    console.error('[auth/logout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
