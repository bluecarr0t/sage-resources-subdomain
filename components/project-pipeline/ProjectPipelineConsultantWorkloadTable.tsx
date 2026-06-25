'use client';

import { useTranslations } from 'next-intl';
import type { PipelineConsultantJobGroup } from '@/lib/project-pipeline/group-jobs-by-consultant';
import {
  formatProjectPipelineSheetDate,
  getProjectPipelineDueDateEmphasis,
  getProjectPipelineJobRowClassName,
} from '@/lib/project-pipeline/due-date-emphasis';
import { ProjectStatusPill } from '@/components/project-pipeline/ProjectStatusPill';
import { consultantPillSurfaceClasses } from '@/lib/project-pipeline/consultant-pill-styles';
import { getWorkloadCoConsultantLabels } from '@/lib/project-pipeline/workload-co-consultants';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

const TABLE_COLS = 7;

function WorkloadBadge({
  count,
  label,
  className,
}: {
  count: number;
  label: string;
  className: string;
}) {
  if (count <= 0) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}: {count}
    </span>
  );
}

function ConsultantJobRow({
  job,
  groupConsultantName,
  onOpenJob,
  tWorkload,
}: {
  job: ProjectPipelineJob;
  groupConsultantName: string;
  onOpenJob: (job: ProjectPipelineJob) => void;
  tWorkload: ReturnType<typeof useTranslations>;
}) {
  const emphasis = getProjectPipelineDueDateEmphasis(job);
  const rowClass = getProjectPipelineJobRowClassName(job, emphasis);
  const client = job.client || '—';
  const coConsultants = getWorkloadCoConsultantLabels(job, groupConsultantName);

  return (
    <tr
      className={`cursor-pointer border-b border-neutral-100 text-sm dark:border-neutral-800 ${rowClass}`}
      onClick={() => onOpenJob(job)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenJob(job);
        }
      }}
      tabIndex={0}
      role="button"
    >
      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">
        <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
          <span>{job.jobNumber || '—'}</span>
          {coConsultants.map((name) => (
            <span
              key={name}
              className={`inline-flex max-w-full items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${consultantPillSurfaceClasses(name)}`}
              title={tWorkload('sharedWithConsultants', { names: name })}
            >
              {tWorkload('coConsultantBadge', { names: name })}
            </span>
          ))}
        </span>
      </td>
      <td className="whitespace-nowrap px-2 py-2.5">
        <ProjectStatusPill status={job.projectStatus} />
      </td>
      <td className="truncate px-3 py-2.5 text-neutral-800 dark:text-neutral-200" title={client}>
        {client}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600 dark:text-neutral-400">
        {job.commercialOutdoor?.trim() || '—'}
      </td>
      <td
        className="truncate px-3 py-2.5 text-neutral-600 dark:text-neutral-400"
        title={job.service || undefined}
      >
        {job.service || '—'}
      </td>
      <td
        className="truncate px-3 py-2.5 text-neutral-600 dark:text-neutral-400"
        title={job.projMgr || undefined}
      >
        {job.projMgr || '—'}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-neutral-800 dark:text-neutral-200">
        {formatProjectPipelineSheetDate(job.dueDate) || '—'}
        {emphasis === 'past-due' ? (
          <span className="ml-2 text-xs font-medium text-red-700 dark:text-red-400">
            {tWorkload('duePast')}
          </span>
        ) : null}
        {emphasis === 'due-soon' ? (
          <span className="ml-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            {tWorkload('dueSoon')}
          </span>
        ) : null}
      </td>
    </tr>
  );
}

export function ProjectPipelineConsultantWorkloadTable({
  groups,
  onOpenJob,
}: {
  groups: PipelineConsultantJobGroup[];
  onOpenJob: (job: ProjectPipelineJob) => void;
}) {
  const t = useTranslations('admin.projectPipeline');
  const tWorkload = useTranslations('admin.pipelineWorkload');

  if (groups.length === 0) {
    return (
      <div className="admin-surface px-4 py-8 text-center text-sm text-neutral-500">
        {tWorkload('empty')}
      </div>
    );
  }

  return (
    <div className="admin-surface overflow-x-auto">
      <table className="w-full min-w-[920px] table-fixed divide-y divide-neutral-200 dark:divide-neutral-800">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-[22%]" />
          <col className="w-[10%]" />
          <col className="w-[18%]" />
          <col className="w-[11%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead className="admin-table-head">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase">
              {tWorkload('columnJobNumber')}
            </th>
            <th className="px-2 py-2.5 text-left text-xs font-medium uppercase">
              {t('columnProjectStatus')}
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase">
              {tWorkload('columnClient')}
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase">
              {tWorkload('columnSegment')}
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase">
              {tWorkload('columnService')}
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase">
              {tWorkload('columnProjMgr')}
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium uppercase">
              {tWorkload('columnDueDate')}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, index) => (
            <ConsultantSection
              key={group.consultantName}
              group={group}
              isFirst={index === 0}
              onOpenJob={onOpenJob}
              tWorkload={tWorkload}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsultantSection({
  group,
  isFirst,
  onOpenJob,
  tWorkload,
}: {
  group: PipelineConsultantJobGroup;
  isFirst: boolean;
  onOpenJob: (job: ProjectPipelineJob) => void;
  tWorkload: ReturnType<typeof useTranslations>;
}) {
  return (
    <>
      {!isFirst ? (
        <tr aria-hidden className="border-0">
          <td
            colSpan={TABLE_COLS}
            className="h-8 border-0 bg-white p-0 dark:bg-neutral-950"
          />
        </tr>
      ) : null}
      <tr
        className={`bg-neutral-100 dark:bg-neutral-900/80 ${
          isFirst
            ? 'border-t border-neutral-200 dark:border-neutral-800'
            : 'border-t-[3px] border-neutral-300 dark:border-neutral-600'
        }`}
      >
        <td colSpan={TABLE_COLS} className="border-l-4 border-l-[#4a624a] px-4 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {group.consultantName}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {tWorkload('authorJobCount', { count: group.jobCount })}
              </span>
              <WorkloadBadge
                count={group.pastDueCount}
                label={tWorkload('pastDueBadge')}
                className="bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
              />
              <WorkloadBadge
                count={group.dueSoonCount}
                label={tWorkload('dueSoonBadge')}
                className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
              />
            </div>
          </div>
        </td>
      </tr>
      {group.jobs.map((job) => (
        <ConsultantJobRow
          key={`${group.consultantName}-${job.jobNumber}-${job.sheetRowIndex}`}
          job={job}
          groupConsultantName={group.consultantName}
          onOpenJob={onOpenJob}
          tWorkload={tWorkload}
        />
      ))}
    </>
  );
}
