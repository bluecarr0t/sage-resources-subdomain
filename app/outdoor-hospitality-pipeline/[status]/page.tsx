import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PipelinePropertyListSection } from '@/components/pipeline-quarterly/PipelinePropertyListSection';
import { PipelineQuarterlyPageShell } from '@/components/pipeline-quarterly/PipelineQuarterlyPageShell';
import {
  PipelineQuarterlyStateChart,
  PipelineQuarterlyUnitTypeChart,
} from '@/components/pipeline-quarterly/PipelineQuarterlyStatusCharts';
import { fetchPipelineQuarterlyStatusBreakdown } from '@/lib/pipeline-quarterly/fetch-status-breakdown';
import {
  parsePipelineStateParam,
  pipelinePropertyStateKey,
} from '@/lib/pipeline-quarterly/filter-properties';
import {
  parsePipelineQuarterlyStatusSlug,
  PIPELINE_QUARTERLY_MARKET,
  pipelineQuarterlyOverviewPath,
  type PipelineQuarterlyStatusSlug,
} from '@/lib/pipeline-quarterly/status-slugs';
import { getPipelinePropertyInitialSort } from '@/lib/pipeline-quarterly/sort-properties';
import { PIPELINE_PROPERTY_OPEN_PAGE_SIZE } from '@/lib/pipeline-quarterly/paginate-properties';
import {
  PIPELINE_OPENING_FORECAST_DAYS,
  PIPELINE_OPENING_FORECAST_MONTHS,
  summarizePipelineOpeningWithinDays,
  summarizePipelineOpeningWithinMonths,
} from '@/lib/pipeline-quarterly/planned-open-window';

export const dynamic = 'force-dynamic';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

type PageProps = {
  params: { status: string };
  searchParams: { state?: string };
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

  const statusSlug = params.status as PipelineQuarterlyStatusSlug;

  const result = await fetchPipelineQuarterlyStatusBreakdown(
    statusSlug,
    PIPELINE_QUARTERLY_MARKET,
    'all'
  );

  const stateFromUrl = parsePipelineStateParam(searchParams.state);
  const initialSelectedStates =
    result.ok &&
    stateFromUrl &&
    result.data.properties.some((row) => pipelinePropertyStateKey(row) === stateFromUrl)
      ? [stateFromUrl]
      : [];

  const hideStatusCharts =
    statusSlug === 'under-construction' || statusSlug === 'proposed-development';

  const openingWithin90Days =
    result.ok && statusSlug === 'under-construction'
      ? summarizePipelineOpeningWithinDays(
          result.data.properties,
          PIPELINE_OPENING_FORECAST_DAYS,
          result.data.asOf
        )
      : null;

  const openingWithin6Months =
    result.ok && statusSlug === 'under-construction'
      ? summarizePipelineOpeningWithinMonths(
          result.data.properties,
          PIPELINE_OPENING_FORECAST_MONTHS,
          result.data.asOf
        )
      : null;

  const showOpeningForecasts = openingWithin90Days != null;

  return (
    <PipelineQuarterlyPageShell
      title={config.label}
      subtitle={config.description}
    >
      <p className="mt-4">
        <Link
          href={pipelineQuarterlyOverviewPath()}
          className="text-[11px] uppercase tracking-widest text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
        >
          ← All pipeline statuses
        </Link>
      </p>

      {result.ok ? (
        <>
          <div
            className={`mt-10 grid gap-8 ${
              showOpeningForecasts ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'
            }`}
          >
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
            {openingWithin90Days ? (
              <div>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Opening within 90 days
                </p>
                <p className="mt-2 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(openingWithin90Days.propertyCount)}
                </p>
              </div>
            ) : null}
            {openingWithin6Months ? (
              <div>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Opening within 6 months
                </p>
                <p className="mt-2 font-light text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {formatInt(openingWithin6Months.propertyCount)}
                </p>
              </div>
            ) : null}
          </div>

          {!hideStatusCharts ? (
            <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-stretch lg:gap-x-16">
              <section className="flex flex-col">
                <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">
                  By state
                </h2>
                <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                  Top states by property count in this status.
                </p>
                <div className="mt-6 flex min-h-80 w-full flex-1 items-end">
                  <PipelineQuarterlyStateChart rows={result.data.byState} />
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
                  <PipelineQuarterlyUnitTypeChart rows={result.data.byUnitType} />
                </div>
              </section>
            </div>
          ) : null}

          <PipelinePropertyListSection
            rows={result.data.properties}
            filenamePrefix={`pipeline-${config.slug}`}
            hidePlannedOpenColumn={statusSlug === 'open'}
            initialSelectedStates={initialSelectedStates}
            rateColumnLabel={
              statusSlug === 'proposed-development' || statusSlug === 'under-construction'
                ? 'Projected Rate'
                : 'Avg rate'
            }
            initialSort={getPipelinePropertyInitialSort(statusSlug)}
            pageSize={statusSlug === 'open' ? PIPELINE_PROPERTY_OPEN_PAGE_SIZE : undefined}
          />
        </>
      ) : (
        <p className="mt-12 text-sm text-neutral-600">{result.error}</p>
      )}
    </PipelineQuarterlyPageShell>
  );
}
