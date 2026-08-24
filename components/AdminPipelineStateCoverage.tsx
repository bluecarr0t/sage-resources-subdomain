'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MapPinned, ChevronRight } from 'lucide-react';
import { adminDangerPanel, adminInlineLink, adminSurface } from '@/lib/admin-ui';
import type { PipelineCountry, PipelineSweepStatus } from '@/lib/glamping-pipeline/constants';
import { assertNeverSweep } from '@/lib/glamping-pipeline/regions';

type LiveCounts = {
  proposed: number;
  underConstruction: number;
  cancelled: number;
};

type CoverageRegion = {
  regionCode: string;
  country: PipelineCountry;
  name: string;
  priority: number;
  sweepStatus: PipelineSweepStatus;
  lastResearchedAt: string | null;
  lastArticlesFound: number;
  lastPropertiesInserted: number;
  live: LiveCounts;
  editorHref: string;
};

type CoverageResponse = {
  success: boolean;
  error?: string;
  summary?: {
    proposed: number;
    underConstruction: number;
    cancelled: number;
    pendingSweeps: number;
    completeSweeps: number;
    noProjectsFound: number;
    regionsWithZeroPipeline: number;
  };
  regions?: CoverageRegion[];
};

function sweepTone(status: PipelineSweepStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'complete':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'no_projects_found':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    default:
      return assertNeverSweep(status);
  }
}

function sweepLabelKey(
  status: PipelineSweepStatus
): 'statusPending' | 'statusInProgress' | 'statusComplete' | 'statusNoneFound' {
  switch (status) {
    case 'pending':
      return 'statusPending';
    case 'in_progress':
      return 'statusInProgress';
    case 'complete':
      return 'statusComplete';
    case 'no_projects_found':
      return 'statusNoneFound';
    default:
      return assertNeverSweep(status);
  }
}

export default function AdminPipelineStateCoverage() {
  const t = useTranslations('admin.pipelineCoverage');
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'United States' | 'Canada'>('United States');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/sage-glamping-data/pipeline-coverage');
        const json = (await res.json()) as CoverageResponse;
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch pipeline coverage');
        }
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pipeline coverage');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const regions = useMemo(
    () => (data?.regions ?? []).filter((r) => r.country === tab),
    [data?.regions, tab]
  );

  if (loading) {
    return (
      <section className={adminSurface} aria-label={t('loadingAria')}>
        <div className="p-6 animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={adminDangerPanel} role="alert">
        <p className="text-sm text-red-800 dark:text-red-200/90 font-medium">{error}</p>
      </section>
    );
  }

  const summary = data?.summary;
  if (!summary) return null;

  return (
    <section className={adminSurface} aria-labelledby="pipeline-coverage-heading">
      <div className="p-6 sm:p-8 space-y-6">
        <div>
          <h2
            id="pipeline-coverage-heading"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
          >
            <MapPinned className="w-5 h-5 text-sage-600 dark:text-sage-400" aria-hidden />
            {t('title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40 px-4 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-sage-600 dark:text-sage-400">
              {summary.proposed.toLocaleString()}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-1">
              {t('proposed')}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40 px-4 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-sage-600 dark:text-sage-400">
              {summary.underConstruction.toLocaleString()}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-1">
              {t('underConstruction')}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40 px-4 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-sage-600 dark:text-sage-400">
              {summary.cancelled.toLocaleString()}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-1">
              {t('cancelled')}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-neutral-50/85 dark:bg-neutral-900/40 px-4 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-sage-600 dark:text-sage-400">
              {summary.regionsWithZeroPipeline.toLocaleString()}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-1">
              {t('zeroPipeline')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('United States')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              tab === 'United States'
                ? 'bg-sage-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('tabUsa')}
          </button>
          <button
            type="button"
            onClick={() => setTab('Canada')}
            className={`px-3 py-1.5 text-sm rounded-md ${
              tab === 'Canada'
                ? 'bg-sage-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('tabCanada')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-neutral-200/75 dark:border-neutral-800">
                <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">
                  {t('colRegion')}
                </th>
                <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">
                  {t('colSweep')}
                </th>
                <th className="text-right py-2 px-1 font-medium text-gray-500 dark:text-gray-400">
                  {t('colProposed')}
                </th>
                <th className="text-right py-2 px-1 font-medium text-gray-500 dark:text-gray-400">
                  {t('colUc')}
                </th>
                <th className="text-right py-2 px-1 font-medium text-gray-500 dark:text-gray-400">
                  {t('colCancelled')}
                </th>
                <th className="text-left py-2 pl-2 font-medium text-gray-500 dark:text-gray-400">
                  {t('colLastSweep')}
                </th>
                <th className="text-left py-2 pl-2 font-medium text-gray-500 dark:text-gray-400">
                  {t('colOpen')}
                </th>
              </tr>
            </thead>
            <tbody>
              {regions.map((row) => (
                <tr
                  key={`${row.country}:${row.regionCode}`}
                  className="border-b border-neutral-100/85 dark:border-neutral-800"
                >
                  <td className="py-2 pr-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {row.regionCode}
                    </span>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">{row.name}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sweepTone(
                        row.sweepStatus
                      )}`}
                    >
                      {t(sweepLabelKey(row.sweepStatus))}
                    </span>
                  </td>
                  <td className="text-right py-2 px-1 tabular-nums">{row.live.proposed}</td>
                  <td className="text-right py-2 px-1 tabular-nums">
                    {row.live.underConstruction}
                  </td>
                  <td className="text-right py-2 px-1 tabular-nums">{row.live.cancelled}</td>
                  <td className="py-2 pl-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {row.lastResearchedAt
                      ? new Date(row.lastResearchedAt).toLocaleDateString()
                      : t('neverSwept')}
                  </td>
                  <td className="py-2 pl-2">
                    <Link href={row.editorHref} className={`${adminInlineLink} text-sm`}>
                      {t('openEditor')}
                      <ChevronRight className="w-4 h-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
