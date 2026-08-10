/**
 * State tourism figure slots + author checklist companion.
 *
 * Demand Indicators tourism infographics (overnight trip characteristics,
 * origin/season/DMA, visitor demographics) differ by state agency and year.
 * We do not auto-rebuild those branded pages — we emit cyan TOUR-0N
 * placeholders in the DOCX and a companion markdown checklist with hunt links.
 */

export type TourismFigureSlotId =
  | 'TOUR-01'
  | 'TOUR-02'
  | 'TOUR-03'
  | 'TOUR-04'
  | 'TOUR-05'
  | 'TOUR-06';

export interface TourismFigureSlot {
  id: TourismFigureSlotId;
  title: string;
  pasteWhat: string;
  /** What the TN template remnant typically looks like (for author context) */
  templateRemnantHint: string;
}

export const TOURISM_FIGURE_SLOTS: readonly TourismFigureSlot[] = [
  {
    id: 'TOUR-01',
    title: 'Overnight trip — transport to destination',
    pasteWhat: 'State vs U.S. Norm bar chart + callout % for mode share to destination',
    templateRemnantHint: 'template transport-to-destination mode-share page',
  },
  {
    id: 'TOUR-02',
    title: 'Overnight trip — transport within destination',
    pasteWhat: 'State vs U.S. Norm bar chart for mode share within destination',
    templateRemnantHint: 'template transport-within-destination mode-share page',
  },
  {
    id: 'TOUR-03',
    title: 'State origin of trip',
    pasteWhat: 'Top origin states % (map and/or ranked list)',
    templateRemnantHint: 'template state-origin map/list page',
  },
  {
    id: 'TOUR-04',
    title: 'Season of trip',
    pasteWhat: 'Quarterly overnight person-trips % (Jan–Mar … Oct–Dec)',
    templateRemnantHint: 'template season-of-trip calendar graphic',
  },
  {
    id: 'TOUR-05',
    title: 'DMA origin of trip',
    pasteWhat: 'Top Designated Market Areas bar chart with %',
    templateRemnantHint: 'template DMA-origin bar chart page',
  },
  {
    id: 'TOUR-06',
    title: 'Visitor demographic profile',
    pasteWhat:
      'Income / age / education / employment vs U.S. Norm (bars and/or donuts)',
    templateRemnantHint: 'template overnight-visitor demographic profile page',
  },
] as const;

