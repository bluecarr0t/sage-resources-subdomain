const ACRES_PATTERN =
  /(?:~|approximately\s+)?(\d+(?:\.\d+)?)\s*-?\s*acres?\b/gi;

/** Lake/reservoir acreage is recreation context, not the glamping parcel. */
const ADJACENT_WATER_AFTER_PATTERN =
  /^\s*(?:[-–—]\s*)?(?:[\w'-]+\s+){0,4}(?:lake|reservoir)\b/i;

/** Adjacent public land called out in marketing copy, not the operator footprint. */
const ADJACENT_WILDERNESS_AFTER_PATTERN =
  /^\s*(?:[-–—]\s*)?(?:catskill\s+park|national\s+forest|wilderness)\b/i;

const DEPRIORITIZE_BEFORE_PATTERN =
  /\b(?:access\s+to\s+the\s+)?(?:vast|expansive|sprawling)\s*$|\b(?:adjacent\s+to|steps\s+away\s+from|near\s+the\s+expansive|surrounded\s+by\s+the\s+expansive|backdrop\s+of\s+the|within\s+(?:a\s+)?(?:sprawling|vast|expansive)|nestled\s+within\s+(?:a\s+)?(?:sprawling|vast|expansive)|broader\s+(?:[\w'-]+\s+)*ranch\s+spans|about)\s*$/i;

type SageAcreageFields = {
  description?: string | null;
  notes?: string | null;
  address?: string | null;
};

type AcreCandidate = {
  value: number;
  deprioritized: boolean;
};

function isDeprioritizedAcreMention(
  text: string,
  matchIndex: number,
  matchLength: number
): boolean {
  const before = text.slice(Math.max(0, matchIndex - 90), matchIndex);
  const after = text.slice(matchIndex + matchLength);

  if (ADJACENT_WATER_AFTER_PATTERN.test(after)) return true;
  if (ADJACENT_WILDERNESS_AFTER_PATTERN.test(after)) return true;
  if (DEPRIORITIZE_BEFORE_PATTERN.test(before)) return true;
  return false;
}

function collectAcreCandidates(text: string | null | undefined): AcreCandidate[] {
  if (!text?.trim()) return [];

  const normalized = text.replace(/,/g, '');
  const candidates: AcreCandidate[] = [];
  const pattern = new RegExp(ACRES_PATTERN.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalized)) !== null) {
    const value = parseFloat(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    candidates.push({
      value,
      deprioritized: isDeprioritizedAcreMention(
        normalized,
        match.index,
        match[0].length
      ),
    });
  }

  return candidates;
}

function pickBestAcreCandidate(candidates: AcreCandidate[]): number | null {
  const preferred = candidates.filter((candidate) => !candidate.deprioritized);
  if (preferred.length === 0) return null;
  if (preferred.length === 1) return preferred[0].value;

  const values = preferred.map((candidate) => candidate.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max / min >= 10) return min;

  return preferred[0].value;
}

function parseAcresFromText(text: string | null | undefined): number | null {
  return pickBestAcreCandidate(collectAcreCandidates(text));
}

/** Best-effort acreage from Sage row narrative fields (description, then address, then notes). */
export function propertyAcresFromSageFields(
  fields: SageAcreageFields
): number | null {
  for (const text of [fields.description, fields.address, fields.notes]) {
    const acres = parseAcresFromText(text);
    if (acres != null) return acres;
  }
  return null;
}

export function formatPipelinePropertyAcres(
  acres: number | null | undefined
): string {
  if (acres == null) return '—';
  const rounded = Math.round(acres * 10) / 10;
  if (Number.isInteger(rounded)) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(rounded);
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rounded);
}
