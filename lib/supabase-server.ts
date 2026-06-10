/**
 * Supabase server client for API routes and Server Components
 * Uses @supabase/ssr to read session from cookies
 * Use this when you need the current user's session (e.g., auth/status, protected API routes)
 */

import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

/**
 * Create a Supabase client that reads the session from cookies.
 * Use in API routes and Server Components when you need the authenticated user.
 */
export async function createServerClientWithCookies() {
  const cookieStore = await cookies();

  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore in Server Components
        }
      },
    },
  });
}

/**
 * Supabase client for Route Handlers that must persist auth cookies on the
 * response (e.g. signInWithOtp PKCE verifier). Pass the same `NextResponse` you
 * return from the handler so `setAll` writes Set-Cookie headers correctly.
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
}
