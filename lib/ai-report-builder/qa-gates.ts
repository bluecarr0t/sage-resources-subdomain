/**
 * Blocking / advisory QA gates before a report draft is marked shippable.
 */

import type { EnrichedInput } from './types';
import type { FeasibilityAssumptions, FeasibilityModelOutput } from '@/lib/feasibility-model';
import type { AssembleDocxDiagnostics } from './assemble-docx';
import {
  buildTourismAnalystTasks,
  findTnTourismFingerprintsInText,
  normalizeStateAbbr,
} from './tourism-author-checklist';

export interface ReportQaGatesInput {
  enriched: EnrichedInput;
  model?: FeasibilityModelOutput | null;
  /** Sample of DOCX plain text for geography / placeholder checks */
  docxTextSample?: string | null;
  /** Sheet names expected but missing from assembled XLSX */
  xlsxMissingSheets?: string[] | null;
  /** When true, skip assumption-lock requirement (scaffolding drafts) */
  assumptionsDraftMode?: boolean;
  /** True when STDB export was imported (or analyst waived Market Profile) */
  stdbImported?: boolean;
  /** Explicit analyst waiver when STDB not imported */
  stdbWaived?: boolean;
  /** Count of `[Image placeholder]` / similar tokens when known */
  placeholderCount?: number | null;
  /** Max placeholders allowed before fail (default 12 after image allow-list) */
  placeholderThreshold?: number;
  /** Leftover sample-market fingerprints from assemble diagnostics */
  sampleFingerprintsRemaining?: string[] | null;
  /** Optional assemble diagnostics for section-hit messaging */
  assembleDiagnostics?: AssembleDocxDiagnostics | null;
  /** Flags from ExcelJS Model Output ↔ engine assert */
  xlsxModelAssertFlags?: string[] | null;
  /** Number of citations attached to executive summary */
  citationCount?: number | null;
}

export interface ReportQaGatesResult {
  passed: boolean;
  flags: string[];
  analystTasks: string[];
}

const DEFAULT_PLACEHOLDER_THRESHOLD = 12;

const ALWAYS_ANALYST_TASKS = [
  'Occupancy call: confirm competitor and subject stabilized occupancy (use workbook phone script).',
  'Assessor mill levy: confirm assessment ratio and mill levy with county assessor.',
  'Planning department: confirm zoning, entitlements, and emerging competitor pipeline.',
  'Site photos: capture exterior/interior site-visit photos and site plan for figures.',
];

function assumptionNeedsLock(a: FeasibilityAssumptions): string[] {
  const unlocked: string[] = [];
  const check = (label: string, state: string | undefined) => {
    if (!state || (state !== 'analyst_set' && state !== 'locked')) {
      unlocked.push(label);
    }
  };

  for (const u of a.units ?? []) {
    check(`unit rates/occ (${u.value.unitType})`, u.state);
  }
  check('lowSeasonMonths', a.lowSeasonMonths?.state);
  check('peakSeasonMonths', a.peakSeasonMonths?.state);
  check('occupancyRamp', a.occupancyRamp?.state);
  check('realMarketAdj', a.realMarketAdj?.state);
  check('landCost', a.landCost?.state);
  check('softCostPct', a.softCostPct?.state);
  check('loanToCost', a.loanToCost?.state);
  check('interestRate', a.interestRate?.state);
  check('loanTermYears', a.loanTermYears?.state);
  check('assessmentRatio', a.assessmentRatio?.state);
  check('millLevy', a.millLevy?.state);

  return unlocked;
}

function geographyFlags(enriched: EnrichedInput, sample: string | null | undefined): string[] {
  const flags: string[] = [];
  const city = enriched.city?.trim();
  const state = enriched.state?.trim();
  if (!city || !state) {
    flags.push('geography: city/state missing on intake');
    return flags;
  }
  if (!sample || !sample.trim()) {
    return flags;
  }
  const lower = sample.toLowerCase();
  if (!lower.includes(city.toLowerCase())) {
    flags.push(`geography: city "${city}" not found in DOCX sample`);
  }
  if (!lower.includes(state.toLowerCase())) {
    flags.push(`geography: state "${state}" not found in DOCX sample`);
  }
  return flags;
}

function fingerprintFlags(
  enriched: EnrichedInput,
  remaining: string[] | null | undefined
): string[] {
  if (!remaining?.length) return [];
  const state = enriched.state?.trim().toUpperCase() || '';
  const city = enriched.city?.trim().toLowerCase() || '';
  const flags: string[] = [];
  for (const fp of remaining) {
    if (fp === 'Jasper' && city === 'jasper') continue;
    if (fp === 'Florence, Arizona' && state === 'AZ') continue;
    if ((fp === '37347' || fp === 'TVA Road' || fp === 'Nickajack' || fp === 'Marion County') && state === 'TN' && city === 'jasper') {
      continue;
    }
    if (
      state === 'TN' &&
      (fp === 'TN DEPARTMENT OF TOURIST' ||
        fp === 'DEPARTMENT OF TOURIST DEVELOPMENT' ||
        fp === 'Overnight Tennessee' ||
        fp === 'Tennessee Visitors')
    ) {
      continue;
    }
    flags.push(`sample_fingerprint: leftover "${fp}" in DOCX`);
  }
  return flags;
}

