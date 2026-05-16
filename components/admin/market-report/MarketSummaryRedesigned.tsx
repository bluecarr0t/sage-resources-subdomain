'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCountyGdpThousands } from '@/lib/market-report/format-county-gdp';
import { formatCurrency, humanLabel } from '@/lib/market-report/format-labels';
import {
  resolveMarketInsightsModelLabel,
  type MarketInsightsModelLabelResolution,
} from '@/lib/market-report/insights-model-label';
import type { MarketReportSections } from '@/lib/market-report/types';
import { unitTypePillSurfaceClasses } from '@/lib/market-report/unit-type-pill-styles';
import { Stat } from '@/components/admin/market-report/MarketReportStat';
import {
  formatMarketReportStateCell,
  sanitizeHttpUrl,
} from '@/components/admin/market-report/report-table-utils';

export type MarketReportInsightsState = {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'failed';
  bullets: string[];
  model: string | null;
  tokensUsed: number | null;
  cached: boolean;
  failedKind?: 'rate_limit' | 'generic';
};

function formatInsightsOperatorLabel(
  t: (key: string, values?: Record<string, string | number>) => string,
  res: MarketInsightsModelLabelResolution,
): string {
  if (res.operatorLabelKey === 'insightsModelOtherProviderViaGateway') {
    return t('insightsModelOtherProviderViaGateway', {
      provider: res.otherProvider ?? 'Unknown',
    });
  }
  return t(res.operatorLabelKey);
}

