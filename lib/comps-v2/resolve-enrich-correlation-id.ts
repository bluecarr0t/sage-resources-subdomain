/**
 * Correlation id for POST /api/admin/comps-v2/enrich-selection: explicit body wins, then header
 * (`X-Correlation-Id`), for tying deep enrich to discovery runs and Vercel logs.
 */

export type CompsV2EnrichCorrelationSource = 'body' | 'header' | null;

export function resolveCompsV2EnrichCorrelationId(
  headerValue: string | null | undefined,
  bodyCorrelationId: unknown
): { correlationId: string | undefined; source: CompsV2EnrichCorrelationSource } {
  const fromBody =
    typeof bodyCorrelationId === 'string' && bodyCorrelationId.trim() ? bodyCorrelationId.trim() : '';
  const fromHeader = headerValue?.trim() || '';
  if (fromBody) return { correlationId: fromBody, source: 'body' };
  if (fromHeader) return { correlationId: fromHeader, source: 'header' };
  return { correlationId: undefined, source: null };
}
