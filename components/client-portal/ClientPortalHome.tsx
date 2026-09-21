'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { ClientPortalEngagementList } from '@/components/client-portal/ClientPortalEngagementList';
import type { ClientPortalSafeJob } from '@/lib/client-portal/types';

export function ClientPortalHome({
  email,
  isStaff,
  jobs,
}: {
  email: string;
  isStaff: boolean;
  jobs: ClientPortalSafeJob[];
}) {
  const t = useTranslations('clientPortal');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="text-sm text-neutral-600">{email}</p>
          {isStaff ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-sage-800">
              {t('staffPreview')}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.assign('/client-portal');
          }}
        >
          {t('signOut')}
        </Button>
      </div>
      <ClientPortalEngagementList jobs={jobs} />
    </div>
  );
}
