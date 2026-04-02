'use client';

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2 } from 'lucide-react';
import VisualizationJpgDownload, {
  type VisualizationJpgDownloadHandle,
} from './VisualizationJpgDownload';
import {
  STATE_ADR_CHOROPLETH_MIN_N,
  type CampspotRvMapDataResult,
} from '@/lib/rv-industry-overview/campspot-rv-map-data';
import type { CampspotSizeTierChartResult } from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';
import type { CampspotTrendsChartResult } from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import type { CampspotUnitTypeChartsResult } from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';
import type { CampspotSeasonRatesChartResult } from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';
import type { CampspotSurfaceRatesChartResult } from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';
import type { CampspotAmenityPropertiesChartResult } from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';
import type { CampspotAmenityAdrChartResult } from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';
import type { CampspotRvParkingChartsResult } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import { Button } from '@/components/ui';

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
      className="flex min-h-[280px] w-full items-center justify-center rounded-md bg-gray-50 dark:bg-gray-900"
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

type Props = {
  mapResult: CampspotRvMapDataResult;
  trendsResult: CampspotTrendsChartResult;
  sizeResult: CampspotSizeTierChartResult;
  unitTypeResult: CampspotUnitTypeChartsResult;
  seasonRatesResult: CampspotSeasonRatesChartResult;
  surfaceRatesResult: CampspotSurfaceRatesChartResult;
  amenityPropsResult: CampspotAmenityPropertiesChartResult;
  amenityAdrResult: CampspotAmenityAdrChartResult;
  rvParkingChartsResult: CampspotRvParkingChartsResult;
};

const BETWEEN_DOWNLOADS_MS = 400;

