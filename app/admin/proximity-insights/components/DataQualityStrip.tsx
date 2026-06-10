'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';
import type { DataQualityMetrics } from '@/lib/anchor-point-insights/aggregate';

interface DataQualityStripProps {
  dataQuality: DataQualityMetrics;
}

export function DataQualityStrip({ dataQuality }: DataQualityStripProps) {
  const t = useTranslations('anchorPointInsights');

  const ratePct =
    dataQuality.total_properties > 0
      ? Math.round((dataQuality.properties_with_rate / dataQuality.total_properties) * 100)
      : 0;

  return (
    <Card className="mb-6 p-4 border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('dataQualityTitle')}
          </h2>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>
              {t('dataQualityRates', {
                withRates: dataQuality.properties_with_rate,
                total: dataQuality.total_properties,
                pct: ratePct,
              })}
            </li>
            <li>
              {t('dataQualityMissingUnits', {
                count: dataQuality.properties_missing_unit_fields,
              })}
            </li>
            <li>
              {t('dataQualityZeroUnits', { count: dataQuality.properties_zero_units })}
            </li>
          </ul>
          {dataQuality.by_source.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {dataQuality.by_source.map((s) => (
                <span
                  key={s.source}
                  className="inline-flex items-center rounded-md bg-white/80 dark:bg-neutral-900/80 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400 border border-neutral-200/75 dark:border-neutral-800"
                >
                  {s.source}: {t('dataQualitySourceMissing', {
                    missingRate: s.missing_rate,
                    total: s.total,
                  })}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
