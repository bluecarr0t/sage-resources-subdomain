/** Skeleton while the US / Canada market overview map chunk loads. */
export function GlampingMarketOverviewMapLoading() {
  return (
    <div
      className="mt-16 animate-pulse sm:mt-20"
      aria-busy="true"
      aria-label="Loading map"
    >
      <div className="mb-4 h-3 w-56 rounded-sm bg-neutral-200/80" />
      <div className="aspect-[880/540] w-full max-w-full rounded-sm bg-neutral-200/55" />
    </div>
  );
}
