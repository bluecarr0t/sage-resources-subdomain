/**
 * @jest-environment node
 */

describe('website-slack-client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.WEBSITE_SLACK_ENABLED;
    delete process.env.WEBSITE_SLACK_CHANNEL_ID;
    delete process.env.WEBSITE_SLACK_WEBHOOK_URL;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('is disabled without WEBSITE_SLACK_ENABLED', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    process.env.WEBSITE_SLACK_CHANNEL_ID = 'C0BJZDM2C3D';
    const { isWebsiteSlackEnabled } = await import('@/lib/slack/website-slack-client');
    expect(isWebsiteSlackEnabled()).toBe(false);
  });

  it('is enabled with bot token + channel id', async () => {
    process.env.WEBSITE_SLACK_ENABLED = 'true';
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    process.env.WEBSITE_SLACK_CHANNEL_ID = 'C0BJZDM2C3D';
    const { isWebsiteSlackEnabled } = await import('@/lib/slack/website-slack-client');
    expect(isWebsiteSlackEnabled()).toBe(true);
  });

  it('builds a celebratory message with signup number', async () => {
    process.env.SITE_URL = 'https://resources.sageoutdooradvisory.com';
    const { buildMarketOverviewSignupSlackMessage } = await import(
      '@/lib/slack/website-slack-client'
    );

    const message = buildMarketOverviewSignupSlackMessage({
      signupNumber: 43,
      email: 'jane@example.com',
      name: 'Jane Doe',
    });

    expect(message.text).toContain('#43');
    expect(message.text).toContain('jane@example.com');
    expect(message.text).toContain('Jane Doe');
    expect(JSON.stringify(message.blocks)).toContain('Market Overview signup #43');
    expect(JSON.stringify(message.blocks)).toContain('Total verified emails: *43*');
  });

  it('builds a return sign-in message with visit count', async () => {
    process.env.SITE_URL = 'https://resources.sageoutdooradvisory.com';
    const { buildMarketOverviewReturnSigninSlackMessage } = await import(
      '@/lib/slack/website-slack-client'
    );

    const message = buildMarketOverviewReturnSigninSlackMessage({
      email: 'jane@example.com',
      name: 'Jane Doe',
      signInCount: 4,
      firstVerifiedAt: '2026-01-15T12:00:00.000Z',
      totalVerifiedEmails: 43,
    });

    expect(message.text).toContain('Return sign-in');
    expect(message.text).toContain('visit #4');
    expect(JSON.stringify(message.blocks)).toContain('return sign-in');
    expect(JSON.stringify(message.blocks)).toContain('sign-in *#4*');
    expect(JSON.stringify(message.blocks)).toContain('Total verified emails: *43*');
  });
});
