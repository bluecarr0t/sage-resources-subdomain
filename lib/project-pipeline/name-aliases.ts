function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split combined appraiser cells (e.g. Lars / Luke) before alias matching. */
function splitAppraiserConsultantField(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s*\/\s*|\s*,\s*/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [trimmed];
}

function isSingleConsultantAuthoredBy(
  field: string,
  displayName: string
): boolean {
  const aliases = extractNameAliases(displayName);
  if (!aliases.length) return false;
  if (!fieldMatchesNameAliases(field, aliases)) return false;

  const fieldTokens = field.split(/\s+/).filter(Boolean);
  if (fieldTokens.length <= 1) return true;

  const authorTokens = displayName.trim().split(/\s+/).filter(Boolean);
  if (authorTokens.length <= 1) return true;

  if (aliases.some((alias) => alias.toLowerCase() === field.toLowerCase())) {
    return true;
  }

  const authorLast = authorTokens[authorTokens.length - 1]!;
  return field.toLowerCase().includes(authorLast.toLowerCase());
}

/** First name and optional compound first name (e.g. Mary Claire) from display_name. */
export function extractNameAliases(displayName: string | null | undefined): string[] {
  if (!displayName?.trim()) return [];

  const tokens = displayName.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const aliases = [tokens[0]];

  if (tokens.length >= 2 && /^[A-Z]/.test(tokens[1])) {
    aliases.push(`${tokens[0]} ${tokens[1]}`);
  }

  return aliases;
}

export function fieldMatchesNameAliases(
  fieldValue: string | null | undefined,
  aliases: readonly string[]
): boolean {
  const normalized = fieldValue?.trim();
  if (!normalized || !aliases.length) return false;

  return aliases.some((alias) => {
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');
    return pattern.test(normalized);
  });
}

/**
 * Matches a sheet appraiser/consultant cell to a managed user's display name.
 * Multi-word sheet values must include the author's last name (bare "Nick" stays ambiguous).
 */
export function isJobAuthoredByConsultant(
  fieldValue: string | null | undefined,
  displayName: string
): boolean {
  const field = fieldValue?.trim();
  if (!field) return false;

  const consultants = splitAppraiserConsultantField(field);
  if (consultants.length > 1) {
    return consultants.some((consultant) =>
      isSingleConsultantAuthoredBy(consultant, displayName)
    );
  }

  return isSingleConsultantAuthoredBy(consultants[0] ?? field, displayName);
}
