/**
 * OpenAI-assisted report title normalization.
 * Produces uniform, readable titles like "Property Name - Job Number" or "Job Number".
 */

import { OpenAI } from 'openai';

/** Phrases that indicate mis-extracted text (descriptions, not property names) */
const GARBAGE_PATTERNS = [
  /^(with|the|a|an)\s/i,
  /\bthe proposed\b/i,
  /^(located|situated|featuring)\s/i,
  /^(a|an)\s+[\w\s]+(?:area|space|trail|pool|sauna|grill|pit|pavilion|station|games?)$/i,
  /vending area|community fire pit|walking trail|natural swimming/i,
];

function isGarbageText(text: string): boolean {
  if (!text || text.length > 60) return true;
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  return GARBAGE_PATTERNS.some((p) => p.test(trimmed));
}

function isLLMEnabled(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  const toggle = process.env.REPORT_TITLE_LLM_ENABLED;
  if (!apiKey?.trim()) return false;
  if (toggle === 'false' || toggle === '0') return false;
  return true;
}

export interface NormalizeReportTitleInput {
  /** Full document title from DOCX first page (e.g. "Sojourner Glamping Resort Feasibility Study Update") - preferred when valid */
  documentTitle?: string | null;
  /** Raw title from extraction (e.g. "with nearby access to various types of ou - 25-138B-03") */
  rawTitle?: string | null;
  /** Property/resort name from extraction */
  propertyName?: string | null;
  /** Resort name from DOCX parser (alias for propertyName) */
  resortName?: string | null;
  /** Job number (e.g. "25-102A-01") */
  studyId: string;
}

export interface NormalizeReportTitleResult {
  /** Clean display title: "Property Name - Job Number" or "Job Number" */
  title: string;
  /** Clean property name for display, or studyId if none */
  propertyName: string;
}

/**
 * Heuristic fallback when OpenAI is unavailable.
 */
function heuristicNormalize(input: NormalizeReportTitleInput): NormalizeReportTitleResult {
  const studyId = input.studyId || '';

  // Prefer full document title from first page when valid (e.g. "Sojourner Glamping Resort Feasibility Study Update")
  const docTitle = input.documentTitle?.trim();
  if (docTitle && !isGarbageText(docTitle) && docTitle.length <= 100) {
    const propertyName = input.propertyName?.trim() || input.resortName?.trim() || docTitle.split(/\s+Feasibility\s+Study/i)[0]?.trim() || docTitle;
    return {
      title: studyId ? `${docTitle} - ${studyId}` : docTitle,
      propertyName: propertyName || studyId || 'Untitled',
    };
  }

  const name =
    input.propertyName?.trim() ||
    input.resortName?.trim() ||
    input.rawTitle?.replace(new RegExp(`\\s*-?\\s*${studyId}\\s*$`, 'i'), '').trim() ||
    '';

  if (!name || isGarbageText(name)) {
    return { title: studyId || 'Untitled', propertyName: studyId || 'Untitled' };
  }

  const cleanName = name.trim();
  return {
    title: studyId ? `${cleanName} - ${studyId}` : cleanName,
    propertyName: cleanName,
  };
}

/**
 * Normalize report title and property name using OpenAI for consistent, readable output.
 * Falls back to heuristics when OpenAI is unavailable.
 */
export async function normalizeReportTitle(
  input: NormalizeReportTitleInput,
  options?: { useLLM?: boolean }
): Promise<NormalizeReportTitleResult> {
  const useLLM = options?.useLLM !== false && isLLMEnabled();
  const studyId = input.studyId || '';

  // Prefer document title from first page when valid - skip LLM for clean titles
  const docTitle = input.documentTitle?.trim();
  if (docTitle && !isGarbageText(docTitle) && docTitle.length <= 100) {
    return heuristicNormalize(input);
  }

  if (!useLLM) {
    return heuristicNormalize(input);
  }

  const rawName =
    input.propertyName?.trim() ||
    input.resortName?.trim() ||
    input.rawTitle?.replace(new RegExp(`\\s*-?\\s*${studyId}\\s*$`, 'i'), '').trim() ||
    '';

  if (!rawName) {
    return { title: studyId || 'Untitled', propertyName: studyId || 'Untitled' };
  }

  if (!isGarbageText(rawName) && rawName.length <= 50) {
    return heuristicNormalize(input);
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const prompt = `You are normalizing a feasibility study report title for an outdoor hospitality property (glamping, RV park, campground).

The following text was extracted from a document but may be garbage (truncated descriptions, amenity phrases, or random sentence fragments):

Raw text: "${rawName}"
Job Number: ${studyId}

Examples of BAD extractions (reject these):
- "with nearby access to various types of ou" (truncated sentence)
- "are its remote location" (sentence fragment)
- "with access to ATV trails. The proposed o" (truncated)
- "vending area" (amenity, not property name)
- "term. In particular, CO" (truncated)

Examples of GOOD property names:
- "Sojourner Glamping Resort"
- "The Drift KOA Resort"
- "CC RV Park"
- "Glamping Feasibility Study Thin Spaces LLC"

Return a JSON object with ONLY these keys:
- property_name: The actual property/resort name if you can extract it from the raw text. Use title case. Keep it short (2-6 words). Use null if the raw text is clearly garbage (truncated, amenity, or not a property name).
- is_valid: true if you extracted a real property name, false if the raw text is garbage.

Return ONLY valid JSON. No markdown or extra text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 150,
    });

    const rawContent = response.choices[0]?.message?.content?.trim();
    if (!rawContent) return heuristicNormalize(input);

    let parsed: { property_name?: string | null; is_valid?: boolean };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const m = rawContent.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else return heuristicNormalize(input);
    }

    const extractedName =
      parsed.property_name && typeof parsed.property_name === 'string'
        ? parsed.property_name.trim()
        : null;

    if (parsed.is_valid === false || !extractedName || extractedName.length < 2) {
      return { title: studyId || 'Untitled', propertyName: studyId || 'Untitled' };
    }

    const cleanName = extractedName.length > 50 ? extractedName.slice(0, 47) + '...' : extractedName;
    return {
      title: studyId ? `${cleanName} - ${studyId}` : cleanName,
      propertyName: cleanName,
    };
  } catch (err) {
    console.warn('[normalize-report-title] LLM failed, using heuristic:', err);
    return heuristicNormalize(input);
  }
}