export interface StateTourismSourceHints {
  stateAbbr: string;
  stateName: string;
  agencyGuess: string;
  searchQueries: string[];
  urls: string[];
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

/** Curated starting points; fall back to generic tourism-research queries. */
const STATE_TOURISM_HINTS: Record<
  string,
  { agencyGuess: string; urls: string[]; extraQueries?: string[] }
> = {
  OH: {
    agencyGuess: 'TourismOhio / Ohio Department of Development',
    urls: [
      'https://ohio.org/',
      'https://tourism.ohio.gov/',
      'https://www.google.com/search?q=Ohio+overnight+visitor+profile+tourism+research',
    ],
    extraQueries: [
      'Ohio overnight person-trips visitor profile',
      'TourismOhio visitor research DMA origin',
    ],
  },
  TN: {
    agencyGuess: 'Tennessee Department of Tourist Development',
    urls: [
      'https://www.tnvacation.com/',
      'https://www.tn.gov/tourism.html',
      'https://www.google.com/search?q=Tennessee+overnight+visitor+profile+Department+of+Tourist+Development',
    ],
  },
  CO: {
    agencyGuess: 'Colorado Tourism Office',
    urls: [
      'https://www.colorado.com/',
      'https://www.google.com/search?q=Colorado+overnight+visitor+profile+tourism+research',
    ],
  },
  TX: {
    agencyGuess: 'Travel Texas / Office of the Governor Economic Development',
    urls: [
      'https://www.traveltexas.com/',
      'https://www.google.com/search?q=Texas+overnight+visitor+profile+tourism+research',
    ],
  },
  FL: {
    agencyGuess: 'VISIT FLORIDA',
    urls: [
      'https://www.visitflorida.com/',
      'https://www.google.com/search?q=Florida+overnight+visitor+profile+VISIT+FLORIDA+research',
    ],
  },
  VA: {
    agencyGuess: 'Virginia Tourism Corporation',
    urls: [
      'https://www.virginia.org/',
      'https://www.google.com/search?q=Virginia+overnight+visitor+profile+tourism+research',
    ],
  },
  KY: {
    agencyGuess: 'Kentucky Department of Tourism',
    urls: [
      'https://www.kentuckytourism.com/',
      'https://www.google.com/search?q=Kentucky+overnight+visitor+profile+tourism+research',
    ],
  },
};

export function normalizeStateAbbr(state: string | null | undefined): string {
  const raw = (state ?? '').trim();
  if (!raw) return '';
  if (raw.length === 2) return raw.toUpperCase();
  const hit = Object.entries(STATE_NAMES).find(
    ([, name]) => name.toLowerCase() === raw.toLowerCase()
  );
  return hit?.[0] ?? raw.slice(0, 2).toUpperCase();
}

export function stateDisplayName(state: string | null | undefined): string {
  const abbr = normalizeStateAbbr(state);
  return STATE_NAMES[abbr] ?? (state?.trim() || 'the subject state');
}

export function resolveStateTourismSourceHints(
  state: string | null | undefined
): StateTourismSourceHints {
  const stateAbbr = normalizeStateAbbr(state);
  const stateName = stateDisplayName(state);
  const curated = STATE_TOURISM_HINTS[stateAbbr];
  const searchQueries = [
    `${stateName} overnight visitor profile`,
    `${stateName} tourism research overnight person-trips`,
    `${stateName} visitor demographic profile DMA origin`,
    ...(curated?.extraQueries ?? []),
  ];
  const urls = curated?.urls ?? [
    `https://www.google.com/search?q=${encodeURIComponent(`${stateName} tourism research overnight visitor profile`)}`,
    `https://www.google.com/search?q=${encodeURIComponent(`${stateName} department of tourism visitor statistics`)}`,
  ];
  return {
    stateAbbr: stateAbbr || 'XX',
    stateName,
    agencyGuess: curated?.agencyGuess ?? `${stateName} tourism / economic development agency`,
    searchQueries,
    urls,
  };
}

export interface TourismAuthorChecklistInput {
  studyId: string;
  propertyName: string;
  city: string;
  state: string;
  county?: string | null;
  draftDate?: string;
  companionDocxFileName?: string;
  companionXlsxFileName?: string;
  preferredDataYear?: string;
}

/** Cyan DOCX note text for one slot (no XML). */
export function tourismSlotPlaceholderText(
  slot: TourismFigureSlot,
  stateName: string,
  preferredYear?: string
): string {
  const yearHint = preferredYear ? ` Prefer ~${preferredYear} data when available.` : '';
  return (
    `[${slot.id}] Add ${slot.title} for ${stateName}. ` +
    `Paste: ${slot.pasteWhat}. ` +
    `Replace template remnant (${slot.templateRemnantHint}). ` +
    `Caption SOURCE: [state tourism agency] [year].` +
    yearHint +
    ` See companion author-checklist.md. Delete this cyan note when done.`
  );
}

export function buildTourismSlotPlaceholderTexts(
  state: string,
  preferredYear?: string
): string[] {
  const stateName = stateDisplayName(state);
  return TOURISM_FIGURE_SLOTS.map((slot) =>
    tourismSlotPlaceholderText(slot, stateName, preferredYear)
  );
}

export function buildTourismAnalystTasks(state: string): string[] {
  const hints = resolveStateTourismSourceHints(state);
  return [
    `State tourism figures: complete TOUR-01…TOUR-06 for ${hints.stateName} (see author-checklist.md). Agency start: ${hints.agencyGuess}.`,
    ...TOURISM_FIGURE_SLOTS.map(
      (s) => `${s.id}: paste ${s.title} (${s.pasteWhat}); remove cyan note when done.`
    ),
  ];
}

/**
 * Companion markdown written beside each draft (local reports/ or storage).
 */
export function buildTourismAuthorChecklistMarkdown(
  input: TourismAuthorChecklistInput
): string {
  const hints = resolveStateTourismSourceHints(input.state);
  const draftDate = input.draftDate ?? new Date().toISOString().slice(0, 10);
  const year = input.preferredDataYear ?? 'latest available (≤2 years old preferred)';
  const docx = input.companionDocxFileName ?? `${input.studyId}-report.docx`;
  const xlsx = input.companionXlsxFileName ?? `${input.studyId}-template.xlsx`;

  const lines: string[] = [
    `# Author checklist — state tourism figures`,
    ``,
    `## Header`,
    `- Study ID: ${input.studyId}`,
    `- Property: ${input.propertyName}`,
    `- Location: ${input.city}, ${hints.stateAbbr}${input.county ? ` (${input.county})` : ''}`,
    `- Draft date: ${draftDate}`,
    `- Companion DOCX: ${docx}`,
    `- Companion XLSX: ${xlsx}`,
    ``,
    `## Source hunt`,
    `- Primary agency (start here): **${hints.agencyGuess}**`,
    `- Preferred data year: ${year}`,
    `- Caption pattern: \`SOURCE: [agency] [year]\` (must match pasted figures; no Tennessee leftover if subject is not TN)`,
    ``,
    `### Suggested links`,
    ...hints.urls.map((u) => `- ${u}`),
    ``,
    `### Search queries`,
    ...hints.searchQueries.map((q) => `- \`${q}\``),
    ``,
    `## Exact slots (cyan in DOCX until cleared)`,
    ``,
  ];

  for (const slot of TOURISM_FIGURE_SLOTS) {
    lines.push(`### ${slot.id} — ${slot.title}`);
    lines.push(`- Paste: ${slot.pasteWhat}`);
    lines.push(`- Template remnant to replace: ${slot.templateRemnantHint}`);
    lines.push(
      `- DOCX note: cyan \`[${slot.id}]\` under Demand Indicators → Tourism Trends`
    );
    lines.push(`- Caption: SOURCE: ${hints.agencyGuess} [${year}]`);
    lines.push(``);
  }

  lines.push(`## Acceptance checks`);
  lines.push(`- [ ] No Tennessee / Jasper / TN DEPARTMENT OF TOURIST DEVELOPMENT leftover`);
  lines.push(`- [ ] Titles name **${hints.stateName}** (or regional subject market), not TN`);
  lines.push(`- [ ] SOURCE year matches the pasted figures`);
  lines.push(`- [ ] All six cyan TOUR-0N notes removed after paste`);
  lines.push(`- [ ] Figures are legible at print size (full-page or half-page as in Sage FS)`);
  lines.push(``);
  lines.push(`## Optional library`);
  lines.push(
    `- If your shared drive already has a filed ${hints.stateAbbr} overnight-visitor pack, link/path it here and reuse instead of re-hunting.`
  );
  lines.push(``);
  lines.push(`## Notes`);
  lines.push(
    `- Numeric tourism economics (spend/jobs) may already be in prose via the tourism_economics connector — that does **not** replace these branded overnight-trip infographic pages.`
  );
  lines.push(
    `- Do not invent bars/percentages. If the state does not publish a matching chart, leave the cyan note and document the gap in your review.`
  );
  lines.push(``);

  return lines.join('\n');
}

/** Soft QA: leftover TN tourism board fingerprints when subject is not TN. */
export const TN_TOURISM_FINGERPRINTS = [
  'TN DEPARTMENT OF TOURIST',
  'DEPARTMENT OF TOURIST DEVELOPMENT',
  'Overnight Tennessee',
  'Tennessee Visitors',
  'Tennessee\'s Overnight',
  "Tennessee's Overnight",
] as const;

export function findTnTourismFingerprintsInText(sample: string): string[] {
  if (!sample) return [];
  const hits: string[] = [];
  for (const fp of TN_TOURISM_FINGERPRINTS) {
    if (sample.includes(fp)) hits.push(fp);
  }
  return hits;
}
