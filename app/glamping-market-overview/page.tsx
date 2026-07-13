import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { EDITORIAL_LINK_CLASS, EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';
import { GlampingMarketClassificationFilter } from '@/components/glamping-industry/GlampingMarketClassificationFilter';
import { GlampingMarketOverviewLoadError } from '@/components/glamping-industry/GlampingMarketOverviewLoadError';
import { GlampingMarketOverviewMapLoading } from '@/components/glamping-industry/GlampingMarketOverviewMapLoading';
import {
  GlampingMarketMethodologyProvider,
  GlampingMarketOverviewResearchFooter,
  GlampingMarketScopeDisclosure,
} from '@/components/glamping-industry/GlampingMarketOverviewResearchFooter';
import { GlampingMarketSnapshotToggle } from '@/components/glamping-industry/GlampingMarketSnapshotToggle';
import { isGlampingMarketOverviewUnlocked } from '@/lib/glamping-market-overview-access';
import {
  formatGlampingMarketOverviewRate,
  glampingMarketOverviewRateCurrencyHint,
  glampingMarketOverviewRateFootnote,
} from '@/lib/glamping-market-overview-currency';
import { parseGlampingMarketSnapshotTierFilter } from '@/lib/glamping-market-snapshot-classification';
import { fetchGlampingIndustryCaProvinceMetrics } from '@/lib/fetch-glamping-industry-ca-province-metrics';
import { fetchGlampingIndustryMetrics } from '@/lib/fetch-glamping-industry-metrics';
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
  searchParams: { market?: string; tier?: string };
};

export default async function GlampingMarketOverviewPage({ searchParams }: PageProps) {
  // Layout already shows the lock UI; skip metric fetches so numbers never leave the server.
  if (!(await isGlampingMarketOverviewUnlocked())) {
    return null;
  }

  const market = parseGlampingMarketSnapshotMarket(searchParams.market);
  const tier = parseGlampingMarketSnapshotTierFilter(searchParams.tier);

  const [result, usStates, caProvinces] = await Promise.all([
    fetchGlampingIndustryMetrics(market, tier),
    market === 'us'
      ? fetchGlampingIndustryUsStateMetrics(tier)
      : Promise.resolve({ ok: true as const, data: {} }),
    market === 'ca'
      ? fetchGlampingIndustryCaProvinceMetrics(tier)
      : Promise.resolve({ ok: true as const, data: {} }),
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
          <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-x-hidden px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
            <h1 className="font-[Georgia] text-sm font-medium uppercase tracking-[0.28em] text-neutral-900 sm:text-lg">
              Glamping Market Overview
            </h1>

          {result.ok ? (
            <p className="mt-3 text-[11px] font-light tabular-nums leading-snug text-neutral-500 sm:text-xs">
              Last Updated: {formatLastUpdatedDate(result.data.asOf)}
            </p>
          ) : null}

          <div className="mt-6 flex w-full flex-wrap items-start justify-between gap-4">
            <GlampingMarketSnapshotToggle market={market} tier={tier} />
            <GlampingMarketClassificationFilter market={market} tier={tier} />
          </div>

          <GlampingMarketScopeDisclosure />

          {result.ok ? (
            <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-x-16">
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
                      <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
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
                <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Top unit types
                </h2>
                <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-500">
                  Open-unit mix{tier !== 'all' ? ' in this tier' : ''}; unit-weighted ARDR
                  {market === 'ca' ? ' (CAD)' : ''} when published
                  {tier !== 'all' ? '. ~ = small sample; under 5 hidden' : ''}.
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
                    <h2 className="mt-10 text-[11px] uppercase tracking-widest text-neutral-500">
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
                    <h2 className="mt-10 text-[11px] uppercase tracking-widest text-neutral-500">
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

          {market === 'us' && result.ok && usStates.ok ? (
            <GlampingIndustryUsMap byState={usStates.data} />
          ) : market === 'us' && result.ok && !usStates.ok ? (
            <GlampingMarketOverviewLoadError
              className="mt-16"
              title="Unable to load US map"
              message="National metrics loaded, but the state map could not be refreshed. Try again or contact support if this continues."
              detail={usStates.error}
            />
          ) : null}

          {market === 'ca' && result.ok && caProvinces.ok ? (
            <GlampingIndustryCanadaProvinces byProvince={caProvinces.data} />
          ) : market === 'ca' && result.ok && !caProvinces.ok ? (
            <GlampingMarketOverviewLoadError
              className="mt-16"
              title="Unable to load Canada map"
              message="National metrics loaded, but the province breakdown could not be refreshed. Try again or contact support if this continues."
              detail={caProvinces.error}
            />
          ) : null}
        </main>

        <GlampingMarketOverviewResearchFooter market={market} />
      </div>
    </GlampingMarketMethodologyProvider>
  );
}
