'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { adminPageDescription, adminPageTitle } from '@/lib/admin-ui';
import { isGlampingOverviewSnapshotMissingError } from '@/lib/glamping-industry-overview/glamping-overview-errors';
import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';
import GlampingIndustryOverviewSnapshotMissing from './GlampingIndustryOverviewSnapshotMissing';

export default function GlampingIndustryOverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('admin.glampingIndustryOverview.snapshotError');
  const snapshotMissing = isGlampingOverviewSnapshotMissingError(error);

  useEffect(() => {
    console.error('[glamping-industry-overview]', error);
  }, [error]);

  if (snapshotMissing) {
    return (
      <main className="pb-16 px-4 sm:px-6 lg:px-8">
        <GlampingIndustryOverviewSnapshotMissing />
      </main>
    );
  }

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className={adminPageTitle}>Something went wrong</h1>
        <p className={adminPageDescription}>
          {sanitizeAdminDisplayError(error, {
            fallback: 'An unexpected error occurred while loading Glamping Industry Overview.',
          })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" size="sm" onClick={() => reset()}>
            {t('tryAgain')}
          </Button>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
          >
            {t('backToDashboard')}
          </Link>
        </div>
      </div>
    </main>
  );
}
