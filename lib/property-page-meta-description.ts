import {
  formatPropertyPageTitleCityState,
  propertyPageTitlePropertyType,
} from '@/lib/property-page-title';
import { formatUnitTypesDisplay } from '@/lib/property-unit-types';

/**
 * Meta description budget. Google often truncates near ~155–160 in SERPs but may show
 * more; we pack structured facts + an excerpt up to this limit before trimming.
 */
export const PROPERTY_PAGE_META_DESCRIPTION_MAX_LENGTH = 300;

export type PropertyPageMetaDescriptionInput = {
  propertyName: string;
  propertyType?: string | null;
  unitTypes?: string[];
  city?: string | null;
  state?: string | null;
  country?: string | null;
  description?: string | null;
  rateAvgRetailDailyRate?: string | number | null;
};

/** Strip admin/source tails and normalize public `description` for meta tags. */
export function sanitizePropertyDescriptionForMeta(
  raw: string | null | undefined
): string {
  if (!raw?.trim()) return '';

  let text = raw.trim();
  const sourcesMatch = text.match(/\bSources:\s*/i);
  if (sourcesMatch?.index != null && sourcesMatch.index > 0) {
    text = text.slice(0, sourcesMatch.index).trim();
  }

  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/** First sentence(s) of description, capped for meta copy. */
export function extractPropertyDescriptionExcerpt(
  raw: string | null | undefined,
  maxChars: number
): string {
  const sanitized = sanitizePropertyDescriptionForMeta(raw);
  if (!sanitized || sanitized.length < 24) return '';

  const sentences = sanitized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [sanitized];
  let excerpt = '';

  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    const candidate = excerpt ? `${excerpt} ${piece}` : piece;
    if (candidate.length > maxChars) break;
    excerpt = candidate;
    if (excerpt.length >= maxChars * 0.65) break;
  }

  if (!excerpt) {
    excerpt = sanitized.length <= maxChars ? sanitized : `${sanitized.slice(0, maxChars - 3).trimEnd()}...`;
  }

  return excerpt.trim();
}

export function formatRateForMetaDescription(
  rate: string | number | null | undefined
): string | null {
  if (rate == null || rate === '') return null;
  const n =
    typeof rate === 'number' ? rate : Number(String(rate).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.round(n);
  return `From $${rounded}/night.`;
}

function truncateMetaDescription(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);

  const slice = text.slice(0, maxLength - 3);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.trimEnd()}...`;
}

/**
 * Meta description: property name, type, all unit types, city/state, description excerpt, optional rate.
 */
export function buildPropertyPageMetaDescription(
  input: PropertyPageMetaDescriptionInput,
  maxLength: number = PROPERTY_PAGE_META_DESCRIPTION_MAX_LENGTH
): string {
  const name = input.propertyName.trim() || 'Property';
  const propertyType = propertyPageTitlePropertyType(input.propertyType);
  const cityState = formatPropertyPageTitleCityState({
    city: input.city,
    state: input.state,
    country: input.country,
  });
  const unitTypesLabel = formatUnitTypesDisplay(input.unitTypes ?? []);
  const rateLabel = formatRateForMetaDescription(input.rateAvgRetailDailyRate);

  let lead: string;
  if (propertyType && cityState) {
    lead = `${name} — ${propertyType} in ${cityState}.`;
  } else if (propertyType) {
    lead = `${name} — ${propertyType}.`;
  } else if (cityState) {
    lead = `${name} in ${cityState}.`;
  } else {
    lead = `${name}.`;
  }

  const segments: string[] = [lead];

  if (unitTypesLabel) {
    segments.push(`Units: ${unitTypesLabel}.`);
  }

  const excerpt = extractPropertyDescriptionExcerpt(input.description, 120);
  const excerptSegment = excerpt
    ? excerpt.endsWith('.')
      ? excerpt
      : `${excerpt}.`
    : null;
  if (excerptSegment) {
    segments.push(excerptSegment);
  }

  if (rateLabel) {
    segments.push(rateLabel);
  }

  const full = segments.join(' ').replace(/\s+/g, ' ').trim();

  if (full.length <= maxLength) return full;

  const withoutRate = rateLabel
    ? segments.filter((segment) => segment !== rateLabel).join(' ').replace(/\s+/g, ' ').trim()
    : full;
  if (withoutRate.length <= maxLength) return withoutRate;

  const withoutExcerpt = segments
    .filter((segment) => segment !== excerptSegment && segment !== rateLabel)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutExcerpt.length <= maxLength) return withoutExcerpt;

  const leadAndUnits = [lead, unitTypesLabel ? `Units: ${unitTypesLabel}.` : null]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (leadAndUnits.length <= maxLength) return leadAndUnits;

  return truncateMetaDescription(lead, maxLength);
}
