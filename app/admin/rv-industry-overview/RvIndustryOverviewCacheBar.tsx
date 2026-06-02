'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { IndustryOverviewSnapshotCounts } from '@/components/admin/industry-overview/IndustryOverviewSnapshotCounts';
import type {
  RvOverviewSnapshotInventory,
  RvOverviewSnapshotMeta,
} from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';
import { rvOverviewApiDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';

type Props = {
  initialMeta: RvOverviewSnapshotMeta;
  snapshotInventory?: RvOverviewSnapshotInventory;
  rowsScannedTotal: number;
  rowsScannedCampspot: number;
  rowsScannedRoverpass: number;
};

type RefreshResponse = {
  success?: boolean;
  error?: string;
  computedAt?: string;
  rowsScanned?: number;
  rowsScannedCampspot?: number;
  rowsScannedRoverpass?: number;
};

export default function RvIndustryOverviewCacheBar({
  initialMeta,
  snapshotInventory,
  rowsScannedTotal,
  rowsScannedCampspot,
  rowsScannedRoverpass,
}: Props) {
  const t = useTranslations('admin.rvIndustryOverview.cacheHealth');
  const format = useFormatter();
  const router = useRouter();

  const [meta, setMeta] = useState(initialMeta);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const computedLabel =
    meta.computedAt != null
      ? format.dateTime(new Date(meta.computedAt), {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;

  const propertyCount = snapshotInventory?.propertyCount ?? null;
  const unitSiteCount = snapshotInventory?.unitSiteCount ?? rowsScannedTotal;
  const unitSiteCampspot =
    snapshotInventory?.unitSiteCountCampspot ?? rowsScannedCampspot;
  const unitSiteRoverpass =
    snapshotInventory?.unitSiteCountRoverpass ?? rowsScannedRoverpass;

  const handleRefresh = useCallback(async () => {
    setRefreshBusy(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/admin/rv-industry-overview/refresh-cache', {
        method: 'POST',
      });
      const json = (await res.json()) as RefreshResponse;
      if (!res.ok || !json.success) {
        throw new Error(rvOverviewApiDisplayError(json.error ?? t('refreshErrorGeneric')));
      }

      if (json.computedAt) {
        setMeta({
          present: true,
          computedAt: json.computedAt,
          rowsScanned:
            typeof json.rowsScanned === 'number' ? json.rowsScanned : meta.rowsScanned,
        });
      }

      router.refresh();
    } catch (err) {
      setRefreshError(rvOverviewApiDisplayError(err));
    } finally {
      setRefreshBusy(false);
    }
  }, [meta.rowsScanned, router, t]);

  return (
    <div
      className="rounded-lg border border-neutral-200/80 bg-neutral-50/70 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/40"
      role="region"
      aria-label={t('regionAria')}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <dl className="min-w-0 space-y-1 text-sm">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <dt className="text-neutral-500 dark:text-neutral-400">{t('snapshotComputed')}</dt>
            <dd className="font-medium text-neutral-800 dark:text-neutral-200">
              {meta.present && computedLabel ? computedLabel : t('snapshotMissing')}
            </dd>
          </div>
          {meta.present ? (
            <IndustryOverviewSnapshotCounts
              propertyCount={propertyCount}
              unitSiteCount={unitSiteCount}
              sources={{
                primaryLabel: 'Campspot',
                primaryCount: unitSiteCampspot,
                secondaryLabel: 'Roverpass',
                secondaryCount: unitSiteRoverpass,
              }}
              notAvailableLabel={t('notAvailable')}
              propertyCountLabel={t('propertyCount')}
              unitSiteCountLabel={t('unitSiteCount')}
              sourceSplitLabel={({ primary, secondary }) =>
                t('sourceSplit', { primary, secondary })
              }
              format={format}
            />
          ) : null}
        </dl>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshBusy}
            className="inline-flex items-center justify-center gap-2"
          >
            {refreshBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {refreshBusy ? t('refreshLoading') : t('refreshData')}
          </Button>
          {refreshBusy ? (
            <p className="max-w-xs text-xs text-neutral-500 dark:text-neutral-400 sm:text-right">
              {t('refreshSlowHint')}
            </p>
          ) : null}
        </div>
      </div>

      {refreshError ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {refreshError}
        </p>
      ) : null}
    </div>
  );
}
