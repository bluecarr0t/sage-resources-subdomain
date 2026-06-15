import Link from 'next/link';
import {
  PIPELINE_OPEN_COLORS,
  PIPELINE_PROPOSED_COLORS,
  PIPELINE_UNDER_CONSTRUCTION_COLORS,
} from '@/lib/pipeline-quarterly/stage-colors';
import type { PipelineQuarterlyStatusCount } from '@/lib/pipeline-quarterly/fetch-overview';
import {
  PIPELINE_QUARTERLY_FUNNEL_SLUGS,
  pipelineQuarterlyStatusPath,
  type PipelineQuarterlyStatusSlug,
} from '@/lib/pipeline-quarterly/status-slugs';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

type FunnelSlug = (typeof PIPELINE_QUARTERLY_FUNNEL_SLUGS)[number];

const STAGE_THEME: Record<
  FunnelSlug,
  {
    accent: string;
    badge: string;
    viewButton: string;
  }
> = {
  'proposed-development': {
    accent: PIPELINE_PROPOSED_COLORS.accentClass,
    badge: PIPELINE_PROPOSED_COLORS.badgeClass,
    viewButton: PIPELINE_PROPOSED_COLORS.mapButtonActiveClass,
  },
  'under-construction': {
    accent: PIPELINE_UNDER_CONSTRUCTION_COLORS.accentClass,
    badge: PIPELINE_UNDER_CONSTRUCTION_COLORS.badgeClass,
    viewButton: PIPELINE_UNDER_CONSTRUCTION_COLORS.mapButtonActiveClass,
  },
  open: {
    accent: PIPELINE_OPEN_COLORS.accentClass,
    badge: PIPELINE_OPEN_COLORS.badgeClass,
    viewButton: PIPELINE_OPEN_COLORS.mapButtonActiveClass,
  },
};

type Props = {
  statusCounts: readonly PipelineQuarterlyStatusCount[];
  descriptions: ReadonlyMap<PipelineQuarterlyStatusSlug, string>;
};

export function PipelineStageFunnel({
  statusCounts,
  descriptions,
}: Props) {
  const bySlug = new Map(statusCounts.map((s) => [s.slug, s] as const));

  const stages = PIPELINE_QUARTERLY_FUNNEL_SLUGS.map((slug, index) => ({
    slug,
    step: index + 1,
    status: bySlug.get(slug),
    description: descriptions.get(slug) ?? '',
    theme: STAGE_THEME[slug],
  }));

  const totalProperties = stages.reduce(
    (sum, s) => sum + (s.status?.propertyCount ?? 0),
    0
  );

  return (
    <div className="overflow-hidden rounded-xl border border-sage-200/90 bg-white shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {stages.map((stage, index) => {
          const propertyCount = stage.status?.propertyCount ?? 0;
          const unitCount = stage.status?.unitCount ?? 0;
          const sharePct =
            totalProperties > 0 ? Math.round((propertyCount / totalProperties) * 100) : 0;

          return (
            <article
              key={stage.slug}
              className={`relative flex flex-1 flex-col border-sage-100 bg-white transition-colors hover:bg-neutral-50/80 lg:min-w-0 ${
                index > 0 ? 'border-t lg:border-t-0 lg:border-l' : ''
              }`}
            >
                <div className={`h-1 w-full ${stage.theme.accent}`} aria-hidden />

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${stage.theme.badge}`}
                      >
                        {stage.step}
                      </span>
                      <h3 className="text-sm font-medium leading-snug text-neutral-800">
                        {stage.status?.label ?? stage.slug}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-sage-100 px-2 py-0.5 text-[11px] tabular-nums text-neutral-600">
                      {sharePct}%
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="font-light text-4xl tabular-nums tracking-tight text-neutral-900 sm:text-[2.75rem] sm:leading-none">
                      {formatInt(propertyCount)}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      properties
                      {unitCount > 0 ? (
                        <>
                          {' · '}
                          <span className="tabular-nums text-neutral-700">{formatInt(unitCount)}</span>{' '}
                          units
                        </>
                      ) : null}
                    </p>
                  </div>

                  <p className="mt-4 flex-1 text-sm leading-relaxed text-neutral-600">
                    {stage.description}
                  </p>

                  <div className="mt-5">
                    <Link
                      href={pipelineQuarterlyStatusPath(stage.slug)}
                      className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:opacity-90 ${stage.theme.viewButton}`}
                    >
                      View properties
                    </Link>
                  </div>
                </div>
              </article>
          );
        })}
      </div>
    </div>
  );
}
