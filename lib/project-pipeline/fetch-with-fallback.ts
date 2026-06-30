import type { SupabaseClient } from '@supabase/supabase-js';
import {
  countProjectPipelineJobsInSupabase,
  fetchAllProjectPipelineJobsFromSupabase,
  fetchProjectPipelineJobsFromSupabase,
  fetchProjectPipelineStoredStatusMap,
  fetchProjectPipelineUiEditedJobsMap,
  mergeSheetJobsWithSupabaseOverrides,
} from './fetch-from-supabase';
import {
  fetchProjectPipelineJobs,
  getProjectPipelineSheetId,
  refreshProjectPipelineJobSegmentsFromSheet,
} from './fetch-jobs';
import { getProjectPipelineAuthMode, isProjectPipelineConfigured } from './auth';
import { isGoogleSheetsServiceAccountConfigured } from '@/lib/google-sheets-export';
import { isGoogleSheetsReadQuotaError } from './sheets-read-cache';
import { dedupeProjectPipelineJobs } from './resolve-job-for-edit';
import {
  isProjectPipelineAllSheetsTab,
  PROJECT_PIPELINE_ALL_SHEETS_TAB,
  PROJECT_PIPELINE_SHEET_TABS,
  sortProjectPipelineJobsForAllYearsView,
} from './sheet-tabs';
import type { ProjectPipelineFieldColumnMap, ProjectPipelineJob } from './types';

export type ProjectPipelineDataSource = 'supabase' | 'sheets';

export type FetchProjectPipelineJobsWithFallbackResult = {
  jobs: ProjectPipelineJob[];
  fieldColumnMap: ProjectPipelineFieldColumnMap;
  dataSource: ProjectPipelineDataSource;
};

export type FetchProjectPipelineJobsWithFallbackOptions = {
  supabase: SupabaseClient;
  sheetName: string;
  accessToken?: string;
  env?: NodeJS.ProcessEnv;
  /** When true, skip Supabase and read the sheet directly. */
  forceSheets?: boolean;
  /** When false, skip the Google Sheets header read (saves API quota). Default true. */
  includeFieldColumnMap?: boolean;
  /**
   * Prefer the Supabase mirror and use service-account Sheets reads (cached) when
   * falling back. User OAuth is only used when `allowOAuthSheets` is true.
   */
  mirrorPreferred?: boolean;
  /** Allow user OAuth for Sheets fallback when the mirror is empty (explicit opt-in). */
  allowOAuthSheets?: boolean;
  /**
   * When true, load jobs from Supabase only — no Google Sheets API reads
   * (use after a successful service-account sync to avoid quota spikes).
   */
  skipSheetReads?: boolean;
  /**
   * When true, re-read row highlight colors from Google Sheets for segment labels.
   * Defaults to false when a service account mirror is configured (segments are stored during sync).
   */
  refreshSegmentsFromSheet?: boolean;
};

async function refreshMirroredPipelineJobs(input: {
  jobs: readonly ProjectPipelineJob[];
  sheetId: string;
  sheetName: string;
  env?: NodeJS.ProcessEnv;
  accessToken?: string;
  refreshSegmentsFromSheet?: boolean;
}): Promise<ProjectPipelineJob[]> {
  if (!input.jobs.length) return [];

  const env = input.env ?? process.env;
  const shouldRefreshSegments =
    input.refreshSegmentsFromSheet === true ||
    (input.refreshSegmentsFromSheet !== false &&
      !isGoogleSheetsServiceAccountConfigured(env));

  if (!shouldRefreshSegments) {
    return [...input.jobs];
  }

  try {
    return await refreshProjectPipelineJobSegmentsFromSheet(input.jobs, {
      sheetId: input.sheetId,
      sheetName: input.sheetName,
      accessToken: input.accessToken,
      env,
    });
  } catch (error) {
    if (isGoogleSheetsReadQuotaError(error)) {
      console.warn(
        `[project-pipeline] Row segment refresh skipped for ${input.sheetName} (quota exceeded)`
      );
    } else {
      console.warn(
        `[project-pipeline] Row segment refresh failed for ${input.sheetName}`,
        error
      );
    }
    return [...input.jobs];
  }
}

async function loadProjectPipelineJobsFromSupabaseMirror(input: {
  supabase: SupabaseClient;
  sheetId: string;
  sheetName: string;
  env?: NodeJS.ProcessEnv;
  accessToken?: string;
  refreshSegmentsFromSheet?: boolean;
}): Promise<ProjectPipelineJob[]> {
  const jobs = await fetchProjectPipelineJobsFromSupabase(input.supabase, {
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    env: input.env,
  });

  return refreshMirroredPipelineJobs({
    jobs,
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    env: input.env,
    accessToken: input.accessToken,
    refreshSegmentsFromSheet: input.refreshSegmentsFromSheet,
  });
}

