'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  GLAMPING_OVERVIEW_DATA_SOURCE_FILTER_KEYS,
  glampingOverviewDataSourceQueryValue,
  type GlampingOverviewDataSourceFilterKey,
} from '@/lib/glamping-industry-overview/glamping-overview-data-source-filter';
import type { GlampingOverviewSourceFilterUnavailable } from '@/lib/glamping-industry-overview/glamping-overview-active-payload';

type Props = {
  sourceFilter: GlampingOverviewDataSourceFilterKey;
  sourceFilterUnavailable: GlampingOverviewSourceFilterUnavailable;
};

export default function GlampingOverviewAnalystControls({
  sourceFilter,
  sourceFilterUnavailable,
}: Props) {
  const t = useTranslations('admin.glampingIndustryOverview.analystControls');
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
          {GLAMPING_OVERVIEW_DATA_SOURCE_FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={sourceFilter === key}
              disabled={pending}
              onClick={() =>
                pushParams({
                  source: key === 'all' ? undefined : glampingOverviewDataSourceQueryValue(key),
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
        {sourceFilterUnavailable === 'hipcamp' ? (
          <p className="text-xs text-amber-800 dark:text-amber-200" role="status">
            {t('hipcampOnlyPendingRefresh')}
          </p>
        ) : null}
        {sourceFilterUnavailable === 'sage' ? (
          <p className="text-xs text-amber-800 dark:text-amber-200" role="status">
            {t('sageOnlyPendingRefresh')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
