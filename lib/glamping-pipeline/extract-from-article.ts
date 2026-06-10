import type { OpenAI } from 'openai';
import type { GlampingIsOpenValue } from '@/lib/glamping-is-open';
import {
  normalizeGlampingIsOpenLabel,
  isPipelineTrackedIsOpen,
} from './normalize-is-open';
import type { PipelineSegment } from './constants';
import {
  PIPELINE_MIN_RV_SITES,
  PIPELINE_RV_PROPERTY_TYPES,
} from './constants';
import type {
  PipelineArticleExtraction,
  PipelineExtractedProperty,
  PipelineStatusUpdate,
} from './types';

const GLAMPING_EXTRACTION_PROMPT = `Extract USA glamping pipeline intelligence from the article below.

Focus on:
1) NEW properties that are **Proposed Development** or **Under Construction** (not yet open for guest bookings).
2) STATUS UPDATES for properties already mentioned — only when the article clearly states a stage change or current pre-opening stage.

Inclusion rules for new_properties:
- United States only (country USA / United States).
- At least 4 glamping units (domes, tents, cabins, yurts, etc.) — not RV-primary parks.
- Glamping-first resorts; not conventional hotels or tent-only campgrounds.
- is_open must be exactly "Proposed Development" or "Under Construction".

For status_updates:
- Match property_name to how the article names the resort.
- is_open must be one of:
  - "Proposed Development", "Under Construction", "Yes" (if clearly opened)
  - "Cancelled" when the project was abandoned, denied, shelved, or will not proceed (never opened).
- Use "Cancelled" (not "Closed") for pipeline projects that fell through before guest bookings.
- confidence: "high" only when explicit (e.g. "now open", "broke ground", "planning denied", "project cancelled", "developer pulled out").
- Use "medium" or "low" when ambiguous — prefer low over guessing.

Return ONLY valid JSON:
{
  "new_properties": [
    {
      "property_name": "Required",
      "city": "optional",
      "state": "2-letter US state",
      "country": "United States",
      "address": "optional",
      "url": "optional official site",
      "description": "brief",
      "unit_type": "singular Title Case e.g. Dome",
      "number_of_units": 10,
      "is_open": "Proposed Development" | "Under Construction"
    }
  ],
  "status_updates": [
    {
      "property_name": "Name as in article",
      "is_open": "Proposed Development" | "Under Construction" | "Yes" | "Cancelled",
      "confidence": "high" | "medium" | "low",
      "evidence": "short quote or paraphrase"
    }
  ]
}

Article:
`;

const RV_EXTRACTION_PROMPT = `Extract USA RV park / RV resort / RV-primary campground pipeline intelligence from the article below.

Focus on:
1) NEW **RV Park**, **RV Resort**, or **Campground** (RV-primary, not tent-only) properties that are **Proposed Development** or **Under Construction**.
2) STATUS UPDATES for RV parks, resorts, or campgrounds mentioned — stage changes or current pre-opening stage.

Inclusion rules for new_properties:
- United States only.
- RV-primary parks, resorts, or campgrounds (not tent-only campgrounds, not glamping-only, not storage yards).
- At least ${PIPELINE_MIN_RV_SITES} RV sites (or total sites if clearly an RV park/campground).
- property_type must be "RV Park", "RV Resort", or "Campground" (use Campground when the article describes a campground with substantial RV sites).
- is_open must be exactly "Proposed Development" or "Under Construction".

For status_updates:
- Match property_name to how the article names the park/resort/campground.
- is_open: "Proposed Development", "Under Construction", "Yes", or "Cancelled" (project fell through).
- confidence: "high" only when explicit.

Return ONLY valid JSON:
{
  "new_properties": [
    {
      "property_name": "Required",
      "property_type": "RV Park" | "RV Resort" | "Campground",
      "city": "optional",
      "state": "2-letter US state",
      "country": "United States",
      "url": "optional",
      "description": "brief",
      "unit_type": "RV Site",
      "number_of_units": 50,
      "is_open": "Proposed Development" | "Under Construction"
    }
  ],
  "status_updates": [
    {
      "property_name": "Name as in article",
      "is_open": "Proposed Development" | "Under Construction" | "Yes" | "Cancelled",
      "confidence": "high" | "medium" | "low",
      "evidence": "short quote"
    }
  ]
}

Article:
`;

