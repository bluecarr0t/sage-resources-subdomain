'use client';

import { Button, Card } from '@/components/ui';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import { QUALITY_TIERS, type QualityTier } from '@/lib/comps-v2/types';
import { orderedCompsV2CountEntries } from '@/app/admin/comps-v2/comps-v2-result-helpers';
import { computeCompsV2SummaryStats } from '@/lib/comps-v2/comps-summary-stats';
import type { WebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';

type TCompsV2 = (key: string, values?: Record<string, string | number>) => string;
type SummaryStats = ReturnType<typeof computeCompsV2SummaryStats>;

interface CompsV2SummarySectionProps {
  t: TCompsV2;
  sourceLabel: (table: string) => string;
  counts: Record<string, number> | null;
  summaryStats: SummaryStats;
  summaryCurrency: Intl.NumberFormat;
  compositionRawRowsTotal: number;
  webResearch: WebResearchDiagnostics | null;
  webResearchFirecrawlTopNUsed: number;
  searchContext: { anchorCity: string; stateAbbr: string } | null;
  discoveryCorrelationId: string | null;
  discoverySourceTimingsMs: Record<string, number> | null;
  tierLabels: Record<QualityTier, string>;
  downloadXlsx: () => Promise<void>;
  downloadCsv: () => void;
  sortedFilteredCandidates: CompsV2Candidate[];
  gapFillLoading: boolean;
  runGapFillOnly: () => void;
  kinds: Set<import('@/lib/comps-v2/types').CompsV2PropertyKind>;
}

export default function CompsV2SummarySection({
  t,
  sourceLabel,
  counts,
  summaryStats,
  summaryCurrency,
  compositionRawRowsTotal,
  webResearch,
  webResearchFirecrawlTopNUsed,
  searchContext,
  discoveryCorrelationId,
  discoverySourceTimingsMs,
  tierLabels,
  downloadXlsx,
  downloadCsv,
  sortedFilteredCandidates,
  gapFillLoading,
  runGapFillOnly,
  kinds,
}: CompsV2SummarySectionProps) {
  if (!counts || Object.keys(counts).length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('summaryTitle')}</h2>
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-2 tabular-nums">
        {t('summaryUniquePropertiesLead', { count: summaryStats.totalProperties.toLocaleString() })}
      </p>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-5 mb-2">
        {t('summarySectionMarketSize')}
      </p>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mb-1">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryTotalSites')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
            {summaryStats.totalSites != null ? summaryStats.totalSites.toLocaleString() : t('summaryDash')}
          </dd>
        </div>
      </dl>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-5 mb-2">
        {t('summarySectionPricing')}
      </p>
      <dl className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mb-1">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryMeanAdr')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
            {summaryStats.avgAdr != null
              ? summaryCurrency.format(Math.round(summaryStats.avgAdr))
              : t('summaryDash')}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryMedianAdr')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
            {summaryStats.medianAdr != null
              ? summaryCurrency.format(Math.round(summaryStats.medianAdr))
              : t('summaryDash')}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryAdrP25P75')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
            {summaryStats.adrP25 != null && summaryStats.adrP75 != null
              ? `${summaryCurrency.format(Math.round(summaryStats.adrP25))} – ${summaryCurrency.format(Math.round(summaryStats.adrP75))}`
              : t('summaryDash')}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryAdrRange')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
            {summaryStats.adrLow != null && summaryStats.adrHigh != null
              ? `${summaryCurrency.format(Math.round(summaryStats.adrLow))} – ${summaryCurrency.format(Math.round(summaryStats.adrHigh))}`
              : t('summaryDash')}
          </dd>
        </div>
      </dl>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-5 mb-2">
        {t('summarySectionCoverage')}
      </p>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mb-1">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryCoverageAdr')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
            {summaryStats.coverageAdrPct != null ? `${summaryStats.coverageAdrPct}%` : t('summaryDash')}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryCoverageUnits')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
            {summaryStats.coverageUnitsPct != null ? `${summaryStats.coverageUnitsPct}%` : t('summaryDash')}
          </dd>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryCoverageCoords')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 mt-0.5">
            {summaryStats.coverageCoordsPct != null ? `${summaryStats.coverageCoordsPct}%` : t('summaryDash')}
          </dd>
        </div>
      </dl>

      {webResearch?.ran ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-5 mb-2">
            {t('summarySectionWebResearch')}
          </p>
          <dl className="grid gap-3 sm:grid-cols-1 max-w-5xl mb-1">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5">
              <dt className="text-xs text-gray-500 dark:text-gray-400">{t('summaryWebResearchHealthLabel')}</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100 mt-0.5 leading-snug space-y-1.5">
                {!webResearch.tavily.apiConfigured ? (
                  <p className="m-0 font-semibold">{t('webResearchSummaryTavilyMissing')}</p>
                ) : (
                  <>
                    <p className="m-0 font-semibold">
                      {t('webResearchSummaryTavily', {
                        raw: webResearch.tavily.rawResultRowsFromApi,
                        filtered: webResearch.tavily.afterRelevanceRows,
                        skipped: webResearch.tavily.skippedAggregatePages ?? 0,
                      })}
                    </p>
                    <p className="m-0 text-xs font-normal text-gray-600 dark:text-gray-400">
                      {t('webResearchCostBudgetNote', {
                        tavilyQ: webResearch.tavily.maxQueriesBudget,
                        tavilyRows: webResearch.tavily.maxResultsPerQueryBudget,
                        firecrawlCap: webResearchFirecrawlTopNUsed,
                      })}
                    </p>
                  </>
                )}
                <p className="m-0 font-semibold">
                  {webResearch.firecrawl.apiConfigured ? (
                    webResearchFirecrawlTopNUsed === 0 ? (
                      t('webResearchSummaryFirecrawlSkipped')
                    ) : (
                      t('webResearchSummaryFirecrawl', {
                        enriched: webResearch.firecrawl.enriched,
                        attempted: webResearch.firecrawl.attempted,
                      })
                    )
                  ) : (
                    t('webResearchSummaryFirecrawlMissing')
                  )}
                </p>
              </dd>
              {webResearch.anchorCityForQueries && searchContext?.stateAbbr ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-2 leading-snug">
                  {t('webResearchAnchorNote', {
                    city: webResearch.anchorCityForQueries,
                    state: searchContext.stateAbbr,
                  })}
                </p>
              ) : null}
              {webResearch.webDistanceGeocodeHits != null && webResearch.webDistanceGeocodeHits > 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 m-0 mt-1 leading-snug">
                  {t('webResearchDistanceGeocoded', {
                    hits: webResearch.webDistanceGeocodeHits,
                  })}
                </p>
              ) : null}
            </div>
          </dl>
        </>
      ) : null}

      {discoveryCorrelationId ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 font-mono m-0 break-all">
          {t('discoveryCorrelationFootnote', { id: discoveryCorrelationId })}
        </p>
      ) : null}

      {discoverySourceTimingsMs && Object.keys(discoverySourceTimingsMs).length > 0 ? (
        <details className="mt-4 text-xs text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
            {t('discoverySourceTimingsTitle')}
          </summary>
          <dl className="mt-2 grid gap-1 sm:grid-cols-2 font-mono tabular-nums">
            {Object.entries(discoverySourceTimingsMs)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, ms]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt>{sourceLabel(k)}</dt>
                  <dd className="m-0">{ms}ms</dd>
                </div>
              ))}
          </dl>
        </details>
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-5 mb-2">
        {t('summaryTierMix')}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300 max-w-5xl mb-1">
        {QUALITY_TIERS.map((tier) => {
          const cnt = summaryStats.tierCounts[tier];
          if (cnt === 0) return null;
          const pct =
            summaryStats.totalProperties > 0
              ? Math.round((100 * cnt) / summaryStats.totalProperties)
              : 0;
          return (
            <span key={tier} className="tabular-nums">
              {tierLabels[tier]}: {cnt.toLocaleString()} ({pct}%)
            </span>
          );
        })}
        {summaryStats.tierUnclassified > 0 ? (
          <span className="tabular-nums">
            {t('summaryTierMixOther')}: {summaryStats.tierUnclassified.toLocaleString()} (
            {summaryStats.totalProperties > 0
              ? Math.round((100 * summaryStats.tierUnclassified) / summaryStats.totalProperties)
              : 0}
            %)
          </span>
        ) : null}
        {QUALITY_TIERS.every((tier) => summaryStats.tierCounts[tier] === 0) &&
        summaryStats.tierUnclassified === 0 ? (
          <span className="text-gray-500 dark:text-gray-400">{t('summaryDash')}</span>
        ) : null}
      </div>

      <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{t('summaryCompositionTitle')}</p>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 space-y-1">
          <p className="m-0 leading-snug">
            {t('summaryCompositionCaption', { rawRows: compositionRawRowsTotal.toLocaleString() })}
          </p>
          {counts && typeof counts.web_search === 'number' ? (
            <p className="m-0 leading-snug">{t('summaryCompositionWebHint')}</p>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
          {orderedCompsV2CountEntries(counts).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2.5"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                {sourceLabel(key)}
              </span>
              <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
                {value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void downloadXlsx()}
          disabled={!sortedFilteredCandidates.length}
        >
          {t('exportXlsx')}
        </Button>
        <Button type="button" variant="secondary" onClick={downloadCsv} disabled={!sortedFilteredCandidates.length}>
          {t('exportCsv')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void runGapFillOnly()}
          disabled={
            gapFillLoading ||
            !searchContext ||
            searchContext.stateAbbr.length !== 2 ||
            kinds.size === 0
          }
        >
          {gapFillLoading ? t('gapFilling') : t('gapFillOnly')}
        </Button>
      </div>
    </Card>
  );
}
