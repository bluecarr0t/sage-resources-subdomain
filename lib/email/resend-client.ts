/**
 * Best-effort Resend client for Job Pipeline notifications.
 *
 * Server-only env vars (no NEXT_PUBLIC_ prefix):
 * - RESEND_API_KEY
 * - RESEND_FROM_EMAIL (default: active-jobs@alerts.sageoutdooradvisory.com)
 * - RESEND_REPLY_TO
 * - PIPELINE_EMAIL_ENABLED (must be "true" to send)
 */

const DEFAULT_FROM_EMAIL = 'active-jobs@alerts.sageoutdooradvisory.com';

export type PipelineEmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export function isPipelineEmailEnabled(): boolean {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  return process.env.PIPELINE_EMAIL_ENABLED?.trim().toLowerCase() === 'true';
}

export function getPipelineEmailFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) return `Sage Job Pipeline <${DEFAULT_FROM_EMAIL}>`;
  if (from.includes('<')) return from;
  return `Sage Job Pipeline <${from}>`;
}

export function getPipelineEmailReplyTo(): string | undefined {
  const replyTo = process.env.RESEND_REPLY_TO?.trim();
  return replyTo || undefined;
}

export async function sendPipelineEmail(payload: PipelineEmailPayload): Promise<void> {
  if (!isPipelineEmailEnabled()) return;

  const apiKey = process.env.RESEND_API_KEY!.trim();
  const to = (Array.isArray(payload.to) ? payload.to : [payload.to]).filter(Boolean);
  if (!to.length) return;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: getPipelineEmailFromAddress(),
      to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo ?? getPipelineEmailReplyTo(),
    });

    if (error) {
      console.error('[pipeline-email] Resend error:', error);
    }
  } catch (err) {
    console.error('[pipeline-email] send failed:', err);
  }
}

/** Fire-and-forget wrapper — never blocks the caller. */
export function notifyPipelineEmail(payload: PipelineEmailPayload): void {
  void sendPipelineEmail(payload);
}
