/**
 * Eval helpers: number fidelity (claims in prose must appear in FACTS) + style rubric scaffold.
 */

/** Extract dollar amounts, percents, and large integers from narrative text. */
export function extractNumericClaims(text: string): string[] {
  const claims = new Set<string>();
  const dollar = text.matchAll(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g);
  for (const m of dollar) claims.add(m[0].replace(/\s/g, ''));
  const pct = text.matchAll(/\b\d{1,3}(?:\.\d+)?%/g);
  for (const m of pct) claims.add(m[0]);
  const bigInt = text.matchAll(/\b\d{1,3}(?:,\d{3})+\b/g);
  for (const m of bigInt) claims.add(m[0]);
  return Array.from(claims);
}

/** Normalize for loose containment checks ($1,200 vs 1200). */
function normalizeClaim(c: string): string {
  return c.replace(/[$,%\s]/g, '').toLowerCase();
}

/**
 * Returns claims found in narrative that do not appear (loosely) in the facts block.
 */
export function findUnsourcedNumericClaims(
  narrative: string,
  factsBlock: string
): string[] {
  const claims = extractNumericClaims(narrative);
  const factsNorm = normalizeClaim(factsBlock);
  const factsRaw = factsBlock.toLowerCase();

  return claims.filter((c) => {
    const n = normalizeClaim(c);
    if (!n) return false;
    if (factsNorm.includes(n)) return false;
    if (factsRaw.includes(c.toLowerCase())) return false;
    const digits = n.replace(/\D/g, '');
    if (digits.length >= 3 && factsNorm.includes(digits)) return false;
    return true;
  });
}

export interface StyleRubricScores {
  tone: number;
  structure: number;
  terminology: number;
  overall: number;
  notes: string[];
}

/**
 * Lightweight automated style rubric (1–5). Analyst override still required for cutover.
 * Heuristics only — not a substitute for human review.
 */
export function scoreStyleRubric(narrative: string): StyleRubricScores {
  const notes: string[] = [];
  let tone = 3;
  let structure = 3;
  let terminology = 3;

  const lower = narrative.toLowerCase();
  if (lower.includes('the subject') || lower.includes('it is concluded')) {
    tone += 1;
    notes.push('uses Sage subject/conclude phrasing');
  }
  if (lower.includes('positive demand indicator')) {
    terminology += 1;
    notes.push('uses positive demand indicator');
  }
  if (/\*\*|##|http:\/\/|https:\/\//.test(narrative)) {
    tone -= 1;
    notes.push('markdown or URL in prose');
  }
  if (narrative.includes('—') || narrative.includes('–')) {
    terminology -= 1;
    notes.push('em/en dash present');
  }
  if (narrative.length > 400) structure += 1;
  if (narrative.split(/\n\n/).length >= 2) structure += 1;

  const clamp = (n: number) => Math.max(1, Math.min(5, n));
  tone = clamp(tone);
  structure = clamp(structure);
  terminology = clamp(terminology);
  const overall = clamp(Math.round((tone + structure + terminology) / 3));

  return { tone, structure, terminology, overall, notes };
}
