'use client';

export function InsightsSkeleton() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Skeleton: Header */}
        <div className="mb-8">
          <div className="h-9 w-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-full max-w-2xl bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="flex flex-wrap gap-3">
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        </div>
        {/* Skeleton: Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
            >
              <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-9 h-9" />
              <div className="flex-1">
                <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton: Chart */}
        <div className="mb-6 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        {/* Skeleton: Two charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-72 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
