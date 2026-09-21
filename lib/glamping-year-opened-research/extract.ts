import OpenAI from 'openai';
import {
  acceptYearOpenedFinding,
  type YearOpenedConfidence,
  type YearOpenedDecision,
} from '@/lib/glamping-year-opened-research/accept';

const SYSTEM_PROMPT = `You extract the year a glamping property first opened to guests from scraped website text.

Rules:
- The year is when THIS glamping operation first took paying guests.
- A ranch founding, a predecessor campground, a family "since 1923", or a brand launch year does not count unless the text says this glamping site opened then.
- Quote must be a contiguous sentence copied from the page, and it must include the property name (or a distinctive part of it) and the year.
- opened_on is YYYY-MM-DD only when the quote states the calendar day. If the page gives only a year or a month, opened_on is null. Never invent a day.
- If the page does not state an opening year, return year null and an empty quote.
- confidence high = the quote explicitly says opened / opening / first guests. medium = the year is stated as the glamping start without the word opened. low = ambiguous.

Return JSON only.`;

type RawExtraction = {
  year: number | null;
  openedOn: string | null;
  quote: string;
  confidence: YearOpenedConfidence;
};

function parseConfidence(value: unknown): YearOpenedConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}

function parseYear(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n)) return null;
  return n;
}

function parseExtraction(raw: string): RawExtraction | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const opened = parsed.opened_on;
  return {
    year: parseYear(parsed.year),
    openedOn: opened == null || opened === '' ? null : String(opened),
    quote: String(parsed.quote ?? ''),
    confidence: parseConfidence(parsed.confidence),
  };
}

export async function extractYearOpened(input: {
  openai: OpenAI;
  propertyName: string;
  city: string | null;
  state: string | null;
  markdown: string;
}): Promise<YearOpenedDecision> {
  const response = await input.openai.chat.completions.create({
    model: process.env.YEAR_OPENED_RESEARCH_MODEL?.trim() || 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    max_tokens: 600,
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
  "year": number | null,
  "opened_on": "YYYY-MM-DD" | null,
  "quote": string,
  "confidence": "high" | "medium" | "low"
}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) return { ok: false, reason: 'empty_model_response' };
  const parsed = parseExtraction(content);
  if (!parsed) return { ok: false, reason: 'unparseable_model_response' };

  return acceptYearOpenedFinding({
    propertyName: input.propertyName,
    markdown: input.markdown,
    year: parsed.year,
    openedOn: parsed.openedOn,
    quote: parsed.quote,
    confidence: parsed.confidence,
  });
}
