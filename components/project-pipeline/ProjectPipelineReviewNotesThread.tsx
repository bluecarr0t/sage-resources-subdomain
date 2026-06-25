'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  formatProjectPipelineReviewNoteLabel,
  isProjectPipelineReviewStatusApproved,
  isProjectPipelineReviewStatusChangesRequested,
} from '@/lib/project-pipeline/review-workflow';
import { getReviewStatusDisplayLabel } from '@/lib/project-pipeline/review-status';
import type { ProjectPipelineReviewNote } from '@/lib/project-pipeline/review-notes';

function formatReviewNoteTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sortReviewNotesNewestFirst(
  notes: readonly ProjectPipelineReviewNote[]
): ProjectPipelineReviewNote[] {
  return [...notes].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    const leftValid = !Number.isNaN(leftTime);
    const rightValid = !Number.isNaN(rightTime);

    if (leftValid && rightValid && leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.id.localeCompare(left.id);
  });
}

type EntryEmphasis = 'changes-requested' | 'approved' | 'none';

function getReviewNoteEmphasis(entry: ProjectPipelineReviewNote): EntryEmphasis {
  if (entry.type !== 'review_feedback') return 'none';
  if (isProjectPipelineReviewStatusChangesRequested(entry.reviewStatus)) {
    return 'changes-requested';
  }
  if (isProjectPipelineReviewStatusApproved(entry.reviewStatus)) {
    return 'approved';
  }
  return 'none';
}

function getEntryClassName(emphasis: EntryEmphasis): string {
  if (emphasis === 'changes-requested') {
    return 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30';
  }
  if (emphasis === 'approved') {
    return 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30';
  }
  return 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50';
}

type ProjectPipelineReviewNotesThreadProps = {
  notes: readonly ProjectPipelineReviewNote[];
  emptyMessage?: string;
};

export function ProjectPipelineReviewNotesThread({
  notes,
  emptyMessage,
}: ProjectPipelineReviewNotesThreadProps) {
  const t = useTranslations('admin.projectPipeline');
  const [expanded, setExpanded] = useState(false);
  const sortedNotes = useMemo(() => sortReviewNotesNewestFirst(notes), [notes]);
  const newestNoteId = sortedNotes[0]?.id ?? '';

  useEffect(() => {
    setExpanded(false);
  }, [newestNoteId, sortedNotes.length]);

  if (!sortedNotes.length) {
    return (
      <p
        className="text-sm italic text-neutral-500 dark:text-neutral-400"
        role="status"
      >
        {emptyMessage ?? t('reviewWorkflowEmpty')}
      </p>
    );
  }

  const hiddenCount = Math.max(0, sortedNotes.length - 1);
  const visibleNotes = expanded ? sortedNotes : sortedNotes.slice(0, 1);

  const renderEntry = (entry: ProjectPipelineReviewNote) => {
    const emphasis = getReviewNoteEmphasis(entry);

    return (
      <li
        key={entry.id}
        className={`rounded-lg border px-3 py-2.5 ${getEntryClassName(emphasis)}`}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {formatProjectPipelineReviewNoteLabel(entry.type, entry.reviewStatus)}
          </span>
          {entry.reviewStatus ? (
            <span>· {getReviewStatusDisplayLabel(entry.reviewStatus)}</span>
          ) : null}
          <span>· {entry.createdByDisplayName}</span>
          <span>· {formatReviewNoteTimestamp(entry.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">
          {entry.note}
        </p>
      </li>
    );
  };

  return (
    <div className="space-y-2">
      <ol className="space-y-3">{visibleNotes.map((entry) => renderEntry(entry))}</ol>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="text-sm font-medium text-sage-700 hover:text-sage-800 dark:text-sage-400 dark:hover:text-sage-300"
          aria-expanded={expanded}
        >
          {expanded
            ? t('reviewNotesShowLess')
            : t('reviewNotesExpandOlder', { count: hiddenCount })}
        </button>
      ) : null}
    </div>
  );
}
