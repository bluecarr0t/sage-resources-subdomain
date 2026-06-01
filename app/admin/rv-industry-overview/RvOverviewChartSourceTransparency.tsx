'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type {
  ChartSourceBreakdown,
  RvOverviewScanTransparency,
} from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

type Props = {
  breakdown?: ChartSourceBreakdown | null;
  scanTransparency?: RvOverviewScanTransparency | null;
};

export default function RvOverviewChartSourceTransparency({
  breakdown,
  scanTransparency,
}: Props) {
  const t = useTranslations('admin.rvIndustryOverview.chartSourceTransparency');
  const format = useFormatter();

  if (!breakdown) {
    return (
      <p className="rounded-md border border-dashed border-neutral-300/80 bg-neutral-50/60 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400">
        {t('pendingRefresh')}
      </p>
    );
  }

  const unclassified = scanTransparency?.unclassifiedExcluded;

  return (
    <div
      className="rounded-md border border-neutral-200/80 bg-neutral-50/90 px-3 py-2.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300"
      role="note"
      aria-label={t('panelAria')}
    >
      <p className="font-medium text-neutral-800 dark:text-neutral-200">{t('title')}</p>
      <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
        <div>
          <dt className="text-neutral-500 dark:text-neutral-400">{t('rowsUsed')}</dt>
          <dd className="font-medium tabular-nums">
            {format.number(breakdown.rowsUsed, { maximumFractionDigits: 0 })}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500 dark:text-neutral-400">{t('sourceMix')}</dt>
          <dd className="font-medium tabular-nums">
            {breakdown.rowsUsed > 0 && breakdown.campspotPct != null && breakdown.roverpassPct != null
              ? t('sourceMixValue', {
                  campspotPct: breakdown.campspotPct,
                  roverpassPct: breakdown.roverpassPct,
                  campspotRows: breakdown.campspotRows,
                  roverpassRows: breakdown.roverpassRows,
                })
              : t('notAvailable')}
          </dd>
        </div>
        {unclassified && unclassified.total > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-neutral-500 dark:text-neutral-400">{t('unclassifiedExcluded')}</dt>
            <dd>
              {t('unclassifiedValue', {
                total: unclassified.total,
                campspot: unclassified.campspot,
                roverpass: unclassified.roverpass,
              })}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-2 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
        {t('footnote')}
      </p>
    </div>
  );
}
