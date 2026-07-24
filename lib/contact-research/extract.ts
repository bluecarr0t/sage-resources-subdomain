import type OpenAI from 'openai';
import {
  CONTACT_CATEGORIES,
  type ContactCategory,
  type ContactExtraction,
  type ContactSeedCandidate,
} from '@/lib/contact-research/types';
import { gateExtraction, parseConfidence, pickPreferredExtraction } from '@/lib/contact-research/validate';
import { emptyToNull } from '@/lib/contact-research/validate';

const SYSTEM_PROMPT = `You extract publicly listed business contact emails for Sage Outdoor Advisory CRM research.

Sage sells feasibility, appraisal, and market intelligence to outdoor hospitality:
- glamping property owners/operators
- outdoor hospitality investors (PE, family offices)
- outdoor hospitality developers
- unit manufacturers (tents, cabins, domes, etc.)
- outdoor hospitality lenders

Rules:
- ONLY return emails that appear explicitly in the provided page text. Never invent or guess emails.
- Prefer a named person's email over generic inboxes (info@, hello@, reservations@) when both exist.
- category MUST be one of: ${CONTACT_CATEGORIES.join(', ')}.
- confidence: high = email clearly on page; medium = email present but role/category inferred; low = uncertain.
- If no email appears in the text, return {"contacts":[]}.
- Return JSON only.`;

type RawContact = Record<string, unknown>;

function parseOne(raw: RawContact, fallbackCategory: ContactCategory): ContactExtraction | null {
  const gated = gateExtraction({
    first_name: emptyToNull(raw.first_name != null ? String(raw.first_name) : null),
    last_name: emptyToNull(raw.last_name != null ? String(raw.last_name) : null),
    email: raw.email != null ? String(raw.email) : null,
    phone: emptyToNull(raw.phone != null ? String(raw.phone) : null),
    business_name: emptyToNull(raw.business_name != null ? String(raw.business_name) : null),
    category: (raw.category as string) || fallbackCategory,
    confidence: parseConfidence(raw.confidence),
    evidence_snippet: emptyToNull(
      raw.evidence_snippet != null ? String(raw.evidence_snippet) : null
    ),
  });

  return gated.ok ? gated.extraction : null;
}

/**
 * Extract contact emails + ICP category from scraped page markdown.
 * Returns null when no gated contact passes email+category+confidence rules.
 */
export async function extractContactsFromMarkdown(
  openai: OpenAI,
  candidate: ContactSeedCandidate,
  markdown: string,
  evidenceUrl: string
): Promise<ContactExtraction | null> {
  const truncated = markdown.slice(0, 40_000);
  if (truncated.trim().length < 40) return null;

  const userPrompt = `Company / target: ${candidate.company_name}
Suggested category: ${candidate.suggested_category}
Seed source: ${candidate.seed_source}
Page URL: ${evidenceUrl}
Seed notes: ${candidate.notes ?? ''}

Page text:
${truncated}

Return JSON:
{
  "contacts": [
    {
      "first_name": string | null,
      "last_name": string | null,
      "email": string,
      "phone": string | null,
      "business_name": string | null,
      "category": ${CONTACT_CATEGORIES.map((c) => `"${c}"`).join(' | ')},
      "confidence": "high" | "medium" | "low",
      "evidence_snippet": string
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: process.env.CONTACT_RESEARCH_MODEL?.trim() || 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content ?? '';
  let parsed: { contacts?: RawContact[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  const list = Array.isArray(parsed.contacts) ? parsed.contacts : [];
  const gated = list
    .map((c) => parseOne(c, candidate.suggested_category))
    .filter((c): c is ContactExtraction => c != null);

  return pickPreferredExtraction(gated);
}
