/**
 * Parse and validate person names for lead capture and CRM webhooks.
 */

export const PERSON_NAME_MIN_LENGTH = 1;
export const PERSON_NAME_MAX_LENGTH = 80;

export type SplitName = {
  first_name: string;
  last_name: string;
};

/** First token → first name; remainder → last name. */
export function splitFullName(fullName: string): SplitName {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  if (!trimmed) return { first_name: '', last_name: '' };

  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { first_name: trimmed, last_name: '' };
  }

  return {
    first_name: trimmed.slice(0, spaceIndex),
    last_name: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function joinFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

export function normalizeNamePart(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidNamePart(value: string): boolean {
  const normalized = normalizeNamePart(value);
  return (
    normalized.length >= PERSON_NAME_MIN_LENGTH &&
    normalized.length <= PERSON_NAME_MAX_LENGTH
  );
}
