#!/usr/bin/env npx tsx
/**
 * Send sample Job Pipeline Slack DMs for manual QA.
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

const sampleJob = {
  jobNumber: '26-TEST-SLACK',
  client: 'Pipeline Slack Test Client',
  propertyLocation: 'Austin, TX',
};

async function sendTestSlack(
  label: string,
  context: Parameters<typeof buildPipelineSlackJobContext>[0],
  recipient: string
) {
  console.log(`Sending ${label} → ${recipient}`);
  await sendPipelineSlackDm(recipient, buildPipelineSlackJobContext(context));
  console.log(`  ✓ ${label}`);
}

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
  console.log(`Sending Job Pipeline Slack test DMs to ${recipient}…\n`);

  const templates: Array<{ label: string; context: Parameters<typeof buildPipelineSlackJobContext>[0] }> =
    [
      {
        label: 'Submit for review',
        context: {
          ...sampleJob,
          headline: 'Submitted for review',
          detailLines: ['Note: Test submit-for-review from scripts/test-pipeline-slack.ts'],
        },
      },
      {
        label: 'Resubmit for review',
        context: {
          ...sampleJob,
          headline: 'Resubmitted for review',
          detailLines: ['Note: Test resubmit-for-review from scripts/test-pipeline-slack.ts'],
        },
      },
      {
        label: 'Review status change',
        context: {
          ...sampleJob,
          headline: 'Review status: Changes Requested',
        },
      },
      {
        label: 'Due date change',
        context: {
          ...sampleJob,
          headline: 'Due date updated to 7/15/26',
          detailLines: ['Was: 6/30/26'],
        },
      },
      {
        label: 'Project status change',
        context: {
          ...sampleJob,
          headline: 'Project status: In Review',
          detailLines: ['Was: In-Progress'],
        },
      },
      {
        label: 'Due date reminder — due soon',
        context: {
          ...sampleJob,
          headline: 'Due date reminder: due soon',
          detailLines: ['Due date: 7/1/26'],
        },
      },
      {
        label: 'Due date reminder — due today',
        context: {
          ...sampleJob,
          headline: 'Due date reminder: due today',
          detailLines: ['Due date: 6/30/26'],
        },
      },
      {
        label: 'Due date reminder — past due',
        context: {
          ...sampleJob,
          headline: 'Due date reminder: past due',
          detailLines: ['Due date: 6/28/26'],
        },
      },
    ];

  for (const template of templates) {
    await sendTestSlack(template.label, template.context, recipient);
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Slack test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
