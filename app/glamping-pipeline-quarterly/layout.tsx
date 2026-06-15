import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { PipelineQuarterlyGatedShell } from '@/components/pipeline-quarterly/PipelineQuarterlyGatedShell';
import { checkGatedPageAccess } from '@/lib/check-gated-page-access';
import { GATED_PAGE_PIPELINE_QUARTERLY } from '@/lib/gated-access';
import { isPipelineQuarterlyProductEnabled } from '@/lib/pipeline-quarterly/is-enabled';
import { createServerClientWithCookies } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PipelineQuarterlyLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isPipelineQuarterlyProductEnabled()) {
    notFound();
  }

  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const unlocked = await checkGatedPageAccess(
    supabase,
    user,
    GATED_PAGE_PIPELINE_QUARTERLY
  );

  if (!unlocked) {
    return <PipelineQuarterlyGatedShell>{children}</PipelineQuarterlyGatedShell>;
  }

  return <>{children}</>;
}
