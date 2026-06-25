/**
 * @jest-environment node
 */

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('resend-client', () => {
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

  it('skips send when pipeline email is disabled', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.PIPELINE_EMAIL_ENABLED = 'false';

    const { sendPipelineEmail } = await import('@/lib/email/resend-client');
    await sendPipelineEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips send when API key is missing', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.PIPELINE_EMAIL_ENABLED = 'true';

    const { sendPipelineEmail } = await import('@/lib/email/resend-client');
    await sendPipelineEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends when enabled with configured from and reply-to', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.PIPELINE_EMAIL_ENABLED = 'true';
    process.env.RESEND_FROM_EMAIL = 'active-jobs@alerts.sageoutdooradvisory.com';
    process.env.RESEND_REPLY_TO = 'hello@sageoutdooradvisory.com';

    const { sendPipelineEmail } = await import('@/lib/email/resend-client');
    await sendPipelineEmail({
      to: 'consultant@example.com',
      subject: 'Review update',
      html: '<p>Updated</p>',
    });

    expect(mockSend).toHaveBeenCalledWith({
      from: 'Sage Job Pipeline <active-jobs@alerts.sageoutdooradvisory.com>',
      to: ['consultant@example.com'],
      subject: 'Review update',
      html: '<p>Updated</p>',
      replyTo: 'hello@sageoutdooradvisory.com',
    });
  });
});
