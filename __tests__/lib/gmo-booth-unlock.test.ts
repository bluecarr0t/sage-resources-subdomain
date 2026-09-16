/**
 * @jest-environment node
 */

import {
  GMO_BOOTH_UNLOCK_TTL_SEC,
  createGmoBoothUnlockToken,
  gmoBoothUnlockCookieOptions,
  verifyGmoBoothUnlockToken,
} from '@/lib/gmo-booth-unlock';

describe('gmo booth unlock token', () => {
  const originalSecret = process.env.GMO_BOOTH_UNLOCK_SECRET;
  const originalCron = process.env.CRON_SECRET;
  const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.GMO_BOOTH_UNLOCK_SECRET = 'booth-test-secret';
    delete process.env.CRON_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.GMO_BOOTH_UNLOCK_SECRET;
    else process.env.GMO_BOOTH_UNLOCK_SECRET = originalSecret;
    if (originalCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCron;
    if (originalService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalService;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('creates a token that verifies within the TTL', () => {
    const now = 1_700_000_000;
    const token = createGmoBoothUnlockToken(now);
    expect(token).toEqual(expect.any(String));
    expect(verifyGmoBoothUnlockToken(token, now + 60)).toEqual({
      remainingSec: GMO_BOOTH_UNLOCK_TTL_SEC - 60,
    });
  });

  it('rejects expired, tampered, and empty tokens', () => {
    const now = 1_700_000_000;
    const token = createGmoBoothUnlockToken(now);
    expect(verifyGmoBoothUnlockToken(token, now + GMO_BOOTH_UNLOCK_TTL_SEC + 1)).toBeNull();
    expect(verifyGmoBoothUnlockToken(`${token}x`, now)).toBeNull();
    expect(verifyGmoBoothUnlockToken('', now)).toBeNull();
    expect(verifyGmoBoothUnlockToken(null, now)).toBeNull();
  });

  it('returns null when no signing secret is configured', () => {
    delete process.env.GMO_BOOTH_UNLOCK_SECRET;
    expect(createGmoBoothUnlockToken()).toBeNull();
    expect(verifyGmoBoothUnlockToken('anything')).toBeNull();
  });

  it('sets an httpOnly cookie scoped to the Market Overview path', () => {
    process.env.NODE_ENV = 'production';
    expect(gmoBoothUnlockCookieOptions(1800)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/glamping-market-overview',
      maxAge: 1800,
    });
  });
});
