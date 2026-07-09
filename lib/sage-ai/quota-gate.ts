/**
 * Shared per-user daily quota gate for Sage AI tools that hit paid external
 * APIs (Google, Tavily, Firecrawl, OpenAI embeddings) or perform gated writes.
 *
 * External, paid tools MUST be billed to a user. A missing userId means we
 * cannot enforce the daily quota, so deny rather than silently bypass —
 * otherwise an unauthenticated/misrouted call would burn the shared API key
 * with no rate limit.
 */

import { enforceDailyQuota } from '@/lib/upstash';

export async function quotaGate(
  toolName: string,
  userId: string | undefined,
  quota: number
): Promise<{ error: string; data: null } | null> {
  if (!userId) {
    return {
      error: `${toolName} requires an authenticated user to enforce daily quota.`,
      data: null,
    };
  }
  const { allowed, used } = await enforceDailyQuota(toolName, userId, quota);
  if (!allowed) {
    return {
      error: `Daily quota exceeded for ${toolName} (used ${used} of ${quota}). Try again tomorrow or ask an admin to raise the limit.`,
      data: null,
    };
  }
  return null;
}
