/**
 * Insert discovery pipeline rejections into the manual review queue.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const GLAMPING_DISCOVERY_CANDIDATES_TABLE = 'glamping_discovery_candidates';

type FailureRow = {
  property_name?: string;
  city?: string;
  state?: string;
  country?: string;
  url?: string;
  description?: string;
  unit_type?: string;
  property_type?: string;
  number_of_units?: number;
};

export async function routeDiscoveryFailuresToCandidates(
  sb: SupabaseClient,
  failedProps: { p: FailureRow; reason: string }[],
  articleUrl: string | undefined,
  discoverySource: string
): Promise<void> {
  if (failedProps.length === 0) return;
  try {
    const rows = failedProps.map(({ p, reason }) => ({
      property_name: p.property_name || 'Unknown',
      city: p.city ?? null,
      state: p.state ?? null,
      country: p.country ?? null,
      url: p.url ?? null,
      description: p.description ?? null,
      unit_type: p.unit_type ?? null,
      property_type: p.property_type ?? null,
      number_of_units: p.number_of_units ?? null,
      article_url: articleUrl ?? null,
      discovery_source: discoverySource,
      status: 'pending',
      rejection_reason: reason,
      confidence: 'low',
    }));
    const { error } = await sb.from(GLAMPING_DISCOVERY_CANDIDATES_TABLE).insert(rows);
    if (error) throw error;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== '42P01') {
      console.warn(
        'Could not route failures to candidates:',
        err instanceof Error ? err.message : err
      );
    }
  }
}
