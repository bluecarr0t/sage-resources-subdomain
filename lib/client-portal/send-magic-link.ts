import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server';
import {
  buildMagicLinkRedirectUrl,
  formatGatedAccessOtpErrorMessage,
  GATED_PAGE_CLIENT_PORTAL,
  normalizeAuthSiteOrigin,
} from '@/lib/gated-access';
import { clientPortalJobPath } from '@/lib/client-portal/sanitize';

type OtpClient = {
  auth: {
    signInWithOtp: (args: {
      email: string;
      options: {
        shouldCreateUser: boolean;
        data: Record<string, string>;
        emailRedirectTo: string;
      };
    }) => Promise<{ error: { message: string } | null }>;
  };
};

export function getClientPortalRequestOrigin(request: NextRequest): string {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (envOrigin) return normalizeAuthSiteOrigin(envOrigin);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) {
    return normalizeAuthSiteOrigin(`${forwardedProto}://${forwardedHost}`);
  }
  return normalizeAuthSiteOrigin(new URL(request.url).origin);
}

export function buildClientPortalMagicLinkRedirectUrl(
  origin: string,
  jobNumber?: string
): string {
  if (jobNumber?.trim()) {
    const params = new URLSearchParams({
      redirect: clientPortalJobPath(jobNumber),
    });
    return `${normalizeAuthSiteOrigin(origin)}/auth/callback?${params.toString()}`;
  }
  return buildMagicLinkRedirectUrl(origin, GATED_PAGE_CLIENT_PORTAL);
}

function createIsolatedAuthClient(): OtpClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function sendOtp(input: {
  supabase: OtpClient;
  email: string;
  emailRedirectTo: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const { error } = await input.supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: true,
      data: { gated_page: GATED_PAGE_CLIENT_PORTAL },
      emailRedirectTo: input.emailRedirectTo,
    },
  });

  if (!error) return { ok: true };

  console.error('[client-portal] signInWithOtp failed:', error.message);
  const otpErrorMessage = formatGatedAccessOtpErrorMessage(error.message);
  if (otpErrorMessage) {
    return { ok: false, message: otpErrorMessage, status: 429 };
  }
  return { ok: true };
}

/** Visitor login: cookie client so PKCE verifier is stored if Supabase uses it. */
export async function sendClientPortalMagicLink(input: {
  request: NextRequest;
  response: NextResponse;
  email: string;
  jobNumber?: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const supabase = createSupabaseRouteHandlerClient(input.request, input.response);
  await supabase.auth.signOut();
  return sendOtp({
    supabase,
    email: input.email,
    emailRedirectTo: buildClientPortalMagicLinkRedirectUrl(
      getClientPortalRequestOrigin(input.request),
      input.jobNumber
    ),
  });
}

/** Staff-triggered invite: never touch the admin session cookies. */
export async function sendClientPortalMagicLinkIsolated(input: {
  origin: string;
  email: string;
  jobNumber?: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const supabase = createIsolatedAuthClient();
  return sendOtp({
    supabase,
    email: input.email,
    emailRedirectTo: buildClientPortalMagicLinkRedirectUrl(input.origin, input.jobNumber),
  });
}
