/**
 * POST /api/glamping-show-quiz/submit
 *
 * Booth quiz lead capture. Persists the full response in Supabase, then awaits
 * a GoHighLevel contact upsert (stage/service/timeline/outcome tags). Optionally
 * records a newsletter signup.
 *
 * Rate limits are generous per IP (shared tablet at the show) and stricter
 * per email. The result screen is returned only after the Supabase row exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { limit } from '@/lib/upstash';
import { isValidEmail } from '@/lib/gated-access';
import { joinFullName, parsePersonNameFields } from '@/lib/person-name';
import { notifyZapierNewsletterSignup } from '@/lib/zapier-webhook';
import { upsertGhlGlampingShowQuizContact } from '@/lib/ghl/glamping-show-quiz-contact';
import {
  insertGlampingShowQuizResponse,
  markGlampingShowQuizGhlSync,
} from '@/lib/glamping-show-quiz-responses';
import {
  GLAMPING_SHOW_QUIZ_SOURCE,
  parseQuizAnswers,
  parseQuizCompany,
  parseQuizPhone,
  parseQuizRegion,
  resolveQuizOutcome,
} from '@/lib/glamping-show-quiz';
import {
  GLAMPING_SHOW_QUIZ_PIN_COOKIE,
  cookieMatches,
} from '@/lib/glamping-show-quiz-gate';

export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function isNewsletterOptIn(value: unknown): boolean {
  return value === true || value === 'true';
}

function ghlErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return 'Unknown GHL sync error';
}

export async function POST(request: NextRequest) {
  if (!cookieMatches(request.cookies.get(GLAMPING_SHOW_QUIZ_PIN_COOKIE)?.value)) {
    return NextResponse.json(
      { ok: false, error: 'This quiz is for the Sage booth.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const answers = parseQuizAnswers(body);
  if (!answers) {
    return NextResponse.json(
      { ok: false, error: 'Please answer all four questions.' },
      { status: 400 }
    );
  }

  const names = parsePersonNameFields(body);
  if (!names) {
    return NextResponse.json(
      { ok: false, error: 'Please enter your first and last name.' },
      { status: 400 }
    );
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  const company = parseQuizCompany(body.company);
  if (company === null) {
    return NextResponse.json(
      { ok: false, error: 'Please enter your company or project name.' },
      { status: 400 }
    );
  }

  const region = parseQuizRegion(body.region);
  if (!region) {
    return NextResponse.json(
      { ok: false, error: 'Please select your project state or region.' },
      { status: 400 }
    );
  }

  const newsletterOptIn = isNewsletterOptIn(body.newsletterOptIn);
  const outcome = resolveQuizOutcome(answers);

  const phone = parseQuizPhone(body.phone);
  if (phone === null) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Please enter a phone number so we can follow up.',
      },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const [emailLimit, ipLimit] = await Promise.all([
    limit('glamping_show_quiz_email', email, 5, '1 h'),
    limit('glamping_show_quiz_ip', ip, 120, '1 h'),
  ]);
  if (!emailLimit.success || !ipLimit.success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const saved = await insertGlampingShowQuizResponse({
    email,
    firstName: names.firstName,
    lastName: names.lastName,
    company,
    region,
    phone,
    answers,
    outcome,
    newsletterOptIn,
  });
  if (!saved) {
    return NextResponse.json(
      { ok: false, error: 'Could not save your response. Please try again.' },
      { status: 500 }
    );
  }

  try {
    const ghl = await upsertGhlGlampingShowQuizContact({
      email,
      firstName: names.firstName,
      lastName: names.lastName,
      company,
      region,
      ...(phone ? { phone } : {}),
      answers,
      outcome,
    });
    if (ghl.status === 'skipped') {
      console.error(
        '[glamping-show-quiz] GHL sync skipped (missing GHL_TOKEN or GHL_LOCATION_ID)'
      );
      await markGlampingShowQuizGhlSync(saved.id, 'skipped', {
        error: 'Missing GHL_TOKEN or GHL_LOCATION_ID',
      });
    } else {
      await markGlampingShowQuizGhlSync(saved.id, ghl.status, {
        contactId: ghl.contactId,
      });
    }
  } catch (err) {
    console.error('[ghl] Failed to sync Glamping Show quiz contact:', err);
    await markGlampingShowQuizGhlSync(saved.id, 'failed', {
      error: ghlErrorMessage(err),
    });
  }

  if (newsletterOptIn) {
    const now = new Date().toISOString();
    try {
      const supabase = createServerClient();
      const { error } = await supabase.from('newsletter_subscribers').upsert(
        {
          email,
          first_name: names.firstName,
          last_name: names.lastName,
          name: joinFullName(names.firstName, names.lastName),
          source: GLAMPING_SHOW_QUIZ_SOURCE,
          subscribed_at: now,
        },
        { onConflict: 'email', ignoreDuplicates: false }
      );
      if (error) {
        console.error('[glamping-show-quiz] newsletter upsert failed:', error.message);
      } else {
        notifyZapierNewsletterSignup({
          email,
          first_name: names.firstName,
          last_name: names.lastName,
          source: GLAMPING_SHOW_QUIZ_SOURCE,
          subscribed_at: now,
        });
      }
    } catch (err) {
      console.error('[glamping-show-quiz] newsletter signup failed:', err);
    }
  }

  return NextResponse.json({ ok: true, outcome });
}
