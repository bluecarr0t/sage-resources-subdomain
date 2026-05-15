const BANNED_SUBSTRINGS = [
  'best in the world',
  'world\'s best',
  'worlds best',
  '#1 ',
  ' #1',
  'guaranteed',
  'miracle',
  'cure ',
  '100% free',
  'act now',
  'click here',
  'limited time offer',
] as const;

export interface ValidateDescriptionInput {
  text: string;
  /** If set and non-trivial, description must mention it (case-insensitive). */
  city?: string | null;
  /** If set and non-trivial, description must mention state as substring (flexible). */
  state?: string | null;
  /** If set, description must mention property name at least once (case-insensitive). */
  propertyName?: string | null;
}

export interface ValidateDescriptionResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
}

const MIN_WORDS = 95;
const MAX_WORDS = 240;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Programmatic checks before persisting SEO copy.
 */
export function validateSeoDescription(input: ValidateDescriptionInput): ValidateDescriptionResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const text = input.text.trim();
  if (!text) {
    errors.push('Description is empty.');
    return { ok: false, warnings, errors };
  }

  const lower = text.toLowerCase();
  for (const b of BANNED_SUBSTRINGS) {
    if (lower.includes(b)) {
      errors.push(`Contains disallowed marketing phrase: "${b}"`);
    }
  }

  const wc = wordCount(text);
  if (wc < MIN_WORDS) {
    errors.push(`Too short: ${wc} words (minimum ${MIN_WORDS}).`);
  }
  if (wc > MAX_WORDS) {
    warnings.push(`Long copy: ${wc} words (soft max ${MAX_WORDS}).`);
  }

  const city = input.city?.trim();
  if (city && city.length > 1 && !lower.includes(city.toLowerCase())) {
    errors.push(`Must include the city name "${city}" for local SEO.`);
  }

  const state = input.state?.trim();
  if (state && state.length > 1 && !lower.includes(state.toLowerCase())) {
    errors.push(`Must include the state "${state}" for local SEO.`);
  }

  const name = input.propertyName?.trim();
  if (name && name.length > 2 && !lower.includes(name.toLowerCase())) {
    errors.push(`Must include the property name for brand clarity.`);
  }

  return { ok: errors.length === 0, warnings, errors };
}
