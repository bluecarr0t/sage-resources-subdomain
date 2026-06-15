import type { ReactNode } from 'react';
import { GlampingMarketAccessGate } from '@/components/glamping-industry/GlampingMarketAccessGate';
import { GATED_PAGE_PIPELINE_QUARTERLY } from '@/lib/gated-access';

export function PipelineQuarterlyGatedShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none select-none blur-[8px] brightness-[0.97] contrast-[0.96]"
        aria-hidden
      >
        {children}
      </div>
      <GlampingMarketAccessGate
        pageSlug={GATED_PAGE_PIPELINE_QUARTERLY}
        title="Pipeline Quarterly"
        leadDescription="Request preview access to quarterly outdoor-hospitality pipeline intelligence: proposed developments, construction activity, openings, and cancellations tracked by Sage."
        emailOnlyDescription="Enter your work email for a secure sign-in link to the Pipeline Quarterly preview."
        successDescription="Open it on this device to unlock Pipeline Quarterly."
      />
    </div>
  );
}
