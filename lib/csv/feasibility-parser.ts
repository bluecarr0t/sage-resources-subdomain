/**
 * Multi-section CSV parser for feasibility study comparable data.
 *
 * The CSVs exported from the feasibility authoring tool contain multiple
 * data tables stacked vertically with offset columns:
 *
 *   Section 1 (cols A-G): Property overview comparables
 *   Section 2 (cols H+):  Unit rate / occupancy comparables + summary rows
 *   Section 3 (optional): Phase projections & detailed numbered comps
 *
 * This parser detects section boundaries by scanning for known header
 * patterns, handles currency/percentage formatting, and normalises unit
 * types into standard categories.
 */

import { parse } from 'csv-parse/sync';
import { parseLocationAndState, getStateFromText } from '@/lib/feasibility-utils';
import type {
  ParsedComparable,
  ParsedCompUnit,
  ParsedSummary,
  ParsedFeasibilityCSV,
  ParsedPropertyScore,
  ParsedProFormaUnit,
  ParsedValuation,
  ProFormaYearlyData,
  CSVFileType,
  UnitCategory,
} from '@/lib/types/feasibility';

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

const ERROR_TOKENS = ['#REF!', '#VALUE!', '#DIV/0!', '#N/A', 'N/A', '-'];

function isErrorToken(val: string): boolean {
  return ERROR_TOKENS.includes(val.trim());
}

export function parseCurrency(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[$,\s]/g, '');
  if (!cleaned || isErrorToken(cleaned)) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parsePercentage(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[%\s]/g, '');
  if (!cleaned || isErrorToken(cleaned)) return null;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return num > 1 ? num / 100 : num;
}

