/**
 * Shared helpers for public newsletter signup forms.
 */

import { isValidEmail } from '@/lib/gated-access';
import { parsePersonNameFields } from '@/lib/person-name';

export { isValidEmail };

export function parseNewsletterNameFields(body: {
  firstName?: unknown;
  lastName?: unknown;
}): { firstName: string; lastName: string } | null {
  return parsePersonNameFields(body);
}

export const DEFAULT_NEWSLETTER_SOURCE = 'footer';

const SOURCE_REGEX = /^[a-z0-9][a-z0-9_-]{0,62}$/;

/** Normalize and validate a signup source tag (e.g. footer, homepage). */
export function normalizeNewsletterSource(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_NEWSLETTER_SOURCE;
  const normalized = value.trim().toLowerCase();
  if (!SOURCE_REGEX.test(normalized)) return DEFAULT_NEWSLETTER_SOURCE;
  return normalized;
}
