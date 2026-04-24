import type { NextRequest } from 'next/server';

/**
 * Authorize a Vercel Cron (or manual) invocation when `CRON_SECRET` is set.
 *
 * Vercel normally sends `Authorization: Bearer <CRON_SECRET>` for scheduled crons.
 * In some edge cases the header can be missing; scheduled invocations may still
 * include `x-vercel-cron: 1` or a `vercel-cron` user-agent — accept those so
 * the job still runs (see Vercel cron docs / community patterns).
 *
 * When `CRON_SECRET` is unset, returns true (same as previous open behavior).
 */
export function authorizeVercelCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  if (request.headers.get('x-vercel-cron') === '1') return true;

  const ua = request.headers.get('user-agent') ?? '';
  if (ua.includes('vercel-cron')) return true;

  return false;
}
