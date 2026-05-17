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
  title: 'Glamping market snapshot',
  description:
    'United States or Canada glamping metrics: mostly glamping-style units at professional properties, excluding RV resorts, tent-heavy campgrounds, and single-unit marketplace listings.',
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

function formatAsOfLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date}, ${time}`;
}

function parseMarket(raw: string | undefined): GlampingMarketSnapshotMarket {
  return raw?.toLowerCase() === 'ca' ? 'ca' : 'us';
}

type PageProps = {
  searchParams: { market?: string };
};

export default async function GlampingMarketSnapshotPage({ searchParams }: PageProps) {
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
      className="relative min-h-screen bg-cover bg-center bg-no-repeat text-neutral-900"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.78)), url(${SNAPSHOT_TOPO_BG_URL})`,
      }}
    >
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-24 sm:py-32">
        <h1 className="text-sm font-medium uppercase tracking-[0.28em] text-neutral-400 sm:text-lg">
          Glamping market snapshot
        </h1>

        {result.ok ? (
          <p className="mt-3 text-xs font-light tabular-nums text-neutral-400 sm:text-sm">
            Last Updated: {formatAsOfLabel(result.data.asOf)}
          </p>
        ) : null}

        <GlampingMarketSnapshotToggle market={market} />

        <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-neutral-500">
          For these figures, a <span className="text-neutral-700">glamping property</span> is one
          where most stays are glamping-style units: safari tents, treehouses, cabins, domes,
          yurts, and similar. We leave out <span className="text-neutral-700">RV resorts</span>,{' '}
          tent-heavy <span className="text-neutral-700">campgrounds</span>, and single-unit
          marketplace listings (e.g. <span className="text-neutral-700">Hipcamp</span>) so the
          numbers reflect professionally run glamping.
        </p>

        {result.ok ? (
          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-x-16">
            <dl className="space-y-12">
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-400">
                  Total properties
                </dt>
                <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(result.data.totalProperties)}
                </dd>
                <ul className="mt-6 space-y-2 border-l border-neutral-200 pl-4 text-sm text-neutral-500">
                  <li>
                    <span className="text-neutral-400">Open</span>{' '}
                    <span className="tabular-nums text-neutral-800">
                      {formatInt(result.data.openProperties)}
                    </span>
                  </li>
                  <li>
                    <span className="text-neutral-400">Under construction</span>{' '}
                    <span className="tabular-nums text-neutral-800">
                      {formatInt(result.data.underConstructionProperties)}
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-400">
                  Total sites
                </dt>
                <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(result.data.totalSites)}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-400">
                  Avg. retail daily rate
                </dt>
                <dd className="mt-3 space-y-1 text-lg font-light tabular-nums tracking-tight text-neutral-800 sm:text-xl">
                  <div>
                    <span className="text-neutral-400">Mean</span>{' '}
                    {formatUsd(result.data.avgRetailDailyRateMean)}
                  </div>
                  <div>
                    <span className="text-neutral-400">Median</span>{' '}
                    {formatUsd(result.data.avgRetailDailyRateMedian)}
                  </div>
                </dd>
                <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-neutral-400">
                  Mean and median use published operating properties with a recorded nightly rate.
                </p>
              </div>
            </dl>

            <aside className="lg:border-l lg:border-neutral-200 lg:pl-10">
              <h2 className="text-[11px] uppercase tracking-widest text-neutral-400">
                Top unit types
              </h2>
              <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-400">
                Percent of total sites by primary unit label on each row (first listed type when
                several are stored together).
              </p>
              {result.data.topUnitTypesBySites.length > 0 ? (
                <ul className="mt-6 space-y-3 text-sm">
                  {result.data.topUnitTypesBySites.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-baseline justify-between gap-6 font-light"
                    >
                      <span className="text-neutral-600">{row.label}</span>
                      <span className="shrink-0 tabular-nums text-neutral-900">
                        {row.pctOfSites}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-xs text-neutral-400">No labeled unit types in this cohort.</p>
              )}

              {market === 'us' && result.ok && usStates.ok ? (
                <>
                  <h2 className="mt-10 text-[11px] uppercase tracking-widest text-neutral-400">
                    Top states
                  </h2>
                  <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-400">
                    Distinct property names with a published row in that state.
                  </p>
                  {topUsStates.length > 0 ? (
                    <ul className="mt-6 space-y-3 text-sm">
                      {topUsStates.map((row) => (
                        <li
                          key={row.key}
                          className="flex items-baseline justify-between gap-6 font-light"
                        >
                          <span className="text-neutral-600">{row.name}</span>
                          <span className="shrink-0 tabular-nums text-neutral-900">
                            {formatInt(row.propertyCount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-6 text-xs text-neutral-400">No state breakdown in this cohort.</p>
                  )}
                </>
              ) : null}

              {market === 'ca' && result.ok && caProvinces.ok ? (
                <>
                  <h2 className="mt-10 text-[11px] uppercase tracking-widest text-neutral-400">
                    Top provinces & territories
                  </h2>
                  <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-400">
                    Distinct property names with a published row in that province or territory.
                  </p>
                  {topCaProvinces.length > 0 ? (
                    <ul className="mt-6 space-y-3 text-sm">
                      {topCaProvinces.map((row) => (
                        <li
                          key={row.key}
                          className="flex items-baseline justify-between gap-6 font-light"
                        >
                          <span className="text-neutral-600">{row.name}</span>
                          <span className="shrink-0 tabular-nums text-neutral-900">
                            {formatInt(row.propertyCount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-6 text-xs text-neutral-400">
                      No province breakdown in this cohort.
                    </p>
                  )}
                </>
              ) : null}
            </aside>
          </div>
        ) : (
          <p className="mt-12 text-sm text-neutral-500">{result.error}</p>
        )}

        {market === 'us' && result.ok && usStates.ok ? (
          <GlampingIndustryUsMap byState={usStates.data} />
        ) : market === 'us' && result.ok && !usStates.ok ? (
          <p className="mt-16 text-sm text-neutral-500">{usStates.error}</p>
        ) : null}

        {market === 'ca' && result.ok && caProvinces.ok ? (
          <GlampingIndustryCanadaProvinces byProvince={caProvinces.data} />
        ) : market === 'ca' && result.ok && !caProvinces.ok ? (
          <p className="mt-16 text-sm text-neutral-500">{caProvinces.error}</p>
        ) : null}

        <footer className="mt-12 border-t border-neutral-200 pt-6 text-center">
          <a
            href="https://sageoutdooradvisory.com/"
            className="text-xs font-light text-neutral-400 underline-offset-2 transition-colors hover:text-neutral-700 hover:underline"
            rel="noopener noreferrer"
          >
            Powered by Sage Outdoor Advisory
          </a>
        </footer>
      </main>
    </div>
  );
}
