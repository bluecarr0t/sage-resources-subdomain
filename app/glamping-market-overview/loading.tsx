import { EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';

/** Route-level skeleton for `/glamping-market-overview` (and nested) while RSC streams. */
export default function GlampingMarketOverviewLoading() {
  return (
    <div
      className="relative flex min-h-screen flex-col bg-[#faf9f3] text-neutral-900"
      aria-busy="true"
      aria-label="Loading glamping market overview"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.015]"
        style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
        aria-hidden
      />
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="h-4 w-64 animate-pulse rounded-sm bg-neutral-200/80 sm:h-5 sm:w-80" />
        <div className="mt-3 h-3 w-40 animate-pulse rounded-sm bg-neutral-200/60" />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="h-9 w-44 animate-pulse rounded-sm bg-neutral-200/70" />
          <div className="h-9 w-56 animate-pulse rounded-sm bg-neutral-200/70" />
        </div>

        <div className="mt-6 h-4 w-72 animate-pulse rounded-sm bg-neutral-200/50" />

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-x-16">
          <div className="space-y-12">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="h-3 w-36 animate-pulse rounded-sm bg-neutral-200/60" />
                <div className="mt-3 h-12 w-28 animate-pulse rounded-sm bg-neutral-200/80" />
              </div>
            ))}
          </div>
          <div className="space-y-8 lg:border-l lg:border-sage-200 lg:pl-10">
            <div className="h-3 w-28 animate-pulse rounded-sm bg-neutral-200/60" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded-sm bg-neutral-200/50" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 aspect-[880/520] w-full animate-pulse rounded-sm bg-neutral-200/45" />
      </main>
    </div>
  );
}
