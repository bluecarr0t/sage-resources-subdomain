'use client';

import { useTranslations } from 'next-intl';
import type { RvOverviewChartSourceScopeKey } from '@/lib/rv-industry-overview/rv-overview-chart-source-scope';

type Props = {
  scopeKey: RvOverviewChartSourceScopeKey;
  /** When analyst selected Campspot-only source toggle. */
  campspotOnlyView?: boolean;
  className?: string;
};

/**
 * Per-chart Campspot vs RoverPass scope (shown in admin UI, excluded from JPEG export).
 */
export default function RvOverviewChartSourceScope({
  scopeKey,
  campspotOnlyView = false,
  className,
}: Props) {
  const t = useTranslations('admin.rvIndustryOverview.chartSourceScope');

  const body = campspotOnlyView ? t('campspotOnlyView') : t(scopeKey);

  return (
    <p
      className={
        className ??
        'rounded-md border border-amber-200/80 bg-amber-50/90 px-2.5 py-1.5 text-xs leading-snug text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100'
      }
      role="note"
    >
      <span className="font-medium">{t('label')}</span> {body}
    </p>
  );
}
