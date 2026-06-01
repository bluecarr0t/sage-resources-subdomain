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
import VisualizationJpgDownload from './VisualizationJpgDownload';
import RvIndustryOverviewDownloadAllBanner from './RvIndustryOverviewDownloadAllBanner';
import type { VisualizationJpgDownloadHandle } from '@/lib/rv-industry-overview/visualization-export';
import {
  runRvOverviewChartCapture,
  runRvOverviewChartDownload,
  summarizeDownloadAll,
  type RvOverviewDownloadAllSummary,
  type RvOverviewDownloadChartKey,
  type RvOverviewDownloadChartOutcome,
} from '@/lib/rv-industry-overview/rv-overview-download-all';
import { STATE_ADR_CHOROPLETH_MIN_N } from '@/lib/rv-industry-overview/campspot-rv-map-data';
import type { RvIndustryOverviewClientProps } from '@/lib/rv-industry-overview/rv-overview-client-props';
import {
  RV_OVERVIEW_UNIT_FILTER_TOGGLE_ORDER,
  type RvOverviewUnitFilterKey,
} from '@/lib/rv-industry-overview/rv-overview-unit-filter';
import { Button } from '@/components/ui';
import { adminPageDescription, adminPageTitle } from '@/lib/admin-ui';
import RvIndustryOverviewCacheBar from './RvIndustryOverviewCacheBar';
import RvOverviewAnalystControls from './RvOverviewAnalystControls';
import RvOverviewChartSourceScope from './RvOverviewChartSourceScope';
import RvOverviewChartSourceTransparency from './RvOverviewChartSourceTransparency';
import { CHART_TRANSPARENCY_TO_SOURCE_SCOPE } from '@/lib/rv-industry-overview/rv-overview-chart-source-scope';
import {
  buildRvOverviewExportPackZip,
  triggerBlobDownload,
  type RvOverviewExportPackFile,
} from '@/lib/rv-industry-overview/rv-overview-export-pack';
import { rvOverviewDataSourceQueryValue } from '@/lib/rv-industry-overview/rv-overview-data-source-filter';
import type {
  ChartSourceBreakdown,
  RvOverviewChartTransparencyKey,
} from '@/lib/rv-industry-overview/rv-overview-chart-transparency';
import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';
import { RV_OVERVIEW_CHART_ERROR_FALLBACK } from '@/lib/rv-industry-overview/rv-overview-display-error';

const RegionalCampspotMap = dynamic(
  () => import('./RegionalCampspotMap'),
  { ssr: false, loading: () => <MapSkeleton /> }
);

const StateAdrChoroplethMap = dynamic(
  () => import('./StateAdrChoroplethMap'),
  { ssr: false, loading: () => <MapSkeleton /> }
);

/** Code-split Recharts so the initial admin JS bundle stays smaller; loads in parallel per chart. */
const OccupancyAdrTrendsChart = dynamic(() => import('./OccupancyAdrTrendsChart'), {
  loading: () => <RechartsMountSkeleton />,
});
const ResortSizeImpactChart = dynamic(() => import('./ResortSizeImpactChart'), {
  loading: () => <RechartsMountSkeleton />,
});
const UnitTypeByRateChart = dynamic(() => import('./UnitTypeByRateChart'), {
  loading: () => <RechartsMountSkeleton />,
});
const UnitTypeDistributionChart = dynamic(() => import('./UnitTypeDistributionChart'), {
  loading: () => <RechartsMountSkeleton />,
});
const RatesBySeasonChart = dynamic(() => import('./RatesBySeasonChart'), {
  loading: () => <RechartsMountSkeleton />,
});
const SiteSurfaceRatesChart = dynamic(() => import('./SiteSurfaceRatesChart'), {
  loading: () => <RechartsMountSkeleton />,
});
const AmenitiesByPropertyPctChart = dynamic(() => import('./AmenitiesByPropertyPctChart'), {
  loading: () => <RechartsMountSkeleton />,
});
const AmenitiesByAvgAdrChart = dynamic(() => import('./AmenitiesByAvgAdrChart'), {
  loading: () => <RechartsMountSkeleton />,
});
const RvSiteTypesDistributionRatesCharts = dynamic(
  () => import('./RvSiteTypesDistributionRatesCharts'),
  { loading: () => <RechartsMountSkeleton /> }
);

