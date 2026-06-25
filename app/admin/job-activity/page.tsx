'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@/components/ui';
import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw, ScrollText } from 'lucide-react';
import { adminPageDescription, adminPageHeadingMargin, adminPageTitle, JOB_PIPELINE_ADMIN_PATH } from '@/lib/admin-ui';
import { JobActivityEntryContent } from '@/components/project-pipeline/JobActivityEntryContent';
import type { ProjectPipelineJobActivityEntry } from '@/lib/project-pipeline/activity/types';
import { PROJECT_PIPELINE_SHEET_TABS, formatProjectPipelineSheetYearLabel } from '@/lib/project-pipeline/sheet-tabs';

type ActivityResponse = {
  entries: ProjectPipelineJobActivityEntry[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  error?: string;
  message?: string;
};

function ActivityPagination({
  pagination,
  onPrevious,
  onNext,
}: {
  pagination: { page: number; totalPages: number };
  onPrevious: () => void;
  onNext: () => void;
}) {
  const t = useTranslations('admin.jobActivity');

  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-200/75 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
      <p className="text-center text-sm text-neutral-600 sm:text-left dark:text-neutral-400">
        {t('pagination', { page: pagination.page, pages: pagination.totalPages })}
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={onPrevious}
          className="flex-1 sm:flex-none"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t('previous')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={onNext}
          className="flex-1 sm:flex-none"
        >
          {t('next')}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export default function JobActivityPage() {
  const t = useTranslations('admin.jobActivity');
  const [entries, setEntries] = useState<ProjectPipelineJobActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobNumber, setJobNumber] = useState('');
  const [actorQuery, setActorQuery] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 50,
    total: 0,
    totalPages: 0,
  });

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('perPage', '50');
      if (jobNumber.trim()) params.set('jobNumber', jobNumber.trim());
      if (actorQuery.trim()) params.set('actor', actorQuery.trim());
      if (sheetName) params.set('sheetName', sheetName);

      const res = await fetch(`/api/admin/project-pipeline/activity?${params.toString()}`, {
        credentials: 'include',
      });
      const data = (await res.json()) as ActivityResponse;
      if (!res.ok) {
        throw new Error(data.message || data.error || t('loadError'));
      }

      setEntries(data.entries ?? []);
      setPagination({
        page: data.page ?? page,
        perPage: data.perPage ?? 50,
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [actorQuery, jobNumber, page, sheetName, t]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const filterInputClassName =
    'w-full min-w-0 rounded-lg border border-neutral-300/80 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900 sm:w-auto';

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className={`${adminPageHeadingMargin} space-y-4`}>
          <div>
            <h1 className={`${adminPageTitle} flex items-center gap-2`}>
              <ScrollText className="h-7 w-7 shrink-0 text-sage-600" aria-hidden />
              {t('title')}
            </h1>
            <p className={`${adminPageDescription} mt-1`}>{t('subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <input
              type="search"
              value={jobNumber}
              onChange={(event) => {
                setJobNumber(event.target.value);
                setPage(1);
              }}
              placeholder={t('filterJobNumber')}
              className={filterInputClassName}
            />
            <input
              type="search"
              value={actorQuery}
              onChange={(event) => {
                setActorQuery(event.target.value);
                setPage(1);
              }}
              placeholder={t('filterActor')}
              className={filterInputClassName}
            />
            <select
              value={sheetName}
              onChange={(event) => {
                setSheetName(event.target.value);
                setPage(1);
              }}
              className={filterInputClassName}
            >
              <option value="">{t('filterAllYears')}</option>
              {PROJECT_PIPELINE_SHEET_TABS.map((tab) => (
                <option key={tab} value={tab}>
                  {formatProjectPipelineSheetYearLabel(tab)}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadActivity()}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              <span className="sr-only">{t('refresh')}</span>
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {error}
          </div>
        ) : null}

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-neutral-500">{t('loading')}</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">{t('emptyState')}</div>
          ) : (
            <>
              <p className="border-b border-neutral-200/75 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                {t('summary', { shown: entries.length, total: pagination.total })}
              </p>

              <div className="divide-y divide-neutral-200/75 md:hidden dark:divide-neutral-800">
                {entries.map((entry) => (
                  <JobActivityEntryContent key={entry.id} entry={entry} layout="card" />
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-neutral-200/75 dark:divide-neutral-800">
                  <thead className="bg-neutral-50/85 dark:bg-neutral-900/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                        {t('columnWhen')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                        {t('columnActor')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                        {t('columnJob')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                        {t('columnAction')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-500">
                        {t('columnChanges')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/75 dark:divide-neutral-800">
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-neutral-50/90 dark:hover:bg-neutral-900/40"
                      >
                        <JobActivityEntryContent entry={entry} layout="table" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ActivityPagination
                pagination={pagination}
                onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                onNext={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
              />
            </>
          )}
        </Card>

        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          <Link
            href={JOB_PIPELINE_ADMIN_PATH}
            className="inline-flex items-center gap-1.5 text-sage-700 hover:text-sage-800 dark:text-sage-400 dark:hover:text-sage-300"
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            {t('backToJobPipeline')}
          </Link>
        </p>
      </div>
    </main>
  );
}