function tdcConsistencyFlags(model: FeasibilityModelOutput): string[] {
  const flags: string[] = [];
  const tdc = model.costs.totalDevelopmentCost;
  const parts =
    model.costs.hardCosts +
    model.costs.softCosts +
    model.costs.contingency +
    model.costs.ffe +
    model.costs.preOpening +
    model.costs.land;
  const delta = Math.abs(tdc - parts);
  const tol = Math.max(1, Math.abs(tdc) * 0.001);
  if (delta > tol) {
    flags.push(
      `number_consistency: TDC ${tdc} ≠ sum of cost components ${parts} (Δ=${Math.round(delta)})`
    );
  }
  if (!(tdc > 0)) {
    flags.push('number_consistency: total development cost is not positive');
  }
  const loan = model.financing.loanAmount;
  const equity = model.financing.equityAmount;
  if (Math.abs(loan + equity - tdc) > tol) {
    flags.push(
      `number_consistency: loan (${loan}) + equity (${equity}) ≠ TDC (${tdc})`
    );
  }
  return flags;
}

function countPlaceholdersInText(sample: string): number {
  const patterns = [
    /\[Image placeholder[^\]]*\]/gi,
    /\[insert\s+[^\]]+\]/gi,
    /Error! Not a valid link\./gi,
    /#REF!/gi,
  ];
  let n = 0;
  for (const p of patterns) {
    const m = sample.match(p);
    if (m) n += m.length;
  }
  return n;
}

export function runReportQaGates(input: ReportQaGatesInput): ReportQaGatesResult {
  const flags: string[] = [];
  const analystTasks = [...ALWAYS_ANALYST_TASKS];

  flags.push(...geographyFlags(input.enriched, input.docxTextSample));
  flags.push(...fingerprintFlags(input.enriched, input.sampleFingerprintsRemaining));

  // Intake echo: ship mode requires address + geocode for radius accuracy
  if (!input.assumptionsDraftMode) {
    if (!input.enriched.address_1?.trim()) {
      flags.push('intake: address_1 required for ship mode');
    }
    if (input.enriched.latitude == null || input.enriched.longitude == null) {
      flags.push('intake: subject geocode missing (lat/lng)');
    }
    if (input.enriched.acres == null || !(input.enriched.acres > 0)) {
      analystTasks.unshift('Intake: confirm acreage on ToT before ship.');
    }
  }

  const unitTotal = input.enriched.unit_mix.reduce((s, u) => s + (u.count > 0 ? u.count : 0), 0);
  if (!input.assumptionsDraftMode && unitTotal <= 0) {
    flags.push('unit_mix: required for model drivers');
  } else if (unitTotal <= 0) {
    analystTasks.unshift('Unit mix: enter unit types and counts so XLSX model drivers can be written.');
  }

  if (!input.assumptionsDraftMode) {
    if (!input.model?.assumptionsUsed) {
      flags.push('assumption_lock: model assumptions missing (required unless draft mode)');
    } else {
      const unlocked = assumptionNeedsLock(input.model.assumptionsUsed);
      if (unlocked.length) {
        flags.push(
          `assumption_lock: judgment fields not analyst_set/locked: ${unlocked.slice(0, 8).join(', ')}${
            unlocked.length > 8 ? ` (+${unlocked.length - 8} more)` : ''
          }`
        );
      }
    }
  }

  if (!input.stdbImported && !input.stdbWaived) {
    flags.push(
      'stdb: Market Profile STDB import missing (upload export or set stdbWaived)'
    );
  }

  const threshold = input.placeholderThreshold ?? DEFAULT_PLACEHOLDER_THRESHOLD;
  let placeholderCount = input.placeholderCount ?? null;
  if (placeholderCount == null && input.docxTextSample) {
    placeholderCount = countPlaceholdersInText(input.docxTextSample);
  }
  if (placeholderCount != null && placeholderCount > threshold) {
    flags.push(
      `placeholders: ${placeholderCount} tokens exceed threshold ${threshold}`
    );
  }

  if (input.xlsxMissingSheets?.length) {
    flags.push(`xlsx: missing sheets: ${input.xlsxMissingSheets.join(', ')}`);
  }

  if (input.xlsxModelAssertFlags?.length) {
    flags.push(...input.xlsxModelAssertFlags);
  }

  if (input.model && unitTotal > 0) {
    try {
      flags.push(...tdcConsistencyFlags(input.model));
    } catch {
      flags.push('number_consistency: incomplete model cost/financing block');
    }
  }

  // Citation coverage when exec summary citations are provided
  if (!input.assumptionsDraftMode && input.citationCount != null && input.citationCount < 3) {
    flags.push(`citations: expected ≥3 numeric citations, got ${input.citationCount}`);
  }

  const missedSections = Object.entries(input.assembleDiagnostics?.sectionHits ?? {})
    .filter(([, v]) => v === 'missed')
    .map(([k]) => k);
  if (missedSections.length && !input.assumptionsDraftMode) {
    flags.push(`sections: missed bind for ${missedSections.join(', ')}`);
  } else if (missedSections.length) {
    analystTasks.push(`Review sections that were not bound: ${missedSections.join(', ')}.`);
  }

  // State tourism overnight-trip figures are author-owned (TOUR-01…06)
  analystTasks.push(...buildTourismAnalystTasks(input.enriched.state));
  const stateAbbr = normalizeStateAbbr(input.enriched.state);
  if (stateAbbr && stateAbbr !== 'TN' && input.docxTextSample) {
    const tnHits = findTnTourismFingerprintsInText(input.docxTextSample);
    for (const fp of tnHits) {
      flags.push(`tourism_fingerprint: leftover "${fp}" (subject is ${stateAbbr}, not TN)`);
    }
  }

  return {
    passed: flags.length === 0,
    flags,
    analystTasks,
  };
}
