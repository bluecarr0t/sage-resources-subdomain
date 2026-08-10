/**
 * Comparables section for FS drafts: propose ≤10 nearby comps (rates, amenities,
 * proximity) so authors can pick the primary set. One photo placeholder each.
 */

import type { ComparableProperty, EnrichedInput } from './types';

export const COMPARABLES_SECTION_MAX = 10;
export const COMPARABLES_PLACEHOLDER_START = 40;

const SOURCE_LABEL: Record<string, string> = {
  all_sage_data: 'Sage glamping',
  hipcamp: 'Hipcamp',
  all_roverpass_data_new: 'RoverPass',
  campspot: 'Campspot',
  past_reports: 'Past Sage report',
  tavily_web_research: 'Web research',
  tavily_gap_fill: 'Web gap-fill',
  firecrawl_gap_fill: 'Web gap-fill',
};

export interface ProposedComparable {
  rank: number;
  comp: ComparableProperty;
  why: string;
  placeholderNum: number;
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function miles(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '—';
  return n < 10 ? n.toFixed(1) : String(Math.round(n));
}

function sourceLabel(table: string): string {
  return SOURCE_LABEL[table] ?? table;
}

function hasRate(c: ComparableProperty): boolean {
  return (
    (c.avg_retail_daily_rate != null && c.avg_retail_daily_rate > 0) ||
    (c.low_rate != null && c.low_rate > 0) ||
    (c.high_rate != null && c.high_rate > 0)
  );
}

function rateDisplay(c: ComparableProperty): string {
  if (c.low_rate != null && c.high_rate != null && c.low_rate > 0 && c.high_rate > 0) {
    return `${money(c.low_rate)}–${money(c.high_rate)}`;
  }
  if (c.avg_retail_daily_rate != null && c.avg_retail_daily_rate > 0) {
    return money(c.avg_retail_daily_rate);
  }
  return '—';
}

function sitesDisplay(c: ComparableProperty): string {
  const n = c.property_total_sites ?? c.quantity_of_units;
  return n != null && n > 0 ? String(Math.round(n)) : '—';
}

function locationDisplay(c: ComparableProperty): string {
  return [c.city, c.state].filter(Boolean).join(', ') || '—';
}

function amenitySnippet(c: ComparableProperty, max = 48): string {
  const raw = (c.amenities || c.description || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
}

/**
 * Score for proposing comps: prefer closer properties with rate data from market DBs.
 */
export function scoreComparableForProposal(c: ComparableProperty): number {
  let score = 0;
  const dist = c.distance_miles;
  if (dist != null && Number.isFinite(dist) && dist >= 0) {
    score += Math.max(0, 200 - dist);
  }
  if (hasRate(c)) score += 40;
  if (c.amenities?.trim() || c.description?.trim()) score += 15;
  if (c.property_total_sites || c.quantity_of_units) score += 10;
  const src = c.source_table;
  if (src === 'all_sage_data' || src === 'hipcamp' || src === 'campspot' || src === 'all_roverpass_data_new') {
    score += 25;
  } else if (src === 'past_reports') {
    score += 15;
  } else if (src === 'tavily_web_research' || src === 'tavily_gap_fill') {
    score += 8;
  }
  if (c.quality_score != null) score += c.quality_score * 2;
  return score;
}

export function buildWhySelected(c: ComparableProperty): string {
  const bits: string[] = [];
  if (c.distance_miles != null && Number.isFinite(c.distance_miles)) {
    bits.push(`${miles(c.distance_miles)} mi from subject`);
  }
  if (hasRate(c)) {
    bits.push(`rates ${rateDisplay(c)}`);
  } else {
    bits.push('rates TBD (gap-fill / author verify)');
  }
  if (c.unit_type) bits.push(c.unit_type);
  const sites = c.property_total_sites ?? c.quantity_of_units;
  if (sites) bits.push(`${Math.round(sites)} sites`);
  const am = amenitySnippet(c, 40);
  if (am) bits.push(am);
  bits.push(sourceLabel(c.source_table));
  return bits.join('; ');
}

/**
 * Select up to `limit` comps for the 1-page Comparables proposal.
 */
export function selectProposedComparables(
  input: EnrichedInput,
  limit = COMPARABLES_SECTION_MAX
): ProposedComparable[] {
  const raw = [...(input.nearby_comps ?? [])];
  raw.sort((a, b) => scoreComparableForProposal(b) - scoreComparableForProposal(a));

  const seen = new Set<string>();
  const picked: ComparableProperty[] = [];
  for (const c of raw) {
    const key = c.property_name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    // Never propose known TN template sample names
    if (/bolt farm|retreat glamping|retreet|stay minty/i.test(key)) continue;
    seen.add(key);
    picked.push(c);
    if (picked.length >= limit) break;
  }

  return picked.map((comp, i) => ({
    rank: i + 1,
    comp,
    why: buildWhySelected(comp),
    placeholderNum: COMPARABLES_PLACEHOLDER_START + i,
  }));
}

export function buildComparablesKeyFindings(
  input: EnrichedInput,
  proposed: ProposedComparable[]
): string[] {
  const subject = [input.city, input.state].filter(Boolean).join(', ') || 'the subject';
  if (proposed.length === 0) {
    return [
      `No nearby RV/glamping comps were enriched within the search radius of ${subject}; author should expand radius or add comps manually.`,
    ];
  }

  const withDist = proposed
    .map((p) => p.comp.distance_miles)
    .filter((d): d is number => d != null && Number.isFinite(d) && d >= 0);
  const withAdr = proposed
    .map((p) => p.comp.avg_retail_daily_rate ?? p.comp.low_rate)
    .filter((d): d is number => d != null && Number.isFinite(d) && d > 0);

  const findings: string[] = [];
  findings.push(
    `Proposed set: ${proposed.length} comps ranked for ${subject} (max ${COMPARABLES_SECTION_MAX}) using proximity, published rates, amenities, and market-DB coverage.`
  );
  if (withDist.length) {
    const nearest = Math.min(...withDist);
    const farthest = Math.max(...withDist);
    findings.push(
      `Proximity: nearest ${miles(nearest)} mi; farthest in set ${miles(farthest)} mi — closer comps weight occupancy more heavily; farther destination comps inform rate ceilings.`
    );
  }
  if (withAdr.length) {
    const lo = Math.min(...withAdr);
    const hi = Math.max(...withAdr);
    findings.push(
      `Observed ADR / nightly rates in the proposed set span roughly ${money(lo)}–${money(hi)} (verify seasonality before locking subject ADR).`
    );
  } else {
    findings.push(
      'Rate coverage is thin in Supabase for this set; web gap-fill was attempted where possible — author should confirm published nightly rates before selection.'
    );
  }
  const dbCount = proposed.filter((p) =>
    /sage|hipcamp|campspot|roverpass/i.test(sourceLabel(p.comp.source_table))
  ).length;
  const webCount = proposed.length - dbCount;
  findings.push(
    `Sources: ${dbCount} from Sage/Hipcamp/Campspot/RoverPass (or past reports); ${webCount} web-supplemented. Prefer market-DB comps when rates and unit mix align with the subject.`
  );
  return findings.slice(0, 4);
}

export function buildComparablesTableRows(proposed: ProposedComparable[]): {
  headers: string[];
  body: string[][];
} {
  return {
    headers: ['#', 'Property', 'Location', 'Mi', 'ADR/Range', 'Sites', 'Why (short)'],
    body: proposed.map((p) => [
      String(p.rank),
      p.comp.property_name.slice(0, 36),
      locationDisplay(p.comp).slice(0, 22),
      miles(p.comp.distance_miles),
      rateDisplay(p.comp),
      sitesDisplay(p.comp),
      p.why.slice(0, 52),
    ]),
  };
}

export function photoPlaceholderText(placeholderNum: number): string {
  return `[Image placeholder ${placeholderNum}: Add comparable property photo — not auto-linked in this draft. Section: Comparables.]`;
}

/**
 * Plain-text body for tests / diagnostics (not DOCX XML).
 */
export function buildComparablesSectionPlainText(
  input: EnrichedInput,
  proposed = selectProposedComparables(input)
): string {
  const subject = [input.city, input.state].filter(Boolean).join(', ') || 'the subject';
  const lines: string[] = [];
  lines.push(
    `This page proposes up to ${COMPARABLES_SECTION_MAX} comparables near ${subject} from Sage glamping / Hipcamp / Campspot / RoverPass (plus web gap-fill when rates or amenities are missing). Authors should pick the primary competitive set from this shortlist.`
  );
  lines.push('');
  lines.push('Key findings');
  for (const f of buildComparablesKeyFindings(input, proposed)) {
    lines.push(`• ${f}`);
  }
  lines.push('');
  lines.push('Proposed comparables');
  for (const p of proposed) {
    lines.push(
      `${p.rank}. ${p.comp.property_name} (${locationDisplay(p.comp)}) — ${p.why}`
    );
    lines.push(photoPlaceholderText(p.placeholderNum));
  }
  if (proposed.length === 0) {
    lines.push('[Author update required] No comps available — expand enrich radius or add comps manually.');
  }
  return lines.join('\n');
}

/** True when a comp is thin enough to warrant a Tavily detail lookup. */
export function compNeedsGapFill(c: ComparableProperty): boolean {
  const thinRate = !hasRate(c);
  const thinAmenity = !(c.amenities?.trim() || (c.description && c.description.length > 80));
  return thinRate || thinAmenity;
}
