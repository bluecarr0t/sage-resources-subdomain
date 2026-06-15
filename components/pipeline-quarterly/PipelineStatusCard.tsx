import Link from 'next/link';
import type { PipelineQuarterlyStatusCount } from '@/lib/pipeline-quarterly/fetch-overview';
import { pipelineQuarterlyStatusPath } from '@/lib/pipeline-quarterly/status-slugs';

function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

type Props = {
  status: PipelineQuarterlyStatusCount;
  description: string;
  compact?: boolean;
};

export function PipelineStatusCard({ status, description, compact = false }: Props) {
  return (
    <Link
      href={pipelineQuarterlyStatusPath(status.slug)}
      className="group block border border-sage-200/90 bg-white/50 p-5 transition-colors hover:border-sage-400 hover:bg-white"
    >
      <p className="text-sm text-neutral-600 group-hover:text-neutral-800">{status.label}</p>
      <p
        className={`mt-2 font-light tabular-nums tracking-tight text-neutral-900 ${
          compact ? 'text-3xl' : 'text-4xl sm:text-5xl'
        }`}
      >
        {formatInt(status.propertyCount)}
      </p>
      {status.unitCount > 0 ? (
        <p className="mt-2 text-sm text-neutral-600">
          <span className="text-neutral-500">Units</span>{' '}
          <span className="tabular-nums text-neutral-800">{formatInt(status.unitCount)}</span>
        </p>
      ) : null}
      {!compact ? (
        <p className="mt-3 text-xs leading-relaxed text-neutral-500 line-clamp-2">{description}</p>
      ) : null}
      <p className="mt-3 text-xs font-medium text-sage-700 group-hover:underline">View breakdown →</p>
    </Link>
  );
}
