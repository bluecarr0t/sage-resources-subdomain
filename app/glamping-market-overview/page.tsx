import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { EDITORIAL_LINK_CLASS, EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';
import { GlampingMarketOverviewLoadError } from '@/components/glamping-industry/GlampingMarketOverviewLoadError';
import { GlampingMarketOverviewMapLoading } from '@/components/glamping-industry/GlampingMarketOverviewMapLoading';
import { GlampingAmenityImpactSection } from '@/components/glamping-industry/GlampingAmenityImpactSection';
import { GlampingMarketOverviewSectionNav } from '@/components/glamping-industry/GlampingMarketOverviewSectionNav';
import { GlampingMarketOverviewStickyNav } from '@/components/glamping-industry/GlampingMarketOverviewStickyNav';
import { GlampingProximitySection } from '@/components/glamping-industry/GlampingProximitySection';
import {
  GlampingMarketMethodologyProvider,
  GlampingMarketOverviewResearchFooter,
  GlampingMarketScopeDisclosure,
} from '@/components/glamping-industry/GlampingMarketOverviewResearchFooter';
import { isGlampingMarketOverviewUnlocked } from '@/lib/glamping-market-overview-access';
import {
  formatGlampingMarketOverviewRate,
  glampingMarketOverviewRateCurrencyHint,
  glampingMarketOverviewRateFootnote,
} from '@/lib/glamping-market-overview-currency';
import { parseGlampingMarketSnapshotTierFilter } from '@/lib/glamping-market-snapshot-classification';
import {
  GLAMPING_MARKET_US_REGION_LABELS,
  regionMatchingStates,
  resolveGlampingMarketUsStatesFilter,
} from '@/lib/glamping-market-snapshot-us-regions';
import { fetchGlampingAmenityImpact } from '@/lib/fetch-glamping-amenity-impact';
import { fetchGlampingIndustryCaProvinceMetrics } from '@/lib/fetch-glamping-industry-ca-province-metrics';
import { fetchGlampingIndustryMetrics } from '@/lib/fetch-glamping-industry-metrics';
import {
  AIRPORTS_PROXIMITY_THRESHOLD_MILES,
  fetchGlampingMarketProximityBundle,
  NATIONAL_PARKS_PROXIMITY_THRESHOLD_MILES,
} from '@/lib/fetch-glamping-proximity-analysis';
import { filterUnitTypesForRateChart, unitTypeLabelsForRateChart } from '@/lib/glamping-unit-type-by-rate-chart';
import { GlampingUnitTypeByRateDefinitionsButton } from '@/components/glamping-industry/GlampingUnitTypeByRateDefinitionsButton';
import { fetchGlampingIndustryUsStateMetrics } from '@/lib/fetch-glamping-industry-us-state-metrics';
import { parseGlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import { CA_PROVINCE_DISPLAY_NAME } from '@/lib/normalize-ca-province-key';
import { US_STATE_NAMES } from '@/lib/us-states';

const TOP_REGIONS_COUNT = 5;

/** Right-aligned numeric columns in sidebar metric tables (unit types, states). */
const SIDEBAR_METRIC_NUMERIC_GROUP_CLASS = 'flex shrink-0 items-baseline gap-x-4 tabular-nums';
const SIDEBAR_METRIC_MID_COL_CLASS = 'w-[3.25rem] shrink-0 text-right';
const SIDEBAR_METRIC_RATE_COL_CLASS = 'w-[4.75rem] shrink-0 text-right';

function SidebarMetricLeader() {
  return (
    <span
      aria-hidden
      className="mb-[0.2em] min-w-[0.75rem] flex-1 border-b border-dotted border-neutral-300"
    />
  );
}

const GlampingIndustryUsMap = nextDynamic(
  () => import('@/components/glamping-industry/GlampingIndustryUsMap'),
  { ssr: false, loading: () => <GlampingMarketOverviewMapLoading /> }
);

const GlampingIndustryCanadaProvinces = nextDynamic(
  () => import('@/components/glamping-industry/GlampingIndustryCanadaProvinces'),
  { ssr: false, loading: () => <GlampingMarketOverviewMapLoading /> }
);

const GlampingUnitTypeByRateChart = nextDynamic(
  () => import('@/components/glamping-industry/GlampingUnitTypeByRateChart'),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[22rem] w-full animate-pulse rounded-sm bg-sage-100/60 sm:h-[26rem]"
        aria-hidden
      />
    ),
  }
);

