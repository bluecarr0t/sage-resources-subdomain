import type { Metadata } from 'next';
import { GlampingMarketScopeDisclosure } from '@/components/glamping-industry/GlampingMarketScopeDisclosure';
import { PipelineOverviewInteractive } from '@/components/pipeline-quarterly/PipelineOverviewInteractive';
import { PipelineQuarterlyPageShell } from '@/components/pipeline-quarterly/PipelineQuarterlyPageShell';
import { fetchGlampingIndustryUsStateMetrics } from '@/lib/fetch-glamping-industry-us-state-metrics';
import { fetchPipelineQuarterlyOverview } from '@/lib/pipeline-quarterly/fetch-overview';
import { defaultPipelineMapSelectedAbbr } from '@/lib/pipeline-quarterly/us-state-pipeline-highlight';
import {
  PIPELINE_QUARTERLY_MARKET,
  PIPELINE_QUARTERLY_STATUSES,
  type PipelineQuarterlyStatusSlug,
} from '@/lib/pipeline-quarterly/status-slugs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pipeline Quarterly | Sage Outdoor Advisory',
  description:
    'Quarterly outdoor hospitality pipeline intelligence: proposed developments, under construction, openings, and cancelled projects.',
  robots: { index: false, follow: false },
};

function formatLastUpdatedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function PipelineQuarterlyOverviewPage() {
  const [result, usStates] = await Promise.all([
    fetchPipelineQuarterlyOverview(PIPELINE_QUARTERLY_MARKET, 'all'),
    fetchGlampingIndustryUsStateMetrics('all'),
  ]);

  const descriptionBySlug = new Map(
    PIPELINE_QUARTERLY_STATUSES.map((s) => [s.slug, s.description] as const)
  );

  const initialMapSelectedAbbr =
    usStates.ok ? defaultPipelineMapSelectedAbbr(usStates.data) : null;

  return (
    <PipelineQuarterlyPageShell
      title="Outdoor Hospitality Pipeline"
      subtitle={
        result.ok ? (
          <>United States · Last updated {formatLastUpdatedDate(result.data.asOf)}</>
        ) : null
      }
    >
      <GlampingMarketScopeDisclosure />

      {result.ok ? (
        <>
          <PipelineOverviewInteractive
            statusCounts={result.data.statusCounts}
            descriptions={descriptionBySlug as ReadonlyMap<PipelineQuarterlyStatusSlug, string>}
            byState={usStates.ok ? usStates.data : {}}
            initialMapSelectedAbbr={initialMapSelectedAbbr}
          />

          {!usStates.ok ? (
            <p className="mt-8 text-sm text-neutral-600">{usStates.error}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-12 text-sm text-neutral-600">{result.error}</p>
      )}
    </PipelineQuarterlyPageShell>
  );
}
