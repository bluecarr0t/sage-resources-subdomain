import type { GlampingMarketSnapshotTierFilter } from '@/lib/glamping-market-snapshot-classification';
import type { GlampingIsOpenMetricsBucket } from '@/lib/glamping-is-open';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';

/** Pipeline Quarterly launches US-only; Canada may be added later. */
export const PIPELINE_QUARTERLY_MARKET: GlampingMarketSnapshotMarket = 'us';

/** URL segment for each pipeline status drill-down view. */
export type PipelineQuarterlyStatusSlug =
  | 'proposed-development'
  | 'under-construction'
  | 'open'
  | 'cancelled'
  | 'newly-opened';

export type PipelineQuarterlyStatusConfig = {
  slug: PipelineQuarterlyStatusSlug;
  label: string;
  shortLabel: string;
  description: string;
  /** Maps to `bucketGlampingIsOpenForMetrics` for live inventory views. */
  metricsBucket?: GlampingIsOpenMetricsBucket;
  /** When true, rows come from status-history transitions instead of current `is_open`. */
  isQuarterlyTransition?: boolean;
};

export const PIPELINE_QUARTERLY_STATUSES: readonly PipelineQuarterlyStatusConfig[] = [
  {
    slug: 'proposed-development',
    label: 'Proposed Development',
    shortLabel: 'Proposed',
    description:
      'Announced or permitted glamping projects not yet under construction. The earliest supply signal.',
    metricsBucket: 'proposed_development',
  },
  {
    slug: 'under-construction',
    label: 'Under Construction',
    shortLabel: 'Under construction',
    description:
      'Active builds with a recorded construction stage. Forecasted openings and unit counts.',
    metricsBucket: 'under_construction',
  },
  {
    slug: 'open',
    label: 'Open',
    shortLabel: 'Open',
    description: 'Operating glamping properties accepting guests in the Sage published universe.',
    metricsBucket: 'yes',
  },
  {
    slug: 'newly-opened',
    label: 'Newly Opened',
    shortLabel: 'Newly opened',
    description:
      'Properties that transitioned to Open in the last 90 days — quarterly supply additions.',
    isQuarterlyTransition: true,
  },
  {
    slug: 'cancelled',
    label: 'Cancelled Projects',
    shortLabel: 'Cancelled',
    description:
      'Pipeline projects marked cancelled or abandoned before opening — stalled supply removed from the forecast.',
    metricsBucket: 'cancelled',
  },
] as const;

/** Primary supply-forecast funnel shown left-to-right on the overview page. */
export const PIPELINE_QUARTERLY_FUNNEL_SLUGS = [
  'proposed-development',
  'under-construction',
  'open',
] as const satisfies readonly PipelineQuarterlyStatusSlug[];

const SLUG_MAP = new Map(
  PIPELINE_QUARTERLY_STATUSES.map((s) => [s.slug, s] as const)
);

export function parsePipelineQuarterlyStatusSlug(
  raw: string | null | undefined
): PipelineQuarterlyStatusConfig | null {
  if (!raw) return null;
  return SLUG_MAP.get(raw as PipelineQuarterlyStatusSlug) ?? null;
}

export type PipelineQuarterlyStatusPathOptions = {
  state?: string | null;
};

function pipelineQuarterlyFilterQuery(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter
): string {
  const params = new URLSearchParams();
  if (market === 'ca') params.set('market', 'ca');
  if (tier !== 'all') params.set('tier', tier);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function pipelineQuarterlyStatusPath(
  slug: PipelineQuarterlyStatusSlug,
  options?: PipelineQuarterlyStatusPathOptions
): string {
  const base = `/outdoor-hospitality-pipeline/${slug}`;
  const state = options?.state?.trim().toUpperCase();
  if (!state) return base;
  return `${base}?state=${encodeURIComponent(state)}`;
}

export function pipelineQuarterlyStatusPathWithFilters(
  slug: PipelineQuarterlyStatusSlug,
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter
): string {
  return `/glamping-pipeline-quarterly/${slug}${pipelineQuarterlyFilterQuery(market, tier)}`;
}

export function pipelineQuarterlyOverviewPath(
  market?: GlampingMarketSnapshotMarket,
  tier?: GlampingMarketSnapshotTierFilter
): string {
  if (market === undefined && tier === undefined) {
    return '/outdoor-hospitality-pipeline';
  }
  return `/glamping-pipeline-quarterly${pipelineQuarterlyFilterQuery(market ?? 'us', tier ?? 'all')}`;
}
