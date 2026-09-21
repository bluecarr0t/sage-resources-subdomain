import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  listAccessibleClientPortalEngagements,
  withClientPortalAuth,
} from '@/lib/client-portal/auth';
import { fetchLatestProjectPipelineJobByNumber } from '@/lib/client-portal/db';
import { isClientPortalJobEligible } from '@/lib/client-portal/eligibility';
import { toClientPortalSafeJob } from '@/lib/client-portal/sanitize';

export const dynamic = 'force-dynamic';

export const GET = withClientPortalAuth(async (_request, auth) => {
  const engagements = await listAccessibleClientPortalEngagements(auth);
  const supabase = createServerClient();

  const jobs = [];
  for (const engagement of engagements) {
    const job = await fetchLatestProjectPipelineJobByNumber(
      supabase,
      engagement.jobNumber
    );
    if (!job) continue;
    if (!auth.isStaff && !isClientPortalJobEligible(job)) continue;
    jobs.push({
      ...toClientPortalSafeJob(job, 0),
      invitedEmail: engagement.invitedEmail,
    });
  }

  return NextResponse.json({ jobs, isStaff: auth.isStaff });
});
