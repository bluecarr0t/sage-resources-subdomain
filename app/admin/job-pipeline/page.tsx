'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ProjectPipelineTable } from '@/components/project-pipeline/ProjectPipelineTable';
import {
  applyProjectPipelineMetricFilter,
  ProjectPipelineMetrics,
  resolveProjectPipelineMetricFilter,
} from '@/components/project-pipeline/ProjectPipelineMetrics';
import { ProjectPipelineOAuthExpiryBanner } from '@/components/project-pipeline/ProjectPipelineOAuthExpiryBanner';
import {
  ProjectPipelineOAuthSyncProgress,
  type PipelineOAuthSyncProgress,
} from '@/components/project-pipeline/ProjectPipelineOAuthSyncProgress';
import { Button } from '@/components/ui';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import {
  filterJobsForDemoAuthor,
  filterAssignedAuthorActiveJobs,
  PROJECT_PIPELINE_DEMO_AUTHOR,
} from '@/lib/project-pipeline/author-preview';
import {
  DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER,
  isProjectPipelineAllSheetsTab,
  resolveProjectPipelineSheetSelection,
  resolveProjectPipelineSheetTab,
} from '@/lib/project-pipeline/sheet-tabs';

import {
  canUseProjectPipelineConsultantWorkloadView,
  placePipelineConsultantWorkloadToggleAfterAuthorPreview,
} from '@/lib/project-pipeline/consultant-workload-view';
import { requestGoogleSheetsAccessToken } from '@/lib/google-sheets-oauth-client';
import {
  clearGoogleSheetsOAuthAccessToken,
  readGoogleSheetsOAuthAccessToken,
  writeGoogleSheetsOAuthAccessToken,
} from '@/lib/google-sheets-oauth-session';
import {
  shouldShowGoogleSheetsOAuthReconnectPrompt,
  shouldSuppressGoogleSheetsOAuthReconnectPrompt,
  silentlyRefreshGoogleSheetsAccessToken,
} from '@/lib/google-sheets-oauth-refresh';
import { googleSheetsPipelineOAuthScopeString } from '@/lib/google-sheets-oauth-scopes';
import {
  readPersistedSegmentFilter,
  writePersistedSegmentFilter,
} from '@/lib/project-pipeline/segment-filter-storage';
import {
  readPersistedSheetFilter,
  resolveInitialSheetFilter,
  writePersistedSheetFilter,
} from '@/lib/project-pipeline/sheet-filter-storage';
import {
  createInitialPipelineOAuthSyncProgress,
  syncProjectPipelineTabsWithOAuth,
} from '@/lib/project-pipeline/oauth-sync-client';
import {
  matchesProjectPipelineJobRef,
  removeProjectPipelineJobFromList,
  upsertProjectPipelineJobInList,
} from '@/lib/project-pipeline/resolve-job-for-edit';
import { resolveProjectPipelineSyncJobsAdded } from '@/lib/project-pipeline/sync-success-message';
import type { ProjectPipelineApiResponse, ProjectPipelineJob } from '@/lib/project-pipeline/types';
import type { ProjectPipelineReviewNoteType } from '@/lib/project-pipeline/review-notes';

const PIPELINE_OAUTH_SCOPE = googleSheetsPipelineOAuthScopeString();
const PIPELINE_OAUTH_BACKFILL_KEY = 'project-pipeline-oauth-backfill-attempted';

/** Manual sheet → Supabase refresh is available to admins and pipeline-wide viewers. */
const SHOW_PROJECT_PIPELINE_REFRESH = true;

type ProjectPipelineSyncResponseBody = {
  error?: string;
  message?: string;
  syncAll?: boolean;
  jobsFetched?: number;
  jobsUpserted?: number;
  jobsAdded?: number;
  totalJobsUpserted?: number;
  totalJobsAdded?: number;
  lastSyncedAt?: string;
};

function buildProjectPipelineSyncSuccessMessage(
  t: ReturnType<typeof useTranslations<'admin.projectPipeline'>>,
  response: ProjectPipelineSyncResponseBody
): string {
  return t('refreshSyncSuccessAdded', {
    added: resolveProjectPipelineSyncJobsAdded(response),
  });
}

