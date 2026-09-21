import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { isValidEmail } from '@/lib/gated-access';
import { isClientPortalEnabled } from '@/lib/client-portal/is-enabled';
import { fetchEnabledClientPortalEngagementsForEmail } from '@/lib/client-portal/db';
import { sendClientPortalMagicLink } from '@/lib/client-portal/send-magic-link';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isClientPortalEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const engagements = await fetchEnabledClientPortalEngagementsForEmail(
    supabase,
    email
  );

  const response = NextResponse.json({ ok: true });
  if (engagements.length === 0) {
    return response;
  }

  const result = await sendClientPortalMagicLink({
    request,
    response,
    email,
    jobNumber: engagements.length === 1 ? engagements[0].jobNumber : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.message },
      { status: result.status }
    );
  }

  return response;
}
