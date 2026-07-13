import { EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';
import type { GlampingMarketOverviewSeoVariant } from '@/lib/glamping-market-overview-seo';

/**
 * Decorative stand-in when access is locked. Abstract bars only — no live
 * metrics and no page H1 — so the blurred backdrop looks real without
 * duplicating the public SEO heading or leaking numbers in HTML.
 */
function MetricBlock({ labelWidth, valueWidth }: { labelWidth: string; valueWidth: string }) {
  return (
    <div className="space-y-3">
      <div className={`h-2.5 rounded-sm bg-neutral-300/80 ${labelWidth}`} />
      <div className={`h-12 rounded-sm bg-neutral-400/70 sm:h-14 ${valueWidth}`} />
    </div>
  );
}

function SidebarRow() {
  return (
    <div className="flex items-baseline gap-x-2">
      <div className="h-3 w-20 rounded-sm bg-neutral-300/90" />
      <div className="mb-[0.2em] min-w-[0.75rem] flex-1 border-b border-dotted border-neutral-300" />
      <div className="h-3 w-10 rounded-sm bg-neutral-400/60" />
      <div className="h-3 w-12 rounded-sm bg-neutral-400/60" />
    </div>
  );
}

function OverviewLockedPreview() {
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
      <div className="h-3 w-56 rounded-sm bg-neutral-400/80 sm:h-4 sm:w-72" />
      <div className="mt-3 h-2.5 w-36 rounded-sm bg-neutral-300/70" />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="h-8 w-28 rounded-sm bg-neutral-300/80" />
        <div className="h-8 w-40 rounded-sm bg-neutral-300/60" />
      </div>

      <div className="mt-6 h-2.5 w-64 max-w-full rounded-sm bg-neutral-300/50" />

      <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-x-16">
        <div className="space-y-12">
          <div>
            <MetricBlock labelWidth="w-40" valueWidth="w-32" />
            <div className="mt-6 space-y-2 border-l border-sage-200 pl-4">
              <div className="h-3 w-36 rounded-sm bg-neutral-300/70" />
              <div className="h-3 w-44 rounded-sm bg-neutral-300/70" />
              <div className="h-3 w-48 rounded-sm bg-neutral-300/70" />
            </div>
          </div>
          <MetricBlock labelWidth="w-36" valueWidth="w-28" />
          <div>
            <MetricBlock labelWidth="w-40" valueWidth="w-24" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-40 rounded-sm bg-neutral-300/80" />
              <div className="h-4 w-36 rounded-sm bg-neutral-300/80" />
            </div>
          </div>
        </div>

        <aside className="lg:border-l lg:border-sage-200 lg:pl-10">
          <div className="h-2.5 w-28 rounded-sm bg-neutral-300/80" />
          <div className="mt-2 h-2 w-48 max-w-full rounded-sm bg-neutral-300/50" />
          <div className="mt-6 space-y-3">
            <SidebarRow />
            <SidebarRow />
            <SidebarRow />
            <SidebarRow />
            <SidebarRow />
          </div>
          <div className="mt-10 h-2.5 w-24 rounded-sm bg-neutral-300/80" />
          <div className="mt-6 space-y-3">
            <SidebarRow />
            <SidebarRow />
            <SidebarRow />
            <SidebarRow />
            <SidebarRow />
          </div>
        </aside>
      </div>

      <div className="mt-16 h-48 w-full rounded-sm bg-neutral-300/40 sm:h-64" />
    </main>
  );
}

function BrandsLockedPreview() {
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
      <div className="h-3 w-48 rounded-sm bg-neutral-300/70" />
      <div className="mt-6 h-3 w-52 rounded-sm bg-neutral-400/80 sm:h-4 sm:w-64" />
      <div className="mt-3 h-2.5 w-40 rounded-sm bg-neutral-300/70" />

      <div className="mt-10 space-y-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-baseline gap-x-3">
            <div className="h-3 w-4 rounded-sm bg-neutral-300/70" />
            <div className="h-3 w-40 rounded-sm bg-neutral-400/70 sm:w-56" />
            <div className="mb-[0.2em] min-w-[0.75rem] flex-1 border-b border-dotted border-neutral-300" />
            <div className="h-3 w-10 rounded-sm bg-neutral-300/80" />
            <div className="h-3 w-10 rounded-sm bg-neutral-300/80" />
            <div className="h-3 w-14 rounded-sm bg-neutral-400/60" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function GlampingMarketOverviewLockedPreview({
  variant = 'overview',
}: {
  variant?: GlampingMarketOverviewSeoVariant;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#faf9f3] text-neutral-900">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.015]"
        style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
        aria-hidden
      />
      {variant === 'brands' ? <BrandsLockedPreview /> : <OverviewLockedPreview />}
    </div>
  );
}
