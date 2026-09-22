/**
 * Accept a scraped open-year finding only when the quote is on the page,
 * names the property, and states an opening year (or a full date).
 */

export const YEAR_OPENED_RESEARCH_TAG = 'web_research_year_opened_2026_09';

const MIN_YEAR = 1990;
const MAX_YEAR = 2026;

const STOPWORDS = new Set([
  'the',
  'and',
  'camp',
  'camps',
  'glamping',
  'resort',
  'resorts',
  'lodge',
  'ranch',
  'retreat',
  'inn',
  'hotel',
  'park',
  'luxury',
  'state',
  'states',
  'island',
  'islands',
  'hill',
  'hills',
  'mountain',
  'mountains',
]);

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

const FOUNDING_LANGUAGE =
  /\b(founded|established|est\.|since|homestead(?:ed)?|family ranch|in operation since)\b/i;
const OPENING_LANGUAGE =
  /\b(opened|opening|grand opening|first guests|began welcoming|welcomed (?:our |the )?first|launched|doors opened)\b/i;
const CAMPGROUND_OPENING = /\b(campsites?|campground|rv sites?|unimproved)\b/i;
const GLAMPING_PRODUCT =
  /\b(glamping|safari|dome|yurt|cabin|tent|a-frame|treehouse|geodesic)\b/i;

export type YearOpenedConfidence = 'high' | 'medium' | 'low';

export type AcceptedYearOpened = {
  year: number;
  /** Full calendar date, only when the quote states the day. */
  openedOn: string | null;
  quote: string;
};

export type YearOpenedDecision =
  | { ok: true; finding: AcceptedYearOpened }
  | { ok: false; reason: string };

function collapse(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function distinctiveNameTokens(propertyName: string): string[] {
  const words = propertyName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
  if (words.length > 0) return words;
  const longer = propertyName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
  return longer.length > 0 ? longer : [];
}

function quoteInMarkdown(quote: string, markdown: string): boolean {
  const needle = collapse(quote);
  if (needle.length < 12) return false;
  return collapse(markdown).includes(needle);
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function quoteHasFullDate(quote: string, openedOn: string): boolean {
  if (quote.includes(openedOn)) return true;
  const [year, monthText, dayText] = openedOn.split('-');
  const month = MONTHS[Number(monthText) - 1];
  const day = String(Number(dayText));
  const normalized = quote.toLowerCase();
  const hasMonth =
    normalized.includes(month) || normalized.includes(month.slice(0, 3));
  const hasDay = new RegExp(`\\b${day}(?:st|nd|rd|th)?\\b`).test(normalized);
  return hasMonth && hasDay && normalized.includes(year);
}

export function acceptYearOpenedFinding(input: {
  propertyName: string;
  markdown: string;
  year: number | null;
  openedOn: string | null;
  quote: string;
  confidence: YearOpenedConfidence;
}): YearOpenedDecision {
  const quote = input.quote.trim();
  if (quote.length < 12) {
    return { ok: false, reason: 'missing_quote' };
  }
  switch (input.confidence) {
    case 'low':
      return { ok: false, reason: 'low_confidence' };
    case 'high':
    case 'medium':
      break;
    default: {
      const _exhaustive: never = input.confidence;
      return { ok: false, reason: String(_exhaustive) };
    }
  }
  if (!quoteInMarkdown(quote, input.markdown)) {
    return { ok: false, reason: 'quote_not_on_page' };
  }

  const tokens = distinctiveNameTokens(input.propertyName);
  const quoteLower = quote.toLowerCase();
  if (tokens.length === 0 || !tokens.some((token) => quoteLower.includes(token))) {
    return { ok: false, reason: 'quote_does_not_name_property' };
  }

  if (FOUNDING_LANGUAGE.test(quote) && !OPENING_LANGUAGE.test(quote)) {
    return { ok: false, reason: 'predecessor_founding_not_opening' };
  }
  if (CAMPGROUND_OPENING.test(quote) && !GLAMPING_PRODUCT.test(quote)) {
    return { ok: false, reason: 'campground_opening_not_glamping' };
  }

  const yearFromDate =
    input.openedOn != null && isValidIsoDate(input.openedOn)
      ? Number(input.openedOn.slice(0, 4))
      : null;
  const year = input.year ?? yearFromDate;
  if (year == null || !Number.isInteger(year)) {
    return { ok: false, reason: 'missing_year' };
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return { ok: false, reason: 'year_out_of_range' };
  }
  if (!quote.includes(String(year))) {
    return { ok: false, reason: 'quote_missing_year' };
  }

  let openedOn: string | null = null;
  if (input.openedOn != null && input.openedOn.trim() !== '') {
    const candidate = input.openedOn.trim();
    if (!isValidIsoDate(candidate) || Number(candidate.slice(0, 4)) !== year) {
      return { ok: false, reason: 'date_does_not_match_year' };
    }
    if (quoteHasFullDate(quote, candidate)) {
      openedOn = candidate;
    }
  }

  return { ok: true, finding: { year, openedOn, quote } };
}
