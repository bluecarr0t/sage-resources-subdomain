import OpenAI from 'openai';
import type { SaunaCohortRow, SaunaPropertyExtraction } from '@/lib/glamping-sauna-research/types';
import { normalizeYesNo } from '@/lib/glamping-sauna-research/normalize';

const SYSTEM_PROMPT = `You extract sauna facts for a glamping property database from scraped website text.

Rules:
- property_sauna = Yes only for shared/communal on-property sauna, bathhouse sauna, or wellness area sauna (not inside a specific unit unless clearly property-wide).
- unit_sauna = Yes only for a PRIVATE sauna for that specific accommodation (in-unit, on private deck, or dedicated to that site).
- If only a shared property sauna exists, set property_sauna = Yes and unit_sauna = No for units unless that unit type explicitly includes a private sauna.
- Do NOT confuse steam room, infrared "wellness" without sauna wording, or hot tub/spa with sauna unless explicitly called a sauna.
- Do NOT guess. If unclear, use null for that field.
- "Sauna access" without private in-unit clarity → unit_sauna = No with evidence explaining shared vs unknown.
- Use evidence quotes or short paraphrase from the provided text.
- confidence: high = explicit on page; medium = strongly implied; low = weak/ambiguous.

Return JSON only matching the schema.`;

function buildUnitInventory(rows: SaunaCohortRow[]): string {
  return rows
    .map(
      (r) =>
        `- id=${r.id}; site_name=${JSON.stringify(r.site_name ?? '')}; unit_type=${JSON.stringify(r.unit_type ?? '')}; current unit_sauna=${r.unit_sauna ?? 'null'}; property_sauna=${r.property_sauna ?? 'null'}`
    )
    .join('\n');
}

function parseExtraction(raw: string): SaunaPropertyExtraction | null {
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
      unit_sauna: normalizeYesNo(item.unit_sauna),
      evidence: String(item.evidence ?? '').slice(0, 500),
      confidence:
        uc === 'high' || uc === 'medium' || uc === 'low' ? uc : 'low',
    };
  });

  return {
    property_sauna: normalizeYesNo(parsed.property_sauna),
    property_sauna_notes: String(parsed.property_sauna_notes ?? '').slice(0, 500),
    units,
    sources: Array.isArray(parsed.sources)
      ? (parsed.sources as unknown[]).map((s) => String(s)).slice(0, 5)
      : [],
    confidence,
  };
}

export async function extractSaunaFromMarkdown(
  openai: OpenAI,
  rows: SaunaCohortRow[],
  markdown: string,
  scrapeSources: string[]
): Promise<SaunaPropertyExtraction | null> {
  const sample = rows[0];
  const propertyName = sample?.property_name ?? 'Unknown';

  const userPrompt = `Property: ${propertyName}
Inventory rows to match (use site_name first, then unit_type):
${buildUnitInventory(rows)}

Scraped pages (${scrapeSources.join(', ')}):

${markdown.slice(0, 40_000)}

Return JSON:
{
  "property_sauna": "Yes" | "No" | null,
  "property_sauna_notes": string,
  "units": [
    {
      "match": { "site_name": string | null, "unit_type": string | null },
      "unit_sauna": "Yes" | "No" | null,
      "evidence": string,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "sources": string[],
  "confidence": "high" | "medium" | "low"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.SAUNA_RESEARCH_MODEL?.trim() || process.env.HOT_TUB_RESEARCH_MODEL?.trim() || 'gpt-4o',
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
