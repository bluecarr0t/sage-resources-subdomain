/**
 * Short-lived HMAC token so a Glamping Show quiz QR can open the gated
 * Market Overview on the visitor’s phone without a magic-link session.
 * TTL is 30 minutes. Email still carries a lasting magic link.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export const GMO_BOOTH_UNLOCK_COOKIE = 'gmo_booth_unlock';
export const GMO_BOOTH_UNLOCK_TTL_SEC = 30 * 60;
export const GMO_BOOTH_UNLOCK_OPEN_PATH =
  '/api/glamping-show-quiz/open-market-overview';

type BoothUnlockClaims = {
  exp: number;
};

function boothUnlockSecret(): string | null {
  const candidates = [
    process.env.GMO_BOOTH_UNLOCK_SECRET,
    process.env.CRON_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function equalSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function encodeToken(claims: BoothUnlockClaims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString(
    'base64url'
  );
  return `${payload}.${signPayload(payload, secret)}`;
}

export function createGmoBoothUnlockToken(
  nowSec: number = Math.floor(Date.now() / 1000)
): string | null {
  const secret = boothUnlockSecret();
  if (!secret) return null;
  return encodeToken({ exp: nowSec + GMO_BOOTH_UNLOCK_TTL_SEC }, secret);
}

export function verifyGmoBoothUnlockToken(
  token: string | null | undefined,
  nowSec: number = Math.floor(Date.now() / 1000)
): { remainingSec: number } | null {
  if (!token || typeof token !== 'string') return null;
  const secret = boothUnlockSecret();
  if (!secret) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!equalSecret(signPayload(payload, secret), signature)) return null;

  let claims: BoothUnlockClaims;
  try {
    claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as BoothUnlockClaims;
  } catch {
    return null;
  }
  if (!Number.isFinite(claims.exp) || claims.exp <= nowSec) return null;
  return { remainingSec: Math.max(1, Math.floor(claims.exp - nowSec)) };
}

export function gmoBoothUnlockCookieOptions(maxAgeSec: number): {
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
    path: '/glamping-market-overview',
    maxAge: maxAgeSec,
  };
}
