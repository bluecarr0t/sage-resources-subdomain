#!/usr/bin/env npx tsx
/**
 * Create a sample Job Pipeline review calendar event.
 *
 * Usage:
 *   PIPELINE_CALENDAR_ENABLED=true \
 *   PIPELINE_CALENDAR_TEST_RECIPIENT=harsell@sageoutdooradvisory.com \
 *   npm run test:pipeline-review-calendar
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { isPipelineCalendarEnabled } from '../lib/google-calendar/config';
import { schedulePipelineReviewCalendarEvents } from '../lib/project-pipeline/notifications/schedule-review-calendar-event';
import type { ProjectPipelineJob } from '../lib/project-pipeline/types';

config({ path: resolve(process.cwd(), '.env.local') });

const sampleJob: ProjectPipelineJob = {
  jobNumber: '26-TEST-01',
  client: 'Calendar Test Client',
  propertyLocation: 'Austin, TX',
  appraiserConsultant: 'Luke Marran',
  projMgr: 'Nick',
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

async function main() {
  if (!isPipelineCalendarEnabled()) {
    console.error(
      'PIPELINE_CALENDAR_ENABLED=true and GOOGLE_SERVICE_ACCOUNT_* credentials are required.'
    );
    process.exit(1);
  }

  const recipient =
    process.env.PIPELINE_CALENDAR_TEST_RECIPIENT?.trim() || 'harsell@sageoutdooradvisory.com';

  console.log(`Creating review calendar event for ${recipient}...`);

  await schedulePipelineReviewCalendarEvents({
    job: sampleJob,
    actorDisplayName: 'Pipeline Calendar Test',
    note: 'Test event from scripts/test-pipeline-review-calendar.ts',
    managedUsers: [
      {
        email: recipient,
        display_name: 'Nick Harsell',
        first_name: 'Nick',
        last_name: 'Harsell',
      },
    ],
  });

  console.log('Done. Check the primary Google Calendar for', recipient);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
