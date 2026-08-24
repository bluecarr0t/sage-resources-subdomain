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

/** Acreage mentions — capture the numeric group without stripping the decimal */
const ACRES_PATTERN = /(?:approximately\s+)?(\d+(?:\.\d+)?)\s*acres?\b/gi;

/**
 * Nightly-rate-like dollar amounts in ADR context.
 * Avoids matching large project costs / financing figures.
 */
const ADR_CONTEXT_PATTERN =
  /(?:ADR|average daily rate|nightly rate|daily rate|\/night|per night)[^\n$.]{0,40}\$[\d,]+(?:\.\d+)?|\$[\d,]+(?:\.\d+)?[^\n.]{0,40}(?:ADR|\/night|per night|nightly)/gi;

const STANDALONE_ADR_DOLLAR = /\$(\d{2,4})(?:\.\d{1,2})?\b/g;

function extractAdrCandidates(text: string): number[] {
  const fromContext: number[] = [];
  const ctxMatches = text.match(ADR_CONTEXT_PATTERN) ?? [];
  for (const chunk of ctxMatches) {
    const dollars = chunk.match(/\$[\d,]+(?:\.\d+)?/g) ?? [];
    for (const d of dollars) {
      const n = parseFloat(d.replace(/[$,]/g, ''));
      if (Number.isFinite(n) && n >= 40 && n <= 2000) fromContext.push(n);
    }
  }
  if (fromContext.length > 0) return fromContext;

  // Fallback: only small dollar amounts typical of nightly rates (not project costs)
  const standalone: number[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(STANDALONE_ADR_DOLLAR.source, 'g');
  while ((m = re.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isFinite(n) && n >= 40 && n <= 800) standalone.push(n);
  }
  return standalone;
}

function extractAcreValues(text: string): number[] {
  const values: number[] = [];
  const re = new RegExp(ACRES_PATTERN.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n)) values.push(n);
  }
  return values;
}

/**
 * Compare generated summary to enriched data; flag significant mismatches
 */
export function factCheckExecutiveSummary(
  summary: string,
  enriched: EnrichedInput
): FactCheckResult {
  const flags: FactCheckFlag[] = [];

  // Check acres — preserve decimals (do not strip "." via \D)
  if (enriched.acres != null && enriched.acres > 0) {
    for (const extracted of extractAcreValues(summary)) {
      const diff = Math.abs(extracted - enriched.acres);
      if (diff > 1) {
        flags.push({
          claim: `${extracted} acres`,
          expected: `${enriched.acres} acres`,
          actual: `${extracted} acres`,
        });
      }
    }
  }

  // Check ADR claims against benchmarks (context-aware; skip project-cost dollars)
  if (enriched.benchmarks?.length) {
    const adrValues = extractAdrCandidates(summary);
    const benchmarkAdrs = enriched.benchmarks.flatMap((b) => [
      Math.round(b.avg_low_adr),
      Math.round(b.avg_peak_adr),
    ]);
    const minBench = Math.min(...benchmarkAdrs);
    const maxBench = Math.max(...benchmarkAdrs);

    for (const adr of adrValues) {
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

  // Population: only check phrases that explicitly mention population
  if (enriched.population_2020 != null && enriched.population_2020 > 0) {
    const popMatch = summary.match(
      /population[^.]{0,80}?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|M)?|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|M)?[^.']{0,40}population/i
    );
    if (popMatch) {
      const raw = (popMatch[1] || popMatch[3] || '').replace(/,/g, '');
      const unit = (popMatch[2] || popMatch[4] || '').toLowerCase();
      let extracted = parseFloat(raw);
      if (unit.startsWith('m')) extracted *= 1_000_000;
      if (Number.isFinite(extracted) && extracted > 1000) {
        const diff = Math.abs(extracted - enriched.population_2020);
        const pctDiff = (diff / enriched.population_2020) * 100;
        if (pctDiff > 20) {
          flags.push({
            claim: `population ${extracted.toLocaleString()}`,
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

/**
 * Compare generated narrative to enriched data; flag significant mismatches.
 * Covers executive summary, SWOT, demand, area, and supply sections.
 */
export function factCheckNarrative(
  text: string,
  enriched: EnrichedInput
): FactCheckResult {
  const flags: FactCheckFlag[] = [];
  const summaryCheck = factCheckExecutiveSummary(text, enriched);
  flags.push(...summaryCheck.flags);

  const city = enriched.city?.trim();
  const state = enriched.state?.trim();
  if (city && state) {
    const cityRe = new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i');
    const inventsOtherCity =
      /\b(?:in|near|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:,\s*([A-Z]{2}))?\b/.exec(text);
    if (inventsOtherCity) {
      const mentionedCity = inventsOtherCity[1];
      const mentionedState = inventsOtherCity[2];
      if (
        mentionedCity &&
        !cityRe.test(mentionedCity) &&
        mentionedCity.toLowerCase() !== city.toLowerCase()
      ) {
        const looksLikePlace =
          !/^(The|This|Our|A|An|Strength|Weakness|Opportunity|Threat)$/i.test(mentionedCity);
        if (looksLikePlace && mentionedState && mentionedState.toUpperCase() !== state.toUpperCase()) {
          flags.push({
            claim: `${mentionedCity}, ${mentionedState}`,
            expected: `${city}, ${state}`,
            actual: `${mentionedCity}, ${mentionedState}`,
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