export default function ProjectPipelinePage() {
  const t = useTranslations('admin.projectPipeline');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ProjectPipelineApiResponse | null>(null);
  const [jobs, setJobs] = useState<ProjectPipelineJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [oauthSyncProgress, setOauthSyncProgress] = useState<PipelineOAuthSyncProgress[]>([]);
  const [oauthSyncActive, setOauthSyncActive] = useState(false);
  const [oauthExpiryPrompt, setOauthExpiryPrompt] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<string>(() => {
    const persisted = readPersistedSegmentFilter(searchParams);
    return persisted ?? '';
  });
  const [segmentDefaultApplied, setSegmentDefaultApplied] = useState(
    () => readPersistedSegmentFilter(searchParams) !== null
  );
  const [dueWithin30DaysOnly, setDueWithin30DaysOnly] = useState(false);
  const [outdoorPastDueOnly, setOutdoorPastDueOnly] = useState(false);
  const [metricTableFilterVersion, setMetricTableFilterVersion] = useState(0);
  const [authorPreviewActive, setAuthorPreviewActive] = useState(false);
  const [consultantWorkloadActive, setConsultantWorkloadActive] = useState(false);
  const [sheetName, setSheetName] = useState(() => resolveInitialSheetFilter(searchParams));
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null
  );

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSaveResult = useCallback((result: { success: boolean; message: string }) => {
    setToast({ message: result.message, variant: result.success ? 'success' : 'error' });
  }, []);

  const handleSegmentFilterChange = useCallback(
    (value: string) => {
      setSegmentFilter(value);
      writePersistedSegmentFilter(value, { pathname, router });
    },
    [pathname, router]
  );

  const handleSheetNameChange = useCallback(
    (value: string) => {
      const selection = resolveProjectPipelineSheetSelection(value);
      setSheetName(selection);
      writePersistedSheetFilter(selection, { pathname, router });
    },
    [pathname, router]
  );

  useEffect(() => {
    let cancelled = false;

    const maintainOAuthSession = async () => {
      if (connecting) return;

      const currentData = dataRef.current;
      if (!currentData || currentData.requiresOAuth) {
        if (!cancelled) setOauthExpiryPrompt(false);
        return;
      }

      if (!readGoogleSheetsOAuthAccessToken(PIPELINE_OAUTH_SCOPE)) {
        if (!cancelled) setOauthExpiryPrompt(false);
        return;
      }

      const promptContext = {
        cronSyncEnabled: currentData.cronSyncEnabled,
        mirrorIncomplete: currentData.mirrorIncomplete,
      };

      if (shouldSuppressGoogleSheetsOAuthReconnectPrompt(promptContext)) {
        if (!cancelled) setOauthExpiryPrompt(false);
        return;
      }

      if (currentData.oauthClientId) {
        const refreshed = await silentlyRefreshGoogleSheetsAccessToken(
          currentData.oauthClientId,
          PIPELINE_OAUTH_SCOPE
        );
        if (cancelled) return;
        if (refreshed) {
          setOauthExpiryPrompt(false);
          return;
        }
      }

      if (!cancelled) {
        setOauthExpiryPrompt(
          shouldShowGoogleSheetsOAuthReconnectPrompt(PIPELINE_OAUTH_SCOPE, promptContext)
        );
      }
    };

    void maintainOAuthSession();
    const timer = window.setInterval(() => void maintainOAuthSession(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    connecting,
    loading,
    data?.requiresOAuth,
    data?.cronSyncEnabled,
    data?.mirrorIncomplete,
    data?.oauthClientId,
  ]);

  const assignedAuthorViewActive = Boolean(
    data && !data.requiresOAuth && !data.missingDisplayName && (authorPreviewActive || !data.canViewAll)
  );

  const allYearsView = isProjectPipelineAllSheetsTab(sheetName);
  const assignedAuthorFilterOptions = {
    allYearsView,
  };

  const displayJobs = useMemo(() => {
    if (authorPreviewActive) {
      return filterJobsForDemoAuthor(jobs, assignedAuthorFilterOptions);
    }
    if (data && !data.canViewAll && !data.missingDisplayName) {
      return filterAssignedAuthorActiveJobs(jobs, assignedAuthorFilterOptions);
    }
    return jobs;
  }, [jobs, authorPreviewActive, allYearsView, data]);

  const metricsJobs = assignedAuthorViewActive ? displayJobs : jobs;

  const activeMetricFilter = useMemo(
    () =>
      resolveProjectPipelineMetricFilter(
        segmentFilter,
        dueWithin30DaysOnly,
        outdoorPastDueOnly
      ),
    [segmentFilter, dueWithin30DaysOnly, outdoorPastDueOnly]
  );

  const handleMetricFilterChange = useCallback(
    (filter: Parameters<typeof applyProjectPipelineMetricFilter>[0]) => {
      const next = applyProjectPipelineMetricFilter(filter);
      handleSegmentFilterChange(next.segmentFilter);
      setDueWithin30DaysOnly(next.dueWithin30DaysOnly);
      setOutdoorPastDueOnly(next.outdoorPastDueOnly);
      setConsultantWorkloadActive(false);
      setMetricTableFilterVersion((version) => version + 1);
    },
    [handleSegmentFilterChange]
  );

  const dataRef = useRef(data);
  dataRef.current = data;

  const loadJobs = useCallback(
    async (
      accessToken?: string,
      nextSheetName: string = sheetName,
      options?: { silent?: boolean; clearJobs?: boolean; skipSheetReads?: boolean }
    ) => {
      if (!options?.silent) {
        setLoading(true);
        if (options?.clearJobs) {
          setJobs([]);
        }
      }
      setLoadError(null);
      if (!dataRef.current) {
        setError(null);
      }
      try {
        const query = new URLSearchParams({ sheetName: nextSheetName });
        if (options?.skipSheetReads) {
          query.set('skipSheetReads', '1');
        }
        const res = await fetch(
          `/api/admin/project-pipeline?${query.toString()}`,
          accessToken
            ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, sheetName: nextSheetName }),
              }
            : undefined
        );
        const body = (await res.json()) as ProjectPipelineApiResponse & {
          message?: string;
          error?: string;
        };
        if (!res.ok) {
          if (accessToken) {
            clearGoogleSheetsOAuthAccessToken();
            const fallbackRes = await fetch(`/api/admin/project-pipeline?${query.toString()}`);
            const fallbackBody = (await fallbackRes.json()) as ProjectPipelineApiResponse & {
              message?: string;
              error?: string;
            };
            if (fallbackRes.ok) {
              setData(fallbackBody);
              setLastSyncedAt(fallbackBody.lastSyncedAt ?? null);
            }
          }
          throw new Error(body.message || body.error || t('loadError'));
        }
        setData(body);
        setError(null);
        setLoadError(null);
        setLastSyncedAt(body.lastSyncedAt ?? null);
        if (!body.requiresOAuth) {
          setJobs(body.jobs ?? []);
          if (!segmentDefaultApplied) {
            const persisted = readPersistedSegmentFilter(searchParams);
            if (persisted === null) {
              if (body.canViewAll || body.viewerIsAdmin) {
                handleSegmentFilterChange('');
              } else if (body.defaultSegmentFilter) {
                handleSegmentFilterChange(body.defaultSegmentFilter);
              }
            }
            setSegmentDefaultApplied(true);
          }

          if (
            accessToken &&
            body.mirrorIncomplete &&
            typeof window !== 'undefined' &&
            !window.sessionStorage.getItem(PIPELINE_OAUTH_BACKFILL_KEY)
          ) {
            window.sessionStorage.setItem(PIPELINE_OAUTH_BACKFILL_KEY, '1');
            void (async () => {
              try {
                setOauthSyncActive(true);
                setOauthSyncProgress(createInitialPipelineOAuthSyncProgress());
                await syncProjectPipelineTabsWithOAuth({
                  accessToken,
                  onProgress: setOauthSyncProgress,
                });
                await loadJobs(accessToken, nextSheetName, { silent: true });
              } catch {
                // Non-fatal; user can reconnect manually.
              } finally {
                setOauthSyncActive(false);
              }
            })();
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : t('loadError');
        if (dataRef.current) {
          setLoadError(message);
        } else {
          setError(message);
        }
        if (!accessToken && !dataRef.current) {
          setData(null);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
        setConnecting(false);
      }
    },
    [handleSegmentFilterChange, segmentDefaultApplied, sheetName, t]
  );

  const loadJobsRef = useRef(loadJobs);
  loadJobsRef.current = loadJobs;
  const sheetLoadCountRef = useRef(0);

  const [syncingFromSheet, setSyncingFromSheet] = useState(false);

  const reconnectOAuthAndSyncSheets = useCallback(async () => {
    const oauthClientId = dataRef.current?.oauthClientId;
    if (!oauthClientId) {
      throw new Error(t('refreshSyncOAuthRequired'));
    }

    setConnecting(true);
    setOauthSyncActive(true);
    setOauthSyncProgress(createInitialPipelineOAuthSyncProgress());

    try {
      const scope = PIPELINE_OAUTH_SCOPE;
      const { accessToken, expiresIn } = await requestGoogleSheetsAccessToken(
        oauthClientId,
        scope
      );
      writeGoogleSheetsOAuthAccessToken(accessToken, scope, expiresIn);
      setOauthExpiryPrompt(false);

      await syncProjectPipelineTabsWithOAuth({
        accessToken,
        onProgress: setOauthSyncProgress,
      });

      await loadJobs(accessToken, sheetName, { silent: true });
    } finally {
      setOauthSyncActive(false);
      setConnecting(false);
    }
  }, [loadJobs, sheetName, t]);

  const syncFromSheet = useCallback(async () => {
    setSyncingFromSheet(true);
    setError(null);
    try {
      const cronSyncEnabled = dataRef.current?.cronSyncEnabled ?? false;
      const useOAuthSync = !cronSyncEnabled;

      const syncPayload = isProjectPipelineAllSheetsTab(sheetName)
        ? { syncAll: true }
        : { sheetName };

      const finishSync = async (
        responseBody: ProjectPipelineSyncResponseBody,
        accessToken?: string
      ) => {
        if (responseBody.lastSyncedAt) {
          setLastSyncedAt(responseBody.lastSyncedAt);
        }
        await loadJobs(accessToken, sheetName, { silent: true, skipSheetReads: true });
        setToast({
          message: buildProjectPipelineSyncSuccessMessage(t, responseBody),
          variant: 'success',
        });
      };

      if (useOAuthSync) {
        const accessToken =
          readGoogleSheetsOAuthAccessToken(PIPELINE_OAUTH_SCOPE) ?? undefined;
        if (!accessToken) {
          throw new Error(t('refreshSyncOAuthRequired'));
        }

        const res = await fetch('/api/admin/project-pipeline/oauth-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken,
            ...syncPayload,
          }),
        });
        const responseBody = (await res.json()) as ProjectPipelineSyncResponseBody;
        if (!res.ok) {
          throw new Error(responseBody.message || responseBody.error || t('refreshSyncError'));
        }
        await finishSync(responseBody, accessToken);
        return;
      }

      const res = await fetch('/api/admin/project-pipeline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload),
      });
      const responseBody = (await res.json()) as ProjectPipelineSyncResponseBody;
      if (!res.ok) {
        throw new Error(responseBody.message || responseBody.error || t('refreshSyncError'));
      }
      await finishSync(responseBody);
    } catch (err) {
      const message =
        err instanceof Error && /share the pipeline spreadsheet/i.test(err.message)
          ? err.message
          : err instanceof Error
            ? err.message
            : t('refreshSyncError');
      if (dataRef.current && !dataRef.current.requiresOAuth) {
        setToast({ message, variant: 'error' });
      } else {
        setError(message);
        setToast({ message, variant: 'error' });
      }
    } finally {
      setSyncingFromSheet(false);
    }
  }, [loadJobs, sheetName, t]);

  const connectGoogleSheets = useCallback(async () => {
    if (!data?.oauthClientId) return;
    setError(null);
    try {
      await reconnectOAuthAndSyncSheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('oauthError'));
    }
  }, [data?.oauthClientId, reconnectOAuthAndSyncSheets, t]);

  const saveJob = useCallback(
    async (
      job: ProjectPipelineJob,
      options?: { reviewFeedbackNote?: string }
    ): Promise<ProjectPipelineJob> => {
      const res = await fetch('/api/admin/project-pipeline/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          ...(options?.reviewFeedbackNote
            ? { reviewFeedbackNote: options.reviewFeedbackNote }
            : {}),
          ...(authorPreviewActive
            ? { previewAsDisplayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName }
            : {}),
        }),
      });

      const body = (await res.json()) as {
        error?: string;
        message?: string;
        warning?: string;
        job?: ProjectPipelineJob;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('saveJobError'));
      }
      return body.job ?? job;
    },
    [t, authorPreviewActive]
  );

  const createJob = useCallback(
    async (job: ProjectPipelineJob): Promise<ProjectPipelineJob> => {
      const res = await fetch('/api/admin/project-pipeline/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });

      const body = (await res.json()) as {
        error?: string;
        message?: string;
        job?: ProjectPipelineJob;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('createJobError'));
      }
      return body.job ?? job;
    },
    [t]
  );

  const deleteJob = useCallback(
    async (job: ProjectPipelineJob): Promise<void> => {
      const res = await fetch('/api/admin/project-pipeline/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      });

      const body = (await res.json()) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('deleteJobError'));
      }
    },
    [t]
  );

  const submitReviewAction = useCallback(
    async (
      job: ProjectPipelineJob,
      action: ProjectPipelineReviewNoteType,
      note: string,
      reviewStatus?: string
    ): Promise<ProjectPipelineJob> => {
      const res = await fetch('/api/admin/project-pipeline/jobs/review-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          action,
          note,
          ...(reviewStatus ? { reviewStatus } : {}),
          ...(authorPreviewActive
            ? { previewAsDisplayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName }
            : {}),
        }),
      });

      const body = (await res.json()) as {
        error?: string;
        message?: string;
        job?: ProjectPipelineJob;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('reviewActionError'));
      }
      return body.job ?? job;
    },
    [authorPreviewActive, t]
  );

  const addJobNote = useCallback(
    async (job: ProjectPipelineJob, note: string): Promise<ProjectPipelineJob> => {
      const res = await fetch('/api/admin/project-pipeline/jobs/job-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          note,
          ...(authorPreviewActive
            ? { previewAsDisplayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName }
            : {}),
        }),
      });

      const body = (await res.json()) as {
        error?: string;
        message?: string;
        job?: ProjectPipelineJob;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('jobNoteAddError'));
      }
      return body.job ?? job;
    },
    [authorPreviewActive, t]
  );

  const saveProjectStatus = useCallback(
    async (
      job: ProjectPipelineJob,
      projectStatus: string,
      manualOverride = false
    ): Promise<ProjectPipelineJob> => {
      const res = await fetch('/api/admin/project-pipeline/jobs/project-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          projectStatus,
          ...(manualOverride ? { manualOverride: true } : {}),
          ...(authorPreviewActive
            ? { previewAsDisplayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName }
            : {}),
        }),
      });

      const body = (await res.json()) as {
        error?: string;
        message?: string;
        job?: ProjectPipelineJob;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t('saveProjectStatusError'));
      }
      return (
        body.job ?? {
          ...job,
          projectStatus,
          projectStatusManual: manualOverride,
          uiSourceOfTruth: true,
        }
      );
    },
    [authorPreviewActive, t]
  );

  const handleJobUpdated = useCallback((job: ProjectPipelineJob) => {
    const matchesJob = (row: ProjectPipelineJob) =>
      matchesProjectPipelineJobRef(row, job, sheetName);

    setJobs((current) => current.map((row) => (matchesJob(row) ? job : row)));
    setData((current) =>
      current
        ? {
            ...current,
            jobs: current.jobs.map((row) => (matchesJob(row) ? job : row)),
          }
        : current
    );
    window.dispatchEvent(new Event('project-pipeline-review-todos-changed'));
  }, [sheetName]);

  const handleJobDeleted = useCallback((job: ProjectPipelineJob) => {
    const matchesJob = (row: ProjectPipelineJob) =>
      matchesProjectPipelineJobRef(row, job, sheetName);

    setJobs((current) => removeProjectPipelineJobFromList(current, job, sheetName));
    setData((current) =>
      current
        ? {
            ...current,
            jobs: removeProjectPipelineJobFromList(current.jobs, job, sheetName),
          }
        : current
    );
    window.dispatchEvent(new Event('project-pipeline-review-todos-changed'));
  }, [sheetName]);

  const handleJobCreated = useCallback(
    (job: ProjectPipelineJob) => {
      const jobSheetTab = resolveProjectPipelineSheetTab(job.pipelineSheetName);
      const shouldInclude =
        isProjectPipelineAllSheetsTab(sheetName) ||
        resolveProjectPipelineSheetTab(sheetName) === jobSheetTab;

      if (!shouldInclude) return;

      setJobs((current) => upsertProjectPipelineJobInList(current, job, sheetName));
      setData((current) =>
        current
          ? {
              ...current,
              jobs: upsertProjectPipelineJobInList(current.jobs, job, sheetName),
            }
          : current
      );
      window.dispatchEvent(new Event('project-pipeline-review-todos-changed'));
    },
    [sheetName]
  );

  const retryLoadJobs = useCallback(() => {
    const cachedToken = readGoogleSheetsOAuthAccessToken(PIPELINE_OAUTH_SCOPE) ?? undefined;
    void loadJobs(cachedToken, sheetName, { clearJobs: false });
  }, [loadJobs, sheetName]);

  useEffect(() => {
    const cachedToken = readGoogleSheetsOAuthAccessToken(PIPELINE_OAUTH_SCOPE) ?? undefined;
    const isSheetChange = sheetLoadCountRef.current > 0;
    sheetLoadCountRef.current += 1;
    void loadJobsRef.current(cachedToken, sheetName, { clearJobs: isSheetChange });
  }, [sheetName]);

  const isInitialLoad = loading && !data;
  const jobsLoading =
    loading && Boolean(data) && !data?.requiresOAuth && displayJobs.length === 0;

  if (isInitialLoad) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="py-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 border-2 border-neutral-300/80 dark:border-neutral-600 border-t-[#4a624a] rounded-full animate-spin mb-4" />
            {t('loading')}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div
          className={`${adminPageHeadingMargin} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}
        >
          <div className="min-w-0">
            <h1 className={`${adminPageTitle} mb-1`}>{t('title')}</h1>
            <p className={adminPageDescription}>{t('subtitle')}</p>
          </div>
          {data && !data.requiresOAuth ? (
            <ProjectPipelineMetrics
              jobs={metricsJobs}
              activeFilter={activeMetricFilter}
              onFilterChange={handleMetricFilterChange}
            />
          ) : null}
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            <p className="font-medium">{t('loadError')}</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : null}

        {loadError && data && !data.requiresOAuth ? (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t('loadRetryTitle')}</p>
              <p className="mt-1 text-sm">{loadError}</p>
            </div>
            <Button type="button" variant="secondary" onClick={retryLoadJobs} disabled={loading}>
              {loading ? t('loading') : t('loadRetry')}
            </Button>
          </div>
        ) : null}

        {oauthExpiryPrompt && data && !data.requiresOAuth ? (
          <ProjectPipelineOAuthExpiryBanner
            onReconnect={() => void connectGoogleSheets()}
            reconnecting={connecting}
          />
        ) : null}

        {data?.requiresOAuth ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {t('oauthTitle')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
              {t('oauthDescription')}
            </p>
            <Button
              type="button"
              variant="primary"
              className="mt-6"
              disabled={connecting}
              onClick={() => void connectGoogleSheets()}
            >
              {connecting ? t('oauthConnecting') : t('oauthConnect')}
            </Button>
            <ProjectPipelineOAuthSyncProgress progress={oauthSyncProgress} active={oauthSyncActive} />
          </div>
        ) : null}

        {oauthSyncActive && data && !data.requiresOAuth && !data.cronSyncEnabled ? (
          <div className="mb-6">
            <ProjectPipelineOAuthSyncProgress progress={oauthSyncProgress} active={oauthSyncActive} />
          </div>
        ) : null}

        {data && !data.requiresOAuth ? (
          <ProjectPipelineTable
            jobs={displayJobs}
            canViewAll={authorPreviewActive ? false : data.canViewAll}
            missingDisplayName={Boolean(data.missingDisplayName)}
            sheetName={sheetName}
            onSheetNameChange={handleSheetNameChange}
            availableSheetTabs={data.availableSheetTabs ?? []}
            segmentFilter={segmentFilter}
            onSegmentFilterChange={handleSegmentFilterChange}
            dueWithin30DaysOnly={dueWithin30DaysOnly}
            onDueWithin30DaysOnlyChange={setDueWithin30DaysOnly}
            outdoorPastDueOnly={outdoorPastDueOnly}
            onOutdoorPastDueOnlyChange={setOutdoorPastDueOnly}
            showAuthorPreviewToggle={Boolean(data.canAuthorPreview)}
            authorPreviewActive={authorPreviewActive}
            onAuthorPreviewToggle={() => setAuthorPreviewActive((active) => !active)}
            authorPreviewDisplayName={PROJECT_PIPELINE_DEMO_AUTHOR.displayName}
            showConsultantWorkloadToggle={canUseProjectPipelineConsultantWorkloadView(
              data.viewerEmail
            )}
            consultantWorkloadToggleAfterAuthorPreview={placePipelineConsultantWorkloadToggleAfterAuthorPreview(
              data.viewerEmail
            )}
            consultantWorkloadActive={consultantWorkloadActive}
            onConsultantWorkloadToggle={() => setConsultantWorkloadActive((active) => !active)}
            consultantWorkloadAuthors={data.consultantWorkloadAuthors}
            pipelineConsultantOptions={data.pipelineConsultantOptions}
            viewerDisplayName={
              authorPreviewActive
                ? PROJECT_PIPELINE_DEMO_AUTHOR.displayName
                : data.viewerDisplayName
            }
            viewerIsAdmin={authorPreviewActive ? false : Boolean(data.viewerIsAdmin)}
            onJobUpdated={handleJobUpdated}
            onSaveJob={saveJob}
            onDeleteJob={authorPreviewActive ? undefined : deleteJob}
            onJobDeleted={handleJobDeleted}
            onReviewAction={submitReviewAction}
            onAddJobNote={authorPreviewActive ? undefined : addJobNote}
            onSaveProjectStatus={saveProjectStatus}
            onSaveResult={handleSaveResult}
            showAddJob={!authorPreviewActive && Boolean(data.viewerIsAdmin)}
            onCreateJob={createJob}
            onJobCreated={handleJobCreated}
            syncingFromSheet={syncingFromSheet}
            cronSyncEnabled={Boolean(data.cronSyncEnabled)}
            onSyncFromSheet={
              SHOW_PROJECT_PIPELINE_REFRESH &&
              !authorPreviewActive &&
              (data.canViewAll || data.viewerIsAdmin)
                ? syncFromSheet
                : undefined
            }
            lastSyncedAt={lastSyncedAt}
            jobsLoading={jobsLoading}
            metricTableFilterVersion={metricTableFilterVersion}
            defaultProjectStatusFilter={
              data.defaultProjectStatusFilter ?? undefined
            }
          />
        ) : null}
      </div>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.variant === 'success'
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
              : 'bg-red-700 text-white dark:bg-red-900 dark:text-red-50'
          }`}
        >
          {toast.variant === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-300 dark:text-emerald-700" aria-hidden />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 opacity-70 hover:opacity-100"
            aria-label={t('dismissToast')}
          >
            ×
          </button>
        </div>
      ) : null}
    </main>
  );
}
