'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { adminPageDescription, adminPageTitle, DEFAULT_ADMIN_PATH } from '@/lib/admin-ui';
import { isRvOverviewSnapshotMissingError } from '@/lib/rv-industry-overview/rv-overview-errors';
import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';

export default function RvIndustryOverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('admin.rvIndustryOverview.snapshotError');
  const snapshotMissing = isRvOverviewSnapshotMissingError(error);

  useEffect(() => {
    console.error('[rv-industry-overview]', error);
  }, [error]);

  if (snapshotMissing) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <header>
            <h1 className={adminPageTitle}>{t('title')}</h1>
            <p className={`mt-2 ${adminPageDescription}`}>{t('description')}</p>
          </header>

          <div
            className="rounded-lg border border-amber-200/90 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30"
            role="alert"
          >
            <p className="text-sm font-medium text-amber-950 dark:text-amber-100">{t('stepsIntro')}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-900/90 dark:text-amber-100/90">
              <li>
                <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-950/60">
                  {t('stepRefreshApi')}
                </code>
              </li>
              <li>{t('stepNpm')}</li>
              <li className="text-amber-800/80 dark:text-amber-200/70">{t('stepDevOnly')}</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="primary" size="sm" onClick={() => reset()}>
              {t('tryAgain')}
            </Button>
            <Link
              href={DEFAULT_ADMIN_PATH}
              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
            >
              {t('backToDashboard')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className={adminPageTitle}>Something went wrong</h1>
        <p className={adminPageDescription}>
          {sanitizeAdminDisplayError(error, {
            fallback: 'An unexpected error occurred while loading RV Industry Overview.',
          })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" size="sm" onClick={() => reset()}>
            {t('tryAgain')}
          </Button>
          <Link
            href={DEFAULT_ADMIN_PATH}
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
          >
            {t('backToDashboard')}
          </Link>
        </div>
      </div>
    </main>
  );
}
