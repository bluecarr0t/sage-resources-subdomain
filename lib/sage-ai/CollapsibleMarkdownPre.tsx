'use client';

import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Collapsed-by-default fenced code in assistant markdown so long Python
 * snippets do not dominate the thread. Expand with the summary control.
 */
export function CollapsibleMarkdownPre({ children }: { children?: ReactNode }) {
  const t = useTranslations('admin.sageAi');
  return (
    <details className="group my-3 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <summary className="flex cursor-pointer list-none items-center gap-2 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 group-open:hidden" aria-hidden />
        <ChevronDown className="hidden h-4 w-4 shrink-0 group-open:block" aria-hidden />
        {t('markdownCodeExpandLabel')}
      </summary>
      <div className="max-h-[min(70vh,560px)] overflow-auto border-t border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-950">
        <pre className="m-0 whitespace-pre-wrap break-words bg-transparent p-0 font-mono text-gray-800 dark:text-gray-200">
          {children}
        </pre>
      </div>
    </details>
  );
}
