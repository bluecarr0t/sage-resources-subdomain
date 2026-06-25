'use client';

import { useFormatter, useTranslations } from 'next-intl';
import {
  formatProjectPipelineActivityAction,
  summarizeProjectPipelineActivityChanges,
} from '@/lib/project-pipeline/activity/format-activity';
import type { ProjectPipelineJobActivityEntry } from '@/lib/project-pipeline/activity/types';
import { formatProjectPipelineSheetYearLabel } from '@/lib/project-pipeline/sheet-tabs';

type JobActivityEntryContentProps = {
  entry: ProjectPipelineJobActivityEntry;
  layout: 'table' | 'card';
};

export function JobActivityEntryContent({ entry, layout }: JobActivityEntryContentProps) {
  const t = useTranslations('admin.jobActivity');
  const format = useFormatter();
  const note = typeof entry.metadata.note === 'string' ? entry.metadata.note.trim() : '';
  const actionLabel = formatProjectPipelineActivityAction(entry.action, entry.metadata);

  const formatWhen = (value: string) =>
    format.dateTime(new Date(value), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  if (layout === 'card') {
    return (
      <article className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{entry.jobNumber}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{entry.client || '—'}</p>
            <p className="text-xs text-neutral-500">
              {formatProjectPipelineSheetYearLabel(entry.sheetName)}
            </p>
          </div>
          <span className="inline-flex shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            {actionLabel}
          </span>
        </div>

        <div className="grid gap-2 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t('columnWhen')}
            </p>
            <p className="text-neutral-700 dark:text-neutral-300">{formatWhen(entry.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t('columnActor')}
            </p>
            <p className="font-medium text-neutral-800 dark:text-neutral-200">{entry.actorDisplayName}</p>
            {entry.actorEmail ? (
              <p className="text-xs text-neutral-500">{entry.actorEmail}</p>
            ) : null}
          </div>
          {note ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {t('notePrefix')}
              </p>
              <p className="text-neutral-700 dark:text-neutral-300">{note}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t('columnChanges')}
            </p>
            {entry.changes.length > 0 ? (
              <ul className="mt-1 space-y-1 text-neutral-700 dark:text-neutral-300">
                {entry.changes.map((change) => (
                  <li key={change.field}>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {change.label}:
                    </span>{' '}
                    {change.previousValue || '—'} → {change.newValue || '—'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">—</p>
            )}
          </div>
        </div>
      </article>
    );
  }

  const changesSummary = summarizeProjectPipelineActivityChanges(entry.changes);

  return (
    <>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">
        {formatWhen(entry.createdAt)}
      </td>
      <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-200">
        <div className="font-medium">{entry.actorDisplayName}</div>
        {entry.actorEmail ? (
          <div className="text-xs text-neutral-500">{entry.actorEmail}</div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="font-medium text-neutral-900 dark:text-neutral-100">{entry.jobNumber}</div>
        <div className="text-neutral-600 dark:text-neutral-400">{entry.client || '—'}</div>
        <div className="text-xs text-neutral-500">
          {formatProjectPipelineSheetYearLabel(entry.sheetName)}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="inline-flex rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
          {actionLabel}
        </span>
        {note ? (
          <p className="mt-2 max-w-xs text-xs text-neutral-600 dark:text-neutral-400">
            {t('notePrefix')} {note}
          </p>
        ) : null}
      </td>
      <td className="max-w-md px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
        {changesSummary}
      </td>
    </>
  );
}
