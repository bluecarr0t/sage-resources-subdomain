import { getManagedUser } from '@/lib/auth-helpers';
import {
  canViewAllPipelineJobs,
  resolvePipelineSegmentDefault,
} from '@/lib/managed-users-pipeline';
import { isManagedUserAdmin } from '@/lib/project-pipeline/job-edit-permissions';
import { createServerClient } from '@/lib/supabase';
import { userNeedsDisplayNameForPipeline } from '@/lib/project-pipeline/filter-jobs';
import {
  getProjectPipelineAuthMode,
  getProjectPipelineOAuthClientId,
  isProjectPipelineConfigured,
} from '@/lib/project-pipeline/auth';
import { isGoogleSheetsServiceAccountConfigured } from '@/lib/google-sheets-export';
import {
  countAllProjectPipelineJobsInSupabase,
  countProjectPipelineJobsInSupabase,
} from '@/lib/project-pipeline/fetch-from-supabase';
import { getProjectPipelineSheetId } from '@/lib/project-pipeline/fetch-jobs';
import { loadVisibleProjectPipelineJobs } from '@/lib/project-pipeline/load-visible-pipeline-jobs';
import { getProjectPipelineMirrorStatus } from '@/lib/project-pipeline/mirror-status';
import { projectPipelineRequiresOAuthConnect } from '@/lib/project-pipeline/oauth-gate';
import { canUseProjectPipelineAuthorPreview } from '@/lib/project-pipeline/author-preview';
import { canUseProjectPipelineConsultantWorkloadView } from '@/lib/project-pipeline/consultant-workload-view';
import { resolveDefaultProjectPipelineTableStatusFilter } from '@/lib/project-pipeline/review-todos';
import type { PipelineCurrentWorkloadAuthorInput } from '@/lib/project-pipeline/current-workload';
import { preparePipelineWorkloadAuthors } from '@/lib/project-pipeline/workload-authors';
import {
  isProjectPipelineAllSheetsTab,
  listProjectPipelineSheetTabOptions,
  parseProjectPipelineSheetYear,
  resolveProjectPipelineSheetSelection,
} from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineApiResponse } from '@/lib/project-pipeline/types';

function buildProjectPipelineBaseMeta(input: {
  canViewAll: boolean;
  viewerIsAdmin: boolean;
  missingDisplayName: boolean;
  defaultSegmentFilter: ReturnType<typeof resolvePipelineSegmentDefault>;
  sheetName: string;
  cronSyncEnabled: boolean;
}) {
  const allYearsView = isProjectPipelineAllSheetsTab(input.sheetName);

  return {
    canViewAll: input.canViewAll,
    viewerIsAdmin: input.viewerIsAdmin,
    missingDisplayName: input.missingDisplayName,
    defaultSegmentFilter: input.defaultSegmentFilter,
    sheetName: input.sheetName,
    sheetYear: allYearsView ? null : parseProjectPipelineSheetYear(input.sheetName),
    availableSheetTabs: listProjectPipelineSheetTabOptions(),
    cronSyncEnabled: input.cronSyncEnabled,
  };
}

export async function buildProjectPipelineApiResponse(input: {
  userId: string;
  email: string | null | undefined;
  accessToken?: string;
  sheetName?: string;
}): Promise<ProjectPipelineApiResponse> {
  const authMode = getProjectPipelineAuthMode();
  const configured = isProjectPipelineConfigured();
  const oauthClientId = getProjectPipelineOAuthClientId();
  const cronSyncEnabled = isGoogleSheetsServiceAccountConfigured();

  const managedUser = await getManagedUser(input.userId);
  const displayName = managedUser?.display_name ?? null;
  const email = input.email;
  const canViewAll = canViewAllPipelineJobs(managedUser);
  const viewerIsAdmin = isManagedUserAdmin(managedUser);
  const defaultSegmentFilter = resolvePipelineSegmentDefault(managedUser, email);
  const missingDisplayName = userNeedsDisplayNameForPipeline({
    email,
    displayName,
    pipelineViewAll: canViewAll,
  });
  const sheetName = resolveProjectPipelineSheetSelection(input.sheetName);
  const baseMeta = buildProjectPipelineBaseMeta({
    canViewAll,
    viewerIsAdmin,
    missingDisplayName,
    defaultSegmentFilter,
    sheetName,
    cronSyncEnabled,
  });

  if (!configured || !authMode) {
    return {
      configured: false,
      authMode: null,
      oauthClientId: null,
      jobs: [],
      total: 0,
      ...baseMeta,
    };
  }

  const allowOAuthSheets = Boolean(input.accessToken?.trim());

  if (authMode === 'oauth') {
    const supabase = createServerClient();
    const sheetId = getProjectPipelineSheetId();
    const mirroredCount = isProjectPipelineAllSheetsTab(sheetName)
      ? await countAllProjectPipelineJobsInSupabase(supabase, { sheetId })
      : await countProjectPipelineJobsInSupabase(supabase, { sheetId, sheetName });

    if (
      projectPipelineRequiresOAuthConnect({
        authMode,
        mirroredCount,
        allowOAuthSheets,
      })
    ) {
      return {
        configured: true,
        authMode,
        oauthClientId,
        requiresOAuth: true,
        jobs: [],
        total: 0,
        ...baseMeta,
      };
    }
  }

  const supabase = createServerClient();
  const sheetId = getProjectPipelineSheetId();
  const mirrorStatus = await getProjectPipelineMirrorStatus(supabase, { sheetId, sheetName });

  const pipeline = await loadVisibleProjectPipelineJobs({
    supabase,
    sheetName,
    email,
    displayName,
    pipelineViewAll: canViewAll,
    viewerIsAdmin,
    allowOAuthSheets,
    accessToken: input.accessToken,
  });

  let consultantWorkloadAuthors: PipelineCurrentWorkloadAuthorInput[] | undefined;
  if (canUseProjectPipelineConsultantWorkloadView(email)) {
    const { data: managedAuthors, error: authorsError } = await supabase
      .from('managed_users')
      .select('email, display_name, first_name, last_name, division, is_active')
      .eq('is_active', true)
      .order('email', { ascending: true });

    if (authorsError) {
      console.warn('[project-pipeline] managed_users read failed', authorsError.message);
    } else {
      consultantWorkloadAuthors = preparePipelineWorkloadAuthors(managedAuthors ?? []);
    }
  }

  return {
    configured: true,
    authMode,
    oauthClientId: authMode === 'oauth' ? oauthClientId : null,
    requiresOAuth: false,
    jobs: pipeline.jobs,
    total: pipeline.jobs.length,
    defaultProjectStatusFilter: resolveDefaultProjectPipelineTableStatusFilter(pipeline.jobs, {
      email,
      displayName,
      pipelineViewAll: canViewAll,
      managedUser,
    }),
    fieldColumnMap: pipeline.fieldColumnMap,
    viewerEmail: email ?? null,
    viewerDisplayName: displayName,
    viewerDivision: managedUser?.division ?? null,
    canAuthorPreview: canUseProjectPipelineAuthorPreview(email),
    consultantWorkloadAuthors,
    dataSource: pipeline.dataSource,
    mirrorIncomplete: mirrorStatus.mirrorIncomplete,
    lastSyncedAt: mirrorStatus.lastSyncedAt,
    ...baseMeta,
  };
}
