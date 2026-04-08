/**
 * AI-assisted extraction for missing DOCX fields.
 * Uses OpenAI to fill in resort_name, address, city, state, zip_code, client_name, client_entity
 * when heuristic extraction returns null.
 */

import { OpenAI } from 'openai';
import { isGarbageReportCity } from '@/lib/report-location-quality';
import type { ParsedDocxReport } from './feasibility-docx-parser';
import type { RawDocxContent } from './feasibility-docx-parser';

/** Phrases that are not valid resort/property names (metadata/header/amenity text) */
const RESORT_NAME_BLACKLIST = /^(located\s+(?:at|in|near)|the\s+(?:subject|property|project|site)|subject\s+property|feasibility\s+study|glamping\s+feasibility|rv\s+resort\s+feasibility|campground\s+feasibility|a\s+vending\s+area|a\s+community\s+fire\s+pit|a\s+walking\s+trail|a\s+natural\s+swimming\s+pool|a\s+communal\s+(?:sauna|grill)|an\s+event\s+space|a\s+pavilion|giant\s+yard\s+games|ev\s+charging\s+stations?)$/i;
const AMENITY_PHRASE_PATTERN = /^(a|an)\s+[\w\s]+(?:area|space|trail|pool|sauna|grill|pit|pavilion|station|games?)$/i;

const AMBIGUOUS_FIELDS = [
  'resort_name',
  'address',
  'city',
  'state',
  'zip_code',
  'client_name',
  'client_entity',
  'report_date',
  'total_units',
] as const;

type AmbiguousField = (typeof AMBIGUOUS_FIELDS)[number];

const MAX_CONTEXT_CHARS = 8000;

function getMissingFields(parsed: ParsedDocxReport): AmbiguousField[] {
  return AMBIGUOUS_FIELDS.filter((f) => {
    const v = parsed[f];
    return v == null || (typeof v === 'string' && v.trim() === '');
  });
}

function buildDocumentContext(raw: RawDocxContent): string {
  const parts: string[] = [];

  // Add key sections first (Executive Summary, Project Overview)
  const execSummary = raw.sections.find((s) =>
    /executive\s+summary/i.test(s.heading)
  );
  const projectOverview = raw.sections.find((s) =>
    /(project|property)\s+overview/i.test(s.heading)
  );

  if (execSummary?.content) {
    parts.push('--- Executive Summary ---\n' + execSummary.content);
  }
  if (projectOverview?.content) {
    parts.push('--- Project/Property Overview ---\n' + projectOverview.content);
  }

  // Add beginning of document (cover page, letter of transmittal)
  const remaining = MAX_CONTEXT_CHARS - parts.join('\n').length;
  if (remaining > 500) {
    const excerpt = raw.fullText.slice(0, remaining);
    parts.push('--- Document excerpt ---\n' + excerpt);
  }

  return parts.join('\n\n').slice(0, MAX_CONTEXT_CHARS);
}

function isLLMEnabled(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  const toggle = process.env.DOCX_LLM_EXTRACTION_ENABLED;
  if (!apiKey?.trim()) return false;
  if (toggle === 'false' || toggle === '0') return false;
  return true;
}

export interface FillMissingFieldsOptions {
  /** Override env check; if false, skips LLM even when API key is set */
  enabled?: boolean;
}

/**
 * Use OpenAI to fill missing ambiguous fields in a parsed DOCX report.
 * Only fills fields that are null/empty. On error, returns original parsed unchanged.
 */
