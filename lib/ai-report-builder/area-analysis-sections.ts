/**
 * Parse / format structured Area Analysis subsections
 * (Overview → State → County → Local) for DOCX assembly.
 */

export type AreaAnalysisBucket = 'overview' | 'state' | 'county' | 'local';

export const AREA_ANALYSIS_BUCKETS: AreaAnalysisBucket[] = [
  'overview',
  'state',
  'county',
  'local',
];

const LABEL_ALIASES: Record<AreaAnalysisBucket, RegExp> = {
  overview: /^overview$/i,
  state: /^state$/i,
  county: /^county$/i,
  local: /^(local(?:\s+area)?|city|municipality)$/i,
};

/**
 * Parse LLM output with `=== Overview ===` (or `## Overview`) delimiters.
 * Unlabeled leading prose falls into Overview.
 */
export function parseAreaAnalysisSections(
  bodyText: string
): Record<AreaAnalysisBucket, string> {
  const out: Record<AreaAnalysisBucket, string> = {
    overview: '',
    state: '',
    county: '',
    local: '',
  };
  if (!bodyText.trim()) return out;

  const lines = bodyText.replace(/\r\n/g, '\n').split('\n');
  let current: AreaAnalysisBucket = 'overview';
  const buffers: Record<AreaAnalysisBucket, string[]> = {
    overview: [],
    state: [],
    county: [],
    local: [],
  };

  for (const raw of lines) {
    const line = raw.trim();
    const labeled =
      line.match(/^={2,}\s*(.+?)\s*={2,}$/) ||
      line.match(/^#{1,3}\s+(.+)$/);
    if (labeled) {
      const title = labeled[1].trim();
      const bucket = matchAreaBucket(title);
      if (bucket) {
        current = bucket;
        continue;
      }
    }
    buffers[current].push(raw);
  }

  for (const key of AREA_ANALYSIS_BUCKETS) {
    out[key] = buffers[key].join('\n').trim();
  }

  // If the model ignored delimiters and returned a single blob, keep it in overview
  if (!out.state && !out.county && !out.local && out.overview) {
    // leave as-is; assembler still injects maps around overview
  }

  return out;
}

export function matchAreaBucket(title: string): AreaAnalysisBucket | null {
  const t = title.trim();
  for (const key of AREA_ANALYSIS_BUCKETS) {
    if (LABEL_ALIASES[key].test(t)) return key;
  }
  return null;
}

/** Format buckets back into delimited text (tests / debugging). */
export function formatAreaAnalysisSections(
  sections: Partial<Record<AreaAnalysisBucket, string>>
): string {
  return AREA_ANALYSIS_BUCKETS.map((key) => {
    const body = (sections[key] || '').trim();
    if (!body) return '';
    const title = key === 'local' ? 'Local' : key[0].toUpperCase() + key.slice(1);
    return `=== ${title} ===\n${body}`;
  })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Parse generic `=== Label ===` sections for Demand Indicators (and similar).
 * Keys are lowercased trimmed labels.
 */
export function parseLabeledSections(bodyText: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!bodyText.trim()) return out;

  const lines = bodyText.replace(/\r\n/g, '\n').split('\n');
  let current = 'other';
  const buffers: Record<string, string[]> = { other: [] };

  for (const raw of lines) {
    const line = raw.trim();
    const labeled =
      line.match(/^={2,}\s*(.+?)\s*={2,}$/) ||
      line.match(/^#{1,3}\s+(.+)$/);
    if (labeled) {
      current = labeled[1].trim().toLowerCase();
      if (!buffers[current]) buffers[current] = [];
      continue;
    }
    if (!buffers[current]) buffers[current] = [];
    buffers[current].push(raw);
  }

  for (const [k, v] of Object.entries(buffers)) {
    const text = v.join('\n').trim();
    if (text) out[k] = text;
  }
  return out;
}

/** Fuzzy-match a Heading2 title to a labeled section key. */
export function matchLabeledSectionKey(
  headingPlain: string,
  labels: Record<string, string>
): string | null {
  const h = headingPlain.trim().toLowerCase();
  if (!h) return null;
  if (labels[h]) return h;
  for (const key of Object.keys(labels)) {
    if (key === 'other') continue;
    if (h.includes(key) || key.includes(h)) return key;
  }
  // Weather aliases
  if (/weather|climate/i.test(h)) {
    for (const key of Object.keys(labels)) {
      if (/weather|climate/i.test(key)) return key;
    }
  }
  return null;
}
