'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { ChevronDown, Download, Loader2 } from 'lucide-react';
import VisualizationJpgDownload from '../rv-industry-overview/VisualizationJpgDownload';
import RvIndustryOverviewDownloadAllBanner from '../rv-industry-overview/RvIndustryOverviewDownloadAllBanner';
import type { VisualizationJpgDownloadHandle } from '@/lib/rv-industry-overview/visualization-export';
import {
  runRvOverviewChartCapture,
  runRvOverviewChartDownload,
  summarizeDownloadAll,
  type RvOverviewDownloadAllSummary,
  type RvOverviewDownloadChartKey,
  type RvOverviewDownloadChartOutcome,
} from '@/lib/rv-industry-overview/rv-overview-download-all';
import { GLAMPING_STATE_ADR_CHOROPLETH_MIN_N } from '@/lib/rv-industry-overview/campspot-rv-map-data';
import type { GlampingIndustryOverviewClientProps } from '@/lib/glamping-industry-overview/glamping-overview-client-props';
import { glampingOverviewDataSourceQueryValue } from '@/lib/glamping-industry-overview/glamping-overview-data-source-filter';
import { GLAMPING_AMENITY_PROPERTY_CHART_KEYS_SAGE } from '@/lib/glamping-industry-overview/glamping-amenity-properties-chart-data';
import { GLAMPING_AMENITY_ADR_CHART_KEYS_SAGE } from '@/lib/glamping-industry-overview/glamping-amenity-adr-chart-data';
import { Button } from '@/components/ui';
import { adminPageDescription, adminPageTitle } from '@/lib/admin-ui';
import GlampingIndustryOverviewCacheBar from './GlampingIndustryOverviewCacheBar';
import GlampingOverviewAnalystControls from './GlampingOverviewAnalystControls';
import GlampingOverviewChartSourceTransparency from './GlampingOverviewChartSourceTransparency';
import { CHART_TRANSPARENCY_TO_SOURCE_SCOPE } from '@/lib/rv-industry-overview/rv-overview-chart-source-scope';
import {
  buildRvOverviewExportPackZip,
  triggerBlobDownload,
  type RvOverviewExportPackFile,
} from '@/lib/rv-industry-overview/rv-overview-export-pack';
import type {
  ChartSourceBreakdown,
  RvOverviewChartTransparencyKey,
} from '@/lib/rv-industry-overview/rv-overview-chart-transparency';
import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';
import { RV_OVERVIEW_CHART_ERROR_FALLBACK } from '@/lib/rv-industry-overview/rv-overview-display-error';
import {
  IndustryOverviewChartLoading,
  IndustryOverviewMapLoading,
} from '@/components/admin/industry-overview/IndustryOverviewLoading';

const glampingChartLoading = () => (
  <IndustryOverviewChartLoading messagesNamespace="admin.glampingIndustryOverview" />
);
const glampingMapLoading = () => (
  <IndustryOverviewMapLoading messagesNamespace="admin.glampingIndustryOverview" />
);

const RegionalCampspotMap = dynamic(
  () => import('../rv-industry-overview/RegionalCampspotMap'),
  { ssr: false, loading: glampingMapLoading }
);

const StateAdrChoroplethMap = dynamic(
  () => import('../rv-industry-overview/StateAdrChoroplethMap'),
  { ssr: false, loading: glampingMapLoading }
);

/** Code-split Recharts so the initial admin JS bundle stays smaller; loads in parallel per chart. */
const OccupancyAdrTrendsChart = dynamic(() => import('../rv-industry-overview/OccupancyAdrTrendsChart'), {
  loading: glampingChartLoading,
});
const ResortSizeImpactChart = dynamic(() => import('../rv-industry-overview/ResortSizeImpactChart'), {
  loading: glampingChartLoading,
});
const RatesBySeasonChart = dynamic(() => import('../rv-industry-overview/RatesBySeasonChart'), {
  loading: glampingChartLoading,
});
const SiteSurfaceRatesChart = dynamic(() => import('../rv-industry-overview/SiteSurfaceRatesChart'), {
  loading: glampingChartLoading,
});
const AmenitiesByPropertyPctChart = dynamic(() => import('../rv-industry-overview/AmenitiesByPropertyPctChart'), {
  loading: glampingChartLoading,
});
const AmenitiesByAvgAdrChart = dynamic(() => import('../rv-industry-overview/AmenitiesByAvgAdrChart'), {
  loading: glampingChartLoading,
});

