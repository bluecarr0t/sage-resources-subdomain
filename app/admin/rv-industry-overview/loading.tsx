/**
 * Shown while the server component loads Campspot aggregates (or reads the long-TTL data cache).
 * Matches the 11 visualization sections on the live page.
 */
function ChartSectionSkeleton({ bordered = true }: { bordered?: boolean }) {
  const inner = (
    <>
      <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mt-6 h-[260px] rounded-lg bg-gray-100 dark:bg-gray-800" />
    </>
  );

  if (!bordered) {
    return <div>{inner}</div>;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-neutral-800 dark:bg-neutral-950">
      {inner}
    </div>
  );
}

export default function RvIndustryOverviewLoading() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8 animate-pulse" aria-busy="true" aria-label="Loading">
        <div>
          <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-gray-800 sm:h-9 sm:w-72" />
          <div className="mt-2 h-4 max-w-xl rounded bg-gray-100 dark:bg-neutral-950" />
        </div>

        <div className="h-24 rounded-lg border border-neutral-200/80 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-900/40" />

        <div className="h-28 rounded-lg border border-gray-200 bg-gray-50/80 dark:border-neutral-800 dark:bg-gray-900/40" />

        <div
          className="w-full rounded-lg bg-gray-100 dark:bg-neutral-950"
          style={{ aspectRatio: '960/580', minHeight: 280 }}
        />

        {Array.from({ length: 10 }, (_, i) => (
          <ChartSectionSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
