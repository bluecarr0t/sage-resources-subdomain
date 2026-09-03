import {
  shouldLoadGhlExternalTracking,
} from '@/lib/ghl/external-tracking';

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
});