type Props = GlampingIndustryOverviewClientProps;

const BETWEEN_DOWNLOADS_MS = 400;
const GLAMPING_UNIT_FILTER = 'glamping' as const;

export default function GlampingIndustryOverviewClient({
  sourceFilter,
  displayPreferences,
  sourceFilterUnavailable,
  slice: unitSlice,
  rowsScannedTotal,
  rowsScannedHipcamp,
  rowsScannedSage,
  scanTransparency,
  snapshotMeta,
  snapshotInventory,
}: Props) {
  const unitFilter = GLAMPING_UNIT_FILTER;
  const searchParams = useSearchParams();

  const {
    mapResult,
    trendsResult,
    sizeResult,
    seasonRatesResult,
    surfaceRatesResult,
    amenityPropsResult,
    amenityAdrResult,
    chartSourceTransparency: chartTransp,
  } = unitSlice;

  const chartSourcePanel = (
    key: RvOverviewChartTransparencyKey,
    breakdown?: ChartSourceBreakdown | null
  ) => (
    <GlampingOverviewChartSourceTransparency
      breakdown={breakdown ?? chartTransp?.[key] ?? null}
      scanTransparency={scanTransparency}
      rowsScannedHipcamp={rowsScannedHipcamp}
      rowsScannedSage={rowsScannedSage}
    />
  );

  const unclassified = scanTransparency?.unclassifiedExcluded;

  const t = useTranslations('admin.glampingIndustryOverview');
  const tt = useTranslations('admin.glampingIndustryOverview.trends');
  const ts = useTranslations('admin.glampingIndustryOverview.sizeImpact');
  const trs = useTranslations('admin.glampingIndustryOverview.ratesBySeason');
  const tss = useTranslations('admin.glampingIndustryOverview.siteSurfaceRates');
  const tap = useTranslations('admin.glampingIndustryOverview.amenitiesByPropertyPct');
  const taa = useTranslations('admin.glampingIndustryOverview.amenitiesByAvgAdr');
  const tsc = useTranslations('admin.glampingIndustryOverview.stateAdrChoropleth');

  const format = useFormatter();
  const rowsScannedLine = (count: number) =>
    t('rowsScanned', {
      count: format.number(count, { maximumFractionDigits: 0 }),
    });
  const rowsScannedSourceLine = t('rowsScannedBySource', {
    hipcamp: format.number(rowsScannedHipcamp, { maximumFractionDigits: 0 }),
    sage: format.number(rowsScannedSage, { maximumFractionDigits: 0 }),
  });

  const chartLoadErrorDetail = (detail: string | null | undefined) =>
    sanitizeAdminDisplayError(detail, { fallback: RV_OVERVIEW_CHART_ERROR_FALLBACK });

  const mapDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const trendsDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const sizeDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const seasonRatesDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const surfaceRatesDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const amenityPropsDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const amenityAdrDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const stateAdrChoroplethDlRef = useRef<VisualizationJpgDownloadHandle>(null);

  const [downloadAllBusy, setDownloadAllBusy] = useState(false);
  const [exportPackBusy, setExportPackBusy] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [downloadAllSummary, setDownloadAllSummary] =
    useState<RvOverviewDownloadAllSummary | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const td = useTranslations('admin.glampingIndustryOverview.downloadAll');
  const tScope = useTranslations('admin.glampingIndustryOverview.chartSourceScope');
  const tPack = useTranslations('admin.glampingIndustryOverview.exportPack');
  const tAnalyst = useTranslations('admin.glampingIndustryOverview.analystControls');
  const yearEmphasis = displayPreferences.yearEmphasis;
  const sageSourceOnly = sourceFilter === 'sage';
  const showOccupancyInCharts = !sageSourceOnly;

  const glampingChartDownloadProps = {
    detailsMessagesNamespace: 'admin.glampingIndustryOverview' as const,
  };

  const chartScopePanel = (key: RvOverviewChartTransparencyKey) => {
    const body =
      sourceFilter === 'hipcamp'
        ? tScope('campspotOnlyView')
        : sourceFilter === 'sage'
          ? key === 'regionalMap'
            ? tScope('regionalMap2025Sage')
            : tScope('sageOnlyView')
          : tScope(CHART_TRANSPARENCY_TO_SOURCE_SCOPE[key]);

    return (
      <p
        className="rounded-md border border-amber-200/80 bg-amber-50/90 px-2.5 py-1.5 text-xs leading-snug text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        role="note"
      >
        <span className="font-medium">{tScope('label')}</span> {body}
      </p>
    );
  };

  const includeSurfaceRatesChart = !sageSourceOnly;

  const hasAnyExportableChart =
    !mapResult.error ||
    !trendsResult.error ||
    !sizeResult.error ||
    !seasonRatesResult.error ||
    (includeSurfaceRatesChart && !surfaceRatesResult.error) ||
    !amenityPropsResult.error ||
    !amenityAdrResult.error;

  const exportBusy = exportPackBusy || downloadAllBusy;

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (exportMenuRef.current?.contains(e.target as Node)) return;
      setExportMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [exportMenuOpen]);

  const downloadAll = useCallback(async () => {
    if (!hasAnyExportableChart) return;
    setDownloadAllBusy(true);
    setDownloadAllSummary(null);

    const pause = () =>
      new Promise<void>((resolve) => setTimeout(resolve, BETWEEN_DOWNLOADS_MS));

    const chartLabels: Record<RvOverviewDownloadChartKey, string> = {
      regionalMap: td('charts.regionalMap'),
      trends: td('charts.trends'),
      resortSize: td('charts.resortSize'),
      unitTypeRate: '',
      unitTypeDistribution: '',
      seasonRates: td('charts.seasonRates'),
      surfaceRates: td('charts.surfaceRates'),
      amenityPropertyPct: td('charts.amenityPropertyPct'),
      amenityAdr: td('charts.amenityAdr'),
      rvParking: '',
      stateAdrChoropleth: td('charts.stateAdrChoropleth'),
    };

    const steps: {
      key: RvOverviewDownloadChartKey;
      enabled: boolean;
      ref: RefObject<VisualizationJpgDownloadHandle | null>;
    }[] = [
      { key: 'regionalMap', enabled: !mapResult.error, ref: mapDlRef },
      { key: 'trends', enabled: !trendsResult.error, ref: trendsDlRef },
      { key: 'resortSize', enabled: !sizeResult.error, ref: sizeDlRef },
      { key: 'seasonRates', enabled: !seasonRatesResult.error, ref: seasonRatesDlRef },
      {
        key: 'surfaceRates',
        enabled: includeSurfaceRatesChart && !surfaceRatesResult.error,
        ref: surfaceRatesDlRef,
      },
      { key: 'amenityPropertyPct', enabled: !amenityPropsResult.error, ref: amenityPropsDlRef },
      { key: 'amenityAdr', enabled: !amenityAdrResult.error, ref: amenityAdrDlRef },
      { key: 'stateAdrChoropleth', enabled: !mapResult.error, ref: stateAdrChoroplethDlRef },
    ];

    const outcomes: RvOverviewDownloadChartOutcome[] = [];

    try {
      for (const step of steps) {
        const label = chartLabels[step.key];
        if (!step.enabled) {
          outcomes.push({ key: step.key, label, status: 'skipped' });
          continue;
        }

        const result = await runRvOverviewChartDownload(step.ref.current);
        if (result.ok) {
          outcomes.push({ key: step.key, label, status: 'exported' });
        } else {
          outcomes.push({
            key: step.key,
            label,
            status: 'failed',
            error: chartLoadErrorDetail(result.error),
          });
        }

        await pause();
      }

      setDownloadAllSummary(summarizeDownloadAll(outcomes));
    } catch (err) {
      console.error('[GlampingIndustryOverviewClient] Download all', err);
      outcomes.push({
        key: 'regionalMap',
        label: td('charts.batchError'),
        status: 'failed',
        error: sanitizeAdminDisplayError(err, { fallback: td('statusErrorGeneric') }),
      });
      setDownloadAllSummary(summarizeDownloadAll(outcomes));
    } finally {
      setDownloadAllBusy(false);
    }
  }, [
    hasAnyExportableChart,
    mapResult.error,
    trendsResult.error,
    sizeResult.error,
    seasonRatesResult.error,
    surfaceRatesResult.error,
    includeSurfaceRatesChart,
    amenityPropsResult.error,
    amenityAdrResult.error,
    td,
  ]);

  const fetchMapFallbackPng = useCallback(
    async (chart: 'regional' | 'choropleth'): Promise<Blob | null> => {
      const q = new URLSearchParams({
        chart,
        unit: unitFilter,
        source: glampingOverviewDataSourceQueryValue(sourceFilter),
      });
      const res = await fetch(`/api/admin/glamping-industry-overview/map-export?${q.toString()}`);
      if (!res.ok) return null;
      return res.blob();
    },
    [unitFilter, sourceFilter]
  );

  const downloadExportPack = useCallback(async () => {
    if (!hasAnyExportableChart) return;
    setExportPackBusy(true);
    setDownloadAllSummary(null);

    const pause = () =>
      new Promise<void>((resolve) => setTimeout(resolve, BETWEEN_DOWNLOADS_MS));

    const chartLabels: Record<RvOverviewDownloadChartKey, string> = {
      regionalMap: td('charts.regionalMap'),
      trends: td('charts.trends'),
      resortSize: td('charts.resortSize'),
      unitTypeRate: '',
      unitTypeDistribution: '',
      seasonRates: td('charts.seasonRates'),
      surfaceRates: td('charts.surfaceRates'),
      amenityPropertyPct: td('charts.amenityPropertyPct'),
      amenityAdr: td('charts.amenityAdr'),
      rvParking: '',
      stateAdrChoropleth: td('charts.stateAdrChoropleth'),
    };

    const steps: {
      key: RvOverviewDownloadChartKey;
      enabled: boolean;
      ref: RefObject<VisualizationJpgDownloadHandle | null>;
      captureProfile: 'chart' | 'map';
      mapFallback?: 'regional' | 'choropleth';
    }[] = [
      { key: 'regionalMap', enabled: !mapResult.error, ref: mapDlRef, captureProfile: 'map', mapFallback: 'regional' },
      { key: 'trends', enabled: !trendsResult.error, ref: trendsDlRef, captureProfile: 'chart' },
      { key: 'resortSize', enabled: !sizeResult.error, ref: sizeDlRef, captureProfile: 'chart' },
      { key: 'seasonRates', enabled: !seasonRatesResult.error, ref: seasonRatesDlRef, captureProfile: 'chart' },
      {
        key: 'surfaceRates',
        enabled: includeSurfaceRatesChart && !surfaceRatesResult.error,
        ref: surfaceRatesDlRef,
        captureProfile: 'chart',
      },
      { key: 'amenityPropertyPct', enabled: !amenityPropsResult.error, ref: amenityPropsDlRef, captureProfile: 'chart' },
      { key: 'amenityAdr', enabled: !amenityAdrResult.error, ref: amenityAdrDlRef, captureProfile: 'chart' },
      { key: 'stateAdrChoropleth', enabled: !mapResult.error, ref: stateAdrChoroplethDlRef, captureProfile: 'map', mapFallback: 'choropleth' },
    ];

    const outcomes: RvOverviewDownloadChartOutcome[] = [];
    const packFiles: RvOverviewExportPackFile[] = [];

    try {
      for (const step of steps) {
        const label = chartLabels[step.key];
        if (!step.enabled) {
          outcomes.push({ key: step.key, label, status: 'skipped' });
          continue;
        }

        const capture = await runRvOverviewChartCapture(step.ref.current);
        if (capture.ok) {
          packFiles.push({ key: step.key, fileName: capture.fileName, blob: capture.blob });
          outcomes.push({ key: step.key, label, status: 'exported' });
        } else if (capture.blankCapture && step.mapFallback) {
          const fallback = await fetchMapFallbackPng(step.mapFallback);
          if (fallback) {
            const fileName =
              step.mapFallback === 'choropleth'
                ? 'rv-industry-state-adr-choropleth-fallback.png'
                : 'glamping-industry-overview-regional-map-fallback.png';
            packFiles.push({ key: step.key, fileName, blob: fallback });
            outcomes.push({ key: step.key, label, status: 'exported' });
          } else {
            outcomes.push({
              key: step.key,
              label,
              status: 'failed',
              error: chartLoadErrorDetail(capture.error),
            });
          }
        } else {
          outcomes.push({
            key: step.key,
            label,
            status: 'failed',
            error: chartLoadErrorDetail(capture.error),
          });
        }

        await pause();
      }

      if (packFiles.length > 0) {
        const zip = await buildRvOverviewExportPackZip(packFiles, {
          title: t('title'),
          generatedAtIso: new Date().toISOString(),
          unitFilterLabel: t('cohortLabel'),
          sourceFilterLabel: tAnalyst(`source.${sourceFilter}`),
          yearEmphasisLabel: tAnalyst(`year.${yearEmphasis}`),
          rateMetricLabel: tAnalyst(`rate.${displayPreferences.rateMetric}`),
          rowsScannedLine: `${rowsScannedLine(rowsScannedTotal)} (${rowsScannedSourceLine})`,
          yoyRulesSummary: t('dataSourcesYoYNote'),
        });
        triggerBlobDownload(zip, tPack('zipFileName'));
      }

      setDownloadAllSummary(summarizeDownloadAll(outcomes));
    } catch (err) {
      console.error('[GlampingIndustryOverviewClient] Export pack', err);
      setDownloadAllSummary(
        summarizeDownloadAll([
          {
            key: 'regionalMap',
            label: tPack('batchError'),
            status: 'failed',
            error: sanitizeAdminDisplayError(err, { fallback: tPack('statusErrorGeneric') }),
          },
        ])
      );
    } finally {
      setExportPackBusy(false);
    }
  }, [
    hasAnyExportableChart,
    mapResult.error,
    trendsResult.error,
    sizeResult.error,
    seasonRatesResult.error,
    surfaceRatesResult.error,
    includeSurfaceRatesChart,
    amenityPropsResult.error,
    amenityAdrResult.error,
    td,
    tPack,
    tAnalyst,
    t,
    unitFilter,
    sourceFilter,
    yearEmphasis,
    displayPreferences.rateMetric,
    rowsScannedTotal,
    rowsScannedLine,
    rowsScannedSourceLine,
    fetchMapFallbackPng,
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className={adminPageTitle}>
          {t('title')}
        </h1>
        <div className="mt-2 flex flex-row items-start justify-between gap-4">
          <p className={`min-w-0 flex-1 ${adminPageDescription}`}>
            {t('subtitle')}
          </p>
          <div className="relative shrink-0" ref={exportMenuRef}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!hasAnyExportableChart || exportBusy}
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
              aria-controls="rv-overview-export-menu"
              id="rv-overview-export-trigger"
              className="inline-flex items-center gap-1.5"
              onClick={() => {
                if (exportBusy) return;
                setExportMenuOpen((open) => !open);
              }}
            >
              {exportBusy ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {exportPackBusy
                ? tPack('loading')
                : downloadAllBusy
                  ? t('downloadAllJpgLoading')
                  : t('exportMenu.button')}
              {!exportBusy ? (
                <ChevronDown
                  className={`h-4 w-4 shrink-0 opacity-70 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              ) : null}
            </Button>
            {exportMenuOpen && !exportBusy ? (
              <div
                id="rv-overview-export-menu"
                role="menu"
                aria-labelledby="rv-overview-export-trigger"
                className="absolute right-0 top-full z-20 mt-1 min-w-[15rem] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => {
                    setExportMenuOpen(false);
                    void downloadExportPack();
                  }}
                >
                  <Download className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  {tPack('button')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => {
                    setExportMenuOpen(false);
                    void downloadAll();
                  }}
                >
                  <Download className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  {t('downloadAllJpg')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <GlampingIndustryOverviewCacheBar
        initialMeta={snapshotMeta}
        snapshotInventory={snapshotInventory}
        rowsScannedTotal={rowsScannedTotal}
        rowsScannedHipcamp={rowsScannedHipcamp}
        rowsScannedSage={rowsScannedSage}
      />

      <GlampingOverviewAnalystControls
        sourceFilter={sourceFilter}
        sourceFilterUnavailable={sourceFilterUnavailable}
      />

      <RvIndustryOverviewDownloadAllBanner
        summary={downloadAllSummary}
        onDismiss={() => setDownloadAllSummary(null)}
      />

      <div
        className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-neutral-800 dark:bg-gray-900/40"
        role="region"
        aria-label={t('cohortRegionAria')}
      >
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('cohortLabel')}</p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('cohortHint')}</p>
        {unclassified && unclassified.total > 0 ? (
          <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400" role="status">
            {t('cohortUnclassified', {
              total: unclassified.total,
              hipcamp: unclassified.campspot,
              sage: unclassified.roverpass,
            })}
          </p>
        ) : scanTransparency ? (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">{t('cohortUnclassifiedNone')}</p>
        ) : null}
        <details className="mt-3 rounded-md border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-700 dark:bg-gray-950/40">
          <summary className="cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200">
            {t('dataSourcesTitle')}
          </summary>
          <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 text-xs text-gray-600 dark:border-neutral-700 dark:text-gray-400">
            <p>{t('dataSourcesSummary')}</p>
            <p>{t('dataSourcesClassifiedRows')}</p>
            <p>{t('dataSourcesYoYNote')}</p>
            <p className="font-medium text-gray-700 dark:text-gray-300">{t('dataSourcesPerChartTitle')}</p>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>
                <span className="font-medium">{td('charts.regionalMap')}</span> —{' '}
                {tScope('regionalMap2025')}
              </li>
              <li>
                <span className="font-medium">{t('dataSourcesChartStateModal')}</span> —{' '}
                {tScope('mapStateModalYoY')}
              </li>
              <li>
                <span className="font-medium">{td('charts.trends')}</span> — {tScope('trendsYoY')}
              </li>
              <li>
                <span className="font-medium">{td('charts.resortSize')}</span> —{' '}
                {tScope('resortSizeYoY')}
              </li>
              <li>
                <span className="font-medium">{td('charts.stateAdrChoropleth')}</span> —{' '}
                {tScope('stateAdrChoropleth2025')}
              </li>
              <li>
                <span className="font-medium">
                  {includeSurfaceRatesChart
                    ? `${td('charts.seasonRates')}, ${td('charts.surfaceRates')}, ${td('charts.amenityPropertyPct')}, ${td('charts.amenityAdr')}`
                    : `${td('charts.seasonRates')}, ${td('charts.amenityPropertyPct')}, ${td('charts.amenityAdr')}`}
                </span>{' '}
                — {tScope('seasonSurfaceAmenity2025')}
              </li>
            </ul>
          </div>
        </details>
        <details className="mt-3 rounded-md border border-neutral-200/70 bg-white/60 px-3 py-2 dark:border-neutral-700 dark:bg-gray-950/40">
          <summary className="cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200">
            {t('standardFiltersTitle')}
          </summary>
          <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 text-xs text-gray-600 dark:border-neutral-700 dark:text-gray-400">
            <p>{t('standardFiltersIntro')}</p>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>{t('standardFiltersOccupancy')}</li>
              <li>{t('standardFiltersRate')}</li>
              <li>{t('standardFiltersPropertyCohort')}</li>
              <li>{t('standardFiltersByChart')}</li>
            </ul>
          </div>
        </details>
      </div>

      <section aria-labelledby="viz1-heading">
        {mapResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {t('loadError')} {chartLoadErrorDetail(mapResult.error)}
          </p>
        ) : (
          <VisualizationJpgDownload
            {...glampingChartDownloadProps}
            ref={mapDlRef}
            headingId="viz1-heading"
            exportTitle={sageSourceOnly ? t('mapSectionTitleSage') : t('mapSectionTitle')}
            captureProfile="map"
            fileStem="glamping-industry-overview-regional-map-2025"
            captionBelow={
              <div className="space-y-2">
                {chartScopePanel('regionalMap')}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sageSourceOnly ? t('mapCaptionSage') : t('mapCaption')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {sageSourceOnly ? t('mapInteractHintSage') : t('mapInteractHint')}
                </p>
                {chartScopePanel('stateAdrChoropleth')}
              </div>
            }
            footerBelow={
              <div className="max-w-4xl space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <p>
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {rowsScannedLine(mapResult.rowsScanned)}
                  </span>{' '}
                  <span className="text-gray-500 dark:text-gray-400">({rowsScannedSourceLine})</span>{' '}
                  {t('rowsScannedDetail')}
                </p>
                <p>{t('mapOutliers')}</p>
                <p>{t('mapRegionalInclusion')}</p>
                <p>{t('mapStateCohortNote')}</p>
              </div>
            }
            sourceTransparency={chartSourcePanel('regionalMap')}
          >
            <RegionalCampspotMap
              byRegion={mapResult.byRegion}
              byState={mapResult.byState}
              showOccupancy={showOccupancyInCharts}
              stateAdrChoropleth={mapResult.stateAdrChoropleth}
              stateHoverMode={sageSourceOnly ? 'adr2025_only' : 'yoy_matched'}
              mapStateMessagesNamespace="admin.glampingIndustryOverview.mapState"
            />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz2-heading"
        className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
      >
        {trendsResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {tt('loadError')} {chartLoadErrorDetail(trendsResult.error)}
          </p>
        ) : (
          <VisualizationJpgDownload
            {...glampingChartDownloadProps}
            ref={trendsDlRef}
            headingId="viz2-heading"
            exportTitle={tt('chartTitle')}
            fileStem="rv-resort-park-occupancy-rate-trends"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                {chartScopePanel('trends')}
                <p className="text-sm text-gray-600 dark:text-gray-400">{tt('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tt('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rowsScannedLine(trendsResult.rowsScanned)}
              </p>
            }
            sourceTransparency={chartSourcePanel('trends')}
          >
            <OccupancyAdrTrendsChart
              rows={trendsResult.rows}
              unitFilter={unitFilter}
              yearEmphasis={yearEmphasis}
              variant="compact"
              showOccupancy={showOccupancyInCharts}
              messagesNamespace="admin.glampingIndustryOverview.trends"
            />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz3-heading"
        className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
      >
        {sizeResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {ts('loadError')} {chartLoadErrorDetail(sizeResult.error)}
          </p>
        ) : (
          <VisualizationJpgDownload
            {...glampingChartDownloadProps}
            ref={sizeDlRef}
            headingId="viz3-heading"
            exportTitle={ts('chartTitle')}
            fileStem="rv-impact-resort-size-ardr-occupancy"
            captionBelow={
              <div className="space-y-2 max-w-4xl">
                {chartScopePanel('resortSize')}
                <p className="text-sm text-gray-600 dark:text-gray-400">{ts('intro')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{ts('body')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ts('tableFootnote')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rowsScannedLine(sizeResult.rowsScanned)}
              </p>
            }
            sourceTransparency={chartSourcePanel('resortSize')}
          >
            <ResortSizeImpactChart
              rows={sizeResult.rows}
              yearEmphasis={yearEmphasis}
              variant="compact"
              showOccupancy={showOccupancyInCharts}
              productVariant="glamping"
            />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz6-heading"
        className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
      >
        {seasonRatesResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {trs('loadError')} {chartLoadErrorDetail(seasonRatesResult.error)}
          </p>
        ) : (
          <VisualizationJpgDownload
            {...glampingChartDownloadProps}
            ref={seasonRatesDlRef}
            headingId="viz6-heading"
            exportTitle={trs('chartTitle')}
            exportSubtitle={trs('subtitle')}
            fileStem="rv-industry-rates-by-season"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                {chartScopePanel('seasonRates')}
                <p className="text-sm text-gray-600 dark:text-gray-400">{trs('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{trs('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rowsScannedLine(seasonRatesResult.rowsScanned)}
              </p>
            }
            sourceTransparency={chartSourcePanel('seasonRates')}
          >
            <RatesBySeasonChart rows={seasonRatesResult.rows} />
          </VisualizationJpgDownload>
        )}
      </section>

      {includeSurfaceRatesChart ? (
        <section
          aria-labelledby="viz7-heading"
          className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
        >
          {surfaceRatesResult.error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {tss('loadError')} {chartLoadErrorDetail(surfaceRatesResult.error)}
            </p>
          ) : (
            <VisualizationJpgDownload
              {...glampingChartDownloadProps}
              ref={surfaceRatesDlRef}
              headingId="viz7-heading"
              exportTitle={tss('chartTitle')}
              exportSubtitle={tss('subtitle')}
              fileStem="rv-industry-site-surface-rates"
              captionBelow={
                <div className="max-w-4xl space-y-2">
                  {chartScopePanel('surfaceRates')}
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tss('intro')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tss('methodology')}</p>
                </div>
              }
              footerBelow={
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rowsScannedLine(surfaceRatesResult.rowsScanned)}
                </p>
              }
              sourceTransparency={chartSourcePanel('surfaceRates')}
            >
              <SiteSurfaceRatesChart rows={surfaceRatesResult.rows} />
            </VisualizationJpgDownload>
          )}
        </section>
      ) : null}

      <section
        aria-labelledby="viz8-heading"
        className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
      >
        {amenityPropsResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {tap('loadError')} {chartLoadErrorDetail(amenityPropsResult.error)}
          </p>
        ) : (
          <VisualizationJpgDownload
            {...glampingChartDownloadProps}
            ref={amenityPropsDlRef}
            headingId="viz8-heading"
            exportTitle={tap('chartTitle')}
            exportSubtitle={tap('subtitle')}
            fileStem="rv-industry-amenities-by-property-pct"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                {chartScopePanel('amenityPropertyPct')}
                <p className="text-sm text-gray-600 dark:text-gray-400">{tap('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tap('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rowsScannedLine(amenityPropsResult.rowsScanned)}
              </p>
            }
            sourceTransparency={chartSourcePanel('amenityPropertyPct')}
          >
            <AmenitiesByPropertyPctChart
              rows={amenityPropsResult.rows}
              variant="glamping"
              chartKeys={
                sageSourceOnly ? [...GLAMPING_AMENITY_PROPERTY_CHART_KEYS_SAGE] : undefined
              }
            />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz9-heading"
        className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
      >
        {amenityAdrResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {taa('loadError')} {chartLoadErrorDetail(amenityAdrResult.error)}
          </p>
        ) : (
          <VisualizationJpgDownload
            {...glampingChartDownloadProps}
            ref={amenityAdrDlRef}
            headingId="viz9-heading"
            exportTitle={taa('chartTitle')}
            exportSubtitle={taa('subtitle')}
            fileStem="rv-industry-amenities-by-avg-adr"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                {chartScopePanel('amenityAdr')}
                <p className="text-sm text-gray-600 dark:text-gray-400">{taa('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{taa('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rowsScannedLine(amenityAdrResult.rowsScanned)}
              </p>
            }
            sourceTransparency={chartSourcePanel('amenityAdr')}
          >
            <AmenitiesByAvgAdrChart
              rows={amenityAdrResult.rows}
              variant="glamping"
              chartKeys={
                sageSourceOnly ? [...GLAMPING_AMENITY_ADR_CHART_KEYS_SAGE] : undefined
              }
            />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz11-heading"
        className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
      >
        {mapResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {tsc('loadError')} {chartLoadErrorDetail(mapResult.error)}
          </p>
        ) : (
          <VisualizationJpgDownload
            {...glampingChartDownloadProps}
            ref={stateAdrChoroplethDlRef}
            headingId="viz11-heading"
            exportTitle={tsc('chartTitle')}
            exportSubtitle={tsc('subtitle')}
            captureProfile="map"
            fileStem="rv-industry-state-adr-choropleth"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                {chartScopePanel('stateAdrChoropleth')}
                <p className="text-sm text-gray-600 dark:text-gray-400">{tsc('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tsc('methodology', {
                    minN: GLAMPING_STATE_ADR_CHOROPLETH_MIN_N,
                  })}
                </p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rowsScannedLine(mapResult.rowsScanned)}
              </p>
            }
            sourceTransparency={chartSourcePanel('stateAdrChoropleth')}
          >
            <StateAdrChoroplethMap
              byStateAdr={mapResult.stateAdrChoropleth}
              productVariant="glamping"
            />
          </VisualizationJpgDownload>
        )}
      </section>
    </div>
  );
}
