import { distinctiveNameTokens } from '@/lib/glamping-year-opened-research/accept';
import {
  normalizeGlampingUnitTypeForStorage,
  listUnitTypeNormalizePhrases,
} from '@/lib/glamping-unit-type-normalize';

const CANONICAL_KEYS = new Set(listUnitTypeNormalizePhrases());

export type AcceptedUnit = {
  unitType: string;
  siteName: string;
  quantity: number | null;
  quote: string;
};

export type UnitTypeDecision =
  | { ok: true; units: AcceptedUnit[] }
  | { ok: false; reason: string };

export type ProposedUnit = {
  unitType: string;
  siteName: string | null;
  quantity: number | null;
  quote: string;
};

function collapse(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function canonicalUnitType(raw: string): string | null {
  const normalized = normalizeGlampingUnitTypeForStorage(raw);
  if (!normalized) return null;
  const key = normalized.toLowerCase();
  if (!CANONICAL_KEYS.has(key)) return null;
  return normalized;
}

function quoteNamesProperty(quote: string, propertyName: string): boolean {
  const tokens = distinctiveNameTokens(propertyName);
  const lower = quote.toLowerCase();
  return (
    tokens.length > 0 &&
    tokens.some((token) => new RegExp(`\\b${token}\\b`).test(lower))
  );
}

function quoteOnPage(quote: string, markdown: string): boolean {
  const needle = collapse(quote);
  return needle.length >= 12 && collapse(markdown).includes(needle);
}

function quoteSupportsQuantity(quote: string, quantity: number): boolean {
  return new RegExp(`\\b${quantity}\\b`).test(quote);
}

function quoteSupportsUnit(quote: string, unitType: string): boolean {
  const words = unitType.toLowerCase().split(/\s+/).filter((word) => word.length >= 4);
  const lower = quote.toLowerCase();
  if (words.length === 0) return lower.includes(unitType.toLowerCase());
  return words.some((word) => lower.includes(word));
}

export function acceptUnitTypeFinding(input: {
  propertyName: string;
  markdown: string;
  products: ProposedUnit[];
}): UnitTypeDecision {
  const accepted: AcceptedUnit[] = [];
  const seen = new Set<string>();

  for (const product of input.products) {
    const quote = product.quote.trim();
    if (!quoteOnPage(quote, input.markdown)) continue;
    if (!quoteNamesProperty(quote, input.propertyName)) continue;
    const unitType = canonicalUnitType(product.unitType);
    if (!unitType || seen.has(unitType)) continue;
    if (!quoteSupportsUnit(quote, unitType)) continue;
    seen.add(unitType);
    const quantity =
      product.quantity != null &&
      Number.isInteger(product.quantity) &&
      product.quantity > 0 &&
      quoteSupportsQuantity(quote, product.quantity)
        ? product.quantity
        : null;
    accepted.push({
      unitType,
      siteName: (product.siteName ?? '').trim() || unitType,
      quantity,
      quote,
    });
  }

  if (accepted.length === 0) {
    return { ok: false, reason: 'no_quoted_unit_type' };
  }
  return { ok: true, units: accepted };
}
