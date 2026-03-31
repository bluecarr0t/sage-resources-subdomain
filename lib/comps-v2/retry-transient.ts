/**
 * Heuristics for retrying third-party HTTP clients (Tavily, Firecrawl) on transient failures.
 */

export function isLikelyTransientNetworkError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) return true;
  if (msg.includes('502') || msg.includes('503') || msg.includes('504')) return true;
  if (msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('timeout')) return true;
  if (msg.includes('fetch failed') || msg.includes('socket hang up') || msg.includes('econnrefused'))
    return true;
  return false;
}

export async function sleepBackoffMs(attemptIndex: number, baseMs: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 150);
  await new Promise((r) => setTimeout(r, baseMs * 2 ** attemptIndex + jitter));
}
