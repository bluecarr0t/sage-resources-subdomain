'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { adminPageDescription, adminPageTitle } from '@/lib/admin-ui';
import { rvOverviewApiDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';

type RefreshResponse = {
  success?: boolean;
  error?: string;
};

export default function GlampingIndustryOverviewSnapshotMissing() {
  const t = useTranslations('admin.glampingIndustryOverview.snapshotError');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/glamping-industry-overview/refresh-cache', {
        method: 'POST',
      });
      const json = (await res.json()) as RefreshResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? t('refreshFailed'));
      }
      router.refresh();
    } catch (err) {
      setError(rvOverviewApiDisplayError(err));
    } finally {
      setBusy(false);
    }
  }, [router, t]);

  return (
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
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={busy}
              className="font-medium text-sage-700 underline underline-offset-2 hover:text-sage-800 disabled:opacity-50 dark:text-sage-300"
            >
              {t('stepRefreshButton')}
            </button>
            {busy ? (
              <Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin align-text-bottom" aria-hidden />
            ) : null}
          </li>
          <li>
            <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-950/60">
              {t('stepRefreshApi')}
            </code>
          </li>
          <li>{t('stepNpm')}</li>
          <li className="text-amber-800/80 dark:text-amber-200/70">{t('stepDevOnly')}</li>
        </ul>
        {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={busy}
          onClick={() => void handleRefresh()}
        >
          {busy ? t('refreshLoading') : t('refreshData')}
        </Button>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
        >
          {t('backToDashboard')}
        </Link>
      </div>
    </div>
  );
}