function AiInsightsBlock({
  t,
  format,
  insights,
  presenterMode,
  onRetryInsights,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  format: ReturnType<typeof useFormatter>;
  insights: MarketReportInsightsState;
  presenterMode: boolean;
  onRetryInsights: () => void;
}) {
  const modelLabel = useMemo(() => {
    if (insights.status !== 'ready' || !insights.model) return null;
    return resolveMarketInsightsModelLabel(insights.model);
  }, [insights.status, insights.model]);

  if (insights.status === 'idle' || insights.status === 'empty') return null;
  if (presenterMode && insights.status === 'failed') return null;

  return (
    <section
      aria-labelledby="market-summary-ai-insights"
      className="market-report-pdf-keep rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3
          id="market-summary-ai-insights"
          className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200"
        >
          {t('summaryAiBulletsTitle')}
        </h3>
        {!presenterMode && insights.status === 'ready' && modelLabel ? (
          <div className="flex max-w-[min(100%,20rem)] flex-col items-end gap-0.5 text-right">
            <p className="text-[10px] leading-snug text-amber-900/75 dark:text-amber-200/75">
              <span>{t('summaryAiBulletsAttributionPrefix')}</span>
              {insights.cached ? (
                <>
                  {' '}
                  ·{' '}
                  <span className="text-amber-900/60 dark:text-amber-200/60">
                    {t('summaryAiBulletsAttributionCachedBadge')}
                  </span>
                </>
              ) : null}
              {' · '}
              <span
                className="cursor-help border-b border-dotted border-amber-900/35 dark:border-amber-200/35"
                title={t('insightsModelRawIdTooltip', { id: modelLabel.rawModelId })}
              >
                {formatInsightsOperatorLabel(t, modelLabel)}
              </span>
            </p>
            {insights.tokensUsed != null ? (
              <p className="text-[10px] tabular-nums text-amber-900/55 dark:text-amber-200/55">
                {t('summaryAiBulletsTokensUsed', { tokens: format.number(insights.tokensUsed) })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {insights.status === 'loading' ? (
        <div
          className="flex items-center gap-2 text-sm text-amber-900/80 dark:text-amber-200/80"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
          <span>{t('summaryAiBulletsLoading')}</span>
        </div>
      ) : null}
      {insights.status === 'failed' ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-950 dark:text-amber-100" role="alert">
            {insights.failedKind === 'rate_limit'
              ? t('summaryAiBulletsFailedRateLimited')
              : t('summaryAiBulletsFailed')}
          </p>
          {!presenterMode ? (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 self-start sm:self-auto"
              onClick={onRetryInsights}
            >
              {t('summaryAiBulletsRetry')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {insights.status === 'ready' ? (
        <>
          <ul className="space-y-1.5 text-sm text-neutral-800 dark:text-neutral-100">
            {insights.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-amber-950/65 dark:text-amber-100/60">
            {presenterMode
              ? t('summaryAiBulletsAttributionFootnotePresenter')
              : t('summaryAiBulletsAttributionFootnote')}
          </p>
        </>
      ) : null}
    </section>
  );
}

function gradeColors(grade: 'A' | 'B' | 'C' | 'D' | 'F'): { ring: string; bg: string; text: string } {
  switch (grade) {
    case 'A':
      return {
        ring: 'ring-emerald-300',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'B':
      return {
        ring: 'ring-lime-300',
        bg: 'bg-lime-50 dark:bg-lime-950/30',
        text: 'text-lime-700 dark:text-lime-300',
      };
    case 'C':
      return {
        ring: 'ring-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-300',
      };
    case 'D':
      return {
        ring: 'ring-orange-300',
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        text: 'text-orange-700 dark:text-orange-300',
      };
    case 'F':
      return {
        ring: 'ring-rose-300',
        bg: 'bg-rose-50 dark:bg-rose-950/30',
        text: 'text-rose-700 dark:text-rose-300',
      };
  }
}

function opportunityPillarBarFillClass(available: boolean, points: number, maxPoints: number): string {
  if (!available || maxPoints <= 0) {
    return 'fill-neutral-400 dark:fill-neutral-600';
  }
  const ratio = points / maxPoints;
  if (ratio >= 2 / 3) {
    return 'fill-emerald-600 dark:fill-emerald-500';
  }
  if (ratio >= 1 / 3) {
    return 'fill-amber-500 dark:fill-amber-400';
  }
  return 'fill-rose-600 dark:fill-rose-500';
}

function OpportunityComponentBar({
  component,
  county,
  fillClassName,
  t,
}: {
  component: NonNullable<MarketReportSections['marketSummary']['opportunityScore']>['components'][number];
  county: MarketReportSections['marketSummary']['countyMetrics'] | null;
  fillClassName: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const pct =
    !component.available || component.maxPoints === 0
      ? 0
      : Math.round((component.points / component.maxPoints) * 100);
  const showCountyLowConfidence =
    component.key === 'economy' && county != null && county.highConfidence === false;
  const barFillW = component.available ? Math.min(100, Math.max(0, pct)) : 0;

  return (
    <div className="text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{component.label}</span>
            {showCountyLowConfidence ? (
              <span
                title={t('countyMetricsLowConfidenceTooltip')}
                className="inline-flex max-w-full shrink-0 rounded border border-amber-200/90 bg-amber-50/90 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200"
              >
                {t('countyMetricsLowConfidenceBadge')}
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
            {component.available ? `${component.points}/${component.maxPoints}` : '—'}
          </span>
          {component.available && component.maxPoints > 0 ? (
            <p className="mt-0.5 text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
              {t('opportunityPillarPercentOfMax', { pct })}
            </p>
          ) : null}
        </div>
      </div>
      <div
        className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={component.available ? pct : 0}
        aria-label={component.label}
      >
        {component.available && barFillW > 0 ? (
          <svg
            className="absolute inset-0 block h-full w-full"
            viewBox="0 0 100 6"
            preserveAspectRatio="none"
            aria-hidden
          >
            <rect x="0" y="0" width={barFillW} height="6" className={fillClassName} />
          </svg>
        ) : null}
      </div>
      <p className="mt-1 leading-snug text-neutral-500 dark:text-neutral-400">{component.detail}</p>
      {component.key === 'premium' && component.available ? (
        <p className="mt-1 leading-snug text-neutral-600 dark:text-neutral-500">
          {t('opportunityPremiumPositioningInterpretation')}
        </p>
      ) : null}
    </div>
  );
}

function OpportunityScoreCard({
  score,
  county,
  t,
}: {
  score: NonNullable<MarketReportSections['marketSummary']['opportunityScore']>;
  county: MarketReportSections['marketSummary']['countyMetrics'] | null | undefined;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const colors = gradeColors(score.grade);
  return (
    <div
      className={`market-report-pdf-keep rounded-lg border border-neutral-200 ${colors.bg} p-4 dark:border-neutral-700`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div
          className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full ring-4 ${colors.ring} bg-white shadow-sm dark:bg-neutral-900`}
        >
          <span className={`text-3xl font-bold tabular-nums ${colors.text}`}>{score.score}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t('opportunityScoreOutOf')}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t('opportunityScoreLabel')}
            </p>
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${colors.text} ${colors.bg}`}>
              {score.grade}
            </span>
            <span
              title={t('opportunityScoreBetaTooltip')}
              className="rounded border border-amber-300/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-700/60 dark:bg-neutral-900 dark:text-amber-300"
            >
              {t('opportunityScoreBetaLabel')}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{score.headline}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {score.components.map((c) => (
              <OpportunityComponentBar
                key={c.key}
                component={c}
                county={c.key === 'economy' ? county ?? null : null}
                fillClassName={opportunityPillarBarFillClass(c.available, c.points, c.maxPoints)}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverTile({
  label,
  count,
  radiusMiles,
  top,
  format,
  t,
}: {
  label: string;
  count: number;
  radiusMiles: number;
  top: string[];
  format: ReturnType<typeof useFormatter>;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50/60 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
        {format.number(count)}
      </p>
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        {t('driverWithinRadius', { miles: format.number(radiusMiles) })}
      </p>
      {top.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 text-xs text-neutral-700 dark:text-neutral-300">
          {top.map((name, i) => (
            <li key={`${i}-${name}`} className="truncate">
              · {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DemandDriversBlock({
  t,
  format,
  drivers,
  county,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  format: ReturnType<typeof useFormatter>;
  drivers: NonNullable<MarketReportSections['marketSummary']['demandDrivers']> | null;
  county: NonNullable<MarketReportSections['marketSummary']['countyMetrics']> | null;
}) {
  return (
    <div className="market-report-pdf-keep">
      <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {t('summaryDemandDriversTitle')}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {drivers ? (
          <>
            <DriverTile
              label={t('driverNationalParks')}
              count={drivers.nationalParks.count}
              radiusMiles={drivers.nationalParks.radiusMiles}
              top={drivers.nationalParks.top.slice(0, 3).map((p) => p.name)}
              format={format}
              t={t}
            />
            <DriverTile
              label={t('driverSkiResorts')}
              count={drivers.skiResorts.count}
              radiusMiles={drivers.skiResorts.radiusMiles}
              top={drivers.skiResorts.top.slice(0, 3).map((p) => p.name)}
              format={format}
              t={t}
            />
            <DriverTile
              label={t('driverWineries')}
              count={drivers.wineries.count}
              radiusMiles={drivers.wineries.radiusMiles}
              top={drivers.wineries.top.slice(0, 3).map((p) => p.name)}
              format={format}
              t={t}
            />
            <DriverTile
              label={t('driverMajorLargeCities')}
              count={drivers.majorAndLargeCities.count}
              radiusMiles={drivers.majorAndLargeCities.radiusMiles}
              top={drivers.majorAndLargeCities.top.slice(0, 3).map((p) =>
                p.siteType ? `${p.name} · ${p.siteType}` : p.name,
              )}
              format={format}
              t={t}
            />
          </>
        ) : null}
      </div>
      {county ? (
        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50/60 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t('summaryCountyTitle')}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">{county.countyName}</p>
            {!county.highConfidence ? (
              <span
                title={t('countyMetricsLowConfidenceTooltip')}
                className="inline-flex max-w-full items-center rounded-md border border-amber-200/90 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200"
              >
                {t('countyMetricsLowConfidenceBadge')}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-neutral-700 dark:text-neutral-300">
            {county.population2020 != null
              ? t('countyPopulationLine', {
                  pop: format.number(county.population2020),
                  change:
                    county.populationChangePct != null
                      ? `${county.populationChangePct >= 0 ? '+' : ''}${county.populationChangePct.toFixed(1)}%`
                      : '—',
                })
              : t('countyPopulationUnknown')}
          </p>
          <p className="mt-1 text-neutral-700 dark:text-neutral-300">
            {county.gdp2023 != null
              ? t('countyGdpLine', {
                  gdp: formatCountyGdpThousands(county.gdp2023),
                  growth:
                    county.gdpGrowthMaaPct != null
                      ? `${county.gdpGrowthMaaPct >= 0 ? '+' : ''}${county.gdpGrowthMaaPct.toFixed(2)}%`
                      : '—',
                })
              : t('countyGdpUnknown')}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function MarketSummaryRedesigned({
  marketSummary,
  rateAnalysis,
  scope,
  insights,
  presenterMode,
  onRetryInsights,
  anonymizeComps = false,
}: {
  marketSummary: MarketReportSections['marketSummary'];
  rateAnalysis: MarketReportSections['rateAnalysis'];
  scope: 'local' | 'national';
  insights: MarketReportInsightsState;
  presenterMode: boolean;
  onRetryInsights: () => void;
  /** When true, unit-type detail rows hide identifiable listing names and external links. */
  anonymizeComps?: boolean;
}) {
  const t = useTranslations('admin.marketReport');
  const format = useFormatter();
  const score = marketSummary.opportunityScore ?? null;
  const drivers = marketSummary.demandDrivers ?? null;
  const county = marketSummary.countyMetrics ?? null;
  const isLocal = scope === 'local';
  const [expandedTopUnitType, setExpandedTopUnitType] = useState<string | null>(null);

  useEffect(() => {
    if (presenterMode) setExpandedTopUnitType(null);
  }, [presenterMode]);

  const toggleTopUnitType = useCallback((unitType: string) => {
    setExpandedTopUnitType((prev) => (prev === unitType ? null : unitType));
  }, []);

  return (
    <div className="space-y-5">
      {isLocal && score ? (
        <OpportunityScoreCard score={score} county={county} t={t} />
      ) : null}

      <AiInsightsBlock
        t={t}
        format={format}
        insights={insights}
        presenterMode={presenterMode}
        onRetryInsights={onRetryInsights}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t('summaryStatProperties')}
          value={format.number(marketSummary.distinctListingCount)}
        />
        <Stat
          label={t('summaryStatTotalSites')}
          value={marketSummary.totalSites != null ? format.number(marketSummary.totalSites) : '—'}
        />
        <Stat
          label={t('summaryStatMeanArdr')}
          value={rateAnalysis.meanAdr != null ? formatCurrency(rateAnalysis.meanAdr) : '—'}
        />
        <Stat
          label={t('summaryStatMedianArdr')}
          value={rateAnalysis.medianAdr != null ? formatCurrency(rateAnalysis.medianAdr) : '—'}
        />
      </div>

      {marketSummary.topUnitTypesWithAdr.length > 0 ? (
        <div>
          <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
            <table className="w-full min-w-[20rem] border-collapse text-sm">
              <thead className="bg-neutral-50/80 dark:bg-neutral-900/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColType')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColCount')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColUnitCount')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColMeanAdr')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">
                    {t('summaryTopUnitTypesColMedianAdr')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {marketSummary.topUnitTypesWithAdr.map((row) => {
                  const expanded = expandedTopUnitType === row.unit_type;
                  const details = row.details ?? [];
                  const hasDetails = details.length > 0;
                  return (
                    <Fragment key={row.unit_type}>
                      <tr
                        className={`border-t border-neutral-200 dark:border-neutral-700 ${
                          hasDetails && !presenterMode
                            ? 'hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">
                          {hasDetails && !presenterMode ? (
                            <button
                              type="button"
                              onClick={() => toggleTopUnitType(row.unit_type)}
                              aria-expanded={expanded}
                              aria-label={
                                expanded
                                  ? t('summaryTopUnitTypesCollapseRow', {
                                      unitType: humanLabel(row.unit_type),
                                    })
                                  : t('summaryTopUnitTypesExpandRow', {
                                      unitType: humanLabel(row.unit_type),
                                    })
                              }
                              className="flex w-full max-w-[min(100%,20rem)] items-center gap-2 rounded-md py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
                            >
                              <ChevronRight
                                className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform dark:text-neutral-400 ${
                                  expanded ? 'rotate-90' : ''
                                }`}
                                aria-hidden
                              />
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${unitTypePillSurfaceClasses(row.unit_type)}`}
                              >
                                {humanLabel(row.unit_type)}
                              </span>
                            </button>
                          ) : (
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${unitTypePillSurfaceClasses(row.unit_type)}`}
                            >
                              {humanLabel(row.unit_type)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{format.number(row.count)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.unitCount != null ? format.number(row.unitCount) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.meanAdr != null ? formatCurrency(row.meanAdr) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.medianAdr != null ? formatCurrency(row.medianAdr) : '—'}
                        </td>
                      </tr>
                      {expanded && hasDetails ? (
                        <tr className="border-t border-neutral-100 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-900/35">
                          <td colSpan={5} className="px-3 py-3 align-top">
                            <div className="overflow-x-auto rounded-md border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-950/80">
                              <table className="w-full min-w-[32rem] border-collapse text-xs">
                                <thead className="bg-neutral-50/90 dark:bg-neutral-900/60">
                                  <tr className="text-left text-neutral-600 dark:text-neutral-300">
                                    <th className="px-3 py-2 font-medium">{t('tableProperty')}</th>
                                    {!anonymizeComps ? (
                                      <th className="px-3 py-2 font-medium">{t('summaryTopUnitTypesColSiteName')}</th>
                                    ) : null}
                                    <th className="px-3 py-2 font-medium">{t('tableCity')}</th>
                                    <th className="px-3 py-2 font-medium">{t('tableState')}</th>
                                    {!presenterMode ? (
                                      <th className="px-3 py-2 font-medium">{t('tableSource')}</th>
                                    ) : null}
                                    {isLocal ? (
                                      <th className="px-3 py-2 font-medium">{t('tableDistanceMi')}</th>
                                    ) : null}
                                    <th className="px-3 py-2 text-right font-medium">
                                      {t('summaryTopUnitTypesDetailUnits')}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">{t('tablePropertyArdr')}</th>
                                    {!anonymizeComps ? (
                                      <th className="px-3 py-2 font-medium">{t('tableWebsite')}</th>
                                    ) : null}
                                  </tr>
                                </thead>
                                <tbody>
                                  {details.map((d, detailIdx) => {
                                    const safeUrl = sanitizeHttpUrl(d.url);
                                    const displayName = anonymizeComps
                                      ? t('anonymizedListingLabel', { n: detailIdx + 1 })
                                      : d.property_name;
                                    return (
                                      <tr
                                        key={d.key}
                                        className="border-t border-neutral-100 dark:border-neutral-800"
                                      >
                                        <td
                                          className="max-w-[11rem] truncate px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100"
                                          title={anonymizeComps ? undefined : d.property_name}
                                        >
                                          {displayName}
                                        </td>
                                        {!anonymizeComps ? (
                                          <td
                                            className="max-w-[10rem] truncate px-3 py-2 text-neutral-800 dark:text-neutral-200"
                                            title={d.site_name ?? undefined}
                                          >
                                            {d.site_name != null && d.site_name.trim() !== ''
                                              ? d.site_name
                                              : '—'}
                                          </td>
                                        ) : null}
                                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                                          {anonymizeComps ? '—' : d.city}
                                        </td>
                                        <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                                          {formatMarketReportStateCell(d.state)}
                                        </td>
                                        {!presenterMode ? (
                                          <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                                            {d.sourceLabel}
                                          </td>
                                        ) : null}
                                        {isLocal ? (
                                          <td className="px-3 py-2 tabular-nums text-neutral-800 dark:text-neutral-200">
                                            {format.number(d.distance_miles)}
                                          </td>
                                        ) : null}
                                        <td className="px-3 py-2 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                                          {d.quantity_of_units != null
                                            ? format.number(d.quantity_of_units)
                                            : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                                          {d.rate_avg != null ? formatCurrency(d.rate_avg) : '—'}
                                        </td>
                                        {!anonymizeComps ? (
                                          <td className="px-3 py-2">
                                            {safeUrl ? (
                                              <a
                                                href={safeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline dark:text-blue-400"
                                              >
                                                {t('tableWebsiteVisit')} ↗
                                              </a>
                                            ) : (
                                              <span className="text-neutral-400">—</span>
                                            )}
                                          </td>
                                        ) : null}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {row.detailsTruncated ? (
                              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                {t('summaryTopUnitTypesTruncated', {
                                  shown: details.length,
                                  total: row.count,
                                })}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isLocal && (drivers || county) ? (
        <DemandDriversBlock t={t} format={format} drivers={drivers} county={county} />
      ) : null}
    </div>
  );
}
