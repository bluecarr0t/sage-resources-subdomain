/**
 * POST /api/newsletter/subscribe
 *
 * Public endpoint that captures email newsletter signups into
 * `newsletter_subscribers` for Zapier → GoHighLevel sync.
 *
 * Security notes:
 * - Always returns generic `{ ok: true }` on success to avoid email enumeration.
 * - Rate limited per-email and per-IP via Upstash (fails open when not configured).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { limit } from '@/lib/upstash';
import {
  isValidEmail,
  normalizeNewsletterSource,
  parseNewsletterNameFields,
} from '@/lib/newsletter';
import { joinFullName } from '@/lib/person-name';
import { notifyZapierNewsletterSignup } from '@/lib/zapier-webhook';

export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; firstName?: unknown; lastName?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const source = normalizeNewsletterSource(body.source);
  const names = parseNewsletterNameFields(body);

  if (!names) {
    return NextResponse.json(
      { ok: false, error: 'Please enter your first and last name.' },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const [emailLimit, ipLimit] = await Promise.all([
    limit('newsletter_subscribe_email', email, 3, '1 h'),
    limit('newsletter_subscribe_ip', ip, 10, '1 h'),
  ]);
  if (!emailLimit.success || !ipLimit.success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { firstName, lastName } = names;

  try {
    const supabase = createServerClient();
    const now = new Date().toISOString();
    const row = {
      email,
      first_name: firstName,
      last_name: lastName,
      name: joinFullName(firstName, lastName),
      source,
      subscribed_at: now,
    };

    const { error } = await supabase.from('newsletter_subscribers').upsert(row, {
      onConflict: 'email',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error('[newsletter/subscribe] upsert failed:', error.message);
    } else {
      notifyZapierNewsletterSignup({
        email,
        first_name: firstName,
        last_name: lastName,
        source,
        subscribed_at: now,
      });
    }
  } catch (err) {
    console.error('[newsletter/subscribe] Unexpected error:', err);
  }

  return NextResponse.json({ ok: true });
}
