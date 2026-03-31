import type { QualityTier } from '@/lib/comps-v2/types';
import { adrToQualityTier } from '@/lib/comps-v2/filters';

const TIER_ORDER: Record<QualityTier, number> = {
  budget: 0,
  economy: 1,
  mid: 2,
  upscale: 3,
  luxury: 4,
};

/** Highest matching tier from marketing copy on property pages (best-effort). */
export function tierFromWebKeywords(text: string): QualityTier | null {
  const t = text.toLowerCase();
  let best: QualityTier | null = null;
  let bestRank = -1;

  const consider = (tier: QualityTier, hit: boolean) => {
    if (!hit) return;
    const r = TIER_ORDER[tier];
    if (r > bestRank) {
      bestRank = r;
      best = tier;
    }
  };

  consider('luxury', /\b(luxury|ultra[-\s]?lux|five[-\s]star|5[-\s]star|world[-\s]class)\b/i.test(t));
  consider('luxury', /\b(high[-\s]end|exclusive\s+retreat|once[-\s]in[-\s]a[-\s]lifetime)\b/i.test(t));
  consider('upscale', /\b(upscale|premium|boutique|elevated|refined)\b/i.test(t));
  consider('mid', /\bmid[-\s]?range\b/i.test(t));
  consider('economy', /\b(affordable|value[-\s]priced|great\s+value)\b/i.test(t));
  consider('budget', /\b(budget|economical|lowest\s+rates)\b/i.test(t));
  consider('budget', /\bcheap(?:est)?\b/i.test(t));

  return best;
}

/**
 * Combine scraped/snippet keywords with parsed nightly rate for web-sourced comps.
 * Caps “luxury/upscale” claims when ADR is implausibly low (bad snippet extraction).
 */
export function resolveWebResearchQualityTier(adr: number | null, fullText: string): QualityTier | null {
  const adrT = adrToQualityTier(adr);
  const kwT = tierFromWebKeywords(fullText);
  if (kwT == null) return adrT;
  if (adrT == null) return kwT;

  if (adr != null && adr < 55) {
    if (kwT === 'luxury' || kwT === 'upscale' || kwT === 'mid') return adrT;
  } else if (adr != null && adr < 90) {
    if (kwT === 'luxury' || kwT === 'upscale') return adrT;
  }

  return TIER_ORDER[kwT] > TIER_ORDER[adrT] ? kwT : adrT;
}
