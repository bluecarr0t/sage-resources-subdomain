/**
 * Best-effort Slack DMs for Job Pipeline notifications.
 *
 * Server-only env vars:
 * - SLACK_BOT_TOKEN (xoxb-… with chat:write, users:read.email)
 * - PIPELINE_SLACK_ENABLED (must be "true" to send)
 * - SITE_URL (optional, for links in messages)
 */

import { buildJobPipelineAdminUrl } from '@/lib/email/pipeline-email-templates';

export type PipelineSlackMessage = {
  text: string;
  blocks?: Record<string, unknown>[];
};

export function isPipelineSlackEnabled(): boolean {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) return false;
  return process.env.PIPELINE_SLACK_ENABLED?.trim().toLowerCase() === 'true';
}

const slackUserIdCache = new Map<string, string | null>();

async function slackApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.SLACK_BOT_TOKEN!.trim();
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!json.ok) {
    throw new Error(json.error ?? `Slack API ${method} failed`);
  }
  return json;
}

export async function lookupSlackUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  if (slackUserIdCache.has(normalized)) {
    return slackUserIdCache.get(normalized) ?? null;
  }

  try {
    const result = await slackApi<{ user?: { id?: string } }>('users.lookupByEmail', {
      email: normalized,
    });
    const userId = result.user?.id?.trim() ?? null;
    slackUserIdCache.set(normalized, userId);
    return userId;
  } catch (error) {
    console.warn('[pipeline-slack] lookupByEmail failed for', normalized, error);
    slackUserIdCache.set(normalized, null);
    return null;
  }
}

export async function sendPipelineSlackDm(
  email: string,
  message: PipelineSlackMessage
): Promise<void> {
  if (!isPipelineSlackEnabled()) return;

  const userId = await lookupSlackUserIdByEmail(email);
  if (!userId) return;

  try {
    await slackApi('chat.postMessage', {
      channel: userId,
      text: message.text,
      ...(message.blocks ? { blocks: message.blocks } : {}),
    });
  } catch (error) {
    console.error('[pipeline-slack] chat.postMessage failed for', email, error);
  }
}

export function notifyPipelineSlackDm(email: string, message: PipelineSlackMessage): void {
  void sendPipelineSlackDm(email, message).catch((err) => {
    console.error('[pipeline-slack] notify failed:', err);
  });
}

export function buildPipelineSlackJobContext(input: {
  jobNumber: string;
  client: string;
  propertyLocation?: string;
  headline: string;
  detailLines?: string[];
}): PipelineSlackMessage {
  const lines = [
    `*${input.headline}*`,
    `Job #${input.jobNumber} — ${input.client || 'Unknown client'}`,
    input.propertyLocation?.trim() ? input.propertyLocation.trim() : null,
    ...(input.detailLines ?? []),
    `<${buildJobPipelineAdminUrl()}|Open Job Pipeline>`,
  ].filter(Boolean) as string[];

  return { text: lines.join('\n') };
}
