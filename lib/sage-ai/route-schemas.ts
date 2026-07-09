/**
 * Shared request-validation schemas for Sage AI API routes.
 *
 * Centralizes the two shapes every route was validating ad-hoc (and some not
 * at all): the session/query `[id]` UUID, and the inbound chat message shape.
 * Keeping these in one place means a malformed id becomes a clean 400 (instead
 * of a Postgres "invalid input syntax for type uuid" 500) and message payloads
 * are structurally validated before they reach persistence or the model.
 */

import { z } from 'zod';

/** Canonical UUID matcher (kept in sync with the feedback route's UUID_RE). */
export const SAGE_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Session / saved-query id (a UUID). */
export const sageSessionIdSchema = z
  .string()
  .regex(SAGE_UUID_REGEX, 'must be a valid id (uuid)');

/**
 * Structural shape of a persisted / inbound Sage AI chat message. Intentionally
 * permissive on `parts` (the AI SDK UIMessage part union is large and evolves);
 * we validate the envelope (role + optional id/content/parts) but let the SDK
 * own part-level semantics.
 */
export const sageMessageSchema = z.object({
  id: z.string().max(256).optional(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().optional(),
  parts: z.array(z.unknown()).optional(),
});

export type SageMessageInput = z.infer<typeof sageMessageSchema>;

export const sageMessagesArraySchema = z.array(sageMessageSchema);

/**
 * Validate a dynamic-route `[id]` segment as a UUID. Returns a discriminated
 * result so route handlers can early-return their own NextResponse without
 * this module depending on `next/server`.
 */
export function isValidSageUuid(id: unknown): id is string {
  return typeof id === 'string' && SAGE_UUID_REGEX.test(id);
}
