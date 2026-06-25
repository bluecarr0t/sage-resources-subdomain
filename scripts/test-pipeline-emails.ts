#!/usr/bin/env npx tsx
/**
 * Send sample Job Pipeline emails for manual QA.
 *
 * Usage:
 *   PIPELINE_EMAIL_TEST_RECIPIENT=harsell@sageoutdooradvisory.com npm run test:pipeline-emails
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import {
  buildDueDateChangeEmail,
  buildResubmitForReviewEmail,
  buildReviewStatusChangeEmail,
  buildSubmitForReviewEmail,
} from '../lib/email/pipeline-email-templates';
import { isPipelineEmailEnabled, sendPipelineEmail } from '../lib/email/resend-client';
import type { ProjectPipelineJob } from '../lib/project-pipeline/types';

config({ path: resolve(process.cwd(), '.env.local') });

const sampleJob: ProjectPipelineJob = {
  jobNumber: '26-TEST-EMAIL',
  client: 'Pipeline Email Test Client',
  propertyLocation: 'Austin, TX',
  appraiserConsultant: 'Luke Marran',
  projMgr: 'Nick Harsell',
  contractStart: '06/01/26',
  dueDate: '7/15/26',
  dateCompleted: '',
  commercialOutdoor: 'Outdoor',
  propertyType: 'Glamping',
  service: 'Feasibility Study',
  reviewStatus: 'In-Progress',
  sentToClient: 'No',
  authorSlackUsername: 'luke',
  clientEmail: 'client@example.com',
  projectStatus: 'In-Progress',
  sheetRowIndex: 2,
  pipelineSheetName: '2026 Jobs',
};

async function sendTestEmail(label: string, subject: string, html: string, recipient: string) {
  const testSubject = `[TEST] ${subject}`;
  console.log(`Sending ${label} → ${recipient}`);
  await sendPipelineEmail({ to: recipient, subject: testSubject, html });
  console.log(`  ✓ ${label}`);
}

async function main() {
  if (!isPipelineEmailEnabled()) {
    console.error('RESEND_API_KEY and PIPELINE_EMAIL_ENABLED=true are required.');
    process.exit(1);
  }

  const recipient =
    process.env.PIPELINE_EMAIL_TEST_RECIPIENT?.trim() || 'harsell@sageoutdooradvisory.com';
  const actorDisplayName = 'Pipeline Email Test';

  const templates = [
    {
      label: 'Submit for review',
      ...buildSubmitForReviewEmail({
        job: sampleJob,
        actorDisplayName,
        note: 'Test submit-for-review email from scripts/test-pipeline-emails.ts',
      }),
    },
    {
      label: 'Resubmit for review',
      ...buildResubmitForReviewEmail({
        job: sampleJob,
        actorDisplayName,
        note: 'Test resubmit-for-review email from scripts/test-pipeline-emails.ts',
      }),
    },
    {
      label: 'Review status change',
      ...buildReviewStatusChangeEmail({
        job: sampleJob,
        previousStatus: 'In-Progress',
        newStatus: 'Changes Requested',
        actorDisplayName,
      }),
    },
    {
      label: 'Due date change',
      ...buildDueDateChangeEmail({
        job: sampleJob,
        previousDueDate: '6/30/26',
        newDueDate: '7/15/26',
        actorDisplayName,
      }),
    },
  ];

  console.log(`Sending ${templates.length} Job Pipeline test emails to ${recipient}...`);

  for (const template of templates) {
    await sendTestEmail(template.label, template.subject, template.html, recipient);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
