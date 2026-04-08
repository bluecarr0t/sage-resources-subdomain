/**
 * DOCX/DOC parser for feasibility study reports.
 *
 * - .docx: Uses mammoth (DOCX→HTML) + cheerio for structured extraction
 * - .doc: Uses word-extractor (legacy binary format) with plain-text section parsing
 *
 * Extracts key facts: property info, client info, executive summary, SWOT highlights.
 * Shared extraction (extractRawContentFromDocx) used by both parseDocxReport and reports/upload.
 */

import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import WordExtractor from 'word-extractor';
import { extractStudyId } from '@/lib/csv/feasibility-parser';
import { isGarbageReportCity } from '@/lib/report-location-quality';
import { fillMissingFieldsWithLLM } from './docx-llm-extractor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawDocxContent {
  fullText: string;
  paragraphs: string[];
  tables: Array<{ table_id: string; rows: string[][] }>;
  /** Section structure (heading + content) for structured extraction */
  sections: Array<{ heading: string; headingLevel: number; content: string; paragraphs: string[] }>;
  /** Mammoth conversion messages (e.g. unsupported images) */
  messages: string[];
}

export interface UnitMixEntry {
  type: string;
  count: number | null;
  description: string | null;
}

export interface FinancialAssumption {
  label: string;
  value: string | number | null;
}

export interface ParsedDocxReport {
  study_id: string;
  /** Full document title from first page (e.g. "Sojourner Glamping Resort Feasibility Study Update") */
  document_title: string | null;
  resort_name: string | null;
  client_name: string | null;
  client_entity: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  county: string | null;
  parcel_number: string | null;
  lot_size_acres: number | null;
  total_units: number | null;
  market_type: string | null;
  report_date: string | null;
  authors: string[] | null;
  executive_summary: string | null;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  } | null;
  report_purpose: string | null;
  development_phase: string | null;
  zoning: string | null;
  unit_mix: UnitMixEntry[] | null;
  financial_assumptions: FinancialAssumption[] | null;
  recommendations: string[] | null;
  /** Key amenities extracted from document (e.g. Pool, Hot Tub, Clubhouse) */
  key_amenities: string[] | null;
  /** Mammoth conversion messages (e.g. unsupported images) */
  extraction_messages?: string[];
}

export interface ParseDocxReportOptions {
  /** When true, use OpenAI to fill missing resort_name, address, client fields when heuristics return null */
  useLLMForMissing?: boolean;
}

// ---------------------------------------------------------------------------
// Section extraction helpers
// ---------------------------------------------------------------------------

interface DocSection {
  heading: string;
  headingLevel: number;
  content: string;
  paragraphs: string[];
}

function extractSections($: ReturnType<typeof cheerio.load>): DocSection[] {
  const sections: DocSection[] = [];
  let currentSection: DocSection | null = null;

  $('body').children().each((_, el) => {
    const $el = $(el);
    const tag = el.type === 'tag' ? (el as unknown as { tagName: string }).tagName.toLowerCase() : '';
    const text = $el.text().trim();
    if (!text) return;

    const headingMatch = tag.match(/^h([1-6])$/);
    if (headingMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        heading: text,
        headingLevel: parseInt(headingMatch[1], 10),
        content: '',
        paragraphs: [],
      };
      return;
    }

    if (currentSection) {
      currentSection.paragraphs.push(text);
      currentSection.content += (currentSection.content ? '\n' : '') + text;
    }
  });

  if (currentSection) sections.push(currentSection);
  return sections;
}

/** Extract sections from plain text (used for legacy .doc files from word-extractor) */
function extractSectionsFromPlainText(fullText: string): DocSection[] {
  const knownHeaders = [
    'Letter of Transmittal',
    'Executive Summary',
    'SWOT Analysis',
    'Strengths, Weaknesses, Opportunities',
    'Project Overview',
    'Property Overview',
    'Property Description',
    'Project Description',
    'Scope of Work',
    'Scope of the Assignment',
    'Site Analysis',
    'Site Description',
    'Market Analysis',
    'Market Overview',
    'Comparable Analysis',
    'Comparable Properties',
    'Financial Analysis',
    'Financial Projections',
    'Certification',
    'Qualifications',
    'Purpose',
    'Introduction',
    'Methodology',
    'Assumptions and Limiting Conditions',
    'Assumptions',
    'Recommendations',
    'Conclusion',
    'Table of Contents',
    'Key Findings',
    'Transmittal',
    'Cover Letter',
    'Limiting Conditions',
    'Valuation',
    'Appraisal',
    'Summary',
    'Background',
    'Property Information',
    'Subject Property',
    'Location',
    'Demographics',
  ];

  const sections: DocSection[] = [];
  const lines = fullText.split(/\r?\n/);
  let currentSection: DocSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match against known headers — use includes() for fuzzy matching of non-standard headers
    const isHeader = trimmed.length < 60 && knownHeaders.some(
      (h) =>
        trimmed.toLowerCase() === h.toLowerCase() ||
        trimmed.toLowerCase().startsWith(h.toLowerCase()) ||
        trimmed.toLowerCase().includes(h.toLowerCase())
    );

    // Also detect ALL-CAPS short lines as section headers
    const isCapsHeader = trimmed.length >= 4 &&
      trimmed.length < 60 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]{4,}/.test(trimmed) &&
      !/^\d/.test(trimmed);

    if (isHeader || isCapsHeader) {
      const header = knownHeaders.find((h) => trimmed.toLowerCase().includes(h.toLowerCase())) || trimmed;
      if (currentSection) sections.push(currentSection);
      currentSection = {
        heading: header,
        headingLevel: 2,
        content: '',
        paragraphs: [],
      };
      continue;
    }

    if (currentSection) {
      currentSection.paragraphs.push(trimmed);
      currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
    } else {
      currentSection = {
        heading: 'Preamble',
        headingLevel: 1,
        content: trimmed,
        paragraphs: [trimmed],
      };
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}

