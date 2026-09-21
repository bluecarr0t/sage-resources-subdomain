import { notFound } from 'next/navigation';
import { ClientPortalLogin } from '@/components/client-portal/ClientPortalLogin';
import { ClientPortalWorkspaceView } from '@/components/client-portal/ClientPortalWorkspace';
import { requireClientPortalJobAccess } from '@/lib/client-portal/auth';
import { loadClientPortalWorkspace } from '@/lib/client-portal/load-workspace';

export const dynamic = 'force-dynamic';

export default async function ClientPortalJobPage({
  params,
}: {
  params: Promise<{ jobNumber: string }>;
}) {
  const { jobNumber: raw } = await params;
  const jobNumber = decodeURIComponent(raw ?? '');
  const access = await requireClientPortalJobAccess(jobNumber);

  if (!access.ok) {
    if (access.response.status === 401) {
      return <ClientPortalLogin />;
    }
    if (access.response.status === 404) {
      notFound();
    }
    notFound();
  }

  const workspace = await loadClientPortalWorkspace({
    job: access.access.job,
    engagement: access.access.engagement,
  });

  return (
    <ClientPortalWorkspaceView
      jobNumber={access.access.job.jobNumber}
      initialWorkspace={workspace}
      isStaff={access.access.isStaff}
    />
  );
}
