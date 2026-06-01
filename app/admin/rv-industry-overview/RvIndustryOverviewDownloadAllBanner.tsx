'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { RvOverviewDownloadAllSummary } from '@/lib/rv-industry-overview/rv-overview-download-all';
import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';

type Props = {
  summary: RvOverviewDownloadAllSummary | null;
  onDismiss: () => void;
};

export default function RvIndustryOverviewDownloadAllBanner({ summary, onDismiss }: Props) {
  const t = useTranslations('admin.rvIndustryOverview.downloadAll');

  useEffect(() => {
    if (!summary) return;
    const timer = setTimeout(onDismiss, 12_000);
    return () => clearTimeout(timer);
  }, [summary, onDismiss]);

  if (!summary) return null;

  const { exported, skipped, failed, outcomes } = summary;
  const variant =
    failed > 0 && exported > 0 ? 'partial' : failed > 0 ? 'error' : exported > 0 ? 'success' : 'neutral';

  const boxClass =
    variant === 'success'
      ? 'border-emerald-200/90 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/35'
      : variant === 'partial'
        ? 'border-amber-200/90 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/35'
        : variant === 'error'
          ? 'border-red-200/90 bg-red-50/90 dark:border-red-900/50 dark:bg-red-950/35'
          : 'border-neutral-200/80 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900/40';

  const title =
    variant === 'success'
      ? t('statusSuccess', { count: exported })
      : variant === 'partial'
        ? t('statusPartial', { exported, failed })
        : variant === 'error'
          ? t('statusError', { failed })
          : t('statusNone');

  const failedOutcomes = outcomes.filter((o) => o.status === 'failed');

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${boxClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
          {skipped > 0 ? (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {t('skippedCharts', { count: skipped })}
            </p>
          ) : null}
          {failedOutcomes.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-neutral-700 dark:text-neutral-300">
              {failedOutcomes.map((o) => (
                <li key={o.key}>
                  {o.label}
                  {o.error
                    ? `: ${sanitizeAdminDisplayError(o.error, { fallback: t('statusErrorGeneric') })}`
                    : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="shrink-0 px-2"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
