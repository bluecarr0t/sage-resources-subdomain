import { Resend } from 'resend';

const DEFAULT_FROM_EMAIL = 'active-jobs@alerts.sageoutdooradvisory.com';

export type ClientPortalEmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export function isClientPortalEmailEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  return env.CLIENT_PORTAL_EMAIL_ENABLED?.trim().toLowerCase() === 'true';
}

export function getClientPortalEmailFromAddress(
  env: NodeJS.ProcessEnv = process.env
): string {
  const from = env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
  if (from.includes('<')) return from;
  return `Sage Outdoor Advisory <${from}>`;
}

export function getClientPortalEmailReplyTo(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const replyTo = env.RESEND_REPLY_TO?.trim();
  return replyTo || undefined;
}

export async function sendClientPortalEmail(
  payload: ClientPortalEmailPayload
): Promise<void> {
  if (!isClientPortalEmailEnabled()) return;

  const apiKey = process.env.RESEND_API_KEY!.trim();
  const to = (Array.isArray(payload.to) ? payload.to : [payload.to]).filter(Boolean);
  if (!to.length) return;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: getClientPortalEmailFromAddress(),
      to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo ?? getClientPortalEmailReplyTo(),
    });
    if (error) {
      console.error('[client-portal-email] Resend error:', error);
    }
  } catch (err) {
    console.error('[client-portal-email] send failed:', err);
  }
}

export function notifyClientPortalEmail(payload: ClientPortalEmailPayload): void {
  void sendClientPortalEmail(payload);
}
