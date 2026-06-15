/**
 * @jest-environment node
 */

const mockInsert = jest.fn();

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'gated_content_access_events') {
        return { insert: (...args: unknown[]) => mockInsert(...args) };
      }
      return {};
    },
  })),
}));

import { logGatedContentEvent } from '@/lib/gated-content-events';

describe('logGatedContentEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('inserts a normalized form_submit event', async () => {
    await logGatedContentEvent({
      eventType: 'form_submit',
      email: 'Jane@Example.com',
      pageSlug: 'glamping-market-overview',
      metadata: { email_only: true },
    });

    expect(mockInsert).toHaveBeenCalledWith({
      event_type: 'form_submit',
      email: 'jane@example.com',
      page_slug: 'glamping-market-overview',
      user_id: null,
      metadata: { email_only: true },
    });
  });

  it('inserts auth_verified with user_id and name metadata', async () => {
    await logGatedContentEvent({
      eventType: 'auth_verified',
      email: 'jane@example.com',
      pageSlug: 'outdoor-hospitality-pipeline',
      userId: 'user-123',
      metadata: { name: 'Jane Doe' },
    });

    expect(mockInsert).toHaveBeenCalledWith({
      event_type: 'auth_verified',
      email: 'jane@example.com',
      page_slug: 'outdoor-hospitality-pipeline',
      user_id: 'user-123',
      metadata: { name: 'Jane Doe' },
    });
  });

  it('skips insert for unknown page slugs', async () => {
    await logGatedContentEvent({
      eventType: 'form_submit',
      email: 'jane@example.com',
      pageSlug: 'not-a-gated-page',
    });

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('skips insert for blank email', async () => {
    await logGatedContentEvent({
      eventType: 'form_submit',
      email: '   ',
      pageSlug: 'glamping-market-overview',
    });

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('logs and does not throw when insert fails', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'db down' } });

    await expect(
      logGatedContentEvent({
        eventType: 'form_submit',
        email: 'jane@example.com',
        pageSlug: 'glamping-market-overview',
      })
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      '[gated-content-events] insert failed:',
      'db down'
    );
  });
});