function coerceUnits(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return Math.round(val);
  const parsed = parseInt(String(val ?? '').trim(), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseNewProperty(
  raw: Record<string, unknown>,
  segment: PipelineSegment
): PipelineExtractedProperty | null {
  const name = String(raw.property_name ?? '').trim();
  if (!name) return null;

  const country = String(raw.country ?? 'United States').trim();
  if (!/united states|usa|u\.s\./i.test(country)) return null;

  const isOpen = normalizeGlampingIsOpenLabel(String(raw.is_open ?? ''));
  if (!isOpen || !isPipelineTrackedIsOpen(isOpen)) return null;

  const units = coerceUnits(raw.number_of_units);
  const minUnits = segment === 'rv' ? PIPELINE_MIN_RV_SITES : 4;
  if (units != null && units < minUnits) return null;

  let propertyType =
    raw.property_type != null ? String(raw.property_type).trim() : undefined;
  if (segment === 'rv') {
    if (
      !propertyType ||
      !(PIPELINE_RV_PROPERTY_TYPES as readonly string[]).includes(propertyType)
    ) {
      if (/\bcampground\b/i.test(name) && !/\bresort\b/i.test(name)) {
        propertyType = 'Campground';
      } else {
        propertyType = /\bresort\b/i.test(name) ? 'RV Resort' : 'RV Park';
      }
    }
  }

  return {
    property_name: name,
    city: raw.city != null ? String(raw.city) : undefined,
    state: raw.state != null ? String(raw.state) : undefined,
    country: 'United States',
    address: raw.address != null ? String(raw.address) : undefined,
    url: raw.url != null ? String(raw.url) : undefined,
    description: raw.description != null ? String(raw.description) : undefined,
    unit_type:
      raw.unit_type != null
        ? String(raw.unit_type)
        : segment === 'rv'
          ? 'RV Site'
          : undefined,
    property_type: propertyType,
    number_of_units: units,
    is_open: isOpen,
  };
}

function parseStatusUpdate(raw: Record<string, unknown>): PipelineStatusUpdate | null {
  const name = String(raw.property_name ?? '').trim();
  if (!name) return null;

  const isOpen = normalizeGlampingIsOpenLabel(String(raw.is_open ?? ''));
  if (!isOpen) return null;

  const confidenceRaw = String(raw.confidence ?? 'low').toLowerCase();
  const confidence =
    confidenceRaw === 'high' || confidenceRaw === 'medium' || confidenceRaw === 'low'
      ? confidenceRaw
      : 'low';

  return {
    property_name: name,
    is_open: isOpen as GlampingIsOpenValue,
    confidence,
    evidence: raw.evidence != null ? String(raw.evidence) : null,
  };
}

export async function extractPipelineFromArticle(
  articleText: string,
  openai: OpenAI,
  segment: PipelineSegment = 'glamping'
): Promise<PipelineArticleExtraction> {
  const basePrompt = segment === 'rv' ? RV_EXTRACTION_PROMPT : GLAMPING_EXTRACTION_PROMPT;
  const prompt = basePrompt + articleText.substring(0, 50_000);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    return { new_properties: [], status_updates: [] };
  }

  try {
    const parsed = JSON.parse(content) as {
      new_properties?: unknown[];
      status_updates?: unknown[];
    };

    const new_properties: PipelineExtractedProperty[] = [];
    for (const item of parsed.new_properties ?? []) {
      if (item && typeof item === 'object') {
        const row = parseNewProperty(item as Record<string, unknown>, segment);
        if (row) new_properties.push(row);
      }
    }

    const status_updates: PipelineStatusUpdate[] = [];
    for (const item of parsed.status_updates ?? []) {
      if (item && typeof item === 'object') {
        const row = parseStatusUpdate(item as Record<string, unknown>);
        if (row) status_updates.push(row);
      }
    }

    return { new_properties, status_updates };
  } catch {
    return { new_properties: [], status_updates: [] };
  }
}
