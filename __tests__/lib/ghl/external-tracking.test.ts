import {
  isGhlExternalTrackingSkippedPath,
  shouldLoadGhlExternalTracking,
} from '@/lib/ghl/external-tracking';

describe('isGhlExternalTrackingSkippedPath', () => {
  it('skips job pipeline and other admin routes', () => {
    expect(isGhlExternalTrackingSkippedPath('/admin')).toBe(true);
    expect(isGhlExternalTrackingSkippedPath('/admin/job-pipeline')).toBe(true);
    expect(isGhlExternalTrackingSkippedPath('/admin/job-pipeline?sheet=2026')).toBe(
      true
    );
  });

  it('skips locale-prefixed admin paths', () => {
    expect(isGhlExternalTrackingSkippedPath('/en/admin/job-pipeline')).toBe(true);
  });

  it('does not skip public marketing pages', () => {
    expect(isGhlExternalTrackingSkippedPath('/glamping-market-overview')).toBe(
      false
    );
    expect(isGhlExternalTrackingSkippedPath('/en/map')).toBe(false);
    expect(isGhlExternalTrackingSkippedPath(null)).toBe(false);
  });
});

describe('shouldLoadGhlExternalTracking', () => {
  it('loads on production public pages', () => {
    expect(
      shouldLoadGhlExternalTracking('/en/map', {
        nodeEnv: 'production',
        vercelEnv: 'production',
      })
    ).toBe(true);
  });

  it('skips local development', () => {
    expect(
      shouldLoadGhlExternalTracking('/en/map', {
        nodeEnv: 'development',
        vercelEnv: null,
      })
    ).toBe(false);
  });

  it('skips Vercel preview', () => {
    expect(
      shouldLoadGhlExternalTracking('/en/map', {
        nodeEnv: 'production',
        vercelEnv: 'preview',
      })
    ).toBe(false);
  });

  it('skips admin', () => {
    expect(
      shouldLoadGhlExternalTracking('/admin/job-pipeline', {
        nodeEnv: 'production',
        vercelEnv: 'production',
      })
    ).toBe(false);
  });

  it('still loads on public pages when pathname is missing', () => {
    expect(
      shouldLoadGhlExternalTracking(null, {
        nodeEnv: 'production',
        vercelEnv: 'production',
      })
    ).toBe(true);
  });
});
