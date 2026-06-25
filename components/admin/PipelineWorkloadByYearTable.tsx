'use client';

import { Fragment, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatProjectPipelineSheetDate } from '@/lib/project-pipeline/due-date-emphasis';
import type { PipelineWorkloadPersonRow } from '@/lib/project-pipeline/workload';

type PersonRole = 'appraiser' | 'projMgr';

function formatDueDate(value: string): string {
  return formatProjectPipelineSheetDate(value) || '—';
}

function WorkloadPersonJobRows({
  jobs,
  role,
  t,
}: {
  jobs: readonly PipelineWorkloadPersonRow['jobs'];
  role: PersonRole;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!jobs.length) {
    return (
      <p className="px-3 py-2 text-sm text-neutral-500">{t('personJobsEmpty')}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            <th className="px-3 py-2">{t('columnJobNumber')}</th>
            <th className="px-3 py-2">{t('columnClient')}</th>
            <th className="px-3 py-2">{t('columnPropertyLocation')}</th>
            <th className="px-3 py-2">{t('columnSegment')}</th>
            <th className="px-3 py-2">{t('columnService')}</th>
            <th className="px-3 py-2">
              {role === 'appraiser' ? t('columnProjMgr') : t('columnAppraiser')}
            </th>
            <th className="px-3 py-2">{t('columnDueDate')}</th>
            <th className="px-3 py-2">{t('columnReviewStatus')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-700/80">
          {jobs.map((job) => (
            <tr key={job.jobNumber} className="text-neutral-800 dark:text-neutral-200">
              <td className="whitespace-nowrap px-3 py-2 font-medium">{job.jobNumber || '—'}</td>
              <td className="max-w-[12rem] truncate px-3 py-2" title={job.client || undefined}>
                {job.client || '—'}
              </td>
              <td className="max-w-[14rem] truncate px-3 py-2" title={job.propertyLocation || undefined}>
                {job.propertyLocation || '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-2">{job.segment}</td>
              <td className="max-w-[10rem] truncate px-3 py-2" title={job.service || undefined}>
                {job.service || '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {role === 'appraiser' ? job.projMgr || '—' : job.appraiserConsultant || '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                {formatDueDate(job.dueDate)}
              </td>
              <td className="max-w-[10rem] truncate px-3 py-2" title={job.reviewStatus || undefined}>
                {job.reviewStatus || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PipelineWorkloadByYearTable({
  tableId,
  title,
  rows,
  role,
}: {
  tableId: string;
  title: string;
  rows: readonly PipelineWorkloadPersonRow[];
  role: PersonRole;
}) {
  const t = useTranslations('admin.pipelineWorkload');
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(() => new Set());

  const toggleRow = (personName: string) => {
    const key = `${tableId}:${personName}`;
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="admin-surface overflow-x-auto">
      <h2 className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
        {title}
      </h2>
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
        <thead className="admin-table-head">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium uppercase">{t('columnPerson')}</th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase">Outdoor</th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase">Commercial</th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase">{t('columnUnknown')}</th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase">{t('columnTotal')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-sm text-neutral-500">
                {t('empty')}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const rowKey = `${tableId}:${row.name}`;
              const expanded = expandedKeys.has(rowKey);

              return (
                <Fragment key={rowKey}>
                  <tr className="text-sm">
                    <td className="px-3 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                      <button
                        type="button"
                        onClick={() => toggleRow(row.name)}
                        aria-expanded={expanded}
                        aria-label={
                          expanded
                            ? t('personCollapseJobs', { name: row.name })
                            : t('personExpandJobs', { name: row.name })
                        }
                        className="inline-flex max-w-full items-center gap-2 text-left hover:text-sage-800 dark:hover:text-sage-300"
                      >
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${
                            expanded ? 'rotate-90' : ''
                          }`}
                          aria-hidden
                        />
                        <span className="truncate">{row.name}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.outdoor}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.commercial}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-neutral-500">{row.unknown}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">{row.total}</td>
                  </tr>
                  {expanded ? (
                    <tr className="bg-neutral-50/90 dark:bg-neutral-900/50">
                      <td colSpan={5} className="border-l-4 border-l-[#4a624a] px-0 py-0">
                        <WorkloadPersonJobRows jobs={row.jobs} role={role} t={t} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
