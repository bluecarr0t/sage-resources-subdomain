'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { GitCompare } from 'lucide-react';
import { buildCompareDiffRows } from '@/lib/anchor-point-insights/compare-diff';
import type { InsightsData } from '../types';

interface CompareDiffPanelProps {
  insightsA: InsightsData;
  insightsB: InsightsData;
  labelA: string;
  labelB: string;
}

export function CompareDiffPanel({ insightsA, insightsB, labelA, labelB }: CompareDiffPanelProps) {
  const t = useTranslations('anchorPointInsights');

  const rows = useMemo(
    () =>
      buildCompareDiffRows(insightsA.summary, insightsB.summary, {
        totalUnits: t('totalUnits'),
        unitsWithin: t('compareDiffUnitsWithin'),
        propertiesWithin: t('compareDiffPropertiesWithin'),
        anchors: t('compareDiffAnchors'),
        avgRate: insightsA.summary.uses_blended_seasonal_rate
          ? t('avgRate')
          : t('avgWinterRate'),
      }),
    [insightsA.summary, insightsB.summary, t]
  );

  return (
    <Card className="mb-8 p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <GitCompare className="w-5 h-5 text-sage-600" />
        {t('compareDiffTitle')}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('compareDiffSubtitle')}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200/75 dark:border-neutral-800">
              <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                {t('compareDiffMetric')}
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                {labelA}
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                {labelB}
              </th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                {t('compareDiffDelta')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{row.label}</td>
                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{row.valueA}</td>
                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{row.valueB}</td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    row.deltaNumeric != null && row.deltaNumeric > 0
                      ? 'text-green-700 dark:text-green-400'
                      : row.deltaNumeric != null && row.deltaNumeric < 0
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {row.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
