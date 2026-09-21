/**
 * @jest-environment node
 */

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('client-portal-resend', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips send unless CLIENT_PORTAL_EMAIL_ENABLED is true', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.CLIENT_PORTAL_EMAIL_ENABLED = 'false';
    process.env.PIPELINE_EMAIL_ENABLED = 'true';

    const { sendClientPortalEmail } = await import(
      '@/lib/email/client-portal-resend'
    );
    await sendClientPortalEmail({
      to: 'client@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends as Sage Outdoor Advisory when enabled', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.CLIENT_PORTAL_EMAIL_ENABLED = 'true';
    process.env.RESEND_FROM_EMAIL = 'active-jobs@alerts.sageoutdooradvisory.com';

    const { sendClientPortalEmail } = await import(
      '@/lib/email/client-portal-resend'
    );
    await sendClientPortalEmail({
      to: 'client@example.com',
      subject: 'Update',
      html: '<p>Updated</p>',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Sage Outdoor Advisory <active-jobs@alerts.sageoutdooradvisory.com>',
        to: ['client@example.com'],
        subject: 'Update',
      })
    );
  });
});