export async function fillMissingFieldsWithLLM(
  parsed: ParsedDocxReport,
  raw: RawDocxContent,
  options?: FillMissingFieldsOptions
): Promise<ParsedDocxReport> {
  const enabled =
    options?.enabled !== false && isLLMEnabled();
  if (!enabled) return parsed;

  const missing = getMissingFields(parsed);
  if (missing.length === 0) return parsed;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const context = buildDocumentContext(raw);

    const prompt = `You are extracting structured data from a feasibility study document for an outdoor hospitality property (glamping, RV park, campground).

The following fields could not be extracted by rule-based parsing. Extract them from the document if present.

Missing fields to extract: ${missing.join(', ')}

Document excerpt:
<document>
${context}
</document>

Return a JSON object with ONLY these keys: ${missing.join(', ')}. Use null for any field you cannot confidently extract from the document.
- resort_name: the property/resort name (e.g. "Mountain View Glamping")
- address: full street address if present
- city: city name only (never sentence fragments like "term. In particular")
- state: US state code (e.g. "TN", "CA")
- zip_code: ZIP code if present
- client_name: person name if document is prepared for a person
- client_entity: company/organization name (LLC, Inc, etc.) if prepared for an entity
- report_date: date the report was sent/completed to the client (YYYY-MM-DD format only; e.g. "2024-03-15"). Look for this on the cover letter, letter of transmittal, or around page 3 where it says "Dear..." with a date. This should be a recent date (2015 or later). Do NOT use census dates, population dates, or market data dates — those refer to census surveys, not the report date.
- total_units: the total number of units/sites for the SUBJECT property (the property being appraised), NOT comparable properties. Look in the Executive Summary, Property Details, or Project Overview. E.g. "50 luxurious tented glamping units" = 50. Must be a positive integer.

Example: {"resort_name": "Mountain View Glamping", "address": "123 Main St", "city": "Gatlinburg", "state": "TN", "zip_code": "37738", "client_name": null, "client_entity": "ABC Development LLC", "report_date": "2024-03-15", "total_units": 50}
Return ONLY valid JSON. No markdown or extra text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const rawContent = response.choices[0]?.message?.content?.trim();
    if (!rawContent) return parsed;

    let llmResult: Record<string, unknown>;
    try {
      llmResult = JSON.parse(rawContent);
    } catch {
      const m = rawContent.match(/\{[\s\S]*\}/);
      if (m) llmResult = JSON.parse(m[0]);
      else return parsed;
    }

    const result = { ...parsed };

    const TEMPLATE_DATE_BLACKLIST = new Set([
      '1990-01-01', '2000-01-01', '2000-04-01',
      '2010-01-01', '2010-04-01', '2010-12-01', '2010-12-02',
      '2020-01-01', '2020-04-01',
    ]);

    for (const field of missing) {
      const val = llmResult[field];
      if (val == null) continue;
      const strVal = typeof val === 'string' ? val.trim() : String(val).trim();
      if (strVal === '') continue;

      if (field === 'report_date') {
        const d = new Date(strVal + 'T00:00:00');
        if (isNaN(d.getTime())) continue;
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (TEMPLATE_DATE_BLACKLIST.has(iso)) continue;
        const year = d.getFullYear();
        if (year < 2015 || year > 2035) continue;
        (result as Record<string, unknown>)[field] = iso;
      } else if (field === 'total_units') {
        const n = typeof val === 'number' ? val : parseInt(strVal, 10);
        if (Number.isFinite(n) && n > 0 && n < 10000) {
          (result as Record<string, unknown>)[field] = n;
        }
      } else if (field === 'resort_name') {
        const isBlacklisted = RESORT_NAME_BLACKLIST.test(strVal) || AMENITY_PHRASE_PATTERN.test(strVal);
        if (!isBlacklisted && strVal.length >= 3 && strVal.length <= 50) {
          (result as Record<string, unknown>)[field] = strVal;
        }
      } else if (field === 'city') {
        if (!isGarbageReportCity(strVal) && strVal.length >= 2 && strVal.length <= 80) {
          (result as Record<string, unknown>)[field] = strVal;
        }
      } else {
        (result as Record<string, unknown>)[field] = strVal;
      }
    }

    if (isGarbageReportCity(result.city)) {
      result.city = null;
    }

    return result;
  } catch (err) {
    console.error('[docx-llm-extractor] LLM extraction failed:', err);
    return parsed;
  }
}