export default function RvIndustryOverviewClient({
  mapResult,
  trendsResult,
  sizeResult,
  unitTypeResult,
  seasonRatesResult,
  surfaceRatesResult,
  amenityPropsResult,
  amenityAdrResult,
  rvParkingChartsResult,
}: Props) {
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

  const hasAnyViz =
    !mapResult.error ||
    !trendsResult.error ||
    !sizeResult.error ||
    !unitTypeResult.error ||
    !seasonRatesResult.error ||
    !surfaceRatesResult.error ||
    !amenityPropsResult.error ||
    !amenityAdrResult.error ||
    !rvParkingChartsResult.error;

  const downloadAll = useCallback(async () => {
    if (!hasAnyViz) return;
    setDownloadAllBusy(true);
    try {
      const pause = () =>
        new Promise<void>((resolve) => setTimeout(resolve, BETWEEN_DOWNLOADS_MS));

      if (!mapResult.error) {
        await mapDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!trendsResult.error) {
        await trendsDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!sizeResult.error) {
        await sizeDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!unitTypeResult.error) {
        await unitTypeRateDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!unitTypeResult.error) {
        await unitTypeDistDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!seasonRatesResult.error) {
        await seasonRatesDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!surfaceRatesResult.error) {
        await surfaceRatesDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!amenityPropsResult.error) {
        await amenityPropsDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!amenityAdrResult.error) {
        await amenityAdrDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!rvParkingChartsResult.error) {
        await rvParkingDlRef.current?.downloadJpeg();
        await pause();
      }
      if (!mapResult.error) {
        await stateAdrChoroplethDlRef.current?.downloadJpeg();
      }
    } catch (err) {
      console.error('[RvIndustryOverviewClient] Download all', err);
    } finally {
      setDownloadAllBusy(false);
    }
  }, [
    hasAnyViz,
    mapResult.error,
    trendsResult.error,
    sizeResult.error,
    unitTypeResult.error,
    seasonRatesResult.error,
    surfaceRatesResult.error,
    amenityPropsResult.error,
    amenityAdrResult.error,
    rvParkingChartsResult.error,
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <div className="mt-2 flex flex-row items-start justify-between gap-4">
          <p className="min-w-0 flex-1 text-sm text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={downloadAll}
            disabled={!hasAnyViz || downloadAllBusy}
            className="inline-flex shrink-0 items-center gap-2"
          >
            {downloadAllBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {downloadAllBusy ? t('downloadAllJpgLoading') : t('downloadAllJpg')}
          </Button>
        </div>
      </header>

      <section aria-labelledby="viz1-heading">
        {mapResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {t('loadError')} {mapResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={mapDlRef}
            headingId="viz1-heading"
            exportTitle={t('mapSectionTitle')}
            fileStem="rv-industry-overview-regional-map-2025"
            captionBelow={
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('mapCaption')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('mapInteractHint')}</p>
              </div>
            }
            footerBelow={
              <div className="max-w-4xl space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <p>
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {t('rowsScanned', { count: mapResult.rowsScanned })}
                  </span>{' '}
                  {t('rowsScannedDetail')}
                </p>
                <p>{t('mapOutliers')}</p>
                <p>{t('mapRegionalInclusion')}</p>
                <p>{t('mapStateCohortNote')}</p>
              </div>
            }
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
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
      >
        {trendsResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {tt('loadError')} {trendsResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={trendsDlRef}
            headingId="viz2-heading"
            exportTitle={tt('chartTitle')}
            fileStem="rv-resort-park-occupancy-rate-trends"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{tt('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tt('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('rowsScanned', { count: trendsResult.rowsScanned })}
              </p>
            }
          >
            <OccupancyAdrTrendsChart rows={trendsResult.rows} variant="compact" />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz3-heading"
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
      >
        {sizeResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {ts('loadError')} {sizeResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={sizeDlRef}
            headingId="viz3-heading"
            exportTitle={ts('chartTitle')}
            fileStem="rv-impact-resort-size-ardr-occupancy"
            captionBelow={
              <div className="space-y-2 max-w-4xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">{ts('intro')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{ts('body')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ts('tableFootnote')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('rowsScanned', { count: sizeResult.rowsScanned })}
              </p>
            }
          >
            <ResortSizeImpactChart rows={sizeResult.rows} variant="compact" />
          </VisualizationJpgDownload>
        )}
      </section>

      {unitTypeResult.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {tuc('loadError')} {unitTypeResult.error}
        </p>
      ) : (
        <>
          <section
            aria-labelledby="viz4-heading"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
          >
            <VisualizationJpgDownload
              ref={unitTypeRateDlRef}
              headingId="viz4-heading"
              exportTitle={tur('chartTitle')}
              exportSubtitle={tur('subtitle')}
              headingClassName="font-serif text-2xl"
              fileStem="rv-industry-unit-type-by-rate"
              captionBelow={
                <div className="max-w-4xl space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tur('intro')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tur('methodology')}</p>
                </div>
              }
              footerBelow={
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('rowsScanned', { count: unitTypeResult.rowsScanned })}
                </p>
              }
            >
              <UnitTypeByRateChart rows={unitTypeResult.rateRows} />
            </VisualizationJpgDownload>
          </section>

          <section
            aria-labelledby="viz5-heading"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
          >
            <VisualizationJpgDownload
              ref={unitTypeDistDlRef}
              headingId="viz5-heading"
              exportTitle={tud('chartTitle')}
              exportSubtitle={tud('subtitle')}
              headingClassName="font-serif text-2xl"
              fileStem="rv-industry-unit-type-distribution"
              captionBelow={
                <div className="max-w-4xl space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tud('intro')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{tud('methodology')}</p>
                </div>
              }
              footerBelow={
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('rowsScanned', { count: unitTypeResult.rowsScanned })}
                </p>
              }
            >
              <UnitTypeDistributionChart rows={unitTypeResult.distributionRows} />
            </VisualizationJpgDownload>
          </section>
        </>
      )}

      <section
        aria-labelledby="viz6-heading"
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
      >
        {seasonRatesResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {trs('loadError')} {seasonRatesResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={seasonRatesDlRef}
            headingId="viz6-heading"
            exportTitle={trs('chartTitle')}
            exportSubtitle={trs('subtitle')}
            headingClassName="font-serif text-2xl"
            fileStem="rv-industry-rates-by-season"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{trs('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{trs('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('rowsScanned', { count: seasonRatesResult.rowsScanned })}
              </p>
            }
          >
            <RatesBySeasonChart rows={seasonRatesResult.rows} />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz7-heading"
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
      >
        {surfaceRatesResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {tss('loadError')} {surfaceRatesResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={surfaceRatesDlRef}
            headingId="viz7-heading"
            exportTitle={tss('chartTitle')}
            exportSubtitle={tss('subtitle')}
            headingClassName="font-serif text-2xl"
            fileStem="rv-industry-site-surface-rates"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{tss('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tss('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('rowsScanned', { count: surfaceRatesResult.rowsScanned })}
              </p>
            }
          >
            <SiteSurfaceRatesChart rows={surfaceRatesResult.rows} />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz8-heading"
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
      >
        {amenityPropsResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {tap('loadError')} {amenityPropsResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={amenityPropsDlRef}
            headingId="viz8-heading"
            exportTitle={tap('chartTitle')}
            exportSubtitle={tap('subtitle')}
            headingClassName="font-serif text-2xl"
            fileStem="rv-industry-amenities-by-property-pct"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{tap('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tap('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('rowsScanned', { count: amenityPropsResult.rowsScanned })}
              </p>
            }
          >
            <AmenitiesByPropertyPctChart rows={amenityPropsResult.rows} />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz9-heading"
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
      >
        {amenityAdrResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {taa('loadError')} {amenityAdrResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={amenityAdrDlRef}
            headingId="viz9-heading"
            exportTitle={taa('chartTitle')}
            exportSubtitle={taa('subtitle')}
            headingClassName="font-serif text-2xl"
            fileStem="rv-industry-amenities-by-avg-adr"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{taa('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{taa('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('rowsScanned', { count: amenityAdrResult.rowsScanned })}
              </p>
            }
          >
            <AmenitiesByAvgAdrChart rows={amenityAdrResult.rows} />
          </VisualizationJpgDownload>
        )}
      </section>

      <section
        aria-labelledby="viz10-heading"
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
      >
        {rvParkingChartsResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {trp('loadError')} {rvParkingChartsResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={rvParkingDlRef}
            headingId="viz10-heading"
            exportTitle={trp('chartTitle')}
            exportSubtitle={trp('subtitle')}
            headingClassName="font-serif text-2xl"
            fileStem="rv-industry-site-types-distribution-rates"
            captionBelow={
              <div className="max-w-4xl space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{trp('intro')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{trp('methodology')}</p>
              </div>
            }
            footerBelow={
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('rowsScanned', { count: rvParkingChartsResult.rowsScanned })}
              </p>
            }
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
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm p-4 sm:p-6"
      >
        {mapResult.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {tsc('loadError')} {mapResult.error}
          </p>
        ) : (
          <VisualizationJpgDownload
            ref={stateAdrChoroplethDlRef}
            headingId="viz11-heading"
            exportTitle={tsc('chartTitle')}
            exportSubtitle={tsc('subtitle')}
            headingClassName="font-serif text-2xl"
            fileStem="rv-industry-state-adr-choropleth"
            captionBelow={
              <div className="max-w-4xl space-y-2">
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
                {t('rowsScanned', { count: mapResult.rowsScanned })}
              </p>
            }
          >
            <StateAdrChoroplethMap byStateAdr={mapResult.stateAdrChoropleth} />
          </VisualizationJpgDownload>
        )}
      </section>
    </div>
  );
}
