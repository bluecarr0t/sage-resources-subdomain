import { redirect } from 'next/navigation';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { ClientPortalLogin } from '@/components/client-portal/ClientPortalLogin';
import { ClientPortalHome } from '@/components/client-portal/ClientPortalHome';
import { isClientPortalStaffUser, listAccessibleClientPortalEngagements } from '@/lib/client-portal/auth';
import { createServerClient } from '@/lib/supabase';
import { fetchLatestProjectPipelineJobByNumber } from '@/lib/client-portal/db';
import { isClientPortalJobEligible } from '@/lib/client-portal/eligibility';
import { clientPortalJobPath, toClientPortalSafeJob } from '@/lib/client-portal/sanitize';

export const dynamic = 'force-dynamic';

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const params = await searchParams;
  const expired = params.access === 'link-expired';
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return <ClientPortalLogin expired={expired} />;
  }

  const isStaff = await isClientPortalStaffUser(user);
  const auth = { user: { id: user.id, email: user.email }, isStaff };
  const engagements = await listAccessibleClientPortalEngagements(auth);
  const admin = createServerClient();
  const jobs = [];
  for (const engagement of engagements) {
    const job = await fetchLatestProjectPipelineJobByNumber(admin, engagement.jobNumber);
    if (!job) continue;
    if (!isStaff && !isClientPortalJobEligible(job)) continue;
    jobs.push(toClientPortalSafeJob(job, 0));
  }

  if (!isStaff && jobs.length === 1) {
    redirect(clientPortalJobPath(jobs[0].jobNumber));
  }

  return <ClientPortalHome email={user.email} isStaff={isStaff} jobs={jobs} />;
}
