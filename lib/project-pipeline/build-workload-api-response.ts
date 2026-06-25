import { createServerClient } from '@/lib/supabase';
import {
  countProjectPipelineJobsInSupabase,
} from '@/lib/project-pipeline/fetch-from-supabase';
import { fetchProjectPipelineJobsWithFallback } from '@/lib/project-pipeline/fetch-with-fallback';
import { projectPipelineRequiresOAuthConnect } from '@/lib/project-pipeline/oauth-gate';
import {
  getProjectPipelineAuthMode,
  getProjectPipelineOAuthClientId,
  isProjectPipelineConfigured,
} from '@/lib/project-pipeline/auth';
import { getProjectPipelineSheetId } from '@/lib/project-pipeline/fetch-jobs';
import {
  listProjectPipelineSheetTabOptions,
  parseProjectPipelineSheetYear,
  resolveProjectPipelineSheetTab,
} from '@/lib/project-pipeline/sheet-tabs';
import {
  buildPipelineWorkloadCharts,
  type PipelineWorkloadCharts,
} from '@/lib/project-pipeline/workload-charts';
import {
  buildPipelineWorkloadSummary,
  resolvePipelineWorkloadSegmentFilter,
  type PipelineWorkloadSegmentFilter,
  type PipelineWorkloadSummary,
} from '@/lib/project-pipeline/workload';

export type PipelineWorkloadView = 'byYear' | 'charts';

export type ProjectPipelineWorkloadApiResponse = {
  configured: boolean;
  requiresOAuth?: boolean;
  oauthClientId?: string | null;
  dataSource?: 'supabase' | 'sheets';
  segmentFilter?: PipelineWorkloadSegmentFilter;
  availableSheetTabs?: { sheetName: string; sheetYear: number | null }[];
  view: PipelineWorkloadView;
} & (
  | ({
      view: 'byYear';
    } & PipelineWorkloadSummary)
  | ({
      view: 'charts';
    } & PipelineWorkloadCharts)
);

function emptyByYearWorkload(sheetName: string): PipelineWorkloadSummary {
  return {
    sheetName,
    totalJobs: 0,
    incompleteJobs: 0,
    byAppraiser: [],
    byProjMgr: [],
  };
}

function emptyChartsWorkload(sheetName: string): PipelineWorkloadCharts {
  return {
    sheetName,
    byMonth: [],
    unparsedJobCount: 0,
  };
}

export function resolvePipelineWorkloadView(
  value: string | null | undefined
): PipelineWorkloadView {
  if (value === 'charts') return 'charts';
  return 'byYear';
}

export async function buildProjectPipelineWorkloadApiResponse(input: {
  sheetName?: string;
  accessToken?: string;
  incompleteOnly?: boolean;
  segmentFilter?: string | null;
  view?: string | null;
  /** Explicit user OAuth connect when the Supabase mirror is empty. */
  allowOAuthSheets?: boolean;
}): Promise<ProjectPipelineWorkloadApiResponse> {
  const view = resolvePipelineWorkloadView(input.view);
  const sheetName = resolveProjectPipelineSheetTab(input.sheetName);
  const segmentFilter = resolvePipelineWorkloadSegmentFilter(input.segmentFilter);
  const authMode = getProjectPipelineAuthMode();
  const configured = isProjectPipelineConfigured();
  const oauthClientId = getProjectPipelineOAuthClientId();
  const availableSheetTabs = listProjectPipelineSheetTabOptions();

  const baseMeta = {
    configured: configured && Boolean(authMode),
    oauthClientId: null as string | null,
    availableSheetTabs,
    segmentFilter,
    view,
  };

  if (!configured || !authMode) {
    if (view === 'charts') {
      return { ...baseMeta, configured: false, ...emptyChartsWorkload(sheetName) };
    }
    return { ...baseMeta, configured: false, ...emptyByYearWorkload(sheetName) };
  }

  const accessToken = input.allowOAuthSheets ? input.accessToken?.trim() : undefined;

  if (authMode === 'oauth') {
    const supabase = createServerClient();
    const mirroredCount = await countProjectPipelineJobsInSupabase(supabase, {
      sheetId: getProjectPipelineSheetId(),
      sheetName,
    });

    if (
      projectPipelineRequiresOAuthConnect({
        authMode,
        mirroredCount,
        allowOAuthSheets: input.allowOAuthSheets === true,
      })
    ) {
      if (view === 'charts') {
        return {
          ...baseMeta,
          configured: true,
          requiresOAuth: true,
          oauthClientId,
          ...emptyChartsWorkload(sheetName),
        };
      }
      return {
        ...baseMeta,
        configured: true,
        requiresOAuth: true,
        oauthClientId,
        ...emptyByYearWorkload(sheetName),
      };
    }
  }

  const supabase = createServerClient();
  const pipeline = await fetchProjectPipelineJobsWithFallback({
    supabase,
    sheetName,
    accessToken,
    includeFieldColumnMap: false,
    mirrorPreferred: true,
    allowOAuthSheets: input.allowOAuthSheets === true,
  });

  const sharedTail = {
    configured: true,
    requiresOAuth: false as const,
    oauthClientId: authMode === 'oauth' ? oauthClientId : null,
    dataSource: pipeline.dataSource,
    availableSheetTabs,
    segmentFilter,
    sheetName,
  };

  if (view === 'charts') {
    const charts = buildPipelineWorkloadCharts(pipeline.jobs, sheetName, {
      segmentFilter,
      sheetYear: parseProjectPipelineSheetYear(sheetName),
    });

    return {
      view: 'charts',
      ...sharedTail,
      ...charts,
    };
  }

  const summary = buildPipelineWorkloadSummary(pipeline.jobs, sheetName, {
    incompleteOnly: input.incompleteOnly !== false,
    segmentFilter,
  });

  return {
    view: 'byYear',
    ...sharedTail,
    ...summary,
  };
}
