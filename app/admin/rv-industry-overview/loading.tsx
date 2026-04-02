/**
 * Shown while the server component loads Campspot aggregates (or reads the long-TTL data cache).
 */
export default function RvIndustryOverviewLoading() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8 animate-pulse" aria-busy="true" aria-label="Loading">
        <div>
          <div className="h-9 w-64 rounded-lg bg-gray-200 dark:bg-gray-800 sm:h-11 sm:w-80" />
          <div className="mt-3 h-4 max-w-xl rounded bg-gray-100 dark:bg-gray-900" />
        </div>
        <div
          className="w-full rounded-lg bg-gray-100 dark:bg-gray-900"
          style={{ aspectRatio: '960/580', minHeight: 280 }}
        />
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-6 h-[260px] rounded-lg bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </main>
  );
}
