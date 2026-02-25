/**
 * Normalizes a stored quality score to a 0–5 display scale.
 * DB may store 0–10 or 0–5; we always show 0–5.
 * If score > 5, treat as 0–10 and divide by 2.
 */
export function qualityScoreToDisplay(score: number | null): number | null {
  if (score === null || typeof score !== 'number' || Number.isNaN(score)) return null;
  if (score > 5) return Math.round(score / 2 * 10) / 10; // 0–10 → 0–5, 1 decimal
  return Math.round(score * 10) / 10; // already 0–5
}
