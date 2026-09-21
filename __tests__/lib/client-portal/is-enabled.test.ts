import { isClientPortalEnabled } from '@/lib/client-portal/is-enabled';

describe('isClientPortalEnabled', () => {
  it('is always off in production', () => {
    expect(
      isClientPortalEnabled({
        VERCEL_ENV: 'production',
        NODE_ENV: 'development',
        ENABLE_CLIENT_PORTAL: 'true',
      })
    ).toBe(false);
  });

  it('is on by default in local development', () => {
    expect(
      isClientPortalEnabled({
        NODE_ENV: 'development',
      })
    ).toBe(true);
  });

  it('can be forced off locally', () => {
    expect(
      isClientPortalEnabled({
        NODE_ENV: 'development',
        ENABLE_CLIENT_PORTAL: 'false',
      })
    ).toBe(false);
  });

  it('is off in preview unless explicitly enabled', () => {
    expect(
      isClientPortalEnabled({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
      })
    ).toBe(false);
    expect(
      isClientPortalEnabled({
        NODE_ENV: 'production',
        VERCEL_ENV: 'preview',
        ENABLE_CLIENT_PORTAL: 'true',
      })
    ).toBe(true);
  });
});
