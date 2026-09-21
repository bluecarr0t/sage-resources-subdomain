import OpenAI from 'openai';
import {
  acceptUnitTypeFinding,
  type ProposedUnit,
  type UnitTypeDecision,
} from '@/lib/glamping-unit-type-research/accept';
import { STRUCTURAL_TENT_TYPES_LLM_DISTINCTION } from '@/lib/glamping-structural-tent-types';

const SYSTEM_PROMPT = `You list the glamping accommodations a property actually rents, from scraped website text.

Rules:
- Each product needs a unit_type that is one canonical label: Cabin, Yurt, Dome, Safari Tent, Bell Tent, Cabin Tent, Canvas Cabin, Tipi, Airstream, Tiny Home, Lodge, Cottage, Chalet, Pod, Treehouse, Covered Wagon, or another single product label already used that way on the page.
- ${STRUCTURAL_TENT_TYPES_LLM_DISTINCTION}
- Tent pads, RV sites, and standard campground sites are not glamping products. Omit them.
- Quote must be a contiguous sentence copied from the page. It must include the property name (or a distinctive part of it) and the product word.
- quantity is an integer only when that number is in the quote. Otherwise null.
- Do not guess. If the page does not name a glamping product, return an empty products array.
- A park or resort name is not a unit type.

Return JSON only.`;

function parseProducts(raw: string): ProposedUnit[] | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const list = Array.isArray(parsed.products) ? parsed.products : [];
  return list.map((item) => {
    const product = item as Record<string, unknown>;
    const quantity = Number(product.quantity);
    return {
      unitType: String(product.unit_type ?? ''),
      siteName: product.site_name == null ? null : String(product.site_name),
      quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : null,
      quote: String(product.quote ?? ''),
    };
  });
}

export async function extractUnitTypes(input: {
  openai: OpenAI;
  propertyName: string;
  city: string | null;
  state: string | null;
  markdown: string;
}): Promise<UnitTypeDecision> {
  const response = await input.openai.chat.completions.create({
    model: process.env.UNIT_TYPE_RESEARCH_MODEL?.trim() || 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    max_tokens: 1200,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Property: ${input.propertyName}
City: ${input.city ?? ''}
State: ${input.state ?? ''}

Scraped text:
${input.markdown.slice(0, 40_000)}

Return JSON:
{
  "products": [
    {
      "unit_type": string,
      "site_name": string | null,
      "quantity": number | null,
      "quote": string
    }
  ]
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) return { ok: false, reason: 'empty_model_response' };
  const products = parseProducts(content);
  if (!products) return { ok: false, reason: 'unparseable_model_response' };
  if (products.length === 0) return { ok: false, reason: 'no_glamping_product_on_page' };

  return acceptUnitTypeFinding({
    propertyName: input.propertyName,
    markdown: input.markdown,
    products,
  });
}
