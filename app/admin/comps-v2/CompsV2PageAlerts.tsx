'use client';

import type { WebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';

type TCompsV2 = (key: string, values?: Record<string, string | number>) => string;

interface CompsV2PageAlertsProps {
  t: TCompsV2;
  error: string | null;
  loading: boolean;
  discoveryEarlyTavilyErrors: string[];
  webResearch: WebResearchDiagnostics | null;
  webResearchFirecrawlTopNUsed: number;
}

export default function CompsV2PageAlerts({
  t,
  error,
  loading,
  discoveryEarlyTavilyErrors,
  webResearch,
  webResearchFirecrawlTopNUsed,
}: CompsV2PageAlertsProps) {
  return (
    <>
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {loading && discoveryEarlyTavilyErrors.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
        >
          <p className="font-medium m-0 mb-1">{t('tavilyStreamingErrorsTitle')}</p>
          <p className="text-xs m-0 mb-2 opacity-90">{t('tavilyStreamingErrorsHint')}</p>
          <ul className="m-0 pl-4 list-disc text-xs space-y-0.5">
            {discoveryEarlyTavilyErrors.slice(0, 6).map((err, i) => (
              <li key={`${i}-${err.slice(0, 40)}`}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {webResearch?.ran ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm space-y-2 ${
            !webResearch.tavily.apiConfigured || webResearch.tavily.queryErrors.length > 0
              ? 'border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
              : 'border-slate-200 bg-slate-50/90 text-slate-800 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-100'
          }`}
          role="status"
        >
          <p className="font-medium text-gray-900 dark:text-gray-100">{t('webResearchBannerTitle')}</p>
          {!webResearch.tavily.apiConfigured ? (
            <p className="m-0 leading-snug">{t('webResearchTavilyNoKey')}</p>
          ) : null}
          {webResearch.tavily.apiConfigured && webResearch.tavily.queryErrors.length > 0 ? (
            <div role="alert">
              <p className="m-0 mb-1 font-medium">{t('webResearchTavilyQueryErrors')}</p>
              <ul className="m-0 pl-4 list-disc text-xs space-y-0.5">
                {webResearch.tavily.queryErrors.slice(0, 6).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {!webResearch.firecrawl.apiConfigured ? (
            <p className="m-0 text-xs leading-snug text-gray-600 dark:text-gray-400">
              {t('webResearchFirecrawlNoKey')}
            </p>
          ) : webResearchFirecrawlTopNUsed === 0 ? (
            <p className="m-0 text-xs leading-snug text-gray-600 dark:text-gray-400">
              {t('webResearchFirecrawlSkippedZero')}
            </p>
          ) : null}
          {webResearch.addedAfterFilters != null ? (
            <p className="m-0 text-xs font-medium text-gray-700 dark:text-gray-300">
              {t('webResearchAfterFilters', { count: webResearch.addedAfterFilters })}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
