'use client';

/** Shown while the code-split InsightsColumn chunk (Recharts + map) loads. */
export function InsightsColumnSkeleton() {
  return (
    <div className="space-y-6 mb-8" aria-busy="true" aria-label="Loading insights">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-950 border border-neutral-200/75 dark:border-neutral-800 rounded-xl"
          >
            <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-9 h-9" />
            <div className="flex-1">
              <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-[500px] bg-gray-100 dark:bg-gray-800 rounded-lg border border-neutral-200/75 dark:border-neutral-800 animate-pulse" />
      <div className="p-6 bg-white dark:bg-neutral-950 border border-neutral-200/75 dark:border-neutral-800 rounded-xl">
        <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
