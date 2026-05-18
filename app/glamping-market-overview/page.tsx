import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import { GlampingMarketSnapshotToggle } from '@/components/glamping-industry/GlampingMarketSnapshotToggle';
import { fetchGlampingIndustryCaProvinceMetrics } from '@/lib/fetch-glamping-industry-ca-province-metrics';
import { fetchGlampingIndustryMetrics } from '@/lib/fetch-glamping-industry-metrics';
import { fetchGlampingIndustryUsStateMetrics } from '@/lib/fetch-glamping-industry-us-state-metrics';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import { CA_PROVINCE_DISPLAY_NAME } from '@/lib/normalize-ca-province-key';
import { US_STATE_NAMES } from '@/lib/us-states';

const TOP_REGIONS_COUNT = 5;

/** Olympic National Park topo line art — `public/images/glamping-market-snapshot-topo.png` */
const SNAPSHOT_TOPO_BG_URL = '/images/glamping-market-snapshot-topo.png';

const GlampingIndustryUsMap = nextDynamic(
  () => import('@/components/glamping-industry/GlampingIndustryUsMap'),
  { ssr: false }
);

const GlampingIndustryCanadaProvinces = nextDynamic(
  () => import('@/components/glamping-industry/GlampingIndustryCanadaProvinces'),
  { ssr: false }
);

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Glamping Market Overview',
  description:
    'United States or Canada glamping metrics focused on private commercial glamping stays; excludes RV parks, tent-heavy campgrounds, marketplace-only listings, and state or federal public-lands glamping.',
  robots: { index: true, follow: true },
};

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function formatUsd(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
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

function parseMarket(raw: string | undefined): GlampingMarketSnapshotMarket {
  return raw?.toLowerCase() === 'ca' ? 'ca' : 'us';
}

type PageProps = {
  searchParams: { market?: string };
};

export default async function GlampingMarketOverviewPage({ searchParams }: PageProps) {
  const market = parseMarket(searchParams.market);

  const [result, usStates, caProvinces] = await Promise.all([
    fetchGlampingIndustryMetrics(market),
    market === 'us' ? fetchGlampingIndustryUsStateMetrics() : Promise.resolve({ ok: true as const, data: {} }),
    market === 'ca' ? fetchGlampingIndustryCaProvinceMetrics() : Promise.resolve({ ok: true as const, data: {} }),
  ]);

  const topUsStates: { key: string; name: string; propertyCount: number }[] =
    market === 'us' && result.ok && usStates.ok
      ? Object.entries(usStates.data)
          .map(([abbr, m]) => ({
            key: abbr,
            name: (US_STATE_NAMES as Record<string, string>)[abbr] ?? abbr,
            propertyCount: m.propertyCount,
          }))
          .filter((r) => r.propertyCount > 0)
          .sort((a, b) => b.propertyCount - a.propertyCount)
          .slice(0, TOP_REGIONS_COUNT)
      : [];

  const topCaProvinces: { key: string; name: string; propertyCount: number }[] =
    market === 'ca' && result.ok && caProvinces.ok
      ? Object.entries(caProvinces.data)
          .map(([code, m]) => ({
            key: code,
            name: CA_PROVINCE_DISPLAY_NAME[code] ?? code,
            propertyCount: m.propertyCount,
          }))
          .filter((r) => r.propertyCount > 0)
          .sort((a, b) => b.propertyCount - a.propertyCount)
          .slice(0, TOP_REGIONS_COUNT)
      : [];

  return (
    <div
      className="relative flex min-h-screen flex-col bg-cover bg-center bg-no-repeat text-neutral-900"
      style={{
        backgroundColor: '#faf9f3',
        backgroundImage: `linear-gradient(to bottom, rgb(250 249 243 / 0.55), rgb(250 249 243 / 0.9)), url(${SNAPSHOT_TOPO_BG_URL})`,
      }}
    >
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-x-visible px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <h1 className="font-[Georgia] text-sm font-medium uppercase tracking-[0.28em] text-neutral-900 sm:text-lg">
          Glamping Market Overview
        </h1>

        {result.ok ? (
          <p className="mt-3 text-[11px] font-light tabular-nums leading-snug text-neutral-500 sm:text-xs">
            Last Updated: {formatLastUpdatedDate(result.data.asOf)}
          </p>
        ) : null}

        <GlampingMarketSnapshotToggle market={market} />

        <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-neutral-600">
          A <span className="text-neutral-900">glamping property</span> here means private stays in
          glamping-style units (tents, treehouses, cabins, domes, yurts, and similar). We exclude{' '}
          <span className="text-neutral-900">RV resorts</span>, tent-heavy{' '}
          <span className="text-neutral-900">campgrounds</span>, marketplace-only bookings (e.g.{' '}
          <span className="text-neutral-900">Hipcamp</span>), and glamping on{' '}
          <span className="text-neutral-900">state</span> or{' '}
          <span className="text-neutral-900">federal</span> public land so totals reflect commercial
          glamping operators.
        </p>

        {result.ok ? (
          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-x-16">
            <dl className="space-y-12">
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Total properties
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
                </ul>
              </div>

              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Total sites
                </dt>
                <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(result.data.totalSites)}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Avg. retail daily rate
                </dt>
                <dd className="mt-3 space-y-1 text-lg font-light tabular-nums tracking-tight text-neutral-800 sm:text-xl">
                  <div>
                    <span className="text-neutral-500">Mean</span>{' '}
                    {formatUsd(result.data.avgRetailDailyRateMean)}
                  </div>
                  <div>
                    <span className="text-neutral-500">Median</span>{' '}
                    {formatUsd(result.data.avgRetailDailyRateMedian)}
                  </div>
                </dd>
                <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-neutral-500">
                  Mean and median use published operating properties with a recorded nightly rate.
                </p>
              </div>
            </dl>

            <aside className="lg:border-l lg:border-sage-200 lg:pl-10">
              <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
                Top unit types
              </h2>
              <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-500">
                Percent of total sites by primary unit label on each row (first listed type when
                several are stored together).
              </p>
              {result.data.topUnitTypesBySites.length > 0 ? (
                <ul className="mt-6 space-y-3 text-sm">
                  {result.data.topUnitTypesBySites.map((row) => (
                    <li
                      key={row.label}
                      className="flex min-w-0 items-baseline gap-x-2 font-light"
                    >
                      <span className="shrink-0 text-neutral-700">{row.label}</span>
                      <span
                        aria-hidden
                        className="mb-[0.2em] min-w-[0.75rem] flex-1 border-b border-dotted border-neutral-300"
                      />
                      <span className="shrink-0 tabular-nums text-neutral-900">
                        {row.pctOfSites}%
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
                    Distinct property names with a published row in that state.
                  </p>
                  {topUsStates.length > 0 ? (
                    <ul className="mt-6 space-y-3 text-sm">
                      {topUsStates.map((row) => (
                        <li
                          key={row.key}
                          className="flex min-w-0 items-baseline gap-x-2 font-light"
                        >
                          <span className="shrink-0 text-neutral-700">{row.name}</span>
                          <span
                            aria-hidden
                            className="mb-[0.2em] min-w-[0.75rem] flex-1 border-b border-dotted border-neutral-300"
                          />
                          <span className="shrink-0 tabular-nums text-neutral-900">
                            {formatInt(row.propertyCount)}
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
                    Distinct property names with a published row in that province or territory.
                  </p>
                  {topCaProvinces.length > 0 ? (
                    <ul className="mt-6 space-y-3 text-sm">
                      {topCaProvinces.map((row) => (
                        <li
                          key={row.key}
                          className="flex min-w-0 items-baseline gap-x-2 font-light"
                        >
                          <span className="shrink-0 text-neutral-700">{row.name}</span>
                          <span
                            aria-hidden
                            className="mb-[0.2em] min-w-[0.75rem] flex-1 border-b border-dotted border-neutral-300"
                          />
                          <span className="shrink-0 tabular-nums text-neutral-900">
                            {formatInt(row.propertyCount)}
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
          <p className="mt-12 text-sm text-neutral-600">{result.error}</p>
        )}

        {market === 'us' && result.ok && usStates.ok ? (
          <GlampingIndustryUsMap byState={usStates.data} />
        ) : market === 'us' && result.ok && !usStates.ok ? (
          <p className="mt-16 text-sm text-neutral-600">{usStates.error}</p>
        ) : null}

        {market === 'ca' && result.ok && caProvinces.ok ? (
          <GlampingIndustryCanadaProvinces byProvince={caProvinces.data} />
        ) : market === 'ca' && result.ok && !caProvinces.ok ? (
          <p className="mt-16 text-sm text-neutral-600">{caProvinces.error}</p>
        ) : null}
      </main>

      <footer className="relative z-10 mt-auto w-full py-6 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-xs font-light text-neutral-500">
            Powered by{' '}
            <a
              href="https://sageoutdooradvisory.com/"
              className="text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
              rel="noopener noreferrer"
            >
              Sage Outdoor Advisory
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
