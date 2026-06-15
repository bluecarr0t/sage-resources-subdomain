import type { Metadata } from 'next';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { GlampingMarketClassificationFilter } from '@/components/glamping-industry/GlampingMarketClassificationFilter';
import { GlampingMarketSnapshotToggle } from '@/components/glamping-industry/GlampingMarketSnapshotToggle';
import { PipelinePropertiesTable } from '@/components/pipeline-quarterly/PipelinePropertiesTable';
import { PipelineQuarterlyExportDropdown } from '@/components/pipeline-quarterly/PipelineQuarterlyExportDropdown';
import { PipelineQuarterlyPageShell } from '@/components/pipeline-quarterly/PipelineQuarterlyPageShell';
import { parseGlampingMarketSnapshotTierFilter } from '@/lib/glamping-market-snapshot-classification';
import { parseGlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import { fetchPipelineQuarterlyStatusBreakdown } from '@/lib/pipeline-quarterly/fetch-status-breakdown';
import {
  parsePipelineQuarterlyStatusSlug,
  pipelineQuarterlyOverviewPath,
  pipelineQuarterlyStatusPathWithFilters,
  type PipelineQuarterlyStatusSlug,
} from '@/lib/pipeline-quarterly/status-slugs';

const PipelineStateBarChart = nextDynamic(
  () =>
    import('@/components/pipeline-quarterly/PipelineStateBarChart').then(
      (m) => m.PipelineStateBarChart
    ),
  { ssr: false }
);

const PipelineUnitTypeDonutChart = nextDynamic(
  () =>
    import('@/components/pipeline-quarterly/PipelineUnitTypeDonutChart').then(
      (m) => m.PipelineUnitTypeDonutChart
    ),
  { ssr: false }
);

export const dynamic = 'force-dynamic';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

type PageProps = {
  params: { status: string };
  searchParams: { market?: string; tier?: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const config = parsePipelineQuarterlyStatusSlug(params.status);
  return {
    title: config
      ? `${config.label} | Pipeline Quarterly`
      : 'Pipeline Quarterly | Sage Outdoor Advisory',
    robots: { index: false, follow: false },
  };
}

export default async function PipelineQuarterlyStatusPage({
  params,
  searchParams,
}: PageProps) {
  const config = parsePipelineQuarterlyStatusSlug(params.status);
  if (!config) notFound();

  const market = parseGlampingMarketSnapshotMarket(searchParams.market);
  const tier = parseGlampingMarketSnapshotTierFilter(searchParams.tier);
  const statusSlug = params.status as PipelineQuarterlyStatusSlug;

  const result = await fetchPipelineQuarterlyStatusBreakdown(statusSlug, market, tier);

  return (
    <PipelineQuarterlyPageShell
      title={config.label}
      subtitle={config.description}
      actions={
        result.ok ? (
          <PipelineQuarterlyExportDropdown
            rows={result.data.properties}
            filenamePrefix={`pipeline-${config.slug}`}
          />
        ) : null
      }
    >
      <p className="mt-4">
        <Link
          href={pipelineQuarterlyOverviewPath(market, tier)}
          className="text-[11px] uppercase tracking-widest text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
        >
          ← All pipeline statuses
        </Link>
      </p>

      <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-4">
        <GlampingMarketSnapshotToggle
          market={market}
          tier={tier}
          pathForMarketTier={(m, t) =>
            pipelineQuarterlyStatusPathWithFilters(statusSlug, m, t)
          }
        />
        <GlampingMarketClassificationFilter
          market={market}
          tier={tier}
          pathForMarketTier={(m, t) =>
            pipelineQuarterlyStatusPathWithFilters(statusSlug, m, t)
          }
        />
      </div>

      {result.ok ? (
        <>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-neutral-500">Properties</p>
              <p className="mt-2 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                {formatInt(result.data.totalProperties)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-neutral-500">Units</p>
              <p className="mt-2 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                {formatInt(result.data.totalUnits)}
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-stretch lg:gap-x-16">
            <section className="flex flex-col">
              <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
                By state
              </h2>
              <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                Top states by property count in this status.
              </p>
              <div className="mt-6 flex min-h-80 w-full flex-1 items-end">
                <PipelineStateBarChart rows={result.data.byState} />
              </div>
            </section>

            <section className="flex flex-col lg:border-l lg:border-sage-200 lg:pl-10">
              <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
                Unit-type mix
              </h2>
              <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                Share of units by primary glamping product type.
              </p>
              <div className="mt-6 min-h-80 w-full">
                <PipelineUnitTypeDonutChart rows={result.data.byUnitType} />
              </div>
            </section>
          </div>

          <section className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Property list
                </h2>
                <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                  {formatInt(result.data.properties.length)} properties · export for full detail
                </p>
              </div>
            </div>
            <div className="mt-6">
              <PipelinePropertiesTable rows={result.data.properties} />
            </div>
          </section>
        </>
      ) : (
        <p className="mt-12 text-sm text-neutral-600">{result.error}</p>
      )}
    </PipelineQuarterlyPageShell>
  );
}
