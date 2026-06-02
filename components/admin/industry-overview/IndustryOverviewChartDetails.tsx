'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

type MessagesNamespace = 'admin.rvIndustryOverview' | 'admin.glampingIndustryOverview';

type Props = {
  children: ReactNode;
  messagesNamespace: MessagesNamespace;
};

/**
 * Collapses source transparency, scope notes, and scan footers below industry overview charts.
 */
export function IndustryOverviewChartDetails({ children, messagesNamespace }: Props) {
  const t = useTranslations(`${messagesNamespace}.chartDetails`);

  return (
    <details className="group rounded-md border border-neutral-200/80 bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-900/40">
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 [&::-webkit-details-marker]:hidden"
        aria-label={t('summaryAria')}
      >
        <span>{t('summary')}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180 dark:text-gray-400"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-neutral-200/80 px-3 py-3 dark:border-neutral-700">
        {children}
      </div>
    </details>
  );
}
