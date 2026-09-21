import {
  fetchClientPortalFiles,
  fetchClientPortalRequests,
  fetchClientPortalUpdates,
} from '@/lib/client-portal/db';
import { buildClientPortalWorkspace } from '@/lib/client-portal/sanitize';
import type { ClientPortalEngagement, ClientPortalWorkspace } from '@/lib/client-portal/types';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { createServerClient } from '@/lib/supabase';

export async function loadClientPortalWorkspace(input: {
  job: ProjectPipelineJob;
  engagement: ClientPortalEngagement | null;
}): Promise<ClientPortalWorkspace> {
  const supabase = createServerClient();
  if (!input.engagement) {
    return buildClientPortalWorkspace({
      job: input.job,
      engagement: null,
      updates: [],
      requests: [],
      files: [],
    });
  }

  const [updates, requests, files] = await Promise.all([
    fetchClientPortalUpdates(supabase, input.engagement.id),
    fetchClientPortalRequests(supabase, input.engagement.id),
    fetchClientPortalFiles(supabase, input.engagement.id),
  ]);

  return buildClientPortalWorkspace({
    job: input.job,
    engagement: input.engagement,
    updates,
    requests,
    files,
  });
}