const GlampingProximityBandChart = nextDynamic(
  () => import('@/components/glamping-industry/GlampingProximityBandChart'),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[22rem] w-full animate-pulse rounded-sm bg-sage-100/60 sm:h-[26rem]"
        aria-hidden
      />
    ),
  }
);

const GlampingAmenityImpactChart = nextDynamic(
  () => import('@/components/glamping-industry/GlampingAmenityImpactChart'),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[22rem] w-full animate-pulse rounded-sm bg-sage-100/60 sm:h-[24rem]"
        aria-hidden
      />
    ),
  }
);

export const dynamic = 'force-dynamic';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function formatLastUpdatedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type PageProps = {
  searchParams: { market?: string; tier?: string; region?: string; states?: string };
};

export default async function GlampingMarketOverviewPage({ searchParams }: PageProps) {
  // Layout already shows the lock UI; skip metric fetches so numbers never leave the server.
  if (!(await isGlampingMarketOverviewUnlocked())) {
    return null;
  }

  const market = parseGlampingMarketSnapshotMarket(searchParams.market);
  const tier = parseGlampingMarketSnapshotTierFilter(searchParams.tier);
  const statesFilter =
    market === 'us'
      ? resolveGlampingMarketUsStatesFilter({
          statesRaw: searchParams.states,
          regionRaw: searchParams.region,
        })
      : null;
  const matchedRegion = regionMatchingStates(statesFilter);
  const geoScopeLabel =
    market !== 'us' || statesFilter == null
      ? null
      : matchedRegion
        ? GLAMPING_MARKET_US_REGION_LABELS[matchedRegion]
        : `${statesFilter.length} states selected`;

  const [result, usStates, caProvinces, proximity, amenityImpact] =
    await Promise.all([
      fetchGlampingIndustryMetrics(market, tier, statesFilter),
      market === 'us'
        ? fetchGlampingIndustryUsStateMetrics(tier, statesFilter)
        : Promise.resolve({ ok: true as const, data: {} }),
      market === 'ca'
        ? fetchGlampingIndustryCaProvinceMetrics(tier)
        : Promise.resolve({ ok: true as const, data: {} }),
      fetchGlampingMarketProximityBundle(market, tier, statesFilter),
      market === 'us'
        ? fetchGlampingAmenityImpact(market, 'all', statesFilter)
        : Promise.resolve({ ok: true as const, data: [] }),
    ]);

  const topUsStates: {
    key: string;
    name: string;
    propertyCount: number;
    meanRate: number | null;
  }[] =
    market === 'us' && result.ok && usStates.ok
      ? Object.entries(usStates.data)
          .map(([abbr, m]) => ({
            key: abbr,
            name: (US_STATE_NAMES as Record<string, string>)[abbr] ?? abbr,
            propertyCount: m.propertyCount,
            meanRate: m.avgRetailDailyRateMean,
          }))
          .filter((r) => r.propertyCount > 0)
          .sort((a, b) => b.propertyCount - a.propertyCount)
          .slice(0, TOP_REGIONS_COUNT)
      : [];

  const topCaProvinces: {
    key: string;
    name: string;
    propertyCount: number;
    meanRate: number | null;
  }[] =
    market === 'ca' && result.ok && caProvinces.ok
      ? Object.entries(caProvinces.data)
          .map(([code, m]) => ({
            key: code,
            name: CA_PROVINCE_DISPLAY_NAME[code] ?? code,
            propertyCount: m.propertyCount,
            meanRate: m.avgRetailDailyRateMean,
          }))
          .filter((r) => r.propertyCount > 0)
          .sort((a, b) => b.propertyCount - a.propertyCount)
          .slice(0, TOP_REGIONS_COUNT)
      : [];

  return (
    <GlampingMarketMethodologyProvider>
        <div className="relative flex min-h-screen flex-col bg-[#faf9f3] text-neutral-900">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.015]"
            style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
            aria-hidden
          />
          <GlampingMarketOverviewSectionNav
            showNationalParks={market === 'us'}
            showAmenityImpact={market === 'us'}
          />
          <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-x-hidden px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
            <GlampingMarketOverviewStickyNav
              market={market}
              tier={tier}
              states={statesFilter}
              lastUpdated={
                result.ok ? (
                  <p className="mt-3 text-[11px] font-light tabular-nums leading-snug text-neutral-500 sm:text-xs">
                    Last Updated: {formatLastUpdatedDate(result.data.asOf)}
                    {geoScopeLabel ? (
                      <>
                        {' '}
                        · <span className="text-neutral-700">{geoScopeLabel}</span>
                      </>
                    ) : null}
                  </p>
                ) : null
              }
            />

          <GlampingMarketScopeDisclosure />

          {result.ok ? (
            <div
              id="overview"
              className="mt-10 scroll-mt-40 grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-x-16"
            >
              <dl className="space-y-12">
                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                    Total glamping properties
                  </dt>
                  <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                    {formatInt(result.data.totalProperties)}
                  </dd>
                  <ul className="mt-6 space-y-2 border-l border-sage-200 pl-4 text-sm text-neutral-600">
                    <li>
                      <span className="text-neutral-500">Open</span>{' '}
                      <span className="tabular-nums text-neutral-800">
                        {formatInt(result.data.openProperties)}
                      </span>
                    </li>
                    <li>
                      <span className="text-neutral-500">Under construction</span>{' '}
                      <span className="tabular-nums text-neutral-800">
                        {formatInt(result.data.underConstructionProperties)}
                      </span>
                    </li>
                    <li>
                      <span className="text-neutral-500">Proposed development</span>{' '}
                      <span className="tabular-nums text-neutral-800">
                        {formatInt(result.data.proposedDevelopmentProperties)}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                    Total glamping units
                  </dt>
                  <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                    {formatInt(result.data.totalUnits)}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                    Avg. retail daily rate (ARDR)
                  </dt>
                  <dd className="mt-3 space-y-1 text-lg font-light tabular-nums tracking-tight text-neutral-800 sm:text-xl">
                    <div>
                      <span className="text-neutral-500">Mean</span>{' '}
                      {formatGlampingMarketOverviewRate(
                        result.data.avgRetailDailyRateMean,
                        market
                      )}
                    </div>
                    <div>
                      <span className="text-neutral-500">Median</span>{' '}
                      {formatGlampingMarketOverviewRate(
                        result.data.avgRetailDailyRateMedian,
                        market
                      )}
                    </div>
                  </dd>
                  <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-neutral-500">
                    {glampingMarketOverviewRateFootnote(market)}
                  </p>
                  {market === 'us' ? (
                    <div className="mt-8">
                      <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-neutral-600 sm:text-base">
                        Top brands
                      </h2>
                      <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-neutral-500">
                        Largest US glamping operators by location count.
                      </p>
                      <Link
                        href="/glamping-market-overview/brands"
                        className={`mt-3 inline-block text-sm font-light ${EDITORIAL_LINK_CLASS}`}
                      >
                        View top brands →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </dl>

              <aside className="lg:border-l lg:border-sage-200 lg:pl-10">
                <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-neutral-600 sm:text-base">
                  Top unit types
                </h2>
                <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-500">
                  Open-unit mix{tier !== 'all' ? ' in this tier' : ''}; unit-weighted ARDR
                  {market === 'ca' ? ' (CAD)' : ''} when published (excludes all-inclusive)
                  {tier !== 'all' ? '. ~ = provisional (thin or package-rate sample)' : ''}.
                </p>
                {result.data.topUnitTypesByUnits.length > 0 ? (
                  <ul className="mt-6 space-y-3 text-sm">
                    <li
                      aria-hidden
                      className="flex min-w-0 items-baseline gap-x-2 text-[10px] uppercase tracking-wider text-neutral-500"
                    >
                      <span className="min-w-0 flex-1" />
                      <span className={SIDEBAR_METRIC_NUMERIC_GROUP_CLASS}>
                        <span className={`${SIDEBAR_METRIC_MID_COL_CLASS} whitespace-nowrap`}>
                          % units
                        </span>
                        <span className={`${SIDEBAR_METRIC_RATE_COL_CLASS} whitespace-nowrap`}>
                          ARDR
                        </span>
                      </span>
                    </li>
                    {result.data.topUnitTypesByUnits.map((row) => (
                      <li
                        key={row.label}
                        className="flex min-w-0 items-baseline gap-x-2 font-light"
                      >
                        <span className="shrink-0 text-neutral-700">{row.label}</span>
                        <SidebarMetricLeader />
                        <span
                          className={`${SIDEBAR_METRIC_NUMERIC_GROUP_CLASS} text-neutral-900`}
                        >
                          <span className={`${SIDEBAR_METRIC_MID_COL_CLASS} whitespace-nowrap`}>
                            {row.pctOfUnits}%
                          </span>
                          <span className={SIDEBAR_METRIC_RATE_COL_CLASS}>
                            {formatGlampingMarketOverviewRate(
                              row.avgRetailDailyRateMean,
                              market,
                              { provisional: row.avgRetailDailyRateProvisional }
                            )}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-6 text-xs text-neutral-500">No labeled unit types in this cohort.</p>
                )}

                {market === 'us' && result.ok && usStates.ok ? (
                  <>
                    <h2 className="mt-10 text-sm font-medium uppercase tracking-[0.14em] text-neutral-600 sm:text-base">
                      Top states
                    </h2>
                    <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-500">
                      Properties per state; {glampingMarketOverviewRateCurrencyHint(market)}.
                    </p>
                    {topUsStates.length > 0 ? (
                      <ul className="mt-6 space-y-3 text-sm">
                        <li
                          aria-hidden
                          className="flex min-w-0 items-baseline gap-x-2 text-[10px] uppercase tracking-wider text-neutral-500"
                        >
                          <span className="min-w-0 flex-1" />
                          <span className={SIDEBAR_METRIC_NUMERIC_GROUP_CLASS}>
                            <span className={`${SIDEBAR_METRIC_MID_COL_CLASS} whitespace-nowrap`}>
                              Props
                            </span>
                            <span className={`${SIDEBAR_METRIC_RATE_COL_CLASS} whitespace-nowrap`}>
                              ARDR
                            </span>
                          </span>
                        </li>
                        {topUsStates.map((row) => (
                          <li
                            key={row.key}
                            className="flex min-w-0 items-baseline gap-x-2 font-light"
                          >
                            <span className="shrink-0 text-neutral-700">{row.name}</span>
                            <SidebarMetricLeader />
                            <span
                              className={`${SIDEBAR_METRIC_NUMERIC_GROUP_CLASS} text-neutral-900`}
                            >
                              <span className={`${SIDEBAR_METRIC_MID_COL_CLASS} whitespace-nowrap`}>
                                {formatInt(row.propertyCount)}
                              </span>
                              <span className={SIDEBAR_METRIC_RATE_COL_CLASS}>
                                {formatGlampingMarketOverviewRate(row.meanRate, market)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-6 text-xs text-neutral-500">No state breakdown in this cohort.</p>
                    )}
                  </>
                ) : null}

                {market === 'ca' && result.ok && caProvinces.ok ? (
                  <>
                    <h2 className="mt-10 text-sm font-medium uppercase tracking-[0.14em] text-neutral-600 sm:text-base">
                      Top provinces & territories
                    </h2>
                    <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-500">
                      Properties per province or territory;{' '}
                      {glampingMarketOverviewRateCurrencyHint(market)}.
                    </p>
                    {topCaProvinces.length > 0 ? (
                      <ul className="mt-6 space-y-3 text-sm">
                        <li
                          aria-hidden
                          className="flex min-w-0 items-baseline gap-x-2 text-[10px] uppercase tracking-wider text-neutral-500"
                        >
                          <span className="min-w-0 flex-1" />
                          <span className={SIDEBAR_METRIC_NUMERIC_GROUP_CLASS}>
                            <span className={`${SIDEBAR_METRIC_MID_COL_CLASS} whitespace-nowrap`}>
                              Props
                            </span>
                            <span className={`${SIDEBAR_METRIC_RATE_COL_CLASS} whitespace-nowrap`}>
                              ARDR
                            </span>
                          </span>
                        </li>
                        {topCaProvinces.map((row) => (
                          <li
                            key={row.key}
                            className="flex min-w-0 items-baseline gap-x-2 font-light"
                          >
                            <span className="shrink-0 text-neutral-700">{row.name}</span>
                            <SidebarMetricLeader />
                            <span
                              className={`${SIDEBAR_METRIC_NUMERIC_GROUP_CLASS} text-neutral-900`}
                            >
                              <span className={`${SIDEBAR_METRIC_MID_COL_CLASS} whitespace-nowrap`}>
                                {formatInt(row.propertyCount)}
                              </span>
                              <span className={SIDEBAR_METRIC_RATE_COL_CLASS}>
                                {formatGlampingMarketOverviewRate(row.meanRate, market)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-6 text-xs text-neutral-500">
                        No province breakdown in this cohort.
                      </p>
                    )}
                  </>
                ) : null}
              </aside>
            </div>
          ) : (
            <GlampingMarketOverviewLoadError detail={result.error} />
          )}

          <div className="mt-16 sm:mt-20">
            <div id="map" className="scroll-mt-28">
              {market === 'us' && result.ok && usStates.ok ? (
                <GlampingIndustryUsMap
                  byState={usStates.data}
                  flushTop
                  filterStates={statesFilter}
                  lockedRegionId={matchedRegion}
                  selectionMetrics={
                    statesFilter != null
                      ? {
                          propertyCount: result.data.totalProperties,
                          openProperties: result.data.openProperties,
                          underConstructionProperties:
                            result.data.underConstructionProperties,
                          proposedDevelopmentProperties:
                            result.data.proposedDevelopmentProperties,
                          unitCount: result.data.totalUnits,
                          avgRetailDailyRateMean: result.data.avgRetailDailyRateMean,
                          avgRetailDailyRateMedian: result.data.avgRetailDailyRateMedian,
                        }
                      : null
                  }
                  market={market}
                  tier={tier}
                />
              ) : market === 'us' && result.ok && !usStates.ok ? (
                <GlampingMarketOverviewLoadError
                  title="Unable to load US map"
                  message="National metrics loaded, but the state map could not be refreshed. Try again or contact support if this continues."
                  detail={usStates.error}
                />
              ) : null}

              {market === 'ca' && result.ok && caProvinces.ok ? (
                <GlampingIndustryCanadaProvinces byProvince={caProvinces.data} flushTop />
              ) : market === 'ca' && result.ok && !caProvinces.ok ? (
                <GlampingMarketOverviewLoadError
                  title="Unable to load Canada map"
                  message="National metrics loaded, but the province breakdown could not be refreshed. Try again or contact support if this continues."
                  detail={caProvinces.error}
                />
              ) : null}
            </div>
          </div>

          {result.ok ? (
            <section
              id="unit-type-by-rate"
              className="mt-16 scroll-mt-28 sm:mt-20"
              aria-labelledby="unit-type-by-rate-heading"
            >
              <h2
                id="unit-type-by-rate-heading"
                className="text-sm font-medium uppercase tracking-[0.14em] text-neutral-600 sm:text-base"
              >
                Unit Type by Rate
              </h2>
              <p className="mt-2 whitespace-nowrap text-[10px] leading-relaxed text-neutral-500">
                Before taxes and booking fees. Open-unit mix
                {tier !== 'all' ? ' in this tier' : ''}; unit-weighted average retail daily
                rate{market === 'ca' ? ' (CAD)' : ''} when published (excludes all-inclusive)
                {tier !== 'all' ? '. ~ = provisional (thin or package-rate sample)' : ''}.
                <GlampingUnitTypeByRateDefinitionsButton
                  labels={unitTypeLabelsForRateChart(result.data.unitTypesByUnits)}
                />
              </p>
              <div className="mt-6">
                <GlampingUnitTypeByRateChart
                  rows={filterUnitTypesForRateChart(result.data.unitTypesByUnits)}
                  market={market}
                />
              </div>
            </section>
          ) : null}

          {market === 'us' ? (
            amenityImpact.ok ? (
              <GlampingAmenityImpactSection
                rows={amenityImpact.data}
                market={market}
                showAllClassificationsScope={tier !== 'all'}
                chart={
                  <GlampingAmenityImpactChart
                    rows={amenityImpact.data}
                    market={market}
                  />
                }
              />
            ) : (
              <GlampingMarketOverviewLoadError
                className="mt-16"
                title="Unable to load amenity impact"
                message="National metrics loaded, but amenity rate impact could not be refreshed. Try again or contact support if this continues."
                detail={amenityImpact.error}
              />
            )
          ) : null}

          {proximity.ok && proximity.data.nationalParks ? (
            <GlampingProximitySection
              headingId="national-parks-analysis-heading"
              title="National Parks Analysis"
              subtitle="Unit-weighted average rate and open inventory by distance band to the nearest national park."
              unitsWithinLabel="Properties within 100 Miles"
              unitsWithinSubLabel="From National Parks"
              withinMetric="propertiesPct"
              rateImpactSubLabel={`Less than ${NATIONAL_PARKS_PROXIMITY_THRESHOLD_MILES} miles vs. greater than ${NATIONAL_PARKS_PROXIMITY_THRESHOLD_MILES} miles`}
              analysis={proximity.data.nationalParks}
              market={market}
              chart={
                <GlampingProximityBandChart
                  analysis={proximity.data.nationalParks}
                  market={market}
                  xAxisLabel="Distance to National Park (miles)"
                  ariaLabel="Band average retail daily rate and open units by distance to nearest national park"
                  showRateImpactFootnote={false}
                />
              }
            />
          ) : null}

          {proximity.ok ? (
            <GlampingProximitySection
              headingId="transportation-analysis-heading"
              title="Transportation Analysis"
              subtitle="Unit-weighted average rate and open inventory by distance band to the nearest major or large airport."
              unitsWithinLabel="Properties greater than 100 Miles"
              unitsWithinSubLabel="From Major and Large Airports"
              withinMetric="propertiesBeyondPct"
              rateImpactSubLabel={`Greater than ${AIRPORTS_PROXIMITY_THRESHOLD_MILES} miles vs. less than ${AIRPORTS_PROXIMITY_THRESHOLD_MILES} miles`}
              analysis={proximity.data.airports}
              market={market}
              chart={
                <GlampingProximityBandChart
                  analysis={proximity.data.airports}
                  market={market}
                  xAxisLabel="Distance to Airport (miles)"
                  ariaLabel="Band average retail daily rate and open units by distance to nearest major airport"
                  showRateImpactFootnote={false}
                  emphasizeBeyondRates
                />
              }
            />
          ) : proximity.ok === false ? (
            <GlampingMarketOverviewLoadError
              className="mt-16"
              title="Unable to load proximity analysis"
              message="National metrics loaded, but park and airport proximity could not be refreshed. Try again or contact support if this continues."
              detail={proximity.error}
            />
          ) : null}
          </main>

        <GlampingMarketOverviewResearchFooter market={market} />
      </div>
    </GlampingMarketMethodologyProvider>
  );
}