function parseIntSafe(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[,\s]/g, '');
  if (!cleaned || isErrorToken(cleaned)) return null;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function parseFloatSafe(val: string | undefined | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[,\s]/g, '');
  if (!cleaned || isErrorToken(cleaned)) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function clean(val: string | undefined | null): string {
  if (!val) return '';
  return val.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Study ID extraction from filename
// ---------------------------------------------------------------------------

/** Study ID patterns (most specific first). Supports NN-NNN[A]?-NN and variants. */
const STUDY_ID_PATTERNS = [
  /^(\d{2}-\d{3}[A-Z]?-\d{2})\b/,           // 25-107A-01
  /^(\d{2}-\d{3}-\d{2})\b/,                 // 25-107-01 (no letter)
  /\b(\d{2}-\d{3}[A-Z]?-\d{2})\b/,          // anywhere in filename
  /^([A-Z]{2,4}-\d{3,6}[A-Z]?-\d{1,3})\b/i, // ALPHA-NNN-N (e.g. FS-101-1)
  /^(\d{6,10}[A-Z]?)\b/,                    // numeric-only IDs
];

export function extractStudyId(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').trim();
  for (const re of STUDY_ID_PATTERNS) {
    const match = base.match(re);
    if (match && match[1].length >= 4 && match[1].length <= 40) {
      return match[1];
    }
  }
  // Fallback: use first "word" (alphanumeric + hyphens) or first 40 chars
  const wordMatch = base.match(/^([A-Za-z0-9][A-Za-z0-9\-_.]*)/);
  if (wordMatch) return wordMatch[1].slice(0, 40);
  return base.slice(0, 40) || 'unknown';
}

// ---------------------------------------------------------------------------
// Amenity keyword extraction
// ---------------------------------------------------------------------------

const AMENITY_KEYWORDS_MAP: Record<string, string[]> = {
  'hot tub': ['hot tub', 'hot tubs', 'soaking tub'],
  'pool': ['pool', 'swimming'],
  'kitchen': ['kitchen', 'kitchenette'],
  'fireplace': ['fireplace', 'fire pit', 'fire pits'],
  'bathroom': ['bathroom', 'ensuite', 'en-suite', 'shower', 'toilet'],
  'deck': ['deck', 'patio', 'terrace', 'balcony'],
  'grill': ['grill', 'bbq', 'barbecue'],
  'hiking': ['hiking', 'trails', 'trail'],
  'fishing': ['fishing', 'kayaking', 'lake'],
  'spa': ['spa', 'sauna', 'cold plunge', 'wellness'],
  'dining': ['dining', 'restaurant', 'chef', 'gourmet'],
  'event venue': ['event', 'wedding', 'venue'],
  'air conditioning': ['a/c', 'ac', 'air conditioning', 'hvac'],
  'heating': ['heating', 'heater', 'heated'],
  'wifi': ['wifi', 'wi-fi', 'internet'],
  'hammock': ['hammock'],
  'bed': ['king', 'queen', 'bed'],
};

export function extractAmenityKeywords(amenityText: string | null | undefined): string[] {
  if (!amenityText) return [];
  const lower = amenityText.toLowerCase();
  const found: string[] = [];
  for (const [keyword, patterns] of Object.entries(AMENITY_KEYWORDS_MAP)) {
    if (patterns.some((p) => lower.includes(p))) {
      found.push(keyword);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Unit type normalisation
// ---------------------------------------------------------------------------

const UNIT_CATEGORY_PATTERNS: Array<[RegExp, UnitCategory]> = [
  [/treehouse|tree\s*house/i, 'treehouse'],
  [/dome|geodesic/i, 'dome'],
  [/a[- ]?frame/i, 'a_frame'],
  [/safari\s*tent/i, 'safari_tent'],
  [/tent|glamping\s*tent/i, 'tent'],
  [/tiny\s*(home|house)|micro/i, 'tiny_home'],
  [/mirror\s*cabin/i, 'mirror_cabin'],
  [/container|shipping/i, 'container'],
  [/yurt/i, 'yurt'],
  [/rv|recreational|pull.?thru|back.?in|airstream/i, 'rv_site'],
  [/cabin|cottage|lodge|hut|barn\s*home/i, 'cabin'],
];

export function normaliseUnitCategory(unitType: string): UnitCategory {
  for (const [pattern, category] of UNIT_CATEGORY_PATTERNS) {
    if (pattern.test(unitType)) return category;
  }
  return 'other';
}

function inferPropertyType(overview: string | null, amenities: string | null): string | null {
  const combined = `${overview || ''} ${amenities || ''}`.toLowerCase();
  if (/luxury|high.?end|luxe|ultra|premium/i.test(combined)) return 'luxury';
  if (/budget|basic|economy/i.test(combined)) return 'budget';
  if (/mid|moderate|standard/i.test(combined)) return 'mid-range';
  return null;
}

// ---------------------------------------------------------------------------
// Section detection helpers
// ---------------------------------------------------------------------------

function isOverviewHeader(cells: string[]): boolean {
  const joined = cells.join('|').toLowerCase();
  return (
    (joined.includes('name') && joined.includes('overview')) ||
    (joined.includes('name') && (joined.includes('ameniti') || joined.includes('amenity')))
  );
}

function isUnitRateHeader(cells: string[]): boolean {
  const joined = cells.join('|').toLowerCase();
  return (
    (joined.includes('type') && (joined.includes('adr') || joined.includes('daily'))) ||
    (joined.includes('type') && joined.includes('units') && joined.includes('rate'))
  );
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => !c || !c.trim());
}

function isSummaryRow(cells: string[]): boolean {
  const joined = cells.join('|').toLowerCase();
  return /\b(minimum|average|max(imum)?)\s*:/i.test(joined);
}

function isPhaseRow(cells: string[]): boolean {
  const joined = cells.join('|').toLowerCase();
  return /phase\s*\d/i.test(joined);
}

// ---------------------------------------------------------------------------
// Row-level parsers
// ---------------------------------------------------------------------------

function parseOverviewRow(cells: string[], offset: number): ParsedComparable | null {
  const name = clean(cells[offset + 0]);
  if (!name || name.toLowerCase() === 'name') return null;
  if (/^(minimum|average|max)/i.test(name)) return null;

  const overview = clean(cells[offset + 1]) || null;
  const amenities = clean(cells[offset + 2]) || null;
  const distance = parseFloatSafe(cells[offset + 3]);
  const totalSites = parseIntSafe(cells[offset + 4]);
  const qualityScore = parseFloatSafe(cells[offset + 5]);

  if (!overview && !amenities && distance === null && totalSites === null && qualityScore === null) {
    return null;
  }

  // Parse overview for location/state; ensure "Location: City, ST" format when source has it
  let finalOverview = overview;
  let state: string | null = null;
  const parsedLoc = parseLocationAndState(overview || '');
  if (parsedLoc) {
    state = parsedLoc.state;
    if (!overview?.match(/Location:\s*/i)) {
      const rest = overview?.replace(/^[^.]*\.?\s*/, '').trim();
      finalOverview = rest ? `Location: ${parsedLoc.locationFormatted}. ${rest}` : `Location: ${parsedLoc.locationFormatted}`;
    }
  } else if (overview) {
    const locMatch = overview.match(/Location:\s*([^.]+)/i);
    if (locMatch) {
      const locParsed = parseLocationAndState(locMatch[1].trim());
      if (locParsed) state = locParsed.state;
    }
  }
  if (!state) state = getStateFromText(name);

  return {
    comp_name: name,
    overview: finalOverview,
    state,
    amenities,
    amenity_keywords: extractAmenityKeywords(amenities),
    distance_miles: distance,
    total_sites: totalSites,
    quality_score: qualityScore,
    property_type: inferPropertyType(overview, amenities),
  };
}

interface UnitRateColumns {
  nameIdx: number;
  typeIdx: number;
  unitsIdx: number;
  lowAdrIdx: number;
  peakAdrIdx: number;
  lowMonthlyIdx: number;
  peakMonthlyIdx: number;
  lowOccIdx: number;
  peakOccIdx: number;
  qualityIdx: number;
  avgAdrIdx: number;
}

function detectUnitRateColumns(headerCells: string[]): UnitRateColumns | null {
  const lower = headerCells.map((c) => (c || '').toLowerCase().trim());

  const nameIdx = lower.findIndex((c) => c === 'name' || c.includes('name'));
  const typeIdx = lower.findIndex((c) => c === 'type' || c.includes('type'));
  const unitsIdx = lower.findIndex(
    (c) => c.includes('units') || c.includes('sites') || c === '# units' || c === 'total # of sites'
  );
  const lowAdrIdx = lower.findIndex(
    (c) => c.includes('low') && (c.includes('adr') || c.includes('daily') || c.includes('rate'))
  );
  const peakAdrIdx = lower.findIndex(
    (c) => c.includes('peak') && (c.includes('adr') || c.includes('daily') || c.includes('rate'))
  );
  const lowMonthlyIdx = lower.findIndex((c) => c.includes('low') && c.includes('monthly'));
  const peakMonthlyIdx = lower.findIndex((c) => c.includes('peak') && c.includes('monthly'));
  const lowOccIdx = lower.findIndex((c) => c.includes('low') && c.includes('occ'));
  const peakOccIdx = lower.findIndex((c) => c.includes('peak') && c.includes('occ'));
  const qualityIdx = lower.findIndex((c) => c.includes('quality'));
  const avgAdrIdx = lower.findIndex(
    (c) => c.includes('avg') && (c.includes('adr') || c.includes('annual'))
  );

  if (typeIdx < 0 || (lowAdrIdx < 0 && peakAdrIdx < 0)) return null;

  return {
    nameIdx: nameIdx >= 0 ? nameIdx : typeIdx - 1,
    typeIdx,
    unitsIdx: unitsIdx >= 0 ? unitsIdx : -1,
    lowAdrIdx: lowAdrIdx >= 0 ? lowAdrIdx : -1,
    peakAdrIdx: peakAdrIdx >= 0 ? peakAdrIdx : -1,
    lowMonthlyIdx: lowMonthlyIdx >= 0 ? lowMonthlyIdx : -1,
    peakMonthlyIdx: peakMonthlyIdx >= 0 ? peakMonthlyIdx : -1,
    lowOccIdx: lowOccIdx >= 0 ? lowOccIdx : -1,
    peakOccIdx: peakOccIdx >= 0 ? peakOccIdx : -1,
    qualityIdx: qualityIdx >= 0 ? qualityIdx : -1,
    avgAdrIdx: avgAdrIdx >= 0 ? avgAdrIdx : -1,
  };
}

function parseUnitRateRow(
  cells: string[],
  cols: UnitRateColumns,
  lastPropertyName: string
): { unit: ParsedCompUnit; propertyName: string } | null {
  const rawType = clean(cells[cols.typeIdx]);
  if (!rawType) return null;

  let propertyName = clean(cells[cols.nameIdx]) || lastPropertyName;
  propertyName = propertyName.replace(/\n/g, ', ').trim();

  const lowAdr = cols.lowAdrIdx >= 0 ? parseCurrency(cells[cols.lowAdrIdx]) : null;
  const peakAdr = cols.peakAdrIdx >= 0 ? parseCurrency(cells[cols.peakAdrIdx]) : null;

  if (lowAdr === null && peakAdr === null) return null;

  return {
    propertyName,
    unit: {
      property_name: propertyName,
      unit_type: rawType,
      unit_category: normaliseUnitCategory(rawType),
      num_units: cols.unitsIdx >= 0 ? parseIntSafe(cells[cols.unitsIdx]) : null,
      low_adr: lowAdr,
      peak_adr: peakAdr,
      avg_annual_adr: cols.avgAdrIdx >= 0 ? parseCurrency(cells[cols.avgAdrIdx]) : null,
      low_monthly_rate: cols.lowMonthlyIdx >= 0 ? parseCurrency(cells[cols.lowMonthlyIdx]) : null,
      peak_monthly_rate:
        cols.peakMonthlyIdx >= 0 ? parseCurrency(cells[cols.peakMonthlyIdx]) : null,
      low_occupancy: cols.lowOccIdx >= 0 ? parsePercentage(cells[cols.lowOccIdx]) : null,
      peak_occupancy: cols.peakOccIdx >= 0 ? parsePercentage(cells[cols.peakOccIdx]) : null,
      quality_score: cols.qualityIdx >= 0 ? parseFloatSafe(cells[cols.qualityIdx]) : null,
    },
  };
}

function parseSummaryRow(
  cells: string[],
  cols: UnitRateColumns,
  statType: 'market_min' | 'market_avg' | 'market_max'
): ParsedSummary {
  return {
    summary_type: statType,
    label: statType.replace('market_', ''),
    num_units: cols.unitsIdx >= 0 ? parseIntSafe(cells[cols.unitsIdx]) : null,
    low_adr: cols.lowAdrIdx >= 0 ? parseCurrency(cells[cols.lowAdrIdx]) : null,
    peak_adr: cols.peakAdrIdx >= 0 ? parseCurrency(cells[cols.peakAdrIdx]) : null,
    low_monthly_rate: cols.lowMonthlyIdx >= 0 ? parseCurrency(cells[cols.lowMonthlyIdx]) : null,
    peak_monthly_rate: cols.peakMonthlyIdx >= 0 ? parseCurrency(cells[cols.peakMonthlyIdx]) : null,
    low_occupancy: cols.lowOccIdx >= 0 ? parsePercentage(cells[cols.lowOccIdx]) : null,
    peak_occupancy: cols.peakOccIdx >= 0 ? parsePercentage(cells[cols.peakOccIdx]) : null,
    quality_score: cols.qualityIdx >= 0 ? parseFloatSafe(cells[cols.qualityIdx]) : null,
  };
}

function parsePhaseRow(cells: string[], cols: UnitRateColumns): ParsedSummary | null {
  const joined = cells.join(' ');
  const phaseMatch = joined.match(/Phase\s*(\d+)\s*[-–—]?\s*(.*?)(?:,|$)/i);
  if (!phaseMatch) return null;

  const label = clean(joined.match(/Phase\s*\d+\s*[-–—]?\s*([^,]+)/i)?.[1] || `Phase ${phaseMatch[1]}`);

  return {
    summary_type: 'phase',
    label: `Phase ${phaseMatch[1]} - ${label}`,
    num_units: cols.unitsIdx >= 0 ? parseIntSafe(cells[cols.unitsIdx]) : null,
    low_adr: cols.lowAdrIdx >= 0 ? parseCurrency(cells[cols.lowAdrIdx]) : null,
    peak_adr: cols.peakAdrIdx >= 0 ? parseCurrency(cells[cols.peakAdrIdx]) : null,
    low_monthly_rate: cols.lowMonthlyIdx >= 0 ? parseCurrency(cells[cols.lowMonthlyIdx]) : null,
    peak_monthly_rate: cols.peakMonthlyIdx >= 0 ? parseCurrency(cells[cols.peakMonthlyIdx]) : null,
    low_occupancy: cols.lowOccIdx >= 0 ? parsePercentage(cells[cols.lowOccIdx]) : null,
    peak_occupancy: cols.peakOccIdx >= 0 ? parsePercentage(cells[cols.peakOccIdx]) : null,
    quality_score: cols.qualityIdx >= 0 ? parseFloatSafe(cells[cols.qualityIdx]) : null,
  };
}

// ---------------------------------------------------------------------------
// Detailed comps parser (numbered rows in section 3 of Jasper-style files)
// ---------------------------------------------------------------------------

function parseDetailedCompRow(cells: string[]): ParsedCompUnit | null {
  const nonEmpty = cells.filter((c) => c && c.trim());
  if (nonEmpty.length < 4) return null;

  let offset = 0;
  for (let i = 0; i < cells.length; i++) {
    const v = cells[i]?.trim();
    if (v && /^\d+$/.test(v) && parseInt(v) <= 100) {
      offset = i;
      break;
    }
  }

  const propertyName = clean(cells[offset + 1]);
  const unitType = clean(cells[offset + 2]);
  if (!propertyName || !unitType) return null;

  const numUnits = parseIntSafe(cells[offset + 3]);
  const lowAdr = parseCurrency(cells[offset + 4]);
  const peakAdr = parseCurrency(cells[offset + 5]);
  const avgAdr = parseCurrency(cells[offset + 6]);
  const lowOcc = parsePercentage(cells[offset + 7]);
  const peakOcc = parsePercentage(cells[offset + 8]);
  const quality = parseFloatSafe(cells[offset + 9]);

  if (lowAdr === null && peakAdr === null) return null;

  return {
    property_name: propertyName.replace(/\n/g, ', ').trim(),
    unit_type: unitType,
    unit_category: normaliseUnitCategory(unitType),
    num_units: numUnits,
    low_adr: lowAdr,
    peak_adr: peakAdr,
    avg_annual_adr: avgAdr,
    low_monthly_rate: null,
    peak_monthly_rate: null,
    low_occupancy: lowOcc,
    peak_occupancy: peakOcc,
    quality_score: quality,
  };
}

// ---------------------------------------------------------------------------
// File type detection
// ---------------------------------------------------------------------------

export function detectFileType(csvText: string, filename: string): CSVFileType {
  const lower = filename.toLowerCase();

  if (/\(all\s*comps\)/i.test(lower) || /\(comps?\s*summ/i.test(lower)) {
    return 'comps_summary';
  }
  if (/\(best\s*comps\)/i.test(lower)) {
    return 'best_comps';
  }
  if (/\(\d+\s*yr\s*pf\)/i.test(lower) || /pro\s*forma/i.test(lower)) {
    return 'pro_forma';
  }
  if (/\(direct\s*cap\)/i.test(lower) || /capitalization/i.test(lower)) {
    return 'direct_cap';
  }

  const sample = csvText.slice(0, 3000).toLowerCase();

  if (sample.includes('occupancy call') || sample.includes('busiest times') || sample.includes('brand strength')) {
    return 'best_comps';
  }
  if (sample.includes('year 1') && sample.includes('year 2') && sample.includes('noi')) {
    return 'pro_forma';
  }
  if (sample.includes('direct capitalization') || sample.includes('oar') || sample.includes('indicated stabilized value')) {
    return 'direct_cap';
  }
  if (sample.includes('overview') && (sample.includes('ameniti') || sample.includes('quality score'))) {
    return 'comps_summary';
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Best Comps parser — 6-dimension qualitative property scoring
// ---------------------------------------------------------------------------

function matchesCategory(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (lower === 'unit type(s)' || lower === 'unit types') return 'unit_types';
  if (lower === 'unit amenities') return 'unit_amenities';
  if (lower === 'property amenities') return 'property_amenities';
  if (lower === 'property') return 'property';
  if (lower === 'location') return 'location';
  if (lower === 'brand strength') return 'brand_strength';
  if (lower === 'occupancy notes') return 'occupancy_notes';
  return null;
}

function parseBestComps(rows: string[][]): ParsedPropertyScore[] {
  const scores: ParsedPropertyScore[] = [];
  let current: ParsedPropertyScore | null = null;

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells || cells.length < 3) continue;
    if (isBlankRow(cells)) continue;

    const col1 = clean(cells[1] || '');
    const col2 = clean(cells[2] || '');
    const col3 = clean(cells[3] || '');

    if (
      col1 &&
      !matchesCategory(col1) &&
      col2 &&
      parseFloatSafe(col2) !== null &&
      (col3.toLowerCase() === 'description' || col3 === '')
    ) {
      if (current) scores.push(current);
      current = {
        property_name: col1,
        overall_score: parseFloatSafe(col2),
        is_subject: false,
        unit_types_score: null,
        unit_types_description: null,
        unit_amenities_score: null,
        unit_amenities_description: null,
        property_score: null,
        property_description: null,
        property_amenities_score: null,
        property_amenities_description: null,
        location_score: null,
        location_description: null,
        brand_strength_score: null,
        brand_strength_description: null,
        occupancy_notes: null,
      };
      continue;
    }

    if (!current) continue;

    const category = matchesCategory(col1);
    if (!category) continue;

    const score = parseFloatSafe(col2);
    const description = clean(col3) || null;

    switch (category) {
      case 'unit_types':
        current.unit_types_score = score;
        current.unit_types_description = description;
        break;
      case 'unit_amenities':
        current.unit_amenities_score = score;
        current.unit_amenities_description = description;
        break;
      case 'property':
        current.property_score = score;
        current.property_description = description;
        break;
      case 'property_amenities':
        current.property_amenities_score = score;
        current.property_amenities_description = description;
        break;
      case 'location':
        current.location_score = score;
        current.location_description = description;
        break;
      case 'brand_strength':
        current.brand_strength_score = score;
        current.brand_strength_description = description;
        break;
      case 'occupancy_notes':
        current.occupancy_notes = description;
        break;
    }
  }

  if (current) scores.push(current);

  // Check for subject property scoring in far-right columns
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells || cells.length < 30) continue;

    for (let c = 25; c < cells.length - 2; c++) {
      const val = clean(cells[c] || '');
      if (val.toLowerCase() === 'category') {
        const nextRow1Col = clean(rows[i + 1]?.[c] || '');
        if (matchesCategory(nextRow1Col)) {
          const subject: ParsedPropertyScore = {
            property_name: 'Subject Property',
            overall_score: null,
            is_subject: true,
            unit_types_score: null, unit_types_description: null,
            unit_amenities_score: null, unit_amenities_description: null,
            property_score: null, property_description: null,
            property_amenities_score: null, property_amenities_description: null,
            location_score: null, location_description: null,
            brand_strength_score: null, brand_strength_description: null,
            occupancy_notes: null,
          };

          const scoreCol = c + 1;
          const justCol = c + 2;

          for (let r = i + 1; r < Math.min(i + 10, rows.length); r++) {
            const cat = matchesCategory(clean(rows[r]?.[c] || ''));
            if (!cat) continue;
            const s = parseFloatSafe(rows[r]?.[scoreCol]);
            const j = clean(rows[r]?.[justCol] || '') || null;
            switch (cat) {
              case 'unit_types': subject.unit_types_score = s; subject.unit_types_description = j; break;
              case 'unit_amenities': subject.unit_amenities_score = s; subject.unit_amenities_description = j; break;
              case 'property': subject.property_score = s; subject.property_description = j; break;
              case 'property_amenities': subject.property_amenities_score = s; subject.property_amenities_description = j; break;
              case 'location': subject.location_score = s; subject.location_description = j; break;
              case 'brand_strength': subject.brand_strength_score = s; subject.brand_strength_description = j; break;
            }
          }

          const subjectScores = [subject.unit_types_score, subject.unit_amenities_score, subject.property_score, subject.property_amenities_score, subject.location_score, subject.brand_strength_score].filter((s) => s !== null) as number[];
          if (subjectScores.length > 0) {
            subject.overall_score = parseFloat((subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length).toFixed(2));

            const nameRow = rows[i - 1];
            if (nameRow) {
              const possibleName = clean(nameRow[c] || '') || clean(nameRow[c + 1] || '');
              if (possibleName && possibleName.length > 2 && possibleName.toLowerCase() !== 'category') {
                subject.property_name = possibleName;
              }
            }

            scores.push(subject);
          }
          break;
        }
      }
    }
  }

  return scores;
}

// ---------------------------------------------------------------------------
// Pro Forma parser — multi-year revenue projections by unit type
// ---------------------------------------------------------------------------

function parseProForma(rows: string[][]): {
  units: ParsedProFormaUnit[];
  valuation: ParsedValuation | null;
} {
  const units: ParsedProFormaUnit[] = [];

  let yearColumns: number[] = [];
  let currentUnitType: string | null = null;
  let currentUnitCount: number | null = null;
  let currentGrowthRate: number | null = null;
  let currentYearlyData: ProFormaYearlyData[] = [];

  const yearlyTotals: Array<{ year: number; total_revenue: number | null; total_expenses: number | null; noi: number | null; noi_margin: number | null }> = [];
  const expenseBreakdown: Array<{ category: string; amount: number | null; per_unit: number | null; pct_of_revenue: number | null }> = [];
  let stabilizedNoi: number | null = null;
  let stabilizedRevenue: number | null = null;
  let terminalCap: number | null = null;
  let projectedSalePrice: number | null = null;
  let discountRate: number | null = null;

  function flushUnit() {
    if (currentUnitType && currentYearlyData.length > 0) {
      units.push({
        unit_type: currentUnitType,
        unit_category: normaliseUnitCategory(currentUnitType),
        unit_count: currentUnitCount,
        adr_growth_rate: currentGrowthRate,
        yearly_data: [...currentYearlyData],
      });
    }
    currentUnitType = null;
    currentUnitCount = null;
    currentGrowthRate = null;
    currentYearlyData = [];
  }

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells || cells.length < 3) continue;
    if (isBlankRow(cells)) continue;

    const joined = cells.join('|').toLowerCase();

    // Detect year header row
    if (joined.includes('year 1') && joined.includes('year 2')) {
      yearColumns = [];
      for (let c = 0; c < cells.length; c++) {
        const m = cells[c]?.trim().match(/^Year\s+(\d+)$/i);
        if (m) yearColumns.push(c);
      }
      continue;
    }

    if (yearColumns.length === 0) continue;

    const col1 = clean(cells[1] || '');
    const col1Lower = col1.toLowerCase();

    // Detect unit type start (a row that has a unit name and a number in the first year column)
    if (
      col1 &&
      !col1Lower.includes('adr') &&
      !col1Lower.includes('occupancy') &&
      !col1Lower.includes('site nights') &&
      !col1Lower.includes('revenue') &&
      !col1Lower.includes('expense') &&
      !col1Lower.includes('total') &&
      !col1Lower.includes('income') &&
      !col1Lower.includes('noi') &&
      !col1Lower.startsWith('$') &&
      !col1Lower.includes('yoy') &&
      !col1Lower.includes('payroll') &&
      !col1Lower.includes('marketing') &&
      !col1Lower.includes('repair') &&
      !col1Lower.includes('utilit') &&
      !col1Lower.includes('management') &&
      !col1Lower.includes('insurance') &&
      !col1Lower.includes('tax') &&
      !col1Lower.includes('legal') &&
      !col1Lower.includes('credit') &&
      !col1Lower.includes('room turn') &&
      !col1Lower.includes('general') &&
      !col1Lower.includes('replacement') &&
      !col1Lower.includes('franchise') &&
      !col1Lower.includes('misc') &&
      !col1Lower.includes('f&b') &&
      !col1Lower.includes('golf') &&
      !col1Lower.includes('bayou') &&
      !col1Lower.includes('sales tax') &&
      !col1Lower.includes('year ') &&
      !col1Lower.includes('stabilized')
    ) {
      const firstYearVal = parseIntSafe(cells[yearColumns[0]]);
      if (firstYearVal !== null && firstYearVal > 0 && firstYearVal < 10000) {
        flushUnit();
        currentUnitType = col1;
        currentUnitCount = firstYearVal;
        continue;
      }
    }

    if (currentUnitType) {
      if (col1Lower === 'adr' || col1Lower.startsWith('adr')) {
        currentGrowthRate = parsePercentage(cells[2]);
        const adrValues = yearColumns.map((c) => parseCurrency(cells[c]));
        adrValues.forEach((adr, idx) => {
          if (!currentYearlyData[idx]) {
            currentYearlyData[idx] = { year: idx + 1, adr: null, occupancy: null, site_nights: null, revenue: null };
          }
          currentYearlyData[idx].adr = adr;
        });
        continue;
      }

      if (col1Lower === 'occupancy' || col1Lower.startsWith('occupancy')) {
        const occValues = yearColumns.map((c) => parsePercentage(cells[c]));
        occValues.forEach((occ, idx) => {
          if (!currentYearlyData[idx]) {
            currentYearlyData[idx] = { year: idx + 1, adr: null, occupancy: null, site_nights: null, revenue: null };
          }
          currentYearlyData[idx].occupancy = occ;
        });
        continue;
      }

      if (col1Lower.includes('site nights')) {
        const snValues = yearColumns.map((c) => parseIntSafe(cells[c]));
        snValues.forEach((sn, idx) => {
          if (!currentYearlyData[idx]) {
            currentYearlyData[idx] = { year: idx + 1, adr: null, occupancy: null, site_nights: null, revenue: null };
          }
          currentYearlyData[idx].site_nights = sn;
        });
        continue;
      }

      if (col1Lower === 'revenue' || col1Lower.startsWith('revenue')) {
        const revValues = yearColumns.map((c) => parseCurrency(cells[c]));
        revValues.forEach((rev, idx) => {
          if (!currentYearlyData[idx]) {
            currentYearlyData[idx] = { year: idx + 1, adr: null, occupancy: null, site_nights: null, revenue: null };
          }
          currentYearlyData[idx].revenue = rev;
        });
        flushUnit();
        continue;
      }
    }

    // Capture financial summary rows
    if (col1Lower.includes('total revenue') || col1Lower === 'total revenue') {
      flushUnit();
      yearColumns.forEach((c, idx) => {
        if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
        yearlyTotals[idx].total_revenue = parseCurrency(cells[c]);
      });
      continue;
    }

    if (col1Lower.includes('total expense') && col1Lower.includes('reserve')) {
      yearColumns.forEach((c, idx) => {
        if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
        yearlyTotals[idx].total_expenses = parseCurrency(cells[c]);
      });
      continue;
    }

    if (col1Lower.includes('net operating income') || col1Lower === 'noi') {
      yearColumns.forEach((c, idx) => {
        if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
        yearlyTotals[idx].noi = parseCurrency(cells[c]);
      });
      continue;
    }

    if (col1Lower.includes('noi %') || col1Lower.includes('noi margin')) {
      yearColumns.forEach((c, idx) => {
        if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
        yearlyTotals[idx].noi_margin = parsePercentage(cells[c]);
      });
      continue;
    }

    // Capture terminal/sale data
    if (joined.includes('terminal cap') || joined.includes('terminal rate')) {
      for (const cell of cells) {
        const v = parsePercentage(cell);
        if (v !== null && v > 0 && v < 1) { terminalCap = v; break; }
      }
    }
    if (joined.includes('sales price') || joined.includes('sale price')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 100000) { projectedSalePrice = v; break; }
      }
    }
    if (joined.includes('discount rate')) {
      for (const cell of cells) {
        const v = parsePercentage(cell);
        if (v !== null && v > 0 && v < 1) { discountRate = v; break; }
      }
    }

    // Capture stabilized values
    if (joined.includes('stabilized') && joined.includes('revenue')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 10000) { stabilizedRevenue = v; break; }
      }
    }
    if (joined.includes('stabilized') && (joined.includes('noi') || joined.includes('net operating'))) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 10000) { stabilizedNoi = v; break; }
      }
    }
  }

  flushUnit();

  let valuation: ParsedValuation | null = null;
  if (yearlyTotals.length > 0 || stabilizedNoi !== null) {
    const stabilizedYear = yearlyTotals.findIndex((y) => y.noi !== null && y.noi_margin !== null && y.noi_margin >= 0.5);
    valuation = {
      valuation_type: 'pro_forma',
      total_units: units.reduce((sum, u) => sum + (u.unit_count || 0), 0),
      occupancy_rate: null,
      average_daily_rate: null,
      annual_lodging_revenue: null,
      total_revenue: stabilizedRevenue || yearlyTotals[stabilizedYear >= 0 ? stabilizedYear : yearlyTotals.length - 1]?.total_revenue || null,
      total_expenses: yearlyTotals[stabilizedYear >= 0 ? stabilizedYear : yearlyTotals.length - 1]?.total_expenses || null,
      total_expenses_with_reserves: null,
      noi: stabilizedNoi || yearlyTotals[stabilizedYear >= 0 ? stabilizedYear : yearlyTotals.length - 1]?.noi || null,
      noi_margin: yearlyTotals[stabilizedYear >= 0 ? stabilizedYear : yearlyTotals.length - 1]?.noi_margin || null,
      cap_rate: terminalCap,
      indicated_value: projectedSalePrice,
      value_per_unit: null,
      stabilization_months: null,
      stabilization_cost: null,
      as_is_value: null,
      discount_rate: discountRate,
      terminal_cap_rate: terminalCap,
      projected_sale_price: projectedSalePrice,
      market_rental_rates: [],
      expense_breakdown: expenseBreakdown,
      yearly_projections: yearlyTotals,
    };
  }

  return { units, valuation };
}

