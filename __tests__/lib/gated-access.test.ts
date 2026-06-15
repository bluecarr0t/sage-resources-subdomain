import {
  GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  GATED_PAGE_PIPELINE_QUARTERLY,
  buildMagicLinkRedirectUrl,
  getGatedPageRedirectPath,
  isGatedPageSlug,
  isEmailOnlyGatedRequest,
  formatGatedAccessOtpErrorMessage,
  isOtpUserMissingError,
  isSupabaseOtpHourlyRateLimitError,
  isSupabaseOtpRateLimitError,
  parseSupabaseOtpCooldownSeconds,
  isValidEmail,
  normalizeAuthSiteOrigin,
  relocateAuthCodeToCallbackUrl,
} from '@/lib/gated-access';

describe('gated-access helpers', () => {
  describe('isGatedPageSlug', () => {
    it('recognizes gated page slugs', () => {
      expect(isGatedPageSlug(GATED_PAGE_GLAMPING_MARKET_OVERVIEW)).toBe(true);
      expect(isGatedPageSlug(GATED_PAGE_PIPELINE_QUARTERLY)).toBe(true);
    });

    it('rejects unknown slugs and nullish values', () => {
      expect(isGatedPageSlug('something-else')).toBe(false);
      expect(isGatedPageSlug(null)).toBe(false);
      expect(isGatedPageSlug(undefined)).toBe(false);
    });
  });

  describe('getGatedPageRedirectPath', () => {
    it('maps the known slug to its path', () => {
      expect(getGatedPageRedirectPath(GATED_PAGE_GLAMPING_MARKET_OVERVIEW)).toBe(
        '/glamping-market-overview'
      );
    });

    it('falls back to the overview path for unknown slugs', () => {
      expect(getGatedPageRedirectPath('nope')).toBe('/glamping-market-overview');
      expect(getGatedPageRedirectPath(null)).toBe('/glamping-market-overview');
    });
  });

  describe('buildMagicLinkRedirectUrl', () => {
    it('builds a callback URL with an encoded redirect param', () => {
      const url = buildMagicLinkRedirectUrl(
        'https://example.com',
        GATED_PAGE_GLAMPING_MARKET_OVERVIEW
      );
      expect(url).toBe(
        'https://example.com/auth/callback?redirect=%2Fglamping-market-overview'
      );
    });

    it('strips trailing slashes from the origin', () => {
      const url = buildMagicLinkRedirectUrl(
        'https://example.com///',
        GATED_PAGE_GLAMPING_MARKET_OVERVIEW
      );
      expect(url.startsWith('https://example.com/auth/callback')).toBe(true);
    });

    it('strips a trailing locale from a misconfigured origin', () => {
      const url = buildMagicLinkRedirectUrl(
        'https://resources.sageoutdooradvisory.com/en',
        GATED_PAGE_GLAMPING_MARKET_OVERVIEW
      );
      expect(url).toBe(
        'https://resources.sageoutdooradvisory.com/auth/callback?redirect=%2Fglamping-market-overview'
      );
    });

    it('uses the fallback path for unknown slugs', () => {
      const url = buildMagicLinkRedirectUrl('https://example.com', 'bogus');
      expect(url).toContain('redirect=%2Fglamping-market-overview');
    });
  });

  describe('normalizeAuthSiteOrigin', () => {
    it('removes trailing /en from the origin', () => {
      expect(normalizeAuthSiteOrigin('https://resources.sageoutdooradvisory.com/en')).toBe(
        'https://resources.sageoutdooradvisory.com'
      );
    });
  });

  describe('relocateAuthCodeToCallbackUrl', () => {
    it('rewrites /en?code=… to /auth/callback with redirect', () => {
      const input = new URL(
        'https://resources.sageoutdooradvisory.com/en?code=9b35882a-3804-4b03-b559-bf0b57a6b948'
      );
      const out = relocateAuthCodeToCallbackUrl(input);
      expect(out?.pathname).toBe('/auth/callback');
      expect(out?.searchParams.get('code')).toBe('9b35882a-3804-4b03-b559-bf0b57a6b948');
      expect(out?.searchParams.get('redirect')).toBe('/glamping-market-overview');
    });

    it('returns null when already on /auth/callback', () => {
      const input = new URL(
        'https://resources.sageoutdooradvisory.com/auth/callback?code=abc&redirect=%2Fglamping-market-overview'
      );
      expect(relocateAuthCodeToCallbackUrl(input)).toBeNull();
    });
  });

  describe('isEmailOnlyGatedRequest', () => {
    it('accepts boolean true and string "true"', () => {
      expect(isEmailOnlyGatedRequest(true)).toBe(true);
      expect(isEmailOnlyGatedRequest('true')).toBe(true);
    });

    it('rejects falsey and other values', () => {
      expect(isEmailOnlyGatedRequest(false)).toBe(false);
      expect(isEmailOnlyGatedRequest('false')).toBe(false);
      expect(isEmailOnlyGatedRequest(undefined)).toBe(false);
    });
  });

  describe('isOtpUserMissingError', () => {
    it('detects user-not-found style messages', () => {
      expect(isOtpUserMissingError('User not found')).toBe(true);
      expect(isOtpUserMissingError('Signups not allowed for otp')).toBe(true);
    });
  });

  describe('parseSupabaseOtpCooldownSeconds', () => {
    it('extracts the cooldown interval from Supabase messages', () => {
      expect(
        parseSupabaseOtpCooldownSeconds(
          'For security purposes, you can only request this after 35 seconds.'
        )
      ).toBe(35);
      expect(parseSupabaseOtpCooldownSeconds('429: email rate limit exceeded')).toBeNull();
    });
  });

  describe('isSupabaseOtpRateLimitError', () => {
    it('detects Supabase OTP email rate limits and cooldowns', () => {
      expect(isSupabaseOtpRateLimitError('429: email rate limit exceeded')).toBe(true);
      expect(
        isSupabaseOtpRateLimitError(
          'For security purposes, you can only request this after 35 seconds.'
        )
      ).toBe(true);
      expect(isSupabaseOtpRateLimitError('unexpected')).toBe(false);
    });

    it('treats cooldown separately from hourly caps', () => {
      expect(
        isSupabaseOtpHourlyRateLimitError(
          'For security purposes, you can only request this after 35 seconds.'
        )
      ).toBe(false);
      expect(isSupabaseOtpHourlyRateLimitError('429: email rate limit exceeded')).toBe(true);
    });
  });

  describe('formatGatedAccessOtpErrorMessage', () => {
    it('shows seconds for short cooldowns instead of the hourly message', () => {
      expect(
        formatGatedAccessOtpErrorMessage(
          'For security purposes, you can only request this after 35 seconds.'
        )
      ).toMatch(/35 seconds/i);
      expect(
        formatGatedAccessOtpErrorMessage('429: email rate limit exceeded')
      ).toMatch(/about an hour/i);
      expect(formatGatedAccessOtpErrorMessage('unexpected')).toBeNull();
    });
  });

  describe('isValidEmail', () => {
    it.each(['a@b.co', 'jane.doe@company.io', 'x+tag@sub.domain.com'])(
      'accepts %s',
      (email) => {
        expect(isValidEmail(email)).toBe(true);
      }
    );

    it.each(['', 'no-at', 'missing@domain', 'spaces in@email.com', '@nolocal.com'])(
      'rejects %s',
      (email) => {
        expect(isValidEmail(email)).toBe(false);
      }
    );
  });
});
