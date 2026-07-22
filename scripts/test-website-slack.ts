#!/usr/bin/env npx tsx
/**
 * Send a sample #website Market Overview signup message for manual QA.
 *
 * Usage:
 *   npm run test:website-slack
 *
 * Requires in .env.local (or env):
 *   SLACK_BOT_TOKEN=xoxb-…
 *   WEBSITE_SLACK_ENABLED=true
 *   WEBSITE_SLACK_CHANNEL_ID=C0BJZDM2C3D
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import {
  buildMarketOverviewSignupSlackMessage,
  isWebsiteSlackEnabled,
  sendWebsiteSlackMessage,
} from '../lib/slack/website-slack-client';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!isWebsiteSlackEnabled()) {
    console.error(
      'Website Slack is not enabled. Set WEBSITE_SLACK_ENABLED=true and WEBSITE_SLACK_CHANNEL_ID (or WEBSITE_SLACK_WEBHOOK_URL) plus SLACK_BOT_TOKEN.'
    );
    process.exit(1);
  }

  const message = buildMarketOverviewSignupSlackMessage({
    signupNumber: 43,
    email: 'test@example.com',
    name: 'Test Signup',
  });

  console.log('Posting sample Market Overview signup to #website…');
  await sendWebsiteSlackMessage(message);
  console.log('✓ Posted sample #43 celebration message');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
