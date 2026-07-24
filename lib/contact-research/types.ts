/** ICP categories for web-researched outdoor hospitality contacts. */
export const CONTACT_CATEGORIES = [
  'glamping_property_owner',
  'outdoor_hospitality_investor',
  'outdoor_hospitality_developer',
  'unit_manufacturer',
  'outdoor_hospitality_lender',
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const WEB_RESEARCH_SOURCE = 'Web Research' as const;

export type ContactConfidence = 'high' | 'medium' | 'low';

export type SeedMode = 'inventory' | 'web' | 'all';

export type ContactSeedCandidate = {
  company_name: string;
  official_url: string | null;
  suggested_category: ContactCategory;
  seed_source: 'inventory' | 'pipeline' | 'web';
  seed_key: string;
  notes?: string;
};

export type ContactExtraction = {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  business_name: string | null;
  category: ContactCategory;
  confidence: ContactConfidence;
  evidence_snippet: string | null;
};

export type ContactInsertRow = {
  external_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string;
  business_name: string | null;
  tags: string;
  source: typeof WEB_RESEARCH_SOURCE;
  category: ContactCategory;
  evidence_url: string;
  research_notes: string;
};

export type GateResult =
  | { ok: true; extraction: ContactExtraction }
  | { ok: false; reason: string };

export function isContactCategory(value: unknown): value is ContactCategory {
  return (
    typeof value === 'string' &&
    (CONTACT_CATEGORIES as readonly string[]).includes(value)
  );
}
