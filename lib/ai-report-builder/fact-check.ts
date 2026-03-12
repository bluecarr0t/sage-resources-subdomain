/**
 * Fact-check layer for generated executive summary
 * Extracts numeric claims and compares to enriched data; flags mismatches
 */

import type { EnrichedInput } from './types';

export interface FactCheckFlag {
  claim: string;
  expected: string | number;
  actual: string | number;
}

export interface FactCheckResult {
  passed: boolean;
  flags: FactCheckFlag[];
}

/** Extract dollar amounts (e.g. $285, $300) */
const ADR_PATTERN = /\$[\d,]+(?:\.[\d]+)?/g;

/** Extract percentages (e.g. 5.2%, 10%) */
const PCT_PATTERN = /[\d.]+%/g;

/** Extract acreage (e.g. "approximately 25 acres", "25 acres") */
const ACRES_PATTERN = /(?:approximately\s+)?(\d+(?:\.\d+)?)\s*acres?/gi;

/** Extract population numbers (e.g. "1.2 million", "500,000") */
const POP_PATTERN = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M|m)?/g;

function extractFirstMatch(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m) return null;
  const raw = m[0].replace(/[$,%\s]/g, '').replace(/,/g, '');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function extractAdrValues(text: string): number[] {
  const matches = text.match(ADR_PATTERN) ?? [];
  return matches
    .map((s) => parseFloat(s.replace(/[$,]/g, '')))
    .filter((n) => Number.isFinite(n));
}

/**
 * Compare generated summary to enriched data; flag significant mismatches
 */
export function factCheckExecutiveSummary(
  summary: string,
  enriched: EnrichedInput
): FactCheckResult {
  const flags: FactCheckFlag[] = [];

  // Check acres
  if (enriched.acres != null && enriched.acres > 0) {
    const acresMatch = summary.match(ACRES_PATTERN);
    if (acresMatch) {
      const match = acresMatch[0];
      const extracted = parseFloat(match.replace(/\D/g, ''));
      if (Number.isFinite(extracted)) {
        const diff = Math.abs(extracted - enriched.acres);
        if (diff > 1) {
          flags.push({
            claim: `"${match.trim()}"`,
            expected: `${enriched.acres} acres`,
            actual: match.trim(),
          });
        }
      }
    }
  }

  // Check ADR claims against benchmarks
  if (enriched.benchmarks?.length) {
    const adrValues = extractAdrValues(summary);
    const benchmarkAdrs = enriched.benchmarks.flatMap((b) => [
      Math.round(b.avg_low_adr),
      Math.round(b.avg_peak_adr),
    ]);
    const minBench = Math.min(...benchmarkAdrs);
    const maxBench = Math.max(...benchmarkAdrs);

    for (const adr of adrValues) {
      if (adr < 50 || adr > 2000) continue;
      const withinRange = adr >= minBench * 0.7 && adr <= maxBench * 1.3;
      if (!withinRange) {
        flags.push({
          claim: `$${adr} ADR`,
          expected: `$${minBench}-$${maxBench} (from benchmarks)`,
          actual: `$${adr}`,
        });
      }
    }
  }

  // Check population if provided
  if (enriched.population_2020 != null && enriched.population_2020 > 0) {
    const popMatch = summary.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M|m)?/);
    if (popMatch) {
      const extracted = parseInt(popMatch[1].replace(/,/g, ''), 10);
      if (Number.isFinite(extracted)) {
        const diff = Math.abs(extracted - enriched.population_2020);
        const pctDiff = (diff / enriched.population_2020) * 100;
        if (pctDiff > 20) {
          flags.push({
            claim: `"${popMatch[0].trim()}" population`,
            expected: `~${enriched.population_2020.toLocaleString()}`,
            actual: extracted.toLocaleString(),
          });
        }
      }
    }
  }

  return {
    passed: flags.length === 0,
    flags,
  };
}