function shouldRefreshSegmentsFromSheet(
  options: FetchProjectPipelineJobsWithFallbackOptions,
  env: NodeJS.ProcessEnv
): boolean {
  if (options.skipSheetReads) return false;
  if (options.refreshSegmentsFromSheet === true) return true;
  if (options.refreshSegmentsFromSheet === false) return false;
  return !isGoogleSheetsServiceAccountConfigured(env);
}

export async function fetchProjectPipelineJobsWithFallback(
  options: FetchProjectPipelineJobsWithFallbackOptions
): Promise<FetchProjectPipelineJobsWithFallbackResult> {
  if (isProjectPipelineAllSheetsTab(options.sheetName)) {
    return fetchAllProjectPipelineJobsWithFallback(options);
  }

  return fetchSingleProjectPipelineSheetTabWithFallback(options);
}

async function fetchSingleProjectPipelineSheetTabWithFallback(
  options: FetchProjectPipelineJobsWithFallbackOptions
): Promise<FetchProjectPipelineJobsWithFallbackResult> {
  const env = options.env ?? process.env;
  const sheetId = getProjectPipelineSheetId(env);
  const sheetName = options.sheetName;
  const accessToken = options.accessToken?.trim();
  const mirrorPreferred = options.mirrorPreferred === true;
  const useOAuthForSheets = mirrorPreferred
    ? options.allowOAuthSheets === true && Boolean(accessToken)
    : Boolean(accessToken);
  const refreshSegmentsFromSheet = shouldRefreshSegmentsFromSheet(options, env);

  if (!options.forceSheets) {
    try {
      const mirroredCount = await countProjectPipelineJobsInSupabase(options.supabase, {
        sheetId,
        sheetName,
      });

      if (mirroredCount > 0) {
        const jobs = await loadProjectPipelineJobsFromSupabaseMirror({
          supabase: options.supabase,
          sheetId,
          sheetName,
          env,
          accessToken,
          refreshSegmentsFromSheet,
        });

        return {
          jobs,
          fieldColumnMap: {},
          dataSource: 'supabase',
        };
      }
    } catch (error) {
      console.warn('[project-pipeline] Supabase read failed, falling back to Google Sheets', error);
    }
  }

  if (options.skipSheetReads) {
    return {
      jobs: [],
      fieldColumnMap: {},
      dataSource: 'supabase',
    };
  }

  if (!isProjectPipelineConfigured(env)) {
    throw new Error('Project Pipeline Google Sheets is not configured');
  }

  const serviceAccountSheetsAvailable = isGoogleSheetsServiceAccountConfigured(env);

  if (
    getProjectPipelineAuthMode(env) === 'oauth' &&
    !useOAuthForSheets &&
    !serviceAccountSheetsAvailable
  ) {
    return {
      jobs: [],
      fieldColumnMap: {},
      dataSource: 'supabase',
    };
  }

  try {
    return await fetchProjectPipelineJobsFromSheetsWithStatusMerge({
      supabase: options.supabase,
      sheetId,
      sheetName,
      env,
      accessToken: useOAuthForSheets ? accessToken : undefined,
    });
  } catch (error) {
    if (isGoogleSheetsReadQuotaError(error)) {
      console.warn('[project-pipeline] Google Sheets quota exceeded; using Supabase mirror if available', error);
    } else {
      console.warn('[project-pipeline] Google Sheets read failed; using partial Supabase mirror', error);
    }

    const mirroredCount = await countProjectPipelineJobsInSupabase(options.supabase, {
      sheetId,
      sheetName,
    }).catch(() => 0);

    if (mirroredCount > 0) {
      const jobs = await loadProjectPipelineJobsFromSupabaseMirror({
        supabase: options.supabase,
        sheetId,
        sheetName,
        env,
        accessToken,
        refreshSegmentsFromSheet,
      });
      return { jobs, fieldColumnMap: {}, dataSource: 'supabase' };
    }

    throw error;
  }
}

async function fetchProjectPipelineJobsFromSheetsWithStatusMerge(input: {
  supabase: SupabaseClient;
  sheetId: string;
  sheetName: string;
  env?: NodeJS.ProcessEnv;
  accessToken?: string;
  bypassCache?: boolean;
}): Promise<FetchProjectPipelineJobsWithFallbackResult> {
  const sheetResult = await fetchProjectPipelineJobs({
    env: input.env,
    accessToken: input.accessToken,
    sheetName: input.sheetName,
    bypassCache: input.bypassCache,
  });

  const [storedStatusByJobNumber, uiEditedByJobNumber] = await Promise.all([
    fetchProjectPipelineStoredStatusMap(input.supabase, {
      sheetId: input.sheetId,
      sheetName: input.sheetName,
      env: input.env,
    }),
    fetchProjectPipelineUiEditedJobsMap(input.supabase, {
      sheetId: input.sheetId,
      sheetName: input.sheetName,
      env: input.env,
    }),
  ]);

  const jobs = mergeSheetJobsWithSupabaseOverrides(
    sheetResult.jobs,
    storedStatusByJobNumber,
    uiEditedByJobNumber
  );

  return {
    jobs,
    fieldColumnMap: sheetResult.fieldColumnMap,
    dataSource: 'sheets',
  };
}

