import type { WebResearchDiagnostics } from '@/lib/comps-v2/web-research-diagnostics';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

export type SearchStreamGeocode = { lat: number; lng: number };

export type SearchStreamSuccessPayload = {
  geocode: SearchStreamGeocode;
  counts: Record<string, number>;
  candidates: CompsV2Candidate[];
  webResearch: WebResearchDiagnostics | null;
  searchContext: { anchorCity: string; stateAbbr: string };
  /** UUID for logs/support; same value in `X-Discovery-Correlation-Id` on stream responses. */
  correlationId?: string;
  /** Wall-clock ms per enabled DB/past-report source (parallel sources overlap). */
  sourceTimingsMs?: Record<string, number>;
};

/** NDJSON lines for discovery stream mode (`Content-Type: application/x-ndjson`). */
export type CompsV2SearchStreamEvent =
  | { type: 'meta'; correlationId: string }
  | { type: 'phase'; step: 'geocode'; status: 'complete' }
  | {
      type: 'phase';
      step: 'markets';
      status: 'complete';
      counts: Record<string, number>;
      warnings?: string[];
      sourceTimingsMs?: Record<string, number>;
    }
  | { type: 'phase'; step: 'merge'; status: 'complete' }
  | { type: 'phase'; step: 'web'; status: 'started' | 'complete' }
  | { type: 'web_progress'; diagnostics: WebResearchDiagnostics }
  | { type: 'result'; success: true } & SearchStreamSuccessPayload
  | { type: 'error'; success: false; message: string; status?: number };
