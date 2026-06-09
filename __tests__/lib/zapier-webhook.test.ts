/**
 * @jest-environment node
 */

const mockFetch = jest.fn();

describe('zapier-webhook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('posts first_name and last_name for newsletter signups', async () => {
    process.env.ZAPIER_NEWSLETTER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/test/';

    const { notifyZapierNewsletterSignup } = await import('@/lib/zapier-webhook');
    notifyZapierNewsletterSignup({
      email: 'jane@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      source: 'footer',
      subscribed_at: '2026-06-05T20:00:00.000Z',
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.zapier.com/hooks/catch/test/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          lead_type: 'newsletter',
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Doe',
          name: 'Jane Doe',
          source: 'footer',
          subscribed_at: '2026-06-05T20:00:00.000Z',
        }),
      })
    );
  });

  it('splits full name for gated content leads', async () => {
    process.env.ZAPIER_GATED_LEAD_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/gated/';

    const { notifyZapierGatedLead } = await import('@/lib/zapier-webhook');
    notifyZapierGatedLead({
      email: 'jane@example.com',
      name: 'Jane Marie Doe',
      page_slug: 'glamping-market-overview',
      verified_at: '2026-06-05T20:00:00.000Z',
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.zapier.com/hooks/catch/gated/',
      expect.objectContaining({
        body: JSON.stringify({
          lead_type: 'gated_content',
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Marie Doe',
          name: 'Jane Marie Doe',
          page_slug: 'glamping-market-overview',
          verified_at: '2026-06-05T20:00:00.000Z',
        }),
      })
    );
  });
});