function sortAllYearsProjectPipelineJobs(jobs: readonly ProjectPipelineJob[]): ProjectPipelineJob[] {
  return sortProjectPipelineJobsForAllYearsView(
    dedupeProjectPipelineJobs(jobs, PROJECT_PIPELINE_ALL_SHEETS_TAB)
  );
}

function groupProjectPipelineJobsBySheetTab(
  jobs: readonly ProjectPipelineJob[]
): Map<string, ProjectPipelineJob[]> {
  const grouped = new Map<string, ProjectPipelineJob[]>();

  for (const job of jobs) {
    const sheetName = job.pipelineSheetName?.trim();
    if (!sheetName) continue;
    const existing = grouped.get(sheetName) ?? [];
    existing.push(job);
    grouped.set(sheetName, existing);
  }

  return grouped;
}

async function fetchAllProjectPipelineJobsWithFallback(
  options: FetchProjectPipelineJobsWithFallbackOptions
): Promise<FetchProjectPipelineJobsWithFallbackResult> {
  const env = options.env ?? process.env;
  const sheetId = getProjectPipelineSheetId(env);
  const accessToken = options.accessToken?.trim();
  const refreshSegmentsFromSheet = shouldRefreshSegmentsFromSheet(options, env);

  if (!options.forceSheets) {
    try {
      const allMirroredJobs = await fetchAllProjectPipelineJobsFromSupabase(options.supabase, {
        sheetId,
        env,
      });

      if (allMirroredJobs.length > 0) {
        const mirroredBySheet = groupProjectPipelineJobsBySheetTab(allMirroredJobs);
        const tabResults: FetchProjectPipelineJobsWithFallbackResult[] = [];

        for (const sheetName of PROJECT_PIPELINE_SHEET_TABS) {
          const mirrored = mirroredBySheet.get(sheetName) ?? [];

          if (mirrored.length > 0) {
            const jobs = await refreshMirroredPipelineJobs({
              jobs: mirrored,
              sheetId,
              sheetName,
              env,
              accessToken,
              refreshSegmentsFromSheet,
            });
            tabResults.push({
              jobs,
              fieldColumnMap: {},
              dataSource: 'supabase',
            });
            continue;
          }

          if (options.skipSheetReads) {
            tabResults.push({
              jobs: [],
              fieldColumnMap: {} as ProjectPipelineFieldColumnMap,
              dataSource: 'supabase',
            });
            continue;
          }

          try {
            tabResults.push(
              await fetchSingleProjectPipelineSheetTabWithFallback({
                ...options,
                sheetName,
              })
            );
          } catch (error) {
            console.warn(
              `[project-pipeline] Failed to load ${sheetName} for all-years view`,
              error
            );
            tabResults.push({
              jobs: [],
              fieldColumnMap: {} as ProjectPipelineFieldColumnMap,
              dataSource: 'supabase',
            });
          }
        }

        const jobs = sortAllYearsProjectPipelineJobs(
          tabResults.flatMap((result) => result.jobs)
        );
        const fieldColumnMap =
          tabResults.find((result) => Object.keys(result.fieldColumnMap).length > 0)
            ?.fieldColumnMap ?? {};
        const dataSource = tabResults.some(
          (result) => result.dataSource === 'sheets' && result.jobs.length > 0
        )
          ? 'sheets'
          : 'supabase';

        return {
          jobs,
          fieldColumnMap,
          dataSource,
        };
      }
    } catch (error) {
      console.warn('[project-pipeline] Bulk Supabase read failed for all-years view', error);
    }
  }

  const tabResults: FetchProjectPipelineJobsWithFallbackResult[] = [];

  for (const sheetName of PROJECT_PIPELINE_SHEET_TABS) {
    try {
      tabResults.push(
        await fetchSingleProjectPipelineSheetTabWithFallback({
          ...options,
          sheetName,
        })
      );
    } catch (error) {
      console.warn(
        `[project-pipeline] Failed to load ${sheetName} for all-years view`,
        error
      );
      tabResults.push({
        jobs: [],
        fieldColumnMap: {} as ProjectPipelineFieldColumnMap,
        dataSource: 'supabase',
      });
    }
  }

  const jobs = sortAllYearsProjectPipelineJobs(tabResults.flatMap((result) => result.jobs));
  const fieldColumnMap =
    tabResults.find((result) => Object.keys(result.fieldColumnMap).length > 0)?.fieldColumnMap ??
    {};
  const dataSource = tabResults.some(
    (result) => result.dataSource === 'sheets' && result.jobs.length > 0
  )
    ? 'sheets'
    : 'supabase';

  return {
    jobs,
    fieldColumnMap,
    dataSource,
  };
}