function RechartsMountSkeleton() {
  return (
    <div
      className="flex min-h-[280px] w-full items-center justify-center rounded-md bg-neutral-50/80 dark:bg-neutral-950/55"
      aria-hidden
    >
      <div className="h-48 w-full max-w-lg animate-pulse rounded bg-gray-200/90 dark:bg-gray-800" />
    </div>
  );
}

function MapSkeleton() {
  return (
    <div
      className="w-full rounded-lg bg-white dark:bg-white animate-pulse"
      style={{ aspectRatio: '960/580', minHeight: 280 }}
      aria-hidden
    />
  );
}

type Props = RvIndustryOverviewClientProps;

const BETWEEN_DOWNLOADS_MS = 400;

export default function RvIndustryOverviewClient({
  unitFilter,
  sourceFilter,
  displayPreferences,
  campspotOnlyUnavailable,
  unitSlice,
  rvParkingChartsResult,
  unitTypeComparisonResult,
  rowsScannedTotal,
  rowsScannedCampspot,
  rowsScannedRoverpass,
  scanTransparency,
  snapshotMeta,
  nextCacheRevalidateDays,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [unitNavPending, startUnitNavTransition] = useTransition();

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
    <RvOverviewChartSourceTransparency
      breakdown={breakdown ?? chartTransp?.[key] ?? null}
      scanTransparency={scanTransparency}
    />
  );

  const chartScopePanel = (key: RvOverviewChartTransparencyKey) => (
    <RvOverviewChartSourceScope
      scopeKey={CHART_TRANSPARENCY_TO_SOURCE_SCOPE[key]}
      campspotOnlyView={sourceFilter === 'campspot'}
    />
  );

  const unclassified = scanTransparency?.unclassifiedExcluded;

  const selectUnitFilter = useCallback(
    (key: RvOverviewUnitFilterKey) => {
      if (key === unitFilter) return;
      startUnitNavTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        next.set('unit', key);
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [unitFilter, pathname, router, searchParams]
  );

  const t = useTranslations('admin.rvIndustryOverview');
  const tt = useTranslations('admin.rvIndustryOverview.trends');
  const ts = useTranslations('admin.rvIndustryOverview.sizeImpact');
  const tur = useTranslations('admin.rvIndustryOverview.unitTypeByRate');
  const tud = useTranslations('admin.rvIndustryOverview.unitTypeDistribution');
  const tuc = useTranslations('admin.rvIndustryOverview.unitTypeCharts');
  const trs = useTranslations('admin.rvIndustryOverview.ratesBySeason');
  const tss = useTranslations('admin.rvIndustryOverview.siteSurfaceRates');
  const tap = useTranslations('admin.rvIndustryOverview.amenitiesByPropertyPct');
  const taa = useTranslations('admin.rvIndustryOverview.amenitiesByAvgAdr');
  const trp = useTranslations('admin.rvIndustryOverview.rvSiteTypesDistributionRates');
  const tsc = useTranslations('admin.rvIndustryOverview.stateAdrChoropleth');

  const format = useFormatter();
  const rowsScannedLine = (count: number) =>
    t('rowsScanned', {
      count: format.number(count, { maximumFractionDigits: 0 }),
    });
  const rowsScannedSourceLine = t('rowsScannedBySource', {
    campspot: format.number(rowsScannedCampspot, { maximumFractionDigits: 0 }),
    roverpass: format.number(rowsScannedRoverpass, { maximumFractionDigits: 0 }),
  });

  const chartLoadErrorDetail = (detail: string | null | undefined) =>
    sanitizeAdminDisplayError(detail, { fallback: RV_OVERVIEW_CHART_ERROR_FALLBACK });

  const mapDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const trendsDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const sizeDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const unitTypeRateDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const unitTypeDistDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const seasonRatesDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const surfaceRatesDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const amenityPropsDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const amenityAdrDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const rvParkingDlRef = useRef<VisualizationJpgDownloadHandle>(null);
  const stateAdrChoroplethDlRef = useRef<VisualizationJpgDownloadHandle>(null);

  const [downloadAllBusy, setDownloadAllBusy] = useState(false);
  const [exportPackBusy, setExportPackBusy] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [downloadAllSummary, setDownloadAllSummary] =
    useState<RvOverviewDownloadAllSummary | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const td = useTranslations('admin.rvIndustryOverview.downloadAll');
  const tScope = useTranslations('admin.rvIndustryOverview.chartSourceScope');
  const tPack = useTranslations('admin.rvIndustryOverview.exportPack');
  const tAnalyst = useTranslations('admin.rvIndustryOverview.analystControls');
  const yearEmphasis = displayPreferences.yearEmphasis;

  const hasAnyExportableChart =
    !mapResult.error ||
    !trendsResult.error ||
    !sizeResult.error ||
    !unitTypeComparisonResult.error ||
    !seasonRatesResult.error ||
    !surfaceRatesResult.error ||
    !amenityPropsResult.error ||
    !amenityAdrResult.error ||
    !rvParkingChartsResult.error;

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
      unitTypeRate: td('charts.unitTypeRate'),
      unitTypeDistribution: td('charts.unitTypeDistribution'),
      seasonRates: td('charts.seasonRates'),
      surfaceRates: td('charts.surfaceRates'),
      amenityPropertyPct: td('charts.amenityPropertyPct'),
      amenityAdr: td('charts.amenityAdr'),
      rvParking: td('charts.rvParking'),
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
      { key: 'unitTypeRate', enabled: !unitTypeComparisonResult.error, ref: unitTypeRateDlRef },
      {
        key: 'unitTypeDistribution',
        enabled: !unitTypeComparisonResult.error,
        ref: unitTypeDistDlRef,
      },
      { key: 'seasonRates', enabled: !seasonRatesResult.error, ref: seasonRatesDlRef },
      { key: 'surfaceRates', enabled: !surfaceRatesResult.error, ref: surfaceRatesDlRef },
      { key: 'amenityPropertyPct', enabled: !amenityPropsResult.error, ref: amenityPropsDlRef },
      { key: 'amenityAdr', enabled: !amenityAdrResult.error, ref: amenityAdrDlRef },
      { key: 'rvParking', enabled: !rvParkingChartsResult.error, ref: rvParkingDlRef },
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
      console.error('[RvIndustryOverviewClient] Download all', err);
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
    unitTypeComparisonResult.error,
    seasonRatesResult.error,
    surfaceRatesResult.error,
    amenityPropsResult.error,
    amenityAdrResult.error,
    rvParkingChartsResult.error,
    td,
  ]);

  const fetchMapFallbackPng = useCallback(
    async (chart: 'regional' | 'choropleth'): Promise<Blob | null> => {
      const q = new URLSearchParams({
        chart,
        unit: unitFilter,
        source: rvOverviewDataSourceQueryValue(sourceFilter),
      });
      const res = await fetch(`/api/admin/rv-industry-overview/map-export?${q.toString()}`);
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
      unitTypeRate: td('charts.unitTypeRate'),
      unitTypeDistribution: td('charts.unitTypeDistribution'),
      seasonRates: td('charts.seasonRates'),
      surfaceRates: td('charts.surfaceRates'),
      amenityPropertyPct: td('charts.amenityPropertyPct'),
      amenityAdr: td('charts.amenityAdr'),
      rvParking: td('charts.rvParking'),
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
      { key: 'unitTypeRate', enabled: !unitTypeComparisonResult.error, ref: unitTypeRateDlRef, captureProfile: 'chart' },
      { key: 'unitTypeDistribution', enabled: !unitTypeComparisonResult.error, ref: unitTypeDistDlRef, captureProfile: 'chart' },
      { key: 'seasonRates', enabled: !seasonRatesResult.error, ref: seasonRatesDlRef, captureProfile: 'chart' },
      { key: 'surfaceRates', enabled: !surfaceRatesResult.error, ref: surfaceRatesDlRef, captureProfile: 'chart' },
      { key: 'amenityPropertyPct', enabled: !amenityPropsResult.error, ref: amenityPropsDlRef, captureProfile: 'chart' },
      { key: 'amenityAdr', enabled: !amenityAdrResult.error, ref: amenityAdrDlRef, captureProfile: 'chart' },
      { key: 'rvParking', enabled: !rvParkingChartsResult.error, ref: rvParkingDlRef, captureProfile: 'chart' },
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
                : 'rv-industry-overview-regional-map-fallback.png';
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
          unitFilterLabel: t(`unitFilter.${unitFilter}`),
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
      console.error('[RvIndustryOverviewClient] Export pack', err);
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
    unitTypeComparisonResult.error,
    seasonRatesResult.error,
    surfaceRatesResult.error,
    amenityPropsResult.error,
    amenityAdrResult.error,
    rvParkingChartsResult.error,
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

      <RvIndustryOverviewCacheBar
        initialMeta={snapshotMeta}
        payloadRowsScannedTotal={rowsScannedTotal}
        rowsScannedCampspot={rowsScannedCampspot}
        rowsScannedRoverpass={rowsScannedRoverpass}
        nextCacheRevalidateDays={nextCacheRevalidateDays}
      />

      <RvOverviewAnalystControls
        sourceFilter={sourceFilter}
        displayPreferences={displayPreferences}
        campspotOnlyUnavailable={campspotOnlyUnavailable}
      />

      <RvIndustryOverviewDownloadAllBanner
        summary={downloadAllSummary}
        onDismiss={() => setDownloadAllSummary(null)}
      />

      <div
        className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-neutral-800 dark:bg-gray-900/40"
        role="region"
        aria-label={t('unitFilterRegionAria')}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p
            id="rv-overview-unit-filter-label"
            className="text-sm font-medium text-gray-800 dark:text-gray-200"
          >
            {t('unitFilterLabel')}
          </p>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-labelledby="rv-overview-unit-filter-label"
          >
            {RV_OVERVIEW_UNIT_FILTER_TOGGLE_ORDER.map((key) => (
              <Button
                key={key}
                type="button"
                variant={unitFilter === key ? 'primary' : 'secondary'}
                size="sm"
                aria-pressed={unitFilter === key}
                disabled={unitNavPending}
                onClick={() => selectUnitFilter(key)}
              >
                {key === 'rv'
                  ? t('unitFilter.rv')
                  : key === 'tent'
                    ? t('unitFilter.tent')
                    : t('unitFilter.glamping')}
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('unitFilterHint')}</p>
        {unclassified && unclassified.total > 0 ? (
          <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400" role="status">
            {t('unitFilterUnclassified', {
              total: unclassified.total,
              campspot: unclassified.campspot,
              roverpass: unclassified.roverpass,
            })}
          </p>
        ) : scanTransparency ? (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">{t('unitFilterUnclassifiedNone')}</p>
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
                <span className="font-medium">{td('charts.unitTypeRate')}</span> /{' '}
                {td('charts.unitTypeDistribution')} — {tScope('unitTypeComparison2025')}
              </li>
              <li>
                <span className="font-medium">
                  {td('charts.seasonRates')}, {td('charts.surfaceRates')},{' '}
                  {td('charts.amenityPropertyPct')}, {td('charts.amenityAdr')}
                </span>{' '}
                — {tScope('seasonSurfaceAmenity2025')}
              </li>
              <li>
                <span className="font-medium">{td('charts.rvParking')}</span> —{' '}
                {tScope('rvParking2025')}
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
            ref={mapDlRef}
            headingId="viz1-heading"
            exportTitle={t('mapSectionTitle')}
            captureProfile="map"
            fileStem="rv-industry-overview-regional-map-2025"
            captionBelow={
              <div className="space-y-2">
                {chartScopePanel('regionalMap')}
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('mapCaption')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('mapInteractHint')}</p>
                <RvOverviewChartSourceScope scopeKey="mapStateModalYoY" campspotOnlyView={sourceFilter === 'campspot'} />
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
            />
          </VisualizationJpgDownload>
        )}
      </section>

      {unitTypeComparisonResult.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {tuc('loadError')} {chartLoadErrorDetail(unitTypeComparisonResult.error)}
        </p>
      ) : (
        <>
          <section
            aria-labelledby="viz4-heading"
            className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
          >
            <VisualizationJpgDownload
              ref={unitTypeRateDlRef}
              headingId="viz4-heading"
              exportTitle={tur('chartTitle')}
              exportSubtitle={tur('subtitle')}
              fileStem="rv-industry-unit-type-by-rate"
              captionBelow={
                <div className="max-w-4xl space-y-2">
                  {chartScopePanel('unitTypeRate')}
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tur('intro')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tuc('notAffectedByUnitFilter')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tur('methodology')}</p>
                </div>
              }
              footerBelow={
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rowsScannedLine(unitTypeComparisonResult.rowsScanned)}
                </p>
              }
              sourceTransparency={chartSourcePanel(
                'unitTypeRate',
                unitTypeComparisonResult.chartSourceTransparency?.unitTypeRate
              )}
            >
              <UnitTypeByRateChart rows={unitTypeComparisonResult.rateRows} />
            </VisualizationJpgDownload>
          </section>

          <section
            aria-labelledby="viz5-heading"
            className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
          >
            <VisualizationJpgDownload
              ref={unitTypeDistDlRef}
              headingId="viz5-heading"
              exportTitle={tud('chartTitle')}
              exportSubtitle={tud('subtitle')}
              fileStem="rv-industry-unit-type-distribution"
              captionBelow={
                <div className="max-w-4xl space-y-2">
                  {chartScopePanel('unitTypeDistribution')}
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tud('intro')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tuc('notAffectedByUnitFilter')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tud('methodology')}</p>
                </div>
              }
              footerBelow={
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rowsScannedLine(unitTypeComparisonResult.rowsScanned)}
                </p>
              }
              sourceTransparency={chartSourcePanel(
                'unitTypeDistribution',
                unitTypeComparisonResult.chartSourceTransparency?.unitTypeDistribution
              )}
            >
              <UnitTypeDistributionChart rows={unitTypeComparisonResult.distributionRows} />
            </VisualizationJpgDownload>
          </section>
        </>
      )}

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
            <AmenitiesByPropertyPctChart rows={amenityPropsResult.rows} />
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
            <AmenitiesByAvgAdrChart rows={amenityAdrResult.rows} />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz10-heading"
        className="rounded-xl border border-neutral-200/75 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4 sm:p-6"
      >
        {rvParkingChartsResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {trp('loadError')} {chartLoadErrorDetail(rvParkingChartsResult.error)}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={rvParkingDlRef}
            headingId="viz10-heading"
            exportTitle={trp('chartTitle')}
            exportSubtitle={trp('subtitle')}
            fileStem="rv-industry-site-types-distribution-rates"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                {chartScopePanel('rvParking')}
                <p className="text-sm text-gray-600 dark:text-gray-400">{trp('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{trp('notAffectedByUnitFilter')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{trp('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rowsScannedLine(rvParkingChartsResult.rowsScanned)}
              </p>
            }
            sourceTransparency={chartSourcePanel('rvParking')}
          >
            <RvSiteTypesDistributionRatesCharts
              distribution={rvParkingChartsResult.distribution}
              rateBars={rvParkingChartsResult.rateBars}
              totalRvRows={rvParkingChartsResult.totalRvRows}
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
                    low: 40,
                    high: 80,
                    minN: STATE_ADR_CHOROPLETH_MIN_N,
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
            <StateAdrChoroplethMap byStateAdr={mapResult.stateAdrChoropleth} />
          </VisualizationJpgDownload>
        )}
      </section>
    </div>
  );
}
