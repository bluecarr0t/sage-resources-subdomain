'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type {
  ChartEntityCountKind,
  ChartSourceBreakdown,
  RvOverviewScanTransparency,
} from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

type Props = {
  breakdown?: ChartSourceBreakdown | null;
  scanTransparency?: RvOverviewScanTransparency | null;
  rowsScannedHipcamp?: number;
  rowsScannedSage?: number;
};

function entityCountsForKind(
  breakdown: ChartSourceBreakdown,
  kind: ChartEntityCountKind
): {
  total: number;
  hipcamp: number;
  sage: number;
  hipcampPct: number | null;
  sagePct: number | null;
} {
  if (kind === 'properties') {
    return {
      total: breakdown.propertiesUsed,
      hipcamp: breakdown.propertiesCampspot,
      sage: breakdown.propertiesRoverpass,
      hipcampPct: breakdown.propertiesCampspotPct,
      sagePct: breakdown.propertiesRoverpassPct,
    };
  }
  return {
    total: breakdown.rowsUsed,
    hipcamp: breakdown.campspotRows,
    sage: breakdown.roverpassRows,
    hipcampPct: breakdown.campspotPct,
    sagePct: breakdown.roverpassPct,
  };
}

/** Hipcamp/Sage labels; breakdown uses campspot/roverpass field names internally. */
export default function GlampingOverviewChartSourceTransparency({
  breakdown,
  scanTransparency,
  rowsScannedHipcamp,
  rowsScannedSage,
}: Props) {
  const t = useTranslations('admin.glampingIndustryOverview.chartSourceTransparency');
  const format = useFormatter();

  if (!breakdown) {
    return (
      <p className="rounded-md border border-dashed border-neutral-300/80 bg-neutral-50/60 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400">
        {t('pendingRefresh')}
      </p>
    );
  }

  const unclassified = scanTransparency?.unclassifiedExcluded;
  const countKind = breakdown.countKind ?? 'units';
  const entity = entityCountsForKind(breakdown, countKind);
  const entityLabel = countKind === 'properties' ? t('propertiesUsed') : t('unitsUsed');

  return (
    <div
      className="rounded-md border border-neutral-200/80 bg-neutral-50/90 px-3 py-2.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300"
      role="note"
      aria-label={t('panelAria')}
    >
      <p className="font-medium text-neutral-800 dark:text-neutral-200">{t('title')}</p>
      <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
        <div>
          <dt className="text-neutral-500 dark:text-neutral-400">{entityLabel}</dt>
          <dd className="font-medium tabular-nums">
            {format.number(entity.total, { maximumFractionDigits: 0 })}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500 dark:text-neutral-400">{t('sourceMix')}</dt>
          <dd className="font-medium tabular-nums">
            {entity.total > 0 && entity.hipcampPct != null && entity.sagePct != null
              ? t('sourceMixValue', {
                  hipcampPct: entity.hipcampPct,
                  sagePct: entity.sagePct,
                  hipcampCount: entity.hipcamp,
                  sageCount: entity.sage,
                })
              : t('notAvailable')}
          </dd>
        </div>
        {rowsScannedHipcamp != null || rowsScannedSage != null ? (
          <div className="sm:col-span-2">
            <dt className="text-neutral-500 dark:text-neutral-400">{t('scanScope')}</dt>
            <dd>
              {t('scanScopeValue', {
                hipcamp: rowsScannedHipcamp ?? 0,
                sage: rowsScannedSage ?? 0,
              })}
            </dd>
          </div>
        ) : null}
        {unclassified && unclassified.total > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-neutral-500 dark:text-neutral-400">{t('unclassifiedExcluded')}</dt>
            <dd>
              {t('unclassifiedValue', {
                total: unclassified.total,
                hipcamp: unclassified.campspot,
                sage: unclassified.roverpass,
              })}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-2 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
        {countKind === 'properties' ? t('footnoteProperties') : t('footnoteUnits')}
      </p>
    </div>
  );
}
