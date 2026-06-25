'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Select } from '@/components/ui';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle } from '@/lib/admin-ui';
import { requestGoogleSheetsAccessToken } from '@/lib/google-sheets-oauth-client';
import {
  clearGoogleSheetsOAuthAccessToken,
  readGoogleSheetsOAuthAccessToken,
  writeGoogleSheetsOAuthAccessToken,
} from '@/lib/google-sheets-oauth-session';
import { googleSheetsPipelineOAuthScopeString } from '@/lib/google-sheets-oauth-scopes';
import type {
  PipelineWorkloadView,
  ProjectPipelineWorkloadApiResponse,
} from '@/lib/project-pipeline/build-workload-api-response';
import { DEFAULT_PROJECT_PIPELINE_SHEET_TAB, formatProjectPipelineSheetYearLabel } from '@/lib/project-pipeline/sheet-tabs';
import {
  DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER,
  type PipelineWorkloadSegmentFilter,
} from '@/lib/project-pipeline/workload';
import { applyWorkloadSegmentFilter } from '@/lib/project-pipeline/workload-segment-filter';
import { PipelineWorkloadByYearTable } from '@/components/admin/PipelineWorkloadByYearTable';
import { PipelineWorkloadChartsPanel } from '@/components/admin/PipelineWorkloadCharts';

const PIPELINE_OAUTH_SCOPE = googleSheetsPipelineOAuthScopeString();

type WorkloadTab = PipelineWorkloadView;

async function readJsonResponse<T>(res: Response): Promise<T & { error?: string; message?: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return {} as T & { error?: string; message?: string };
  }
  return JSON.parse(text) as T & { error?: string; message?: string };
}

