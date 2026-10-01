/**
 * Read one PostgREST page, retrying transient network failures.
 * Callers must build a fresh query inside `run` — the builder is single-use.
 */

type SupabasePageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export function isTransientSupabaseFetchError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('socket hang up') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

export async function readSupabasePage<T>(
  run: () => PromiseLike<SupabasePageResult<T>>,
  attempts = 3
): Promise<T[]> {
  let lastMessage = 'Unknown Supabase error';
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data, error } = await run();
    if (!error) return data ?? [];
    lastMessage = error.message;
    const retry = isTransientSupabaseFetchError(lastMessage) && attempt < attempts - 1;
    if (!retry) throw new Error(lastMessage);
    await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
  }
  throw new Error(lastMessage);
}
