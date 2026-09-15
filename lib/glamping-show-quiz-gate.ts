/**
 * Booth PIN gate for the unlisted Glamping Show quiz.
 * When GLAMPING_SHOW_QUIZ_PIN is unset the gate is off (local tests).
 */

import { createHmac, timingSafeEqual } from 'crypto';

export const GLAMPING_SHOW_QUIZ_PIN_COOKIE = 'glamping_show_quiz_booth';

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 14;

export function getGlampingShowQuizPin(): string | null {
  const pin = process.env.GLAMPING_SHOW_QUIZ_PIN?.trim();
  return pin ? pin : null;
}

export function isGlampingShowQuizGateEnabled(): boolean {
  return getGlampingShowQuizPin() !== null;
}

function equalSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function pinMatches(candidate: unknown): boolean {
  const expected = getGlampingShowQuizPin();
  if (!expected) return true;
  if (typeof candidate !== 'string') return false;
  const got = candidate.trim();
  if (!got) return false;
  return equalSecret(got, expected);
}

export function boothCookieValue(): string | null {
  const pin = getGlampingShowQuizPin();
  if (!pin) return null;
  return createHmac('sha256', pin).update('glamping-show-quiz-booth').digest('hex');
}

export function cookieMatches(value: string | undefined | null): boolean {
  if (!isGlampingShowQuizGateEnabled()) return true;
  const expected = boothCookieValue();
  if (!expected || !value) return false;
  return equalSecret(value, expected);
}

export function boothCookieOptions(): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
  };
}
