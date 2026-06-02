'use client';

import { useTranslations } from 'next-intl';

const SPINNER_CLASS =
  'h-8 w-8 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600 dark:border-sage-800 dark:border-t-sage-400';

type OverviewNamespace = 'admin.rvIndustryOverview' | 'admin.glampingIndustryOverview';

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={SPINNER_CLASS} aria-hidden />
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

export function IndustryOverviewPageLoading({
  messagesNamespace,
}: {
  messagesNamespace: OverviewNamespace;
}) {
  const t = useTranslations(messagesNamespace);
  return (
    <main className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[min(70vh,560px)] max-w-7xl items-center justify-center">
        <LoadingSpinner message={t('pageLoading')} />
      </div>
    </main>
  );
}

export function IndustryOverviewChartLoading({
  messagesNamespace,
}: {
  messagesNamespace: OverviewNamespace;
}) {
  const t = useTranslations(messagesNamespace);
  return (
    <div className="flex min-h-[280px] w-full items-center justify-center rounded-md bg-neutral-50/80 dark:bg-neutral-950/55">
      <LoadingSpinner message={t('chartLoading')} />
    </div>
  );
}

export function IndustryOverviewMapLoading({
  messagesNamespace,
}: {
  messagesNamespace: OverviewNamespace;
}) {
  const t = useTranslations(messagesNamespace);
  return (
    <div
      className="flex w-full items-center justify-center rounded-lg bg-white dark:bg-white"
      style={{ aspectRatio: '960/580', minHeight: 280 }}
    >
      <LoadingSpinner message={t('mapLoading')} />
    </div>
  );
}
