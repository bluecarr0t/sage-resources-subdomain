#!/usr/bin/env npx tsx
/**
 * Send a sample Job Pipeline Slack DM for manual QA.
 *
 * Usage:
 *   PIPELINE_SLACK_TEST_RECIPIENT=harsell@sageoutdooradvisory.com npm run test:pipeline-slack
 *
 * Requires in .env.local (or env):
 *   SLACK_BOT_TOKEN=xoxb-…
 *   PIPELINE_SLACK_ENABLED=true
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import {
  buildPipelineSlackJobContext,
  isPipelineSlackEnabled,
  lookupSlackUserIdByEmail,
  sendPipelineSlackDm,
} from '../lib/slack/pipeline-slack-client';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const recipient =
    process.env.PIPELINE_SLACK_TEST_RECIPIENT?.trim() || 'harsell@sageoutdooradvisory.com';

  if (!isPipelineSlackEnabled()) {
    console.error('SLACK_BOT_TOKEN and PIPELINE_SLACK_ENABLED=true are required.');
    process.exit(1);
  }

  const token = process.env.SLACK_BOT_TOKEN?.trim() ?? '';
  if (!token.startsWith('xoxb-')) {
    console.error('SLACK_BOT_TOKEN must be a real Bot User OAuth Token (starts with xoxb-).');
    process.exit(1);
  }

  console.log(`Looking up Slack user for ${recipient}…`);
  const userId = await lookupSlackUserIdByEmail(recipient);
  if (!userId) {
    console.error(
      `Could not resolve Slack user for ${recipient}. Check that the email matches their Slack profile and the bot has users:read.email scope.`
    );
    process.exit(1);
  }

  console.log(`Resolved Slack user ID: ${userId}`);
  console.log(`Sending test DM to ${recipient}…`);

  const message = buildPipelineSlackJobContext({
    jobNumber: '26-TEST-SLACK',
    client: 'Pipeline Slack Test',
    propertyLocation: 'Austin, TX',
    headline: 'Slack DM test',
    detailLines: ['This is a manual test from scripts/test-pipeline-slack.ts'],
  });

  await sendPipelineSlackDm(recipient, message);
  console.log(`✓ Test DM sent to ${recipient}`);
}

main().catch((error) => {
  console.error('Slack test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
