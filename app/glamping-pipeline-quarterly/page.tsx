import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import { GlampingMarketClassificationFilter } from '@/components/glamping-industry/GlampingMarketClassificationFilter';
import { GlampingMarketScopeDisclosure } from '@/components/glamping-industry/GlampingMarketScopeDisclosure';
import { GlampingMarketSnapshotToggle } from '@/components/glamping-industry/GlampingMarketSnapshotToggle';
import { PipelineQuarterlyPageShell } from '@/components/pipeline-quarterly/PipelineQuarterlyPageShell';
import { PipelineStatusCard } from '@/components/pipeline-quarterly/PipelineStatusCard';
import { parseGlampingMarketSnapshotTierFilter } from '@/lib/glamping-market-snapshot-classification';
import { parseGlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import { fetchPipelineQuarterlyOverview } from '@/lib/pipeline-quarterly/fetch-overview';
import {
  PIPELINE_QUARTERLY_STATUSES,
  pipelineQuarterlyOverviewPath,
} from '@/lib/pipeline-quarterly/status-slugs';

const PipelineStatusMixChart = nextDynamic(
  () =>
    import('@/components/pipeline-quarterly/PipelineStatusMixChart').then(
      (m) => m.PipelineStatusMixChart
    ),
  { ssr: false }
);

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pipeline Quarterly | Sage Outdoor Advisory',
  description:
    'Quarterly outdoor hospitality pipeline intelligence — proposed developments, under construction, openings, and cancelled projects.',
  robots: { index: false, follow: false },
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

type PageProps = {
  searchParams: { market?: string; tier?: string };
};

export default async function PipelineQuarterlyOverviewPage({ searchParams }: PageProps) {
  const market = parseGlampingMarketSnapshotMarket(searchParams.market);
  const tier = parseGlampingMarketSnapshotTierFilter(searchParams.tier);

  const result = await fetchPipelineQuarterlyOverview(market, tier);

  const descriptionBySlug = new Map(
    PIPELINE_QUARTERLY_STATUSES.map((s) => [s.slug, s.description] as const)
  );

  return (
    <PipelineQuarterlyPageShell
      title="Outdoor Hospitality Pipeline"
      subtitle={
        result.ok ? (
          <>
            <span className="tabular-nums">{result.data.quarterLabel}</span>
            {' · '}Last updated {formatLastUpdatedDate(result.data.asOf)}
          </>
        ) : null
      }
    >
      <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-4">
        <GlampingMarketSnapshotToggle
          market={market}
          tier={tier}
          pathForMarketTier={pipelineQuarterlyOverviewPath}
        />
        <GlampingMarketClassificationFilter
          market={market}
          tier={tier}
          pathForMarketTier={pipelineQuarterlyOverviewPath}
        />
      </div>

      <GlampingMarketScopeDisclosure />

      {result.ok ? (
        <>
          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-x-16">
            <dl className="space-y-12">
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Tracked glamping properties
                </dt>
                <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(result.data.totalProperties)}
                </dd>
                <p className="mt-4 max-w-sm text-[11px] leading-relaxed text-neutral-500">
                  Private commercial glamping operators in the published Sage universe. Click a
                  status below for property-level detail, charts, and export.
                </p>
              </div>

              <div>
                <dt className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Total glamping units
                </dt>
                <dd className="mt-3 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(result.data.totalUnits)}
                </dd>
              </div>
            </dl>

            <aside className="lg:border-l lg:border-sage-200 lg:pl-10">
              <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
                Pipeline mix
              </h2>
              <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-500">
                Distinct properties by development stage. Newly opened counts transitions in the
                last 90 days.
              </p>
              <div className="mt-6">
                <PipelineStatusMixChart statusCounts={result.data.statusCounts} />
              </div>
            </aside>
          </div>

          <section className="mt-16">
            <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
              By development status
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {result.data.statusCounts.map((status) => (
                <PipelineStatusCard
                  key={status.slug}
                  status={status}
                  description={descriptionBySlug.get(status.slug) ?? ''}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="mt-12 text-sm text-neutral-600">{result.error}</p>
      )}
    </PipelineQuarterlyPageShell>
  );
}
