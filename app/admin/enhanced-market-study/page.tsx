import { Suspense } from 'react';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import { EnhancedMarketStudyClient } from '@/components/admin/enhanced-market-study/EnhancedMarketStudyClient';

/**
 * Enhanced Market Study (MVP): interactive, deep-linkable cohort view backed by
 * POST /api/admin/market-report. Multi-county catchment GDP/pop rollups are Phase 2.
 */
export default function EnhancedMarketStudyPage() {
  return (
    <GoogleMapsProvider>
      <Suspense
        fallback={
          <div className="p-6 text-sm text-neutral-600 dark:text-neutral-400">Loading study…</div>
        }
      >
        <EnhancedMarketStudyClient />
      </Suspense>
    </GoogleMapsProvider>
  );
}
