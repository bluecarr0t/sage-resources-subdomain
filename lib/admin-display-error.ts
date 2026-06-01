/**
 * Redact sensitive fragments before showing errors in admin UI or JSON responses.
 * Full errors should still be logged server-side with console.error.
 */

const DEFAULT_FALLBACK = 'An error occurred';
const DEFAULT_MAX_LENGTH = 240;

/** Patterns that must not appear in admin-facing copy. */
const SENSITIVE_PATTERNS: RegExp[] = [
  /postgres(?:ql)?:\/\/\S+/gi,
  /mysql:\/\/\S+/gi,
  /mongodb(?:\+srv)?:\/\/\S+/gi,
  /https?:\/\/[^\s]*supabase\.co[^\s]*/gi,
  /(?:password|passwd|secret|api[_-]?key|service[_-]?role|anon[_-]?key)\s*[=:]\s*\S+/gi,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+\b/g,
  /\b(?:sbp|sb)_[A-Za-z0-9_-]{20,}\b/gi,
];

const STACK_IN_MESSAGE = /\n\s*at\s+[\w./<>]+/;

function extractMessage(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  if (raw instanceof Error) return raw.message;
  if (typeof raw === 'object') {
    const obj = raw as { message?: unknown; code?: unknown };
    if (typeof obj.message === 'string') {
      const code = typeof obj.code === 'string' ? obj.code.trim() : '';
      return code ? `[${code}] ${obj.message}` : obj.message;
    }
  }
  return null;
}

function redactSensitive(text: string): string {
  let out = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, '[redacted]');
  }
  return out;
}

function isMostlyRedacted(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const withoutTags = trimmed.replace(/\[redacted\]/gi, '').trim();
  return withoutTags.length === 0;
}

export type SanitizeAdminDisplayErrorOptions = {
  fallback?: string;
  maxLength?: number;
};

/**
 * Safe string for admin UI / API `error` fields. Strips stacks, URLs with credentials, and JWTs.
 */
export function sanitizeAdminDisplayError(
  raw: unknown,
  options?: SanitizeAdminDisplayErrorOptions
): string {
  const fallback = options?.fallback ?? DEFAULT_FALLBACK;
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;

  const extracted = extractMessage(raw);
  if (!extracted) return fallback;

  let text = extracted;
  const stackAt = text.search(STACK_IN_MESSAGE);
  if (stackAt >= 0) text = text.slice(0, stackAt).trim();

  text = redactSensitive(text).replace(/\s+/g, ' ').trim();

  if (isMostlyRedacted(text)) return fallback;

  if (text.length > maxLength) {
    text = `${text.slice(0, maxLength - 1)}…`;
  }

  return text;
}
