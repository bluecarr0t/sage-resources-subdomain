import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isAllowedEmailDomain, isManagedUser } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { isClientPortalEnabled } from '@/lib/client-portal/is-enabled';
import {
  canClientAccessPortalJob,
  isClientPortalJobEligible,
} from '@/lib/client-portal/eligibility';
import {
  fetchClientPortalEngagementByJobNumber,
  fetchEnabledClientPortalEngagements,
  fetchEnabledClientPortalEngagementsForEmail,
  fetchLatestProjectPipelineJobByNumber,
} from '@/lib/client-portal/db';
import type { ClientPortalEngagement } from '@/lib/client-portal/types';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type ClientPortalAuthContext = {
  user: { id: string; email: string };
  isStaff: boolean;
};

export type ClientPortalJobAccess = ClientPortalAuthContext & {
  job: ProjectPipelineJob;
  engagement: ClientPortalEngagement | null;
};

export async function isClientPortalStaffUser(
  user: Pick<User, 'id' | 'email'> | null | undefined
): Promise<boolean> {
  if (!user?.id || !isAllowedEmailDomain(user.email)) return false;
  return isManagedUser(user.id);
}

export async function requireClientPortalUser(): Promise<
  | { ok: true; auth: ClientPortalAuthContext }
  | { ok: false; response: NextResponse }
> {
  if (!isClientPortalEnabled()) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const isStaff = await isClientPortalStaffUser(user);
  return {
    ok: true,
    auth: {
      user: { id: user.id, email: user.email },
      isStaff,
    },
  };
}

export function withClientPortalAuth(
  handler: (
    request: NextRequest,
    auth: ClientPortalAuthContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await requireClientPortalUser();
    if (!result.ok) return result.response;
    return handler(request, result.auth);
  };
}

export async function requireClientPortalJobAccess(
  jobNumber: string
): Promise<
  | { ok: true; access: ClientPortalJobAccess }
  | { ok: false; response: NextResponse }
> {
  const authResult = await requireClientPortalUser();
  if (!authResult.ok) return authResult;

  const trimmed = jobNumber.trim();
  if (!trimmed) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const admin = createServerClient();
  const job = await fetchLatestProjectPipelineJobByNumber(admin, trimmed);
  if (!job) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const engagement = await fetchClientPortalEngagementByJobNumber(admin, job.jobNumber);
  const { auth } = authResult;

  if (auth.isStaff) {
    return { ok: true, access: { ...auth, job, engagement } };
  }

  if (
    !canClientAccessPortalJob({
      isStaff: auth.isStaff,
      eligible: isClientPortalJobEligible(job),
      sessionEmail: auth.user.email,
      engagement,
    })
  ) {
    return { ok: false, response: forbiddenResponse() };
  }

  return { ok: true, access: { ...auth, job, engagement } };
}

export async function listAccessibleClientPortalEngagements(
  auth: ClientPortalAuthContext
): Promise<ClientPortalEngagement[]> {
  const admin = createServerClient();
  if (auth.isStaff) {
    return fetchEnabledClientPortalEngagements(admin);
  }

  return fetchEnabledClientPortalEngagementsForEmail(admin, auth.user.email);
}