function findSection(sections: DocSection[], ...patterns: string[]): DocSection | null {
  for (const pattern of patterns) {
    const lower = pattern.toLowerCase();
    const found = sections.find((s) => s.heading.toLowerCase().includes(lower));
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

function isValidUSState(code: string): boolean {
  return US_STATES.has(code.toUpperCase());
}

const HEADING_BLACKLIST = /^(project\s+overview|property\s+overview|executive\s+summary|scope\s+of\s+work|project\s+description|property\s+description|site\s+analysis|introduction|purpose|overview|certification|qualifications|property\s+is\s+(intended|located)|project\s+is\s+(intended|located))$/i;

/** Phrases that appear in metadata blocks or amenity lists but are not resort/property names */
const RESORT_NAME_BLACKLIST = /^(located\s+(?:at|in|near)|the\s+(?:subject|property|project|site)|subject\s+property|feasibility\s+study|glamping\s+feasibility|rv\s+resort\s+feasibility|campground\s+feasibility|a\s+vending\s+area|a\s+community\s+fire\s+pit|a\s+walking\s+trail|a\s+natural\s+swimming\s+pool|a\s+communal\s+(?:sauna|grill)|an\s+event\s+space|a\s+pavilion|giant\s+yard\s+games|ev\s+charging\s+stations?)$/i;

/** Phrases starting with "a/an" + amenity/descriptive words (common in amenity lists) */
const AMENITY_PHRASE_PATTERN = /^(a|an)\s+[\w\s]+(?:area|space|trail|pool|sauna|grill|pit|pavilion|station|games?)$/i;

function isValidResortName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  if (HEADING_BLACKLIST.test(trimmed)) return false;
  if (RESORT_NAME_BLACKLIST.test(trimmed)) return false;
  if (AMENITY_PHRASE_PATTERN.test(trimmed)) return false;
  if (/^\d+$/.test(trimmed)) return false;
  // Marketing / location prose (not a property title), e.g. "in a world-class dual waterfront access s"
  if (/^in\s+(a|an|the)\s/i.test(trimmed)) return false;
  if (/\bworld-class\b/i.test(trimmed) && /\b(access|waterfront|views?)\b/i.test(trimmed)) return false;
  // Truncated word at end (e.g. "... access s" from a cut-off "site")
  if (trimmed.length > 18 && /\s[a-z]$/.test(trimmed)) return false;
  return true;
}

/** Words that never appear as standalone US city names */
const INVALID_CITY_WORDS = new Set([
  'hot tubs', 'hot tub', 'swimming pool', 'pools', 'pool', 'fire pit', 'fire pits',
  'sauna', 'cold plunge', 'spa', 'kitchen', 'kitchenette', 'grill', 'bbq',
  'bathroom', 'shower', 'deck', 'patio', 'terrace', 'balcony', 'hiking', 'trails',
  'fishing', 'kayaking', 'wellness', 'dining', 'restaurant', 'event', 'venue',
  'accommodations', 'amenities', 'units', 'sites', 'acres',
]);

/** Words/phrases that signal descriptive text, not a city name */
const DESCRIPTIVE_WORDS = /\b(including|such\s+as|featuring|offering|with|major|minor|various|multiple|numerous|several|tourism|hubs?|attractions?|destinations?|recreational|nearby|surrounding|adjacent|approximately|within|between|throughout|across)\b/i;

function isValidCityName(city: string): boolean {
  const trimmed = city.trim();
  if (isGarbageReportCity(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (trimmed.length < 2 || trimmed.length > 35) return false;
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 4) return false;
  if (INVALID_CITY_WORDS.has(lower)) return false;
  if (DESCRIPTIVE_WORDS.test(trimmed)) return false;
  if (/^\d+\s*(acres?|units?|sites?|hot\s+tubs?|pools?)/i.test(lower)) return false;
  if (/\b(the|a|an)\s/i.test(trimmed) && wordCount > 2) return false;
  return true;
}

function extractResortName(sections: DocSection[], fullText: string): string | null {
  const searchSections = [
    findSection(sections, 'Project Overview', 'Property Overview'),
    findSection(sections, 'Executive Summary'),
    findSection(sections, 'Letter of Transmittal', 'Transmittal'),
  ].filter(Boolean) as DocSection[];

  // 1. Quoted names — strongest signal
  const quotedPattern = /(?:resort|property|project)\s+(?:is\s+)?(?:known\s+as|named?|called)\s+[\u201C"](.*?)[\u201D"]/i;
  for (const sec of searchSections) {
    const m = sec.content.match(quotedPattern);
    if (m && isValidResortName(m[1])) return m[1].trim();
  }

  // 2. "known as / named / called X" with trailing context
  const namedPattern = /(?:known\s+as|named?|called)\s+([A-Z][A-Za-z\s&'.-]{2,45})(?:\.|,|\s+(?:is|was|will|which|located|in|at|on|resort|campground|rv))/i;
  for (const sec of searchSections) {
    const m = sec.content.match(namedPattern);
    if (m && isValidResortName(m[1])) return m[1].trim();
  }

  // 3. Broader "resort/property is..." with blacklist filtering
  const broaderPattern = /(?:resort|property|project)\s+(?:is\s+)?(?:known\s+as\s+|named?\s+|called\s+)?[\u201C"]?([A-Z][A-Za-z\s&'.-]{2,40})[\u201D"]?/i;
  for (const sec of searchSections) {
    const m = sec.content.match(broaderPattern);
    if (m && isValidResortName(m[1])) return m[1].trim();
  }

  // 4. "the project, [Name]," or "Property: [Name]"
  const projectCommaPattern = /(?:the\s+)?(?:project|property)\s*,\s*["']?([A-Z][A-Za-z\s&'.-]{2,45})["']?\s*,/i;
  for (const sec of searchSections) {
    const m = sec.content.match(projectCommaPattern);
    if (m && isValidResortName(m[1])) return m[1].trim();
  }
  const propertyLabelPattern = /(?:^|\n)\s*Property\s*:?\s*["']?([A-Z][A-Za-z\s&'.-]{2,45})["']?(?:\s|$|\n)/i;
  for (const sec of searchSections) {
    const m = sec.content.match(propertyLabelPattern);
    if (m && isValidResortName(m[1])) return m[1].trim();
  }

  // 5. Title line fallback
  const titleMatch = fullText.match(/(?:Feasibility Study|FS)\s+[-\u2013\u2014]\s+(.+?)(?:\n|$)/i);
  if (titleMatch && isValidResortName(titleMatch[1])) return titleMatch[1].trim();

  // 6. Metadata block: first line before a study ID
  const metaName = fullText.match(/^([A-Z][A-Za-z\s&'.-]{3,50})\s*\n\s*\d{2}-\d{3}[A-Z]?-\d{2}/m);
  if (metaName && isValidResortName(metaName[1])) return metaName[1].trim();

  return null;
}

/** Skip patterns for first-page header/footer text */
const FIRST_PAGE_SKIP = /^(Sage Outdoor Advisory|Confidential|Prepared for|Dear\s|Property\s*:?\s*$|\d{1,2}\/\d{1,2}\/\d{2,4})/i;

/**
 * Extract the full document title from the first page of the DOCX.
 * Typical format: "Property Name" + newline + "Feasibility Study" or "Feasibility Study Update"
 * Returns e.g. "Sojourner Glamping Resort Feasibility Study Update"
 */
function extractFirstPageTitle(fullText: string): string | null {
  const firstPage = fullText.slice(0, 2500);
  const lines = firstPage.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Two-line pattern: "Property Name" \n "Feasibility Study" or "Feasibility Study Update"
  for (let i = 0; i < lines.length - 1; i++) {
    const curr = lines[i];
    const next = lines[i + 1];
    if (FIRST_PAGE_SKIP.test(curr)) continue;
    const fsMatch = next.match(/^(Feasibility\s+Study(?:\s+Update)?)(?:\s+[-–—]\s*[^\n]+)?\s*$/i);
    const plausibleCoverLine =
      /^[A-Z0-9]/.test(curr) &&
      curr.length >= 4 &&
      curr.length <= 60 &&
      !/^in\s+(a|an|the)\s/i.test(curr);
    if (fsMatch && (isValidResortName(curr) || plausibleCoverLine)) {
      const combined = `${curr} ${fsMatch[1].trim()}`.trim();
      if (combined.length <= 100) return combined;
    }
  }

  // 2. Single-line: "Property Name Feasibility Study Update"
  const oneLine = firstPage.match(/([A-Z][A-Za-z\s&'.-]{3,55})\s+(Feasibility\s+Study(?:\s+Update)?)(?:\s|$|\n)/i);
  if (oneLine) {
    const combined = `${oneLine[1].trim()} ${oneLine[2].trim()}`.trim();
    if (combined.length >= 15 && combined.length <= 100 && !RESORT_NAME_BLACKLIST.test(oneLine[1].trim())) {
      return combined;
    }
  }

  // 3. "Feasibility Study - Property Name" format
  const dashFormat = firstPage.match(/(?:Feasibility\s+Study(?:\s+Update)?)\s*[-–—]\s*([A-Z][A-Za-z\s&'.-]{3,50})(?:\s|$|\n)/i);
  if (dashFormat && isValidResortName(dashFormat[1])) {
    return `${dashFormat[1].trim()} Feasibility Study`.trim();
  }

  // 4. First 2-3 meaningful lines before body text (before "Letter of Transmittal", "Executive Summary", etc.)
  const bodyStart = firstPage.search(/(?:Letter of Transmittal|Executive Summary|Dear\s|Project Overview)/i);
  const scanLen = bodyStart > 0 ? Math.min(bodyStart, 1200) : 1200;
  const scanText = firstPage.slice(0, scanLen);
  const scanLines = scanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const titleParts: string[] = [];
  for (const line of scanLines) {
    if (FIRST_PAGE_SKIP.test(line)) continue;
    if (/^\d{2}-\d{3}[A-Z]?-\d{2}$/.test(line)) continue;
    if (/^[A-Za-z\s.'-]+,\s*[A-Z]{2}\s*$/.test(line) && line.length < 50) continue;
    if (line.length < 3 || line.length > 70) continue;
    titleParts.push(line);
    if (titleParts.length >= 3) break;
  }
  if (titleParts.length >= 1) {
    const combined = titleParts.join(' ').replace(/\s+/g, ' ').trim();
    if (combined.length >= 10 && combined.length <= 100 && /feasibility\s+study/i.test(combined)) {
      return combined;
    }
  }

  return null;
}

function extractAddress(sections: DocSection[], fullText: string): {
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
} {
  const result = { address: null as string | null, city: null as string | null, state: null as string | null, zip_code: null as string | null };

  // 0. Metadata block: StudyID followed by "City, ST" on the next line
  //    e.g. "25-107A-01\nNewport, TN\nCocke County"
  const metaLocMatch = fullText.match(
    /\d{2}-\d{3}[A-Z]?-\d{2}\s*\n\s*([A-Z][A-Za-z\s.'-]{1,30}),\s*([A-Z]{2})\s*\n/
  );
  if (metaLocMatch && isValidUSState(metaLocMatch[2]) && isValidCityName(metaLocMatch[1])) {
    result.city = metaLocMatch[1].trim();
    result.state = metaLocMatch[2].trim().toUpperCase();
    return result;
  }

  // Build a search corpus that favours subject-property sections over comparables
  const subjectSections = [
    findSection(sections, 'Letter of Transmittal', 'Transmittal'),
    findSection(sections, 'Project Overview', 'Property Overview'),
    findSection(sections, 'Executive Summary'),
    findSection(sections, 'Site Analysis', 'Site Description'),
  ].filter(Boolean) as DocSection[];

  const sectionText = subjectSections.map((s) => s.content).join('\n');
  const page1 = fullText.slice(0, 3500);

  // City capture: 1-4 words, each starting with a letter, max ~35 chars
  const CITY_RE = '([A-Za-z][A-Za-z.\'-]*(?:\\s+[A-Za-z][A-Za-z.\'-]*){0,3})';

  const searchOrder = [sectionText, page1, fullText];

  for (const text of searchOrder) {
    if (!text) continue;

    // Labeled address patterns — "subject property: ...", "property address: ..."
    const labeledPatterns = [
      new RegExp(`(?:subject\\s+property|property\\s+address|street\\s+address|site\\s+address|address)\\s*:?\\s*[\\r\\n]?\\s*(\\d{1,5}\\s+[A-Za-z0-9\\s.,#'-]+?),\\s*${CITY_RE},\\s*([A-Z]{2})\\s+(\\d{5}(?:-\\d{4})?)`, 'i'),
      new RegExp(`(?:subject\\s+property|property\\s+address|address)\\s*:?\\s*[\\r\\n]?\\s*(\\d{1,5}\\s+[A-Za-z0-9\\s.,#'-]+)[\\r\\n]+\\s*${CITY_RE},\\s*([A-Z]{2})\\s+(\\d{5}(?:-\\d{4})?)`, 'i'),
    ];
    for (const pat of labeledPatterns) {
      const m = text.match(pat);
      if (m && isValidUSState(m[3]) && isValidCityName(m[2])) {
        result.address = m[1].trim();
        result.city = m[2].trim();
        result.state = m[3].trim().toUpperCase();
        result.zip_code = m[4].trim();
        return result;
      }
    }

    // Full address pattern: street, city, state zip (no label)
    const fullAddrRe = new RegExp(
      `(\\d{1,5}\\s+[A-Za-z0-9\\s.,#'-]+?),\\s*${CITY_RE},\\s*([A-Z]{2})\\s+(\\d{5}(?:-\\d{4})?)`, ''
    );
    const fullAddrMatch = text.match(fullAddrRe);
    if (fullAddrMatch && isValidUSState(fullAddrMatch[3]) && isValidCityName(fullAddrMatch[2])) {
      result.address = fullAddrMatch[1].trim();
      result.city = fullAddrMatch[2].trim();
      result.state = fullAddrMatch[3].trim().toUpperCase();
      result.zip_code = fullAddrMatch[4].trim();
      return result;
    }

    // City, state only — require contextual keywords
    const cityStateRe = new RegExp(
      `(?:located\\s+(?:in|at|near)|(?:city|town)\\s+of|subject\\s+(?:property|site)\\s+(?:is\\s+)?(?:in|at|near)|(?:near|outside)\\s+(?:of\\s+)?)${CITY_RE},\\s*([A-Z]{2})(?:\\s+(\\d{5}(?:-\\d{4})?))?`, 'i'
    );
    const cityStateMatch = text.match(cityStateRe);
    if (cityStateMatch && isValidUSState(cityStateMatch[2]) && isValidCityName(cityStateMatch[1])) {
      result.city = cityStateMatch[1].trim();
      result.state = cityStateMatch[2].trim().toUpperCase();
      if (cityStateMatch[3]) result.zip_code = cityStateMatch[3].trim();
      if (result.city || result.state) return result;
    }
  }

  return result;
}

function extractCityStateFromFilename(filename: string): { city: string | null; state: string | null } {
  const base = filename.replace(/\.[^.]+$/, '');
  const studyIdMatch = base.match(/^(\d{2}-\d{3}[A-Z]?-\d{2})\s*/);
  const afterStudyId = studyIdMatch ? base.slice(studyIdMatch[0].length).trim() : base;
  const cityStateMatch = afterStudyId.match(/^([A-Za-z\s]+),\s*([A-Z]{2})/i);
  if (cityStateMatch && isValidCityName(cityStateMatch[1])) {
    return { city: cityStateMatch[1].trim(), state: cityStateMatch[2].trim() };
  }
  return { city: null, state: null };
}

function extractClient(sections: DocSection[], fullText: string): { name: string | null; entity: string | null } {
  // Search multiple sections: Letter of Transmittal, Preamble (cover page), Exec Summary
  const searchSections = [
    findSection(sections, 'Letter of Transmittal', 'Transmittal'),
    findSection(sections, 'Preamble'),
    findSection(sections, 'Executive Summary'),
  ].filter(Boolean) as DocSection[];

  // Also search the first ~2000 chars (cover page area)
  const coverText = fullText.slice(0, 2000);

  let name: string | null = null;
  let entity: string | null = null;

  const entityPatterns = [
    /(?:prepared\s+for|client|on\s+behalf\s+of)\s*:?\s*(.+?)(?:\n|$)/i,
    /(?:Dear|Attention)\s+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*(.+?)(?:\n|,|$)/i,
    /(?:submitted\s+to|presented\s+to)\s*:?\s*(.+?)(?:\n|$)/i,
  ];

  // Search sections first
  for (const sec of searchSections) {
    for (const pat of entityPatterns) {
      const match = sec.content.match(pat);
      if (match) {
        const val = match[1].trim().replace(/[.,;:]+$/, '');
        if (val.length > 2 && val.length < 100) {
          if (/LLC|Inc|Corp|Ltd|LP|Trust|Group|Partners|Company|Co\.|Association|Assoc/i.test(val)) {
            entity = val;
          } else {
            name = val;
          }
          break;
        }
      }
    }
    if (name || entity) break;
  }

  // Search cover text if still missing
  if (!name && !entity) {
    for (const pat of entityPatterns) {
      const match = coverText.match(pat);
      if (match) {
        const val = match[1].trim().replace(/[.,;:]+$/, '');
        if (val.length > 2 && val.length < 100) {
          if (/LLC|Inc|Corp|Ltd|LP|Trust|Group|Partners|Company|Co\.|Association|Assoc/i.test(val)) {
            entity = val;
          } else {
            name = val;
          }
          break;
        }
      }
    }
  }

  // Look for LLC/Inc entities in any of the searched areas
  if (!entity) {
    const allSearchText = searchSections.map((s) => s.content).join('\n') + '\n' + coverText;
    const llcMatch = allSearchText.match(/\b([A-Z][A-Za-z\s&'.-]+(?:LLC|Inc|Corp|Ltd|LP|Trust))\b/);
    if (llcMatch) entity = llcMatch[1].trim();
  }

  return { name, entity };
}

function extractCounty(sections: DocSection[], fullText: string): string | null {
  // 1. Metadata block: county line before a date line
  const metaCounty = fullText.match(
    /\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+County\s*\n\s*[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}/
  );
  if (metaCounty) return metaCounty[1].trim();

  // 2. Subject-property sections (prefer these over full-text to avoid comparable counties)
  const subjectSections = [
    findSection(sections, 'Project Overview', 'Property Overview'),
    findSection(sections, 'Executive Summary'),
    findSection(sections, 'Letter of Transmittal', 'Transmittal'),
    findSection(sections, 'Site Analysis', 'Site Description'),
  ].filter(Boolean) as DocSection[];

  for (const sec of subjectSections) {
    const match = sec.content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+County/);
    if (match) return match[1].trim();
  }

  // 3. First 5000 chars fallback
  const earlyMatch = fullText.slice(0, 5000).match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+County/);
  if (earlyMatch) return earlyMatch[1].trim();

  return null;
}

function extractParcel(fullText: string): string | null {
  const match = fullText.match(/(?:parcel\s*(?:number|#|no\.?)|APN)\s*:?\s*([\d][\d\-./A-Za-z]{2,})/i);
  if (!match) return null;
  const val = match[1].trim();
  if (val.length < 3) return null;
  return val;
}

function extractAcreage(sections: DocSection[], fullText: string): number | null {
  // Prefer subject-property sections to avoid comparable acreage
  const subjectSections = [
    findSection(sections, 'Project Overview', 'Property Overview'),
    findSection(sections, 'Executive Summary'),
    findSection(sections, 'Site Analysis', 'Site Description'),
  ].filter(Boolean) as DocSection[];

  const acreagePattern = /(?:subject|property|site|tract|parcel|project|lot|contains|approximately|total(?:ing)?)\s+(?:(?:is|of|contains|encompasses|comprises|totals?|area)?\s*)?(\d+(?:[.,]\d+)?)\s*(?:\+\/?-|\u00B1)?\s*acres?/i;
  const simplePattern = /(\d+(?:\.\d+)?)\s*(?:\+\/?-|\u00B1)?\s*acres?/i;

  // 1. Context-aware match in subject sections
  for (const sec of subjectSections) {
    const m = sec.content.match(acreagePattern);
    if (m) {
      const val = parseFloat(m[1].replace(',', ''));
      if (val > 0 && val < 100000) return val;
    }
  }

  // 2. Simple match in subject sections
  for (const sec of subjectSections) {
    const m = sec.content.match(simplePattern);
    if (m) {
      const val = parseFloat(m[1]);
      if (val > 0 && val < 100000) return val;
    }
  }

  // 3. Fallback: first 5000 chars (still better than entire doc)
  const earlyMatch = fullText.slice(0, 5000).match(simplePattern);
  if (earlyMatch) {
    const val = parseFloat(earlyMatch[1]);
    if (val > 0 && val < 100000) return val;
  }

  return null;
}

function extractTotalUnits(sections: DocSection[], fullText: string): number | null {
  // Only search subject-property sections — NOT comparables/tables (which have "13 Total Units" etc.)
  const subjectSections = [
    findSection(sections, 'Executive Summary'),
    findSection(sections, 'Project Overview', 'Property Overview'),
    findSection(sections, 'Property Details'),
  ].filter(Boolean) as DocSection[];

  const subjectText = subjectSections.map((s) => s.content).join('\n');
  if (!subjectText.trim()) return null;

  // Prefer explicit subject/project unit counts (e.g. "There will be 50 luxurious tented glamping units")
  const subjectPatterns = [
    /(?:will\s+be|consist|contain|include|feature|have|offer|accommodate)s?\s+(?:(?:a\s+total\s+of|up\s+to|approximately)\s+)?(\d+)\s+(?:\w+\s+)*(?:units?|keys?|sites?|accommodations?|spaces?)\b/i,
    /(\d+)\s+(?:luxurious|luxury|tented|glamping|proposed|subject)\s+(?:\w+\s+)*(?:units?|keys?|sites?)\b/i,
    /(?:total\s+(?:of\s+)?)(\d+)\s+(?:units?|keys?|sites?|spaces?)/i,
    /(\d+)\s+(?:total\s+)(?:units?|keys?|sites?|spaces?)/i,
    /approved\s+for\s+(\d+)\s+(?:dwelling\s+)?(?:units?|keys?|sites?)/i,
  ];

  for (const pat of subjectPatterns) {
    const match = subjectText.match(pat);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val > 0 && val < 10000) return val;
    }
  }

  // Fallback: number + optional adjectives + units (only in subject sections to avoid comp table counts)
  const broadInSubject = /(\d+)\s+(?:\w+\s+)*(?:units?|keys?|sites?|accommodations?)\b/i;
  const fallbackMatch = subjectText.match(broadInSubject);
  if (fallbackMatch) {
    const val = parseInt(fallbackMatch[1], 10);
    if (val > 0 && val < 10000) return val;
  }

  return null;
}

function extractMarketType(fullText: string): string | null {
  const lower = fullText.toLowerCase();
  if (lower.includes('glamping') || lower.includes('glamorous camping')) return 'glamping';
  if (lower.includes('rv park') || lower.includes('rv resort')) return 'rv-park';
  if (lower.includes('campground') || lower.includes('camping resort')) return 'campground';
  if (lower.includes('mixed use') || lower.includes('mixed-use')) return 'mixed';
  return 'outdoor_hospitality';
}

/** Known template/census dates that appear in feasibility docs but are not report dates */
const TEMPLATE_DATE_BLACKLIST = new Set([
  '1990-01-01',
  '2000-01-01', '2000-04-01',
  '2010-01-01', '2010-04-01',
  '2010-12-01', '2010-12-02', // Census "December 2010" reference
  '2020-01-01', '2020-04-01',
]);

/** Reject any date before 2015 as very likely a census/template date, not a report date */
function isPlausibleReportDate(iso: string): boolean {
  const year = parseInt(iso.slice(0, 4), 10);
  if (year < 2015 || year > 2035) return false;
  return !TEMPLATE_DATE_BLACKLIST.has(iso);
}

function extractReportDate(fullText: string): string | null {
  const parseAndValidate = (dateStr: string): string | null => {
    const normalized = dateStr.replace(/\b(\d{1,2})(st|nd|rd|th)\b/i, '$1');
    const d = new Date(normalized + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!isPlausibleReportDate(iso)) return null;
    return iso;
  };

  // 1. Prefer date from the metadata block: Property / Study ID / County / Date / Glamping
  // Allow ordinals (1st, 2nd, etc.) which appear in some templates
  const metadataBlock = fullText.match(
    /[^\n]*County[^\n]*\n\s*([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\s*\n\s*(?:Glamping|Rv|Campground|Mixed)/i
  );
  if (metadataBlock) {
    const result = parseAndValidate(metadataBlock[1]);
    if (result) return result;
  }

  // 2. Explicit date labels (dated, as of, effective date)
  const explicitMatch = fullText.slice(0, 5000).match(
    /(?:dated?|as\s+of|effective\s+date)\s*:?\s*([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i
  );
  if (explicitMatch) {
    const result = parseAndValidate(explicitMatch[1]);
    if (result) return result;
  }

  // No fallback — first date in doc often picks template/census dates (e.g. December 1, 2010)
  return null;
}

function extractAuthors(sections: DocSection[], fullText: string): string[] | null {
  const authors: string[] = [];

  const certSection = findSection(sections, 'Certification', 'Qualifications');
  const letterSection = findSection(sections, 'Letter of Transmittal', 'Transmittal');
  const searchText = (certSection?.content || '') + '\n' + (letterSection?.content || '') + '\n' + fullText.slice(0, 5000);

  const designations = ['MAI', 'SRA', 'AI-GRS', 'CCIM', 'CRE'];
  for (const desig of designations) {
    const regex = new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z]\\.?)?\\s+[A-Z][a-z]+),?\\s+${desig}`, 'g');
    let match;
    while ((match = regex.exec(searchText)) !== null) {
      const name = match[1].trim();
      if (!authors.includes(name)) authors.push(name);
    }
  }

  return authors.length > 0 ? authors : null;
}

function extractExecutiveSummary(sections: DocSection[]): string | null {
  const section = findSection(sections, 'Executive Summary');
  if (!section) return null;
  const text = section.content.trim();
  return text.length > 10 ? text.slice(0, 5000) : null;
}

function extractSWOT(sections: DocSection[]): ParsedDocxReport['swot'] {
  const swotSection = findSection(sections, 'SWOT Analysis', 'SWOT', 'Strengths');
  if (!swotSection) return null;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  let currentBucket: string[] | null = null;

  for (const para of swotSection.paragraphs) {
    const lower = para.toLowerCase().trim();

    // Detect bucket headers — support "Strengths:", "STRENGTHS", "S -", etc.
    if (/^(?:strengths?|s\s*[-:])/.test(lower) || lower === 'strengths') {
      currentBucket = strengths;
      // If the heading line also has content after ":", capture it
      const afterColon = para.replace(/^(?:strengths?)\s*[-:]\s*/i, '').trim();
      if (afterColon.length > 5 && strengths.length < 10) strengths.push(afterColon.slice(0, 500));
      continue;
    }
    if (/^(?:weakness(?:es)?|w\s*[-:])/.test(lower) || lower === 'weaknesses') {
      currentBucket = weaknesses;
      const afterColon = para.replace(/^(?:weakness(?:es)?)\s*[-:]\s*/i, '').trim();
      if (afterColon.length > 5 && weaknesses.length < 10) weaknesses.push(afterColon.slice(0, 500));
      continue;
    }
    if (/^(?:threats?|t\s*[-:])/.test(lower) || lower === 'threats') {
      currentBucket = threats;
      const afterColon = para.replace(/^(?:threats?)\s*[-:]\s*/i, '').trim();
      if (afterColon.length > 5 && threats.length < 10) threats.push(afterColon.slice(0, 500));
      continue;
    }
    if (/^(?:opportunit(?:y|ies)|o\s*[-:]|recommendations?)/.test(lower) || lower === 'opportunities') {
      currentBucket = opportunities;
      const afterColon = para.replace(/^(?:opportunit(?:y|ies)|recommendations?)\s*[-:]\s*/i, '').trim();
      if (afterColon.length > 5 && opportunities.length < 10) opportunities.push(afterColon.slice(0, 500));
      continue;
    }

    if (currentBucket && para.length > 5 && currentBucket.length < 10) {
      currentBucket.push(para.slice(0, 500));
    }
  }

  if (strengths.length === 0 && weaknesses.length === 0 && opportunities.length === 0 && threats.length === 0) {
    return null;
  }
  return { strengths, weaknesses, opportunities, threats };
}

function extractReportPurpose(sections: DocSection[]): string | null {
  const scope = findSection(sections, 'Scope of Work', 'Scope of the Assignment', 'Purpose');
  if (!scope) return null;
  const text = scope.content.trim();
  return text.length > 10 ? text.slice(0, 2000) : null;
}

// ---------------------------------------------------------------------------
// New extractions
// ---------------------------------------------------------------------------

function extractDevelopmentPhase(sections: DocSection[], fullText: string): string | null {
  const searchSections = [
    findSection(sections, 'Executive Summary'),
    findSection(sections, 'Project Overview', 'Property Overview'),
    findSection(sections, 'Introduction'),
    findSection(sections, 'Scope of Work'),
  ].filter(Boolean) as DocSection[];

  const sectionText = searchSections.map((s) => s.content).join('\n');
  const searchText = sectionText || fullText.slice(0, 8000);

  const phasePatterns: Array<{ pattern: RegExp; phase: string }> = [
    { pattern: /(?:currently\s+)?under\s+construction/i, phase: 'under_construction' },
    { pattern: /(?:currently\s+)?(?:being\s+)?(?:built|constructed|developed)/i, phase: 'under_construction' },
    { pattern: /construction\s+(?:has\s+)?(?:begun|started|commenced|underway)/i, phase: 'under_construction' },
    { pattern: /(?:proposed|planned)\s+(?:development|project|resort|campground|rv\s+park)/i, phase: 'proposed' },
    { pattern: /(?:development|project)\s+(?:is\s+)?(?:proposed|planned|conceptual)/i, phase: 'proposed' },
    { pattern: /pre-development|predevelopment|entitlement\s+phase/i, phase: 'proposed' },
    { pattern: /(?:currently\s+)?(?:operational|operating|open\s+(?:to|for)\s+(?:the\s+)?public)/i, phase: 'operational' },
    { pattern: /(?:existing|established)\s+(?:resort|campground|rv\s+park|property)/i, phase: 'operational' },
    { pattern: /expansion\s+(?:of|to)\s+(?:the\s+)?(?:existing|current)/i, phase: 'expansion' },
    { pattern: /(?:phase\s+(?:2|ii|two|3|iii|three))\s+(?:of\s+)?(?:the\s+)?(?:development|project)/i, phase: 'expansion' },
  ];

  for (const { pattern, phase } of phasePatterns) {
    if (pattern.test(searchText)) return phase;
  }

  return null;
}

function extractZoning(sections: DocSection[], fullText: string): string | null {
  const searchSections = [
    findSection(sections, 'Site Analysis', 'Site Description'),
    findSection(sections, 'Project Overview', 'Property Overview'),
    findSection(sections, 'Executive Summary'),
  ].filter(Boolean) as DocSection[];

  const sectionText = searchSections.map((s) => s.content).join('\n');
  const searchText = sectionText || fullText.slice(0, 10000);

  // "zoned as X", "zoning: X", "zoning classification: X", "zoned X"
  const zoningPatterns = [
    /(?:zoning\s+(?:classification|designation|district|category))\s*:?\s*["']?([A-Za-z0-9\s\-/()]{2,60})["']?/i,
    /(?:zoned|zoning)\s*:?\s+(?:as\s+)?["']?([A-Za-z0-9\s\-/()]{2,60})["']?/i,
    /(?:current|existing|present)\s+zoning\s*:?\s*["']?([A-Za-z0-9\s\-/()]{2,60})["']?/i,
    /zoning\s+(?:is|of)\s+["']?([A-Za-z0-9\s\-/()]{2,60})["']?/i,
  ];

  for (const pat of zoningPatterns) {
    const m = searchText.match(pat);
    if (m) {
      const val = m[1].trim()
        .replace(/[.,;:]+$/, '')
        .replace(/\s+which\s+.*/i, '')
        .replace(/\s+that\s+.*/i, '')
        .replace(/\s+and\s+.*/i, '')
        .trim();
      if (val.length >= 2 && val.length <= 60) return val;
    }
  }

  return null;
}

function extractUnitMix(sections: DocSection[], fullText: string): UnitMixEntry[] | null {
  const searchSections = [
    findSection(sections, 'Executive Summary'),
    findSection(sections, 'Project Overview', 'Property Overview'),
  ].filter(Boolean) as DocSection[];

  const sectionText = searchSections.map((s) => s.content).join('\n');
  const searchText = sectionText || fullText.slice(0, 8000);
  const units: UnitMixEntry[] = [];

  // Pattern: "N unit-type" — e.g. "8 glamping units", "12 treehouses", "4 cabins", "20 RV sites"
  const unitTypes = [
    'glamping\\s+(?:units?|tents?|sites?|pods?)',
    'treehouse[s]?', 'tree\\s+house[s]?',
    'cabin[s]?', 'log\\s+cabin[s]?',
    'tent[s]?', 'safari\\s+tent[s]?', 'bell\\s+tent[s]?', 'canvas\\s+tent[s]?',
    'tiny\\s+home[s]?', 'tiny\\s+house[s]?',
    'a-frame[s]?', 'a\\s+frame[s]?',
    'dome[s]?', 'geodesic\\s+dome[s]?',
    'yurt[s]?',
    'rv\\s+site[s]?', 'rv\\s+space[s]?', 'rv\\s+pad[s]?',
    'container[s]?', 'shipping\\s+container[s]?',
    'cottage[s]?',
    'lodge\\s+room[s]?', 'hotel\\s+room[s]?',
    'campsite[s]?', 'camp\\s+site[s]?', 'tent\\s+site[s]?',
    'villa[s]?',
  ];

  const unitTypePattern = new RegExp(
    `(\\d+)\\s+(${unitTypes.join('|')})`,
    'gi'
  );

  let match;
  const seen = new Set<string>();
  while ((match = unitTypePattern.exec(searchText)) !== null) {
    const count = parseInt(match[1], 10);
    const rawType = match[2].trim();
    const normalised = rawType.toLowerCase().replace(/\s+/g, ' ');
    if (count > 0 && count < 10000 && !seen.has(normalised)) {
      seen.add(normalised);
      units.push({ type: rawType, count, description: null });
    }
  }

  // Also look for labeled lists: "Unit A: 8 Treehouses", "Type 1 - Cabins (12)"
  const labeledPattern = /(?:unit\s+[a-f]|type\s+\d)\s*[-:]\s*(\d+)\s+([A-Za-z\s]+?)(?:\s*\(|,|\n|$)/gi;
  while ((match = labeledPattern.exec(searchText)) !== null) {
    const count = parseInt(match[1], 10);
    const rawType = match[2].trim();
    const normalised = rawType.toLowerCase().replace(/\s+/g, ' ');
    if (count > 0 && count < 10000 && rawType.length > 2 && !seen.has(normalised)) {
      seen.add(normalised);
      units.push({ type: rawType, count, description: null });
    }
  }

  return units.length > 0 ? units : null;
}

function extractFinancialAssumptions(sections: DocSection[], fullText: string): FinancialAssumption[] | null {
  const searchSections = [
    findSection(sections, 'Executive Summary'),
    findSection(sections, 'Financial Analysis', 'Financial Projections'),
    findSection(sections, 'Assumptions'),
    findSection(sections, 'Scope of Work'),
    findSection(sections, 'Project Overview', 'Property Overview'),
  ].filter(Boolean) as DocSection[];

  const sectionText = searchSections.map((s) => s.content).join('\n');
  const assumptions: FinancialAssumption[] = [];
  const seen = new Set<string>();

  const patterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /(?:total\s+)?(?:development|project)\s+cost[s]?\s*(?:of|:|\s+is)?\s*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)?/i, label: 'Total Development Cost' },
    { pattern: /(?:total\s+)?(?:investment|capital)\s+(?:required|needed|cost)\s*(?:of|:|\s+is)?\s*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)?/i, label: 'Total Investment' },
    { pattern: /(?:stabilized\s+)?(?:average\s+)?(?:daily\s+rate|adr)\s*(?:of|:|\s+is)?\s*\$?([\d,.]+)/i, label: 'Average Daily Rate' },
    { pattern: /(?:stabilized\s+)?occupancy\s*(?:rate)?\s*(?:of|:|\s+is)?\s*([\d.]+)\s*%/i, label: 'Stabilized Occupancy' },
    { pattern: /(?:annual\s+)?(?:total\s+)?revenue[s]?\s*(?:of|:|\s+is)?\s*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)?/i, label: 'Annual Revenue' },
    { pattern: /(?:net\s+operating\s+income|noi)\s*(?:of|:|\s+is)?\s*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)?/i, label: 'Net Operating Income' },
    { pattern: /cap(?:italization)?\s+rate\s*(?:of|:|\s+is)?\s*([\d.]+)\s*%/i, label: 'Cap Rate' },
    { pattern: /(?:irr|internal\s+rate\s+of\s+return)\s*(?:of|:|\s+is)?\s*([\d.]+)\s*%/i, label: 'IRR' },
    { pattern: /(?:stabiliz(?:e|ation))\s+(?:within|in|after)?\s*(?:approximately\s+)?(\d+)\s+(?:months?|years?)/i, label: 'Stabilization Period' },
    { pattern: /(?:payback|break-even)\s+(?:period)?\s*(?:of|:|\s+is|in)?\s*(?:approximately\s+)?(\d+)\s+(?:months?|years?)/i, label: 'Payback Period' },
    { pattern: /(?:land\s+(?:cost|price|value|basis))\s*(?:of|:|\s+is)?\s*\$?([\d,]+(?:\.\d+)?)/i, label: 'Land Cost' },
    { pattern: /(?:cost\s+per\s+(?:unit|key|site))\s*(?:of|:|\s+is)?\s*\$?([\d,]+(?:\.\d+)?)/i, label: 'Cost Per Unit' },
    { pattern: /(?:operating\s+expense)\s+(?:ratio|percentage)\s*(?:of|:|\s+is)?\s*([\d.]+)\s*%/i, label: 'Operating Expense Ratio' },
  ];

  for (const { pattern, label } of patterns) {
    if (seen.has(label)) continue;
    const m = sectionText.match(pattern);
    if (m) {
      let value: string | number = m[1].replace(/,/g, '');
      const numVal = parseFloat(value);
      if (!isNaN(numVal)) {
        if (m[0].toLowerCase().includes('million') || m[0].toLowerCase().includes('m)')) {
          value = numVal * 1_000_000;
        } else {
          value = numVal;
        }
      }
      seen.add(label);
      assumptions.push({ label, value });
    }
  }

  return assumptions.length > 0 ? assumptions : null;
}

function extractKeyAmenities(sections: DocSection[], fullText: string): string[] | null {
  const amenitySection = findSection(
    sections,
    'Key Amenities',
    'Amenities',
    'Property Amenities',
    'Proposed Amenities',
    'Site Amenities'
  );
  const searchSections = amenitySection
    ? [amenitySection]
    : [
        findSection(sections, 'Executive Summary'),
        findSection(sections, 'Project Overview', 'Property Overview'),
      ].filter(Boolean) as DocSection[];

  const sectionText = searchSections.map((s) => s.content).join('\n');
  const searchText = sectionText || fullText.slice(0, 12000);

  const amenities: string[] = [];
  const seen = new Set<string>();

  const knownAmenities = [
    'pool', 'hot tub', 'sauna', 'clubhouse', 'wifi', 'wi-fi', 'restaurant', 'dog park',
    'laundry', 'playground', 'fire pit', 'ev charging', 'general store', 'bathhouse',
    'fitness center', 'game room', 'lodge', 'pavilion', 'grill', 'picnic area',
    'hiking trails', 'fishing', 'boat ramp', 'marina', 'beach', 'waterfront',
    'basketball', 'volleyball', 'tennis', 'golf', 'mini golf', 'arcade',
    'camp store', 'propane', 'dump station', 'full hookups', 'sewer', 'water', 'electric',
  ];

  const lowerText = searchText.toLowerCase();
  for (const known of knownAmenities) {
    if (lowerText.includes(known.toLowerCase())) {
      const normalized = known
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      if (!seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase());
        amenities.push(normalized);
      }
    }
  }

  const bulletPattern = /(?:^|\n)\s*[•\-*]\s*([A-Za-z][A-Za-z\s&'-]{2,50})(?=\s*\n|$|,)/gm;
  let match;
  while ((match = bulletPattern.exec(searchText)) !== null) {
    const item = match[1].trim().replace(/\s+/g, ' ');
    if (item.length >= 3 && item.length <= 50 && !/^(the|a|an|and|or|with|including)\s/i.test(item)) {
      const normalized = item
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      if (!seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase());
        amenities.push(normalized);
      }
    }
  }

  return amenities.length > 0 ? amenities.sort() : null;
}

function extractRecommendations(sections: DocSection[]): string[] | null {
  const recSection = findSection(sections, 'Recommendations', 'Conclusion', 'Key Findings');
  if (!recSection) return null;

  const recs: string[] = [];
  for (const para of recSection.paragraphs) {
    if (para.length < 10) continue;

    // Skip headings and boilerplate
    const lower = para.toLowerCase();
    if (lower === 'recommendations' || lower === 'conclusion' || lower === 'key findings') continue;
    if (/^(based on|in conclusion|overall|in summary)/i.test(para) && recs.length === 0) {
      recs.push(para.slice(0, 500));
      continue;
    }

    if (recs.length < 15) {
      recs.push(para.slice(0, 500));
    }
  }

  return recs.length > 0 ? recs : null;
}

// ---------------------------------------------------------------------------
// Shared raw extraction (used by parseDocxReport and reports/upload)
// ---------------------------------------------------------------------------

/**
 * Extract raw content from DOCX/DOC files. Shared by parseDocxReport and reports/upload
 * so both paths use the same extraction logic (paragraphs, tables, sections, messages).
 */
/** OLE compound document magic (legacy .doc) */
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);

export async function extractRawContentFromDocx(
  buffer: Buffer,
  filename?: string
): Promise<RawDocxContent> {
  const extIsDoc = filename?.toLowerCase().endsWith('.doc') ?? false;
  const isOleFormat = buffer.length >= 8 && buffer.subarray(0, 4).equals(OLE_MAGIC);
  const isLegacyDoc = extIsDoc || isOleFormat;

  if (isLegacyDoc) {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    let fullText = doc.getBody() || '';
    if (!fullText || fullText.trim().length < 10) {
      fullText = (doc.getHeaders?.() || '') + '\n' + fullText;
    }
    const paragraphs = fullText.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
    const sections = extractSectionsFromPlainText(fullText);
    return {
      fullText,
      paragraphs,
      tables: [],
      sections: sections.map((s) => ({
        heading: s.heading,
        headingLevel: s.headingLevel,
        content: s.content,
        paragraphs: s.paragraphs,
      })),
      messages: [],
    };
  }

  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  const messages = (result.messages || []).map((m) => m.message || String(m));
  const $ = cheerio.load(html);

  const sections = extractSections($);
  const paragraphs: string[] = [];
  $('body').children().each((_, el) => {
    const t = $(el).text().trim();
    if (t) paragraphs.push(t);
  });
  const fullText = paragraphs.join('\n');

  const tables: Array<{ table_id: string; rows: string[][] }> = [];
  $('table').each((i, table) => {
    const rows: string[][] = [];
    $(table)
      .find('tr')
      .each((_, tr) => {
        const rowData: string[] = [];
        $(tr)
          .find('td, th')
          .each((_, cell) => {
            rowData.push($(cell).text().trim());
          });
        if (rowData.length) rows.push(rowData);
      });
    tables.push({ table_id: `table_${i + 1}`, rows });
  });

  return {
    fullText,
    paragraphs,
    tables,
    sections: sections.map((s) => ({
      heading: s.heading,
      headingLevel: s.headingLevel,
      content: s.content,
      paragraphs: s.paragraphs,
    })),
    messages,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function parseDocxReport(
  buffer: Buffer,
  filename: string,
  options?: ParseDocxReportOptions
): Promise<ParsedDocxReport> {
  const studyId = extractStudyId(filename);

  let raw: RawDocxContent;
  try {
    raw = await extractRawContentFromDocx(buffer, filename);
  } catch (err) {
    const isLegacyDoc = filename.toLowerCase().endsWith('.doc');
    throw new Error(
      isLegacyDoc
        ? `Failed to read "${filename}" as a Word document. Legacy .doc files are supported; the file may be corrupted. (${(err as Error).message})`
        : `Failed to read "${filename}" as a Word document. The file may be corrupted or not a valid .docx file. (${(err as Error).message})`
    );
  }

  const sections: DocSection[] = raw.sections.map((s) => ({
    heading: s.heading,
    headingLevel: s.headingLevel,
    content: s.content,
    paragraphs: s.paragraphs,
  }));
  const fullText = raw.fullText;

  const addressData = extractAddress(sections, fullText);
  const filenameParts = extractCityStateFromFilename(filename);
  const clientData = extractClient(sections, fullText);

  const documentTitle = extractFirstPageTitle(fullText);
  let parsed: ParsedDocxReport = {
    study_id: studyId,
    document_title: documentTitle,
    resort_name: extractResortName(sections, fullText),
    client_name: clientData.name,
    client_entity: clientData.entity,
    address: addressData.address,
    city: addressData.city || filenameParts.city,
    state: addressData.state || filenameParts.state,
    zip_code: addressData.zip_code,
    county: extractCounty(sections, fullText),
    parcel_number: extractParcel(fullText),
    lot_size_acres: extractAcreage(sections, fullText),
    total_units: extractTotalUnits(sections, fullText),
    market_type: extractMarketType(fullText),
    report_date: extractReportDate(fullText),
    authors: extractAuthors(sections, fullText),
    executive_summary: extractExecutiveSummary(sections),
    swot: extractSWOT(sections),
    report_purpose: extractReportPurpose(sections),
    development_phase: extractDevelopmentPhase(sections, fullText),
    zoning: extractZoning(sections, fullText),
    unit_mix: extractUnitMix(sections, fullText),
    financial_assumptions: extractFinancialAssumptions(sections, fullText),
    recommendations: extractRecommendations(sections),
    key_amenities: extractKeyAmenities(sections, fullText),
    extraction_messages: raw.messages.length > 0 ? raw.messages : undefined,
  };

  if (options?.useLLMForMissing) {
    parsed = await fillMissingFieldsWithLLM(parsed, raw);
  }

  if (isGarbageReportCity(parsed.city)) {
    parsed.city = null;
  }

  return parsed;
}
