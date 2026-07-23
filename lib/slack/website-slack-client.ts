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
  /** 1-based ordinal for this signup (this lead's rank). */
  signupNumber: number;
  email: string;
  name?: string | null;
  /** Current verified total; defaults to signupNumber when omitted. */
  totalVerifiedEmails?: number;
};

export type MarketOverviewReturnSigninSlackPayload = {
  email: string;
  name?: string | null;
  /** Total magic-link verifies for this email+page (including this one). */
  signInCount: number;
  /** ISO timestamp of the lead's first verification, if known. */
  firstVerifiedAt?: string | null;
  /** Current total verified Market Overview emails. */
  totalVerifiedEmails: number;
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
  const n = payload.signupNumber;
  const total = payload.totalVerifiedEmails ?? n;
  const text = [
    `🎉 New Glamping Market Overview signup — *#${n}*!`,
    `${who} just unlocked the free market overview.`,
    `Email: ${payload.email}`,
    `Total verified emails: ${total}`,
  ].join('\n');

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🎉 Market Overview signup #${n}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `Signup *#${n}* just joined the *Glamping Market Overview*!`,
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
          text: `<${marketOverviewUrl()}|Open Market Overview> · Total verified emails: *${total}*`,
        },
      ],
    },
  ];

  return { text, blocks };
}

function formatSlackDate(iso: string | null | undefined): string {
  if (!iso) return '_Unknown_';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '_Unknown_';
  return `<!date^${Math.floor(ms / 1000)}^{date_short_pretty}|${iso.slice(0, 10)}>`;
}

export function buildMarketOverviewReturnSigninSlackMessage(
  payload: MarketOverviewReturnSigninSlackPayload
): WebsiteSlackMessage {
  const who = payload.name?.trim() || payload.email;
  const visits = payload.signInCount;
  const text = [
    `🔁 Return sign-in — Glamping Market Overview`,
    `${who} signed in again (visit #${visits}).`,
    `Email: ${payload.email}`,
    `Total verified emails: ${payload.totalVerifiedEmails}`,
  ].join('\n');

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🔁 Market Overview return sign-in`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*${who}* signed back in to the *Glamping Market Overview* (sign-in *#${visits}* for this email).`,
          '',
          `*Name:* ${payload.name?.trim() || '_Not provided_'}`,
          `*Email:* ${payload.email}`,
          `*First verified:* ${formatSlackDate(payload.firstVerifiedAt)}`,
        ].join('\n'),
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<${marketOverviewUrl()}|Open Market Overview> · Total verified emails: *${payload.totalVerifiedEmails}*`,
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
  if (!isWebsiteSlackEnabled()) {
    console.warn(
      '[website-slack] skipped market overview signup notify (not enabled or missing env)'
    );
    return;
  }

  try {
    await sendWebsiteSlackMessage(buildMarketOverviewSignupSlackMessage(payload));
  } catch (error) {
    console.error('[website-slack] market overview signup notify failed:', error);
  }
}

export async function notifyMarketOverviewReturnSigninSlack(
  payload: MarketOverviewReturnSigninSlackPayload
): Promise<void> {
  if (!isWebsiteSlackEnabled()) {
    console.warn(
      '[website-slack] skipped market overview return sign-in notify (not enabled or missing env)'
    );
    return;
  }

  try {
    await sendWebsiteSlackMessage(buildMarketOverviewReturnSigninSlackMessage(payload));
  } catch (error) {
    console.error('[website-slack] market overview return sign-in notify failed:', error);
  }
}

/** Fire-and-forget wrapper for non-critical paths. Prefer await in auth callbacks. */
export function notifyMarketOverviewSignupSlackAsync(
  payload: MarketOverviewSignupSlackPayload
): void {
  void notifyMarketOverviewSignupSlack(payload);
}
