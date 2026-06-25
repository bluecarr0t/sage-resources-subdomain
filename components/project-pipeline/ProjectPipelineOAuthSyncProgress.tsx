'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatProjectPipelineSheetYearLabel } from '@/lib/project-pipeline/sheet-tabs';

export type PipelineOAuthSyncProgress = {
  sheetName: string;
  index: number;
  total: number;
  status: 'pending' | 'syncing' | 'done' | 'error';
};

type ProjectPipelineOAuthSyncProgressProps = {
  progress: PipelineOAuthSyncProgress[];
  active?: boolean;
};

export function ProjectPipelineOAuthSyncProgress({
  progress,
  active = false,
}: ProjectPipelineOAuthSyncProgressProps) {
  const t = useTranslations('admin.projectPipeline');

  if (!active || !progress.length) return null;

  const completed = progress.filter((item) => item.status === 'done').length;

  return (
    <div
      className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {t('oauthSyncProgressTitle', { completed, total: progress.length })}
      </p>
      <ul className="mt-3 space-y-2">
        {progress.map((item) => (
          <li
            key={item.sheetName}
            className="flex items-center justify-between gap-3 text-sm text-neutral-700 dark:text-neutral-300"
          >
            <span>{formatProjectPipelineSheetYearLabel(item.sheetName)}</span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              {item.status === 'syncing' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {t('oauthSyncProgressSyncing')}
                </>
              ) : null}
              {item.status === 'done' ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  {t('oauthSyncProgressDone')}
                </span>
              ) : null}
              {item.status === 'error' ? (
                <span className="text-red-700 dark:text-red-400">
                  {t('oauthSyncProgressError')}
                </span>
              ) : null}
              {item.status === 'pending' ? (
                <span className="text-neutral-400">{t('oauthSyncProgressPending')}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
