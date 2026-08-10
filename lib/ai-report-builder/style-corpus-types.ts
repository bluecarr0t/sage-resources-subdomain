/** Canonical section keys stored in report_section_corpus.section */

export const STYLE_CORPUS_SECTIONS = [
  'executive_summary',
  'letter_of_transmittal',
  'swot',
  'site_analysis',
  'area_analysis',
  'demand_indicators',
  'supply_competition',
] as const;

export type StyleCorpusSection = (typeof STYLE_CORPUS_SECTIONS)[number];

export function isStyleCorpusSection(value: string): value is StyleCorpusSection {
  return (STYLE_CORPUS_SECTIONS as readonly string[]).includes(value);
}

/** Heading patterns → canonical section (first match wins). */
export const SECTION_HEADING_PATTERNS: Array<{
  section: StyleCorpusSection;
  patterns: RegExp[];
}> = [
  {
    section: 'letter_of_transmittal',
    patterns: [/letter\s+of\s+transmittal/i, /^transmittal$/i],
  },
  {
    section: 'executive_summary',
    patterns: [/executive\s+summary/i, /^summary$/i],
  },
  {
    section: 'swot',
    patterns: [/\bswot\b/i, /strengths?\s*,?\s*weaknesses?/i],
  },
  {
    section: 'site_analysis',
    patterns: [/site\s+analysis/i, /property\s+overview/i, /project\s+overview/i],
  },
  {
    section: 'area_analysis',
    patterns: [/area\s+analysis/i, /market\s+analysis/i, /location\s+analysis/i],
  },
  {
    section: 'demand_indicators',
    patterns: [/demand\s+indicator/i, /demand\s+analysis/i, /demand\s+conclusion/i],
  },
  {
    section: 'supply_competition',
    patterns: [
      /supply\s+(?:and\s+)?competition/i,
      /competitive\s+(?:supply|analysis)/i,
      /comparable\s+analysis/i,
      /competition\s+analysis/i,
    ],
  },
];

/**
 * Studies reserved for eval — never used as few-shot exemplars.
 * Match is prefix/contains against study_id (case-insensitive).
 */
export const DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS = [
  'spencer',
  'lewiston',
  'placerville',
  'sharpsburg',
  '26-107',
  '26-109',
  '26-111',
  'GOLDEN-',
] as const;
