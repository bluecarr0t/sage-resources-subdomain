import { createHash } from 'crypto';
import {
  isContactCategory,
  type ContactCategory,
  type ContactConfidence,
  type ContactExtraction,
  type ContactInsertRow,
  type GateResult,
  WEB_RESEARCH_SOURCE,
} from '@/lib/contact-research/types';
import {
  isGenericInbox,
  isJunkEmail,
  isValidEmailShape,
  normalizeEmail,
} from '@/lib/contact-research/junk-email';

export function externalIdForEmail(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex');
}

export function parseConfidence(value: unknown): ContactConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

/** Loose input before email/category/confidence gates (LLM or scraper output). */
export type RawContactExtractionInput = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  business_name?: string | null;
  category?: string | null;
  confidence?: ContactConfidence | string | null;
  evidence_snippet?: string | null;
};

export function gateExtraction(
  raw: RawContactExtractionInput,
  options?: { requirePersonEmail?: boolean }
): GateResult {
  const emailRaw = (raw.email ?? '').trim();
  if (!emailRaw || !isValidEmailShape(emailRaw)) {
    return { ok: false, reason: 'missing_or_invalid_email' };
  }
  if (isJunkEmail(emailRaw)) {
    return { ok: false, reason: 'junk_email' };
  }

  if (!isContactCategory(raw.category)) {
    return { ok: false, reason: 'missing_or_invalid_category' };
  }

  const confidence = parseConfidence(raw.confidence);
  if (confidence === 'low') {
    return { ok: false, reason: 'confidence_too_low' };
  }

  if (options?.requirePersonEmail && isGenericInbox(emailRaw)) {
    return { ok: false, reason: 'generic_inbox_only' };
  }

  const extraction: ContactExtraction = {
    first_name: emptyToNull(raw.first_name),
    last_name: emptyToNull(raw.last_name),
    email: normalizeEmail(emailRaw),
    phone: emptyToNull(raw.phone),
    business_name: emptyToNull(raw.business_name),
    category: raw.category,
    confidence,
    evidence_snippet: emptyToNull(raw.evidence_snippet),
  };

  return { ok: true, extraction };
}

export function pickPreferredExtraction(
  candidates: ContactExtraction[]
): ContactExtraction | null {
  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort((a, b) => {
    const confRank = { high: 0, medium: 1, low: 2 } as const;
    const confDiff = confRank[a.confidence] - confRank[b.confidence];
    if (confDiff !== 0) return confDiff;
    const aGeneric = isGenericInbox(a.email) ? 1 : 0;
    const bGeneric = isGenericInbox(b.email) ? 1 : 0;
    return aGeneric - bGeneric;
  });

  return ranked[0] ?? null;
}

export function toContactInsertRow(
  extraction: ContactExtraction,
  evidenceUrl: string,
  researchNotes: string
): ContactInsertRow {
  return {
    external_id: externalIdForEmail(extraction.email),
    first_name: extraction.first_name,
    last_name: extraction.last_name,
    phone: extraction.phone,
    email: extraction.email,
    business_name: extraction.business_name,
    tags: `web_research,${extraction.category}`,
    source: WEB_RESEARCH_SOURCE,
    category: extraction.category,
    evidence_url: evidenceUrl,
    research_notes: researchNotes.slice(0, 1000),
  };
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

export function normalizeCompanyKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

export function assertWebResearchCategory(category: ContactCategory | null | undefined): void {
  if (!isContactCategory(category)) {
    throw new Error('Web Research contacts require a valid category');
  }
}
