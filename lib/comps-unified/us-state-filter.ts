import {
  STATE_ABBREVIATIONS,
  normalizeStateToCanonicalAbbrev,
} from '@/components/map/utils/stateUtils';
import { US_STATES } from '@/lib/us-states';

/** State filter on unified comps admin is US-only (excludes Canadian provinces, etc.). */
const US_STATE_FILTER_CODES = new Set<string>([...US_STATES, 'DC']);

export function buildUsStateFilterOptions(
  rawStates: string[]
): { value: string; label: string }[] {
  return rawStates
    .map((s) => {
      const abbr = normalizeStateToCanonicalAbbrev(s) ?? s.toUpperCase();
      return { raw: s, abbr };
    })
    .filter((row) => US_STATE_FILTER_CODES.has(row.abbr))
    .map(({ raw, abbr }) => {
      const fullName = STATE_ABBREVIATIONS[abbr] ?? raw;
      return {
        value: abbr,
        label: fullName !== abbr ? `${fullName} (${abbr})` : abbr,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}
