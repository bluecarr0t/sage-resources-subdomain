/**
 * Best-effort Slack posts to #website for public website events
 * (e.g. Glamping Market Overview signups).
 *
 * Server-only env vars:
 * - SLACK_BOT_TOKEN (xoxb-… with chat:write)
 * - WEBSITE_SLACK_ENABLED (must be "true" to send)
 * - WEBSITE_SLACK_CHANNEL_ID (e.g. C0BJZDM2C3D for #website)
 * - WEBSITE_SLACK_WEBHOOK_URL (optional Incoming Webhook alternative)
 * - SITE_URL (optional, for links in messages)
 */

export type WebsiteSlackMessage = {
  text: string;
  blocks?: Record<string, unknown>[];
};

export type MarketOverviewSignupSlackPayload = {
  signupNumber: number;
  email: string;
  name?: string | null;
};

export function isWebsiteSlackEnabled(): boolean {
  if (process.env.WEBSITE_SLACK_ENABLED?.trim().toLowerCase() !== 'true') {
    return false;
  }
  if (process.env.WEBSITE_SLACK_WEBHOOK_URL?.trim()) return true;
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  const channelId = process.env.WEBSITE_SLACK_CHANNEL_ID?.trim();
  return Boolean(token && channelId);
}

function siteOrigin(): string {
  const fromEnv = process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  return 'https://resources.sageoutdooradvisory.com';
}

function marketOverviewUrl(): string {
  return `${siteOrigin()}/glamping-market-overview`;
}

export function buildMarketOverviewSignupSlackMessage(
  payload: MarketOverviewSignupSlackPayload
): WebsiteSlackMessage {
  const who = payload.name?.trim() || payload.email;
  const text = [
    `🎉 New Glamping Market Overview signup — *#${payload.signupNumber}*!`,
    `${who} just unlocked the free market overview.`,
    `Email: ${payload.email}`,
  ].join('\n');

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🎉 Market Overview signup #${payload.signupNumber}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*#${payload.signupNumber}* just signed up for the *Glamping Market Overview*!`,
          '',
          `*Name:* ${payload.name?.trim() || '_Not provided_'}`,
          `*Email:* ${payload.email}`,
        ].join('\n'),
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<${marketOverviewUrl()}|Open Market Overview> · Total verified emails: *${payload.signupNumber}*`,
        },
      ],
    },
  ];

  return { text, blocks };
}

async function postViaWebhook(message: WebsiteSlackMessage): Promise<void> {
  const webhookUrl = process.env.WEBSITE_SLACK_WEBHOOK_URL!.trim();
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: message.text,
      ...(message.blocks ? { blocks: message.blocks } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Webhook failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

async function postViaBot(message: WebsiteSlackMessage): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN!.trim();
  const channel = process.env.WEBSITE_SLACK_CHANNEL_ID!.trim();
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel,
      text: message.text,
      ...(message.blocks ? { blocks: message.blocks } : {}),
    }),
  });

  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!json.ok) {
    throw new Error(json.error ?? 'chat.postMessage failed');
  }
}

export async function sendWebsiteSlackMessage(message: WebsiteSlackMessage): Promise<void> {
  if (!isWebsiteSlackEnabled()) return;

  if (process.env.WEBSITE_SLACK_WEBHOOK_URL?.trim()) {
    await postViaWebhook(message);
    return;
  }

  await postViaBot(message);
}

export async function notifyMarketOverviewSignupSlack(
  payload: MarketOverviewSignupSlackPayload
): Promise<void> {
  if (!isWebsiteSlackEnabled()) return;

  try {
    await sendWebsiteSlackMessage(buildMarketOverviewSignupSlackMessage(payload));
  } catch (error) {
    console.error('[website-slack] market overview signup notify failed:', error);
  }
}

/** Fire-and-forget wrapper for request handlers. */
export function notifyMarketOverviewSignupSlackAsync(
  payload: MarketOverviewSignupSlackPayload
): void {
  void notifyMarketOverviewSignupSlack(payload);
}
