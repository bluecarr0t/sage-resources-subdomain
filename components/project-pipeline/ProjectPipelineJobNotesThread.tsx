'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ProjectPipelineJobNote } from '@/lib/project-pipeline/job-notes';

function formatJobNoteDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return '';
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sortJobNotesNewestFirst(
  notes: readonly ProjectPipelineJobNote[]
): ProjectPipelineJobNote[] {
  return [...notes].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    const leftValid = !Number.isNaN(leftTime) && leftTime > 0;
    const rightValid = !Number.isNaN(rightTime) && rightTime > 0;

    if (leftValid && rightValid && leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.id.localeCompare(left.id);
  });
}

type ProjectPipelineJobNotesThreadProps = {
  notes: readonly ProjectPipelineJobNote[];
  emptyMessage?: string;
};

export function ProjectPipelineJobNotesThread({
  notes,
  emptyMessage,
}: ProjectPipelineJobNotesThreadProps) {
  const t = useTranslations('admin.projectPipeline');
  const sortedNotes = useMemo(() => sortJobNotesNewestFirst(notes), [notes]);

  if (!sortedNotes.length) {
    return (
      <p
        className="text-sm italic text-neutral-500 dark:text-neutral-400"
        role="status"
      >
        {emptyMessage ?? t('jobNotesEmpty')}
      </p>
    );
  }

  return (
    <ol className="max-h-56 space-y-3 overflow-y-auto">
      {sortedNotes.map((entry) => {
        const dateAdded = formatJobNoteDate(entry.createdAt);

        return (
          <li
            key={entry.id}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-700 dark:bg-neutral-900/50"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
              {dateAdded ? <time dateTime={entry.createdAt}>{dateAdded}</time> : null}
              {entry.createdByDisplayName ? (
                <>
                  {dateAdded ? <span aria-hidden="true">·</span> : null}
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {entry.createdByDisplayName}
                  </span>
                </>
              ) : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">
              {entry.note}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
