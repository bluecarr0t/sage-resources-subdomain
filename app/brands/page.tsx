import type { Metadata } from 'next';
import Link from 'next/link';
import { GlampingMarketScopeDisclosure } from '@/components/glamping-industry/GlampingMarketScopeDisclosure';
import { EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';
import {
  fetchTopGlampingBrands,
  formatRetailDailyRate,
  TOP_GLAMPING_BRANDS_COUNT,
} from '@/lib/fetch-top-glamping-brands';

/** Fixed columns: rank · brand name · props · units · avg. retail daily rate */
const BRANDS_TABLE_GRID_CLASS =
  'grid grid-cols-[1.25rem_minmax(0,1fr)_3.25rem_3.25rem_minmax(5.5rem,auto)] items-baseline gap-x-2';
const BRANDS_TABLE_NUMERIC_CLASS = 'text-right tabular-nums';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Top Glamping Brands',
  description:
    'Rankings of the largest US and Canada glamping brands by published Glamping property type only — property count, units, and average nightly rates.',
  robots: { index: true, follow: true },
};

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

export default async function BrandOverviewPage() {
  const result = await fetchTopGlampingBrands(TOP_GLAMPING_BRANDS_COUNT);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#faf9f3] text-neutral-900">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.015]"
        style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
        aria-hidden
      />
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-x-visible px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <h1 className="font-[Georgia] text-sm font-medium uppercase tracking-[0.28em] text-neutral-900 sm:text-lg">
          Top Glamping Brands
        </h1>

        {result.ok ? (
          <p className="mt-3 text-[11px] font-light tabular-nums leading-snug text-neutral-500 sm:text-xs">
            Last Updated: {formatLastUpdatedDate(result.data.asOf)}
          </p>
        ) : null}

        <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-neutral-600">
          Largest multi-property glamping operators in Sage research, ranked by published Glamping
          property count. Portfolio brands include sub-brand locations in their totals.
        </p>

        <GlampingMarketScopeDisclosure />

        {result.ok ? (
          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] lg:items-start lg:gap-x-12">
            <dl className="space-y-12 lg:max-w-[13.5rem]">
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Brands ranked
                </dt>
                <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(result.data.brands.length)}
                </dd>
                <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-neutral-500">
                  Top {TOP_GLAMPING_BRANDS_COUNT} by published Glamping properties with an assigned
                  brand in Sage research.
                </p>
              </div>

              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Properties in ranking
                </dt>
                <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(result.data.totalBrandedProperties)}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Glamping units in ranking
                </dt>
                <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(result.data.totalBrandedUnits)}
                </dd>
                <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-neutral-500">
                  Unit totals use quantity of units or property total sites per published location.
                </p>
              </div>
            </dl>

            <aside className="min-w-0 lg:border-l lg:border-sage-200 lg:pl-10">
              <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
                Top brands
              </h2>
              <p className="mt-2 max-w-md text-[10px] leading-relaxed text-neutral-500">
                Props per brand; rollups include sub-brands. Avg. retail rate is the mean where
                nightly rates are published.
              </p>
              {result.data.brands.length > 0 ? (
                <ul className="mt-6 w-full min-w-0 space-y-4 text-sm">
                  <li
                    aria-hidden
                    className={`${BRANDS_TABLE_GRID_CLASS} text-[10px] uppercase tracking-wider text-neutral-500`}
                  >
                    <span />
                    <span />
                    <span className={`${BRANDS_TABLE_NUMERIC_CLASS} whitespace-nowrap`}>Props</span>
                    <span className={`${BRANDS_TABLE_NUMERIC_CLASS} whitespace-nowrap`}>Units</span>
                    <span
                      className={`${BRANDS_TABLE_NUMERIC_CLASS} whitespace-nowrap text-[9px] leading-tight`}
                    >
                      Avg. retail
                      <br />
                      daily rate
                    </span>
                  </li>
                  {result.data.brands.map((row) => (
                    <li key={row.slug} className={`${BRANDS_TABLE_GRID_CLASS} font-light`}>
                      <span className={`${BRANDS_TABLE_NUMERIC_CLASS} text-neutral-400`}>
                        {row.rank}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/en/brand/${row.slug}`}
                          title={row.displayName}
                          className="block truncate text-neutral-800 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500"
                        >
                          {row.displayName}
                        </Link>
                        {row.subBrandNote ? (
                          <p className="mt-0.5 text-[10px] font-light leading-snug text-neutral-500">
                            {row.subBrandNote}
                          </p>
                        ) : null}
                      </div>
                      <span className={`${BRANDS_TABLE_NUMERIC_CLASS} text-neutral-900`}>
                        {formatInt(row.propertyCount)}
                      </span>
                      <span className={`${BRANDS_TABLE_NUMERIC_CLASS} text-neutral-900`}>
                        {formatInt(row.unitCount)}
                      </span>
                      <span
                        className={`${BRANDS_TABLE_NUMERIC_CLASS} whitespace-nowrap text-neutral-900`}
                      >
                        {formatRetailDailyRate(row.avgRetailDailyRate)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-xs text-neutral-500">No ranked brands in this cohort.</p>
              )}
            </aside>
          </div>
        ) : (
          <p className="mt-12 text-sm text-neutral-600">{result.error}</p>
        )}
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
