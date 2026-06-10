/**
 * Shared helpers for Supabase magic-link gated content pages (e.g.
 * `/glamping-market-overview`). Keeps slug constants, redirect builders, and
 * the session predicate in one place so the request API, auth callback, and
 * the server-side layout gate stay in sync.
 *
 * Active admin users (`managed_users` + allowed domain) bypass the gate via
 * `checkGatedPageAccess`; everyone else needs a magic-link lead row.
 */

export const GATED_PAGE_GLAMPING_MARKET_OVERVIEW = 'glamping-market-overview';

/** Every slug we currently gate, mapped to the path it unlocks. */
const GATED_PAGE_PATHS: Record<string, string> = {
  [GATED_PAGE_GLAMPING_MARKET_OVERVIEW]: '/glamping-market-overview',
};

export type GatedPageSlug = keyof typeof GATED_PAGE_PATHS;

/** True when `slug` corresponds to a known gated page. */
export function isGatedPageSlug(slug: unknown): slug is GatedPageSlug {
  return typeof slug === 'string' && slug in GATED_PAGE_PATHS;
}

/**
 * Resolve a slug to its destination path. Falls back to the glamping market
 * overview page for unknown slugs so we never produce an invalid redirect.
 */
export function getGatedPageRedirectPath(slug: string | null | undefined): string {
  if (isGatedPageSlug(slug)) return GATED_PAGE_PATHS[slug];
  return GATED_PAGE_PATHS[GATED_PAGE_GLAMPING_MARKET_OVERVIEW];
}

/** Strip a trailing locale segment from a site origin (misconfigured Site URL). */
export function normalizeAuthSiteOrigin(origin: string): string {
  const trimmed = origin.replace(/\/+$/, '');
  for (const locale of ['en', 'es', 'fr', 'de'] as const) {
    if (trimmed.endsWith(`/${locale}`)) {
      return trimmed.slice(0, -(locale.length + 1));
    }
  }
  return trimmed;
}

/**
 * Build the `emailRedirectTo` URL for `signInWithOtp`. Supabase sends the user
 * to `/auth/callback` with a `code`; we tack on `redirect` so the callback
 * knows which gated page to unlock after exchanging the code.
 */
export function buildMagicLinkRedirectUrl(origin: string, pageSlug: string): string {
  const normalizedOrigin = normalizeAuthSiteOrigin(origin);
  const destination = getGatedPageRedirectPath(pageSlug);
  const params = new URLSearchParams({ redirect: destination });
  return `${normalizedOrigin}/auth/callback?${params.toString()}`;
}

/**
 * When Supabase Site URL is set to `/{locale}` (or `emailRedirectTo` is not
 * allowlisted), magic links land as `/{locale}?code=…`. Rewrite to our callback.
 */
export function relocateAuthCodeToCallbackUrl(url: URL): URL | null {
  const code = url.searchParams.get('code');
  if (!code || url.pathname === '/auth/callback' || url.pathname.startsWith('/auth/callback/')) {
    return null;
  }
  const next = new URL(url);
  next.pathname = '/auth/callback';
  if (!next.searchParams.has('redirect')) {
    next.searchParams.set('redirect', getGatedPageRedirectPath(null));
  }
  return next;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lightweight email shape check (server-side validation, not deliverability). */
export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export const GATED_ACCESS_NAME_MIN_LENGTH = 2;

/** True when the client is requesting a returning-user (email-only) sign-in link. */
export function isEmailOnlyGatedRequest(emailOnly: unknown): boolean {
  return emailOnly === true || emailOnly === 'true';
}

/**
 * Supabase may return these when `shouldCreateUser: false` but the address has
 * never completed the lead form — retry with `shouldCreateUser: true`.
 */
export function isOtpUserMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('user not found') ||
    lower.includes('signup') ||
    lower.includes('sign up') ||
    lower.includes('not registered') ||
    lower.includes('no user')
  );
}

const SUPABASE_OTP_COOLDOWN_REGEX = /only request this after (\d+) second/i;

/** Seconds until Supabase allows another OTP send (short per-address cooldown). */
export function parseSupabaseOtpCooldownSeconds(message: string): number | null {
  const match = message.match(SUPABASE_OTP_COOLDOWN_REGEX);
  if (!match) return null;
  const seconds = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Supabase Auth hourly / project email cap (not the short between-request cooldown). */
export function isSupabaseOtpHourlyRateLimitError(message: string): boolean {
  if (parseSupabaseOtpCooldownSeconds(message) !== null) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('too many requests')
  );
}

/** Supabase Auth rejected the OTP/magic-link send (hourly cap or short cooldown). */
export function isSupabaseOtpRateLimitError(message: string): boolean {
  return (
    parseSupabaseOtpCooldownSeconds(message) !== null ||
    isSupabaseOtpHourlyRateLimitError(message)
  );
}

const HOURLY_OTP_RATE_LIMIT_MESSAGE =
  'Too many sign-in emails were requested recently. Please wait about an hour, or check your inbox (and spam) for an earlier link.';

/** User-facing copy for Supabase OTP throttling; null when the error is unrelated. */
export function formatGatedAccessOtpErrorMessage(message: string): string | null {
  const cooldownSeconds = parseSupabaseOtpCooldownSeconds(message);
  if (cooldownSeconds !== null) {
    if (cooldownSeconds <= 60) {
      return `Please wait ${cooldownSeconds} seconds before requesting another sign-in link. Check your inbox (and spam) for an earlier link.`;
    }
    const minutes = Math.ceil(cooldownSeconds / 60);
    return `Please wait about ${minutes} minute${minutes === 1 ? '' : 's'} before requesting another sign-in link. Check your inbox (and spam) for an earlier link.`;
  }
  if (isSupabaseOtpHourlyRateLimitError(message)) {
    return HOURLY_OTP_RATE_LIMIT_MESSAGE;
  }
  return null;
}
