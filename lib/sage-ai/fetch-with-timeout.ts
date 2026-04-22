/**
 * Wrap `fetch` with a wall-clock timeout, optionally chained off an outer
 * AbortSignal (so client disconnects propagate down to provider HTTP calls).
 *
 * Why we need this: every external tool call in Sage AI (Google Places,
 * Tavily, Firecrawl crawl status polling, OpenAI) goes out over the public
 * internet. Without an explicit timeout, a hung peer keeps the route open
 * until the platform's outer timeout (default 60s on Vercel functions) fires,
 * which means we burn the user's daily quota *and* their AI Gateway budget
 * with nothing to show for it. Capping each call individually keeps the user
 * in control of what counts against them.
 */

export interface TimeoutFetchOptions extends RequestInit {
  /** Hard cap in milliseconds. */
  timeoutMs: number;
  /** Optional outer signal — usually `request.signal` from the route handler. */
  parentSignal?: AbortSignal;
}

export class FetchTimeoutError extends Error {
  constructor(public readonly url: string, public readonly timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'FetchTimeoutError';
  }
}

/**
 * Like `fetch`, but throws `FetchTimeoutError` after `timeoutMs`. If a
 * `parentSignal` is supplied (or one is already on `init.signal`), aborting it
 * also cancels the request — so a client disconnect propagates through.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: TimeoutFetchOptions
): Promise<Response> {
  const { timeoutMs, parentSignal, signal: providedSignal, ...init } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

  // Forward aborts from any upstream signal(s) (parent + caller-provided).
  const forwards: Array<() => void> = [];
  for (const signal of [parentSignal, providedSignal]) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    const onAbort = () => controller.abort(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    forwards.push(() => signal.removeEventListener('abort', onAbort));
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Distinguish our own timeout from a parent-driven abort. If the parent
      // is aborted, surface the parent's reason; otherwise it's our timeout.
      const parentAborted = parentSignal?.aborted || providedSignal?.aborted;
      if (parentAborted) throw err;
      throw new FetchTimeoutError(String(input), timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    for (const remove of forwards) remove();
  }
}
