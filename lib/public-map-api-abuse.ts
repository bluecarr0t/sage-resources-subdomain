/**
 * Abuse tracking for public map JSON APIs.
 *
 * When an IP is rate-limited on /api/properties or /api/google-places we count
 * the offense in Redis. Once an IP crosses the ban threshold it is added to a
 * "candidate" set, which the /api/cron/ban-abusive-ips cron drains into the
 * Vercel Firewall IP block list.
 *
 * Hot path stays cheap (a single INCR + occasional SADD); the slower Vercel API
 * calls are batched in the cron, off the request path.
 */

import {
  addToSet,
  getSetMembers,
  incrementCounterWithTtl,
  removeFromSet,
  setIfNotExists,
} from '@/lib/redis';

const OFFENSE_KEY_PREFIX = 'public_map_api:abuse:offenses:';
const CANDIDATE_SET_KEY = 'public_map_api:abuse:candidates';
const BANNED_KEY_PREFIX = 'public_map_api:abuse:banned:';

/** Offense counter window. Repeated rate-limit hits within this window accumulate. */
const OFFENSE_TTL_SECONDS = 60 * 60; // 1 hour

/** Banned-marker TTL — prevents re-submitting the same IP to Vercel for a while. */
const BANNED_MARKER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function parseIntEnv(name: string, defaultValue: number, min: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw === '' ? defaultValue : Number(raw);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.max(min, Math.floor(n));
}

/** Offenses (rate-limit hits) before an IP becomes a ban candidate. */
export function getAbuseBanThreshold(): number {
  return parseIntEnv('PUBLIC_MAP_API_ABUSE_BAN_THRESHOLD', 10, 1);
}

/** Master switch — auto-ban is opt-in so it never fires unexpectedly. */
export function isAutoBanEnabled(): boolean {
  return process.env.PUBLIC_MAP_API_AUTO_BAN_ENABLED === 'true';
}

/**
 * Record one abusive (rate-limited) request from `ip`.
 * Returns the running offense count, or null if not tracked (Redis off / unknown IP).
 */
export async function recordPublicMapApiAbuse(ip: string): Promise<number | null> {
  if (!ip || ip === 'unknown') return null;

  const count = await incrementCounterWithTtl(
    `${OFFENSE_KEY_PREFIX}${ip}`,
    OFFENSE_TTL_SECONDS
  );
  if (count === null) return null;

  if (count >= getAbuseBanThreshold()) {
    await addToSet(CANDIDATE_SET_KEY, ip);
  }

  return count;
}

/** IPs that have crossed the ban threshold and await firewall promotion. */
export async function getAbuseCandidateIps(): Promise<string[]> {
  return getSetMembers(CANDIDATE_SET_KEY);
}

/** Remove an IP from the candidate set (after a successful ban or manual clear). */
export async function clearAbuseCandidate(ip: string): Promise<void> {
  await removeFromSet(CANDIDATE_SET_KEY, ip);
}

/**
 * Atomically claim an IP for banning. Returns true only for the first caller,
 * so concurrent cron runs don't double-submit the same IP to Vercel.
 */
export async function claimIpForBan(ip: string): Promise<boolean> {
  return setIfNotExists(
    `${BANNED_KEY_PREFIX}${ip}`,
    String(Date.now()),
    BANNED_MARKER_TTL_SECONDS
  );
}
