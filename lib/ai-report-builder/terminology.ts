/**
 * Terminology and style guide for AI-generated report content.
 * Ensures consistent spelling and professional language matching the
 * Sage Outdoor Advisory feasibility study templates.
 */

/** Preferred spelling for specific industry terms */
export const TERMINOLOGY_CORRECTIONS: Array<[RegExp, string]> = [
  // RV site terminology: always hyphenate "back-in", use "pull thru" (no hyphen)
  [/\bback[\s-]?in\b/gi, 'back-in'],
  [/\bpull[\s-]?thr(?:u|ough)\b/gi, 'pull thru'],

  // Full hookups
  [/\bfull[\s-]?hook[\s-]?ups?\b/gi, 'full hookups'],
  [/\bFHU\b/g, 'FHU'],

  // Glamping / resort terminology
  [/\bglamping[\s-]?site/gi, 'glamping site'],
  [/\bRV[\s-]?site/gi, 'RV site'],
  [/\boutdoor[\s-]?hospitality/gi, 'outdoor hospitality'],
  [/\boutdoor[\s-]?resort/gi, 'outdoor resort'],

  // Financial terms
  [/\bpro[\s-]?forma\b/gi, 'pro forma'],
  [/\b(?:cap|capitalization)[\s-]?rate\b/gi, 'capitalization rate'],
  [/\bNOI\b/g, 'NOI'],
  [/\bIRR\b/g, 'IRR'],
  [/\bADR\b/g, 'ADR'],
  [/\bRevPAR\b/g, 'RevPAR'],

  // Amenities
  [/\b50[\s-]?amp\b/gi, '50 amp'],
  [/\b30[\s-]?amp\b/gi, '30 amp'],

  // Appraisal standards
  [/\bUSPAP\b/g, 'USPAP'],
];

/**
 * Apply terminology corrections to AI-generated text.
 * Normalizes spelling to match the Sage feasibility study templates.
 */
export function normalizeTerminology(text: string): string {
  let result = text;
  for (const [pattern, replacement] of TERMINOLOGY_CORRECTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Style instructions appended to AI prompts to ensure generated content
 * matches the professional tone and conventions of Sage feasibility studies.
 */
export const STYLE_GUIDE_PROMPT = `
IMPORTANT STYLE AND TERMINOLOGY RULES:
- Always hyphenate "back-in" (e.g. "back-in RV sites")
- Always write "pull thru" (two words, no hyphen, not "pull-through" or "pull-thru")
- Use "full hookups" (abbreviated as "FHU")
- Use "50 amp" and "30 amp" (no hyphen)
- Use "pro forma" (two words, lowercase unless starting a sentence)
- Use "ADR" for average daily rate, "NOI" for net operating income, "IRR" for internal rate of return
- Use "outdoor hospitality" and "outdoor resort" (not "outdoor hospitality industry")
- Use formal third-person perspective throughout
- Reference "the subject" or "the subject property" when discussing the proposed development
- Use "concluded" rather than "determined" for findings (e.g. "it is concluded to be feasible")
- Use "the property" or "the subject site" rather than informal references
- Use "ownership" instead of "the owner" when referring generically
- Reference amenities with professional phrasing: "The proposed resort will feature..." not "It will have..."
- Use "positive demand indicator" for favorable market conditions
- Write numbers formally: "approximately 47 acres" not "about 47 acres" or "~47 acres"
- For feasibility conclusions, use the phrase: "the project is deemed feasible, with an adequate internal rate of return"
- For unfavorable conclusions: "further analysis is recommended" or "the project requires refinement"
`.trim();

/**
 * Market-type-specific context for the AI prompt.
 */
export function getMarketTypeContext(marketType?: string | null): string {
  const t = (marketType || '').toLowerCase();

  if (t === 'glamping') {
    return `This is a GLAMPING feasibility study. Use language appropriate for luxury glamping resorts.
Key terminology:
- "glamping sites" (not "campsites" or "slots")
- "glamping resort" or "glamping development"
- Emphasize luxury, aesthetics, privacy, views, and premium amenities
- Reference unit types like: Safari Tent, Bell Tent, Treehouse, Cabin, Yurt, A-Frame, Tiny Home, Glamping Pod
- Describe amenities in detail: heated pools, lodge buildings, fire pit areas, spa areas, event spaces
- Use phrases like "very high-end glamping resort development" and "premium rates"
- Reference "scenic natural areas" and "aesthetic property with adequate spacing, privacy, and views"`;
  }

  if (t === 'rv' || t === 'rv_glamping') {
    return `This is an RV RESORT feasibility study. Use language appropriate for luxury RV resorts.
Key terminology:
- "RV sites" (not "RV spots" or "spaces")
- "back-in" sites (hyphenated) and "pull thru" sites (two words, no hyphen)
- "full hookups (FHU)" with "50 amp" service
- "RV resort" or "luxury RV destination"
- Reference "paved, angled approaches with picnic tables"
- "big rigs" and "luxury motorcoach" for high-end RV travelers
- Describe amenities: clubhouse, general store, pool, recreation areas
- Use phrases like "luxury RV resort development" and "competitive size"
- Reference "adequate spacing, privacy, and views of scenic natural areas"`;
  }

  return `This is an outdoor hospitality feasibility study. Use professional appraisal and consulting language appropriate for the outdoor resort industry.`;
}
