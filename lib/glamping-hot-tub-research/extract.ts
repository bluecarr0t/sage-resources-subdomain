import OpenAI from 'openai';
import type { HotTubCohortRow, HotTubPropertyExtraction } from '@/lib/glamping-hot-tub-research/types';
import { normalizeYesNo } from '@/lib/glamping-hot-tub-research/normalize';

const SYSTEM_PROMPT = `You extract hot tub and sauna facts for a glamping property database from scraped website text.

Rules:
- property_hot_tub = Yes only for shared/communal on-property hot tub, spa, or Nordic spa (not inside a specific unit unless clearly property-wide).
- unit_hot_tub = Yes only for a PRIVATE hot tub, jacuzzi, or spa tub for that specific accommodation (in-unit, on private deck, or dedicated to that site).
- If only a shared property spa exists, set property_hot_tub = Yes and unit_hot_tub = No for units unless that unit type explicitly includes a private tub.
- unit_sauna = Yes only for private in-unit or dedicated sauna for that accommodation.
- Do NOT guess. If unclear, use null for that field.
- "Hot tub access" without private in-unit clarity → unit_hot_tub = No with evidence explaining shared vs unknown.
- Use evidence quotes or short paraphrase from the provided text.
- confidence: high = explicit on page; medium = strongly implied; low = weak/ambiguous.

Return JSON only matching the schema.`;

function buildUnitInventory(rows: HotTubCohortRow[]): string {
  return rows
    .map(
      (r) =>
        `- id=${r.id}; site_name=${JSON.stringify(r.site_name ?? '')}; unit_type=${JSON.stringify(r.unit_type ?? '')}; current unit_hot_tub=${r.unit_hot_tub ?? 'null'}; property_hot_tub=${r.property_hot_tub ?? 'null'}`
    )
    .join('\n');
}

function parseExtraction(raw: string): HotTubPropertyExtraction | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    parsed = JSON.parse(m[0]);
  }

  const conf = parsed.confidence;
  const confidence =
    conf === 'high' || conf === 'medium' || conf === 'low' ? conf : 'low';

  const unitsRaw = Array.isArray(parsed.units) ? parsed.units : [];
  const units = unitsRaw.map((u) => {
    const item = u as Record<string, unknown>;
    const match = (item.match ?? {}) as Record<string, unknown>;
    const uc = item.confidence;
    return {
      match: {
        site_name: match.site_name != null ? String(match.site_name) : null,
        unit_type: match.unit_type != null ? String(match.unit_type) : null,
      },
      unit_hot_tub: normalizeYesNo(item.unit_hot_tub),
      unit_sauna: normalizeYesNo(item.unit_sauna),
      evidence: String(item.evidence ?? '').slice(0, 500),
      confidence:
        uc === 'high' || uc === 'medium' || uc === 'low' ? uc : 'low',
    };
  });

  return {
    property_hot_tub: normalizeYesNo(parsed.property_hot_tub),
    property_spa_notes: String(parsed.property_spa_notes ?? '').slice(0, 500),
    units,
    sources: Array.isArray(parsed.sources)
      ? (parsed.sources as unknown[]).map((s) => String(s)).slice(0, 5)
      : [],
    confidence,
  };
}

export async function extractHotTubFromMarkdown(
  openai: OpenAI,
  rows: HotTubCohortRow[],
  markdown: string,
  scrapeSources: string[]
): Promise<HotTubPropertyExtraction | null> {
  const sample = rows[0];
  const propertyName = sample?.property_name ?? 'Unknown';

  const userPrompt = `Property: ${propertyName}
Inventory rows to match (use site_name first, then unit_type):
${buildUnitInventory(rows)}

Scraped pages (${scrapeSources.join(', ')}):

${markdown.slice(0, 40_000)}

Return JSON:
{
  "property_hot_tub": "Yes" | "No" | null,
  "property_spa_notes": string,
  "units": [
    {
      "match": { "site_name": string | null, "unit_type": string | null },
      "unit_hot_tub": "Yes" | "No" | null,
      "unit_sauna": "Yes" | "No" | null,
      "evidence": string,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "sources": string[],
  "confidence": "high" | "medium" | "low"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.HOT_TUB_RESEARCH_MODEL?.trim() || 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) return null;
  return parseExtraction(content);
}