// ---------------------------------------------------------------------------
// Direct Cap parser — valuation + market rental rate conclusions
// ---------------------------------------------------------------------------

function parseDirectCap(rows: string[][]): ParsedValuation | null {
  let totalUnits: number | null = null;
  let occupancyRate: number | null = null;
  let averageDailyRate: number | null = null;
  let annualLodgingRevenue: number | null = null;
  let totalRevenue: number | null = null;
  let totalExpenses: number | null = null;
  let totalExpensesWithReserves: number | null = null;
  let noi: number | null = null;
  let noiMargin: number | null = null;
  let capRate: number | null = null;
  let indicatedValue: number | null = null;
  let valuePerUnit: number | null = null;
  let asIsValue: number | null = null;
  let stabilizationCost: number | null = null;

  const expenseBreakdown: Array<{ category: string; amount: number | null; per_unit: number | null; pct_of_revenue: number | null }> = [];
  const marketRentalRates: Array<{ unit_type: string; daily_rate: number | null; weekly_rate: number | null; monthly_rate: number | null; renter_pct_daily: number | null; renter_pct_weekly: number | null; renter_pct_monthly: number | null }> = [];

  // Scan for market rental rate conclusion tables
  let rateHeaderRow = -1;
  let rateUnitTypes: string[] = [];
  let rateUnitCols: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells || cells.length < 5) continue;
    const joined = cells.join('|').toLowerCase();

    // Find unit count
    if (joined.includes('units') && !joined.includes('per unit') && !joined.includes('unit type')) {
      for (const cell of cells) {
        const v = parseIntSafe(cell);
        if (v !== null && v > 0 && v < 5000) { totalUnits = v; break; }
      }
    }

    // Occupancy
    if (joined.includes('occupancy') && !joined.includes('stabilized occupancy') && !joined.includes('projected occupancy')) {
      for (const cell of cells) {
        const v = parsePercentage(cell);
        if (v !== null && v > 0.1 && v <= 1) { occupancyRate = v; break; }
      }
    }

    // ADR
    if (joined.includes('average daily rate') || (joined.includes('adr') && !joined.includes('growth'))) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 10 && v < 10000) { averageDailyRate = v; break; }
      }
    }

    // Annual lodging revenue
    if (joined.includes('annual lodging revenue') || joined.includes('lodging revenue')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 10000) { annualLodgingRevenue = v; break; }
      }
    }

    // Total revenue
    if ((joined.includes('total revenue') || joined.match(/^[,|]*total revenue/)) && !joined.includes('expense')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 10000) { totalRevenue = v; break; }
      }
    }

    // NOI
    if (joined.includes('noi') && !joined.includes('%') && !joined.includes('growth') && !joined.includes('margin') && !joined.includes('year')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && Math.abs(v) > 1000) { noi = v; break; }
      }
    }

    // NOI margin
    if (joined.includes('noi') && (joined.includes('%') || joined.includes('margin'))) {
      for (const cell of cells) {
        const v = parsePercentage(cell);
        if (v !== null && v > 0 && v < 1) { noiMargin = v; break; }
      }
    }

    // Total expenses
    if (joined.includes('total expense') && !joined.includes('reserve')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 1000) { totalExpenses = v; break; }
      }
    }

    if (joined.includes('total expense') && joined.includes('reserve')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 1000) { totalExpensesWithReserves = v; break; }
      }
    }

    // OAR / Cap rate
    if (joined.includes('oar') || (joined.includes('cap') && joined.includes('rate') && !joined.includes('terminal'))) {
      for (const cell of cells) {
        const v = parsePercentage(cell);
        if (v !== null && v > 0.01 && v < 0.5) { capRate = v; break; }
      }
    }

    // Indicated value
    if (joined.includes('indicated') && joined.includes('value')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 50000) { indicatedValue = v; break; }
      }
    }

    // Value conclusion
    if (joined.includes('value conclusion') || joined.includes('value, rounded') || joined.includes('as is')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && v > 50000) { asIsValue = v; break; }
      }
      // Check for per-unit
      for (const cell of cells) {
        if (cell && cell.includes('/Unit')) {
          const v = parseCurrency(cell.replace(/\/Unit/i, ''));
          if (v !== null) valuePerUnit = v;
        }
      }
    }

    // Stabilization cost
    if (joined.includes('stabilization cost') || joined.includes('less: stabilization')) {
      for (const cell of cells) {
        const v = parseCurrency(cell);
        if (v !== null && Math.abs(v) > 100) { stabilizationCost = Math.abs(v); break; }
      }
    }

    // Expense line items
    const expenseCategories = ['marketing', 'real estate tax', 'payroll', 'repairs', 'maintenance', 'utilities', 'trash', 'general', 'admin', 'legal', 'professional', 'insurance', 'management fee', 'franchise'];
    for (const cat of expenseCategories) {
      if (joined.includes(cat)) {
        const amounts = cells.filter((c) => c).map((c) => parseCurrency(c)).filter((v): v is number => v !== null && v > 0);
        if (amounts.length > 0) {
          const pctCells = cells.filter((c) => c && c.includes('%'));
          const pct = pctCells.length > 0 ? parsePercentage(pctCells[pctCells.length - 1]) : null;
          const perUnitCells = cells.map((c) => parseCurrency(c)).filter((v): v is number => v !== null && v > 0 && v < 100000);
          expenseBreakdown.push({
            category: clean(cells[cells.findIndex((c) => c && c.toLowerCase().includes(cat))] || cat),
            amount: amounts.length > 1 ? amounts[amounts.length - 2] : amounts[0],
            per_unit: perUnitCells.length > 1 ? perUnitCells[1] : null,
            pct_of_revenue: pct,
          });
        }
        break;
      }
    }

    // Detect market rental rate header
    if (joined.includes('market rental rate') && joined.includes('conclusion')) {
      rateHeaderRow = i;
      continue;
    }

    // After the rate header, find the unit type columns
    if (rateHeaderRow >= 0 && rateUnitTypes.length === 0 && i <= rateHeaderRow + 5) {
      const unitCandidates: Array<{ col: number; name: string }> = [];
      for (let c = 0; c < cells.length; c++) {
        const v = clean(cells[c] || '');
        if (v && v.length > 2 && !v.toLowerCase().includes('market') && !v.toLowerCase().includes('# of sites') && !v.toLowerCase().includes('rental')) {
          unitCandidates.push({ col: c, name: v });
        }
      }
      if (unitCandidates.length >= 2) {
        rateUnitTypes = unitCandidates.map((u) => u.name);
        rateUnitCols = unitCandidates.map((u) => u.col);
      }
      continue;
    }

    // Parse daily/weekly/monthly rates
    if (rateUnitTypes.length > 0 && rateHeaderRow >= 0) {
      const label = cells.find((c) => c && /daily rate|weekly rate|monthly rate/i.test(c.trim()));
      const renterLabel = cells.find((c) => c && /% daily|% weekly|% monthly/i.test(c.trim()));

      if (label) {
        const lower = label.toLowerCase();
        for (let u = 0; u < rateUnitTypes.length; u++) {
          if (!marketRentalRates[u]) {
            marketRentalRates[u] = {
              unit_type: rateUnitTypes[u],
              daily_rate: null, weekly_rate: null, monthly_rate: null,
              renter_pct_daily: null, renter_pct_weekly: null, renter_pct_monthly: null,
            };
          }
          const val = parseCurrency(cells[rateUnitCols[u]]);
          if (lower.includes('daily')) marketRentalRates[u].daily_rate = val;
          else if (lower.includes('weekly')) marketRentalRates[u].weekly_rate = val;
          else if (lower.includes('monthly')) marketRentalRates[u].monthly_rate = val;
        }
      }

      if (renterLabel) {
        const lower = renterLabel.toLowerCase();
        for (let u = 0; u < rateUnitTypes.length; u++) {
          if (!marketRentalRates[u]) continue;
          const val = parsePercentage(cells[rateUnitCols[u]]);
          if (lower.includes('daily')) marketRentalRates[u].renter_pct_daily = val;
          else if (lower.includes('weekly')) marketRentalRates[u].renter_pct_weekly = val;
          else if (lower.includes('monthly')) marketRentalRates[u].renter_pct_monthly = val;
        }
      }
    }
  }

  if (noi === null && totalRevenue === null && indicatedValue === null && marketRentalRates.length === 0) {
    return null;
  }

  return {
    valuation_type: 'direct_cap',
    total_units: totalUnits,
    occupancy_rate: occupancyRate,
    average_daily_rate: averageDailyRate,
    annual_lodging_revenue: annualLodgingRevenue,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    total_expenses_with_reserves: totalExpensesWithReserves,
    noi,
    noi_margin: noiMargin,
    cap_rate: capRate,
    indicated_value: indicatedValue || asIsValue,
    value_per_unit: valuePerUnit,
    stabilization_months: null,
    stabilization_cost: stabilizationCost,
    as_is_value: asIsValue,
    discount_rate: null,
    terminal_cap_rate: null,
    projected_sale_price: null,
    market_rental_rates: marketRentalRates.filter((r) => r.daily_rate !== null || r.weekly_rate !== null || r.monthly_rate !== null),
    expense_breakdown: expenseBreakdown,
    yearly_projections: [],
  };
}

