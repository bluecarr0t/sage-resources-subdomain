import {
  isGlampingServiceTier,
  tierDisplayLabel,
  type GlampingServiceTier,
} from '@/lib/glamping-service-tier';
import { renderPipelineEmptyCell } from '@/components/pipeline-quarterly/PipelineTableEmptyValue';

const TIER_PILL_CLASSES: Record<GlampingServiceTier, string> = {
  luxury: 'bg-violet-600 text-white',
  upscale: 'bg-sage-600 text-white',
  midscale: 'bg-sky-600 text-white',
  rustic: 'bg-amber-700 text-white',
};

type Props = {
  tier: string | null | undefined;
  emptyDisplay?: string;
};

export function GlampingServiceTierPill({ tier, emptyDisplay = '—' }: Props) {
  if (!tier?.trim()) {
    return renderPipelineEmptyCell(emptyDisplay);
  }

  const normalized = tier.trim().toLowerCase();
  if (!isGlampingServiceTier(normalized)) {
    return <span className="text-[12px] text-neutral-600">{tier}</span>;
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${TIER_PILL_CLASSES[normalized]}`}
    >
      {tierDisplayLabel(normalized, 'short')}
    </span>
  );
}