export default function PipelineWorkloadPage() {
  const t = useTranslations('admin.pipelineWorkload');
  const [activeTab, setActiveTab] = useState<WorkloadTab>('charts');
  const [sheetName, setSheetName] = useState(DEFAULT_PROJECT_PIPELINE_SHEET_TAB);
  const [segmentFilter, setSegmentFilter] = useState<PipelineWorkloadSegmentFilter>(
    DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER
  );
  const [data, setData] = useState<ProjectPipelineWorkloadApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkload = useCallback(
    async (
      options: {
        view?: WorkloadTab;
        nextSheetName?: string;
        accessToken?: string;
        allowOAuthSheets?: boolean;
      } = {}
    ) => {
      const view = options.view ?? activeTab;
      const nextSheetName = options.nextSheetName ?? sheetName;
      const allowOAuthSheets = options.allowOAuthSheets === true;
      const accessToken =
        options.accessToken ??
        (allowOAuthSheets ? undefined : readGoogleSheetsOAuthAccessToken(PIPELINE_OAUTH_SCOPE) ?? undefined);

      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          view,
          segmentFilter: DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER,
        });
        if (view === 'byYear' || view === 'charts') {
          query.set('sheetName', nextSheetName);
        }

        const fetchWorkload = async (useOAuth: boolean, token?: string) => {
          const oauthToken = useOAuth ? token : undefined;
          return fetch(
            `/api/admin/project-pipeline/workload?${query.toString()}`,
            oauthToken
              ? {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessToken: oauthToken,
                    allowOAuthSheets: true,
                    view,
                    sheetName: view === 'byYear' || view === 'charts' ? nextSheetName : undefined,
                    segmentFilter: DEFAULT_PIPELINE_WORKLOAD_SEGMENT_FILTER,
                  }),
                }
              : undefined
          );
        };

        let res = await fetchWorkload(allowOAuthSheets, accessToken);
        let body = await readJsonResponse<ProjectPipelineWorkloadApiResponse>(res);

        if (body.requiresOAuth && accessToken && !allowOAuthSheets) {
          res = await fetchWorkload(true, accessToken);
          body = await readJsonResponse<ProjectPipelineWorkloadApiResponse>(res);
        }

        if (!res.ok) {
          throw new Error(body.message || body.error || t('loadError'));
        }

        setData(body);
        if (!body.requiresOAuth && (body.view === 'byYear' || body.view === 'charts') && body.sheetName) {
          setSheetName(body.sheetName);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadError'));
        if (!allowOAuthSheets && !accessToken) {
          setData(null);
        }
      } finally {
        setLoading(false);
        setConnecting(false);
      }
    },
    [activeTab, sheetName, t]
  );

  const connectGoogleSheets = useCallback(async () => {
    if (!data?.oauthClientId) return;
    setConnecting(true);
    setError(null);
    try {
      const { accessToken, expiresIn } = await requestGoogleSheetsAccessToken(
        data.oauthClientId,
        PIPELINE_OAUTH_SCOPE
      );
      writeGoogleSheetsOAuthAccessToken(accessToken, PIPELINE_OAUTH_SCOPE, expiresIn);
      await loadWorkload({ accessToken, allowOAuthSheets: true });
    } catch (err) {
      setConnecting(false);
      clearGoogleSheetsOAuthAccessToken();
      setError(err instanceof Error ? err.message : t('oauthError'));
    }
  }, [data?.oauthClientId, loadWorkload, t]);

  useEffect(() => {
    void loadWorkload({
      view: activeTab,
      nextSheetName: sheetName,
    });
  }, [loadWorkload, activeTab, sheetName]);

  const displayData = useMemo(
    () => (data ? applyWorkloadSegmentFilter(data, segmentFilter) : null),
    [data, segmentFilter]
  );

  const sheetTabs =
    data?.availableSheetTabs?.map((tab) => tab.sheetName) ?? [DEFAULT_PROJECT_PIPELINE_SHEET_TAB];

  const subtitle =
    activeTab === 'charts' ? t('subtitleCharts') : t('subtitleByYear');

  if (loading && !displayData?.requiresOAuth) {
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className={`${adminPageHeadingMargin} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <h1 className={`${adminPageTitle} mb-1`}>{t('title')}</h1>
            <p className={adminPageDescription}>{subtitle}</p>
            {data?.dataSource ? (
              <p className="mt-1 text-xs text-neutral-500">
                {data.dataSource === 'supabase' ? t('dataSourceSupabase') : t('dataSourceSheets')}
              </p>
            ) : null}
          </div>
          {displayData && !displayData.requiresOAuth ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="w-full sm:w-36">
                <Select
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  aria-label={t('filterSheetYear')}
                  className="h-10 text-sm"
                >
                  {sheetTabs.map((tab) => (
                    <option key={tab} value={tab}>
                      {formatProjectPipelineSheetYearLabel(tab)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <Select
                  value={segmentFilter}
                  onChange={(e) =>
                    setSegmentFilter(e.target.value as PipelineWorkloadSegmentFilter)
                  }
                  aria-label={t('filterSegment')}
                  className="h-10 text-sm"
                >
                  <option value="both">{t('filterSegmentBoth')}</option>
                  <option value="Outdoor">{t('filterSegmentOutdoor')}</option>
                  <option value="Commercial">{t('filterSegmentCommercial')}</option>
                </Select>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="flex w-full gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800 sm:w-fit"
          role="tablist"
          aria-label={t('tabsAria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'charts'}
            onClick={() => setActiveTab('charts')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              activeTab === 'charts'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {t('tabCharts')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'byYear'}
            onClick={() => setActiveTab('byYear')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              activeTab === 'byYear'
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100'
                : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {t('tabByYear')}
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            <p className="font-medium">{t('loadError')}</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
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
          </div>
        ) : null}

        {displayData && !displayData.requiresOAuth && displayData.view === 'byYear' ? (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('summary', {
                incomplete: displayData.incompleteJobs,
                total: displayData.totalJobs,
                sheet: displayData.sheetName,
              })}
            </p>
            <PipelineWorkloadByYearTable
              tableId="appraiser"
              title={t('byAppraiser')}
              rows={displayData.byAppraiser}
              role="appraiser"
            />
            <PipelineWorkloadByYearTable
              tableId="proj-mgr"
              title={t('byProjMgr')}
              rows={displayData.byProjMgr}
              role="projMgr"
            />
          </>
        ) : null}

        {displayData && !displayData.requiresOAuth && displayData.view === 'charts' ? (
          <PipelineWorkloadChartsPanel data={displayData} />
        ) : null}
      </div>
    </main>
  );
}