// ---------------------------------------------------------------------------
// Main parser — detects file type and delegates to the correct sub-parser
// ---------------------------------------------------------------------------

export function parseFeasibilityCSV(csvText: string, filename: string): ParsedFeasibilityCSV {
  const studyId = extractStudyId(filename);
  const fileType = detectFileType(csvText, filename);

  const rows: string[][] = parse(csvText, {
    relax_column_count: true,
    skip_empty_lines: false,
    relax_quotes: true,
  });

  const result: ParsedFeasibilityCSV = {
    study_id: studyId,
    filename,
    file_type: fileType,
    comparables: [],
    comp_units: [],
    summaries: [],
    property_scores: [],
    pro_forma_units: [],
    valuation: null,
  };

  switch (fileType) {
    case 'best_comps': {
      result.property_scores = parseBestComps(rows);
      break;
    }

    case 'pro_forma': {
      const pf = parseProForma(rows);
      result.pro_forma_units = pf.units;
      result.valuation = pf.valuation;
      break;
    }

    case 'direct_cap': {
      result.valuation = parseDirectCap(rows);
      break;
    }

    case 'comps_summary':
    default: {
      // Original comps summary parser
      let mode: 'scanning' | 'overview' | 'unit_rates' | 'detailed' = 'scanning';
      let overviewOffset = 0;
      let unitCols: UnitRateColumns | null = null;
      let lastPropertyName = '';

      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i];
        if (!cells || cells.length === 0) continue;

        if (isBlankRow(cells)) {
          if (mode === 'detailed') continue;
          continue;
        }

        if (isOverviewHeader(cells)) {
          mode = 'overview';
          overviewOffset = cells.findIndex(
            (c) => c && c.toLowerCase().trim() === 'name'
          );
          if (overviewOffset < 0) overviewOffset = 0;
          continue;
        }

        if (isUnitRateHeader(cells)) {
          const detected = detectUnitRateColumns(cells);
          if (detected) {
            unitCols = detected;
            mode = 'unit_rates';
            lastPropertyName = '';
          }
          continue;
        }

        const firstNonEmpty = cells.find((c) => c && c.trim());
        if (
          firstNonEmpty &&
          /^\d+$/.test(firstNonEmpty.trim()) &&
          parseInt(firstNonEmpty.trim()) <= 100 &&
          mode !== 'overview'
        ) {
          mode = 'detailed';
          const unit = parseDetailedCompRow(cells);
          if (unit) result.comp_units.push(unit);
          continue;
        }

        switch (mode) {
          case 'overview': {
            const comp = parseOverviewRow(cells, overviewOffset);
            if (comp) result.comparables.push(comp);
            break;
          }

          case 'unit_rates': {
            if (!unitCols) break;

            if (isSummaryRow(cells)) {
              const joined = cells.join('|').toLowerCase();
              let statType: 'market_min' | 'market_avg' | 'market_max' = 'market_avg';
              if (joined.includes('minimum')) statType = 'market_min';
              else if (joined.includes('max')) statType = 'market_max';
              result.summaries.push(parseSummaryRow(cells, unitCols, statType));
              break;
            }

            if (isPhaseRow(cells)) {
              const phase = parsePhaseRow(cells, unitCols);
              if (phase) result.summaries.push(phase);
              break;
            }

            const parseResult = parseUnitRateRow(cells, unitCols, lastPropertyName);
            if (parseResult) {
              result.comp_units.push(parseResult.unit);
              lastPropertyName = parseResult.propertyName;
            }
            break;
          }

          case 'detailed': {
            const unit = parseDetailedCompRow(cells);
            if (unit) result.comp_units.push(unit);
            break;
          }

          default:
            break;
        }
      }
      break;
    }
  }

  return result;
}
