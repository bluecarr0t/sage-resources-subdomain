'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  RV_OVERVIEW_DATA_SOURCE_FILTER_KEYS,
  rvOverviewDataSourceQueryValue,
  type RvOverviewDataSourceFilterKey,
} from '@/lib/rv-industry-overview/rv-overview-data-source-filter';
import { RV_OVERVIEW_CHART_SOURCE_RULES } from '@/lib/rv-industry-overview/rv-overview-source-parity';

type Props = {
  sourceFilter: RvOverviewDataSourceFilterKey;
  campspotOnlyUnavailable: boolean;
};

export default function RvOverviewAnalystControls({
  sourceFilter,
  campspotOnlyUnavailable,
}: Props) {
  const t = useTranslations('admin.rvIndustryOverview.analystControls');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      startTransition(() => {
        const q = next.toString();
        router.push(q ? `${pathname}?${q}` : pathname);
      });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('sourceLabel')}</p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{t('sourceHint')}</p>
        </div>
        <div
          className="inline-flex flex-wrap gap-2"
          role="radiogroup"
          aria-label={t('sourceAria')}
        >
          {RV_OVERVIEW_DATA_SOURCE_FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={sourceFilter === key}
              disabled={pending}
              onClick={() =>
                pushParams({
                  source: key === 'all' ? undefined : rvOverviewDataSourceQueryValue(key),
                })
              }
              className={
                sourceFilter === key
                  ? 'rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-950 dark:text-gray-200'
              }
            >
              {t(`source.${key}`)}
            </button>
          ))}
        </div>
        {campspotOnlyUnavailable ? (
          <p className="text-xs text-amber-800 dark:text-amber-200" role="status">
            {t('campspotOnlyPendingRefresh')}
          </p>
        ) : null}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">
          {t('yoyRulesTitle')}
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-gray-600 dark:text-gray-400">
          {RV_OVERVIEW_CHART_SOURCE_RULES.filter((r) => r.requiresMatched2024And2025).map((rule) => (
            <li key={rule.chartKey}>
              <span className="font-medium text-gray-700 dark:text-gray-300">{rule.chartKey}</span>
              {' — '}
              {rule.notes}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">{t('yoyRulesFootnote')}</p>
      </details>
    </div>
  );
}
