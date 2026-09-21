'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { clientPortalJobPath } from '@/lib/client-portal/sanitize';
import type { ClientPortalSafeJob } from '@/lib/client-portal/types';

export function ClientPortalEngagementList({
  jobs,
}: {
  jobs: ClientPortalSafeJob[];
}) {
  const t = useTranslations('clientPortal');

  if (jobs.length === 0) {
    return <p className="text-neutral-600 dark:text-neutral-300">{t('noEngagements')}</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        {t('selectEngagement')}
      </h2>
      <ul className="space-y-3">
        {jobs.map((job) => (
          <li key={job.jobNumber}>
            <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-50">
                  {job.jobNumber}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {job.client}
                  {job.propertyLocation ? ` · ${job.propertyLocation}` : ''}
                </p>
                <p className="text-sm text-neutral-500">{job.stage}</p>
              </div>
              <Link
                href={clientPortalJobPath(job.jobNumber)}
                className="inline-flex items-center justify-center rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700"
              >
                {t('openJob')}
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
