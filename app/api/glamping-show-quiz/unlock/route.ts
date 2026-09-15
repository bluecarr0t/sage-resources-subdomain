/**
 * POST unlocks the booth quiz with a PIN. GET ?pin= does the same and redirects.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GLAMPING_SHOW_QUIZ_PIN_COOKIE,
  boothCookieOptions,
  boothCookieValue,
  pinMatches,
} from '@/lib/glamping-show-quiz-gate';
import { GLAMPING_SHOW_QUIZ_PATH } from '@/lib/glamping-show-quiz';

export const dynamic = 'force-dynamic';

function quizUrl(request: NextRequest): URL {
  return new URL(GLAMPING_SHOW_QUIZ_PATH, request.url);
}

function unlockedRedirect(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(quizUrl(request));
  const value = boothCookieValue();
  if (value) {
    response.cookies.set(GLAMPING_SHOW_QUIZ_PIN_COOKIE, value, boothCookieOptions());
  }
  return response;
}

export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get('pin');
  if (!pinMatches(pin)) {
    return NextResponse.redirect(quizUrl(request));
  }
  return unlockedRedirect(request);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!pinMatches(body.pin)) {
    return NextResponse.json(
      { ok: false, error: 'That PIN is not valid.' },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ ok: true });
  const value = boothCookieValue();
  if (value) {
    response.cookies.set(GLAMPING_SHOW_QUIZ_PIN_COOKIE, value, boothCookieOptions());
  }
  return response;
}
