/**
 * Assemble DOCX from template and generated sections.
 * Fetches templates from Supabase Storage by market type; caches in memory.
 * Preserves all template formatting, images, tables, fonts, and styles.
 */

import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import sharp from 'sharp';
import { createServerClient } from '@/lib/supabase';
import type { DevelopmentCostsData, EnrichedInput } from './types';
import type { GeneratedSections } from './types';
import type { FeasibilityModelOutput } from '@/lib/feasibility-model';
import { getTemplateKeyForMarketType } from './template-key';
import {
  buildIdentityReplacements,
  findRemainingSampleFingerprints,
  replacePlainTextInDocument,
  stripAuthorHighlightXml,
} from './assemble-docx-identity';
import {
  bodyTextToStyledParagraphsXml,
  extractParagraphStyleTemplate,
  FALLBACK_PARAGRAPH_STYLE,
  isLayoutChromeParagraph,
  isLetterheadParagraph,
  isSignatureParagraph,
  matchSwotBucketKey,
  parseSwotBuckets,
  splitBodyIntoChunks,
  stripMarkdownEmphasis,
  withBoldRunProps,
  type ParagraphStyleTemplate,
} from './assemble-docx-format';
import {
  matchLabeledSectionKey,
  parseAreaAnalysisSections,
  parseLabeledSections,
} from './area-analysis-sections';
import {
  fetchAreaMapImage,
  fetchDriveTimeRouteMapImage,
  fetchParksProximityMapImage,
  prioritizeWeatherSparkChartUrls,
} from './figures';
import { selectChartsForEmbed } from './weatherspark-charts';
import type { WeatherChartImageData } from './types';
import {
  buildTourismSlotPlaceholderTexts,
  normalizeStateAbbr,
  stateDisplayName,
} from './tourism-author-checklist';
import {
  annotateLinkedExcelTables,
  isExcelLinkParagraph,
  replaceExcelLinkParagraphsBySheet,
  retargetLinkedExcelWorkbook,
} from './assemble-docx-excel-links';
import {
  buildCombinedNpsTableRows,
  buildStateParksTableRows,
  formatMilesLabel,
  selectNationalParkRows,
  selectStateParkRows,
} from './park-visitation';
import {
  buildHighwayAccessContent,
  fetchDriveRouteFromCity,
  resolveNearestMajorCity,
} from './transportation-access';
import { buildDriveTimeMarketProfileTable } from './drive-time-demographics';
import {
  buildInfluentialCitiesParagraphs,
  selectInfluentialCities,
} from './influential-cities';
import {
  buildComparablesKeyFindings,
  buildComparablesTableRows,
  photoPlaceholderText,
  selectProposedComparables,
} from './comparables-section';
import { buildScopeOfWorkContent } from './scope-of-work';
import {
  buildCertificationContent,
  buildLetterOfTransmittalContent,
  formatReportDate,
  type LetterOfTransmittalContent,
} from './front-matter';
import {
  buildExecutiveSummaryContent,
  type ExecSummaryLine,
} from './executive-summary';

export { getTemplateKeyForMarketType } from './template-key';
export {
  buildIdentityReplacements,
  replacePlainTextInDocument,
  findRemainingSampleFingerprints,
  stripAuthorHighlightXml,
} from './assemble-docx-identity';
export {
  bodyTextToStyledParagraphsXml,
  extractParagraphStyleTemplate,
  isLayoutChromeParagraph,
  parseSwotBuckets,
  stripMarkdownEmphasis,
} from './assemble-docx-format';

export type SectionHitStatus = 'replaced' | 'inserted' | 'missed';

export interface AssembleDocxDiagnostics {
  sectionHits: Record<string, SectionHitStatus>;
  identityReplacements: number;
  imagesKept: number;
  imagesPlaceholdered: number;
  sampleFingerprintsRemaining: string[];
  /** Times a replace loop stopped to preserve sectPr / page-break chrome */
  layoutChromeSkipped: number;
  /** Cyan TOUR-0N placeholders injected under Tourism Trends */
  tourismPlaceholdersInjected: number;
  /** Template tourism drawings removed under Tourism Trends */
  tourismDrawingsStripped: number;
}

export type AssembleDraftDocxResult = {
  buffer: Buffer;
  diagnostics: AssembleDocxDiagnostics;
};

type LayoutChromeCounter = { skipped: number };

const BUCKET_NAME = 'report-templates';
const INCLUDE_CITATIONS_IN_DOCX =
  process.env.REPORT_BUILDER_INCLUDE_CITATIONS_IN_DOCX === 'true';

const templateCache = new Map<string, { content: string; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearTemplateCache() {
  templateCache.clear();
}

async function fetchTemplateFromSupabase(templateKey: string): Promise<string | null> {
  const storagePath = `${templateKey}/template.docx`;
  const supabase = createServerClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(storagePath);

  if (error || !data) {
    console.warn(`[assemble-docx] Supabase template fetch failed for ${storagePath}:`, error?.message);
    return null;
  }

  const arrayBuffer = await data.arrayBuffer();
  const binary = Buffer.from(arrayBuffer).toString('binary');
  return binary;
}

function getLocalFallbackTemplate(templateKey: string): string {
  const specificPath = path.join(process.cwd(), 'templates', templateKey, 'template.docx');
  if (fs.existsSync(specificPath)) {
    return fs.readFileSync(specificPath, 'binary');
  }
  const developmentCostsPath = path.join(process.cwd(), 'templates', 'Development Costs.docx');
  if (fs.existsSync(developmentCostsPath)) {
    return fs.readFileSync(developmentCostsPath, 'binary');
  }
  const genericPath = path.join(process.cwd(), 'templates', 'feasibility-draft.docx');
  if (!fs.existsSync(genericPath)) {
    throw new Error(
      `Template not found at ${specificPath}, ${developmentCostsPath}, or ${genericPath}. Add templates/Development Costs.docx (Vercel) or run: npx tsx scripts/create-feasibility-draft-template.ts`
    );
  }
  return fs.readFileSync(genericPath, 'binary');
}

async function getTemplateContent(templateKey: string): Promise<string> {
  const cached = templateCache.get(templateKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.content;
  }

  const fromSupabase = await fetchTemplateFromSupabase(templateKey);
  const content = fromSupabase ?? getLocalFallbackTemplate(templateKey);
  templateCache.set(templateKey, { content, fetchedAt: Date.now() });
  return content;
}

export interface AssembleDraftDocxOptions {
  marketType?: string | null;
  /**
   * Basename of the companion XLSX saved alongside this DOCX (e.g. template.xlsx).
   * Used to retarget Word LINK Excel fields so authors can refresh from the model.
   */
  companionWorkbookFileName?: string | null;
}

const DOCX_XML_PARTS = [
  'word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
  'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
];

/**
 * Pre-render: strip <w:highlight/> from runs containing {placeholder} tags
 * so docxtemplater-replaced values won't inherit the template's highlighting.
 */
function stripHighlightsFromPlaceholderRuns(zip: PizZip): void {
  for (const xmlPath of DOCX_XML_PARTS) {
    const file = zip.file(xmlPath);
    if (!file) continue;

    let xml = file.asText();
    xml = xml.replace(
      /(<w:r\b[^>]*>)([\s\S]*?)(<\/w:r>)/g,
      (match, open: string, inner: string, close: string) => {
        if (!/\{[a-z_]+\}/i.test(inner)) return match;
        return open + inner.replace(/<w:highlight\b[^/]*\/>/g, '') + close;
      }
    );
    zip.file(xmlPath, xml);
  }
}

/**
 * Post-render: strip cyan highlights from runs / paragraphs whose text matches
 * form-filled values. Preserves cyan on unresolved author-mark fields
 * (e.g. co-author names still needing review).
 */
function stripHighlightsFromFormValues(zip: PizZip, formValues: Set<string>): void {
  const normalized = new Set(
    [...formValues].map((v) => v.replace(/\s+/g, ' ').trim()).filter((v) => v.length > 0)
  );
  if (normalized.size === 0) return;

  for (const xmlPath of DOCX_XML_PARTS) {
    const file = zip.file(xmlPath);
    if (!file) continue;

    let xml = file.asText();

    xml = xml.replace(/<w:p([\s>])([\s\S]*?)<\/w:p>/g, (match, openTail: string, inner: string) => {
      if (!/<w:highlight\b[^>]*w:val="(cyan|green)"/i.test(inner)) return match;
      const plain = extractParagraphPlainText(match).replace(/\s+/g, ' ').trim();
      if (!plain) return match;
      const resolved = [...normalized].some(
        (v) => plain === v || (v.length >= 4 && plain.includes(v)) || (plain.length >= 4 && v.includes(plain))
      );
      if (!resolved) return match;
      return `<w:p${openTail}${stripAuthorHighlightXml(inner)}</w:p>`;
    });

    zip.file(xmlPath, xml);
  }
}

/**
 * Cover-page author marks: apply intake values and clear cyan only where we
 * updated (or affirmed) the field. Leave unresolved marks (co-authors, etc.).
 */
function applyCoverPageResolvedMarks(zip: PizZip, input: EnrichedInput): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const address1 = input.address_1?.trim() || '';
  const cityStateZip = [input.city, [input.state, input.zip_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const cityState = [input.city, input.state].filter(Boolean).join(', ');
  const parcel = input.parcel_number?.trim() || '';
  const parcelLine = parcel ? `Parcel Number ${parcel}` : '';
  const studySubtitle = (input.service || 'Feasibility Study').trim() || 'Feasibility Study';

  let xml = file.asText();
  let pastCover = false;

  xml = xml.replace(/<w:p([\s>])([\s\S]*?)<\/w:p>/g, (match, openTail: string, inner: string) => {
    if (pastCover) return match;
    const plain = extractParagraphPlainText(match).replace(/\s+/g, ' ').trim();
    if (!plain) return match;

    // Stop at TOC / first real section
    if (
      (/Letter of Transmittal|Table of Contents|Certification/i.test(plain) &&
        /w:pStyle\s+w:val="Heading1"/.test(match)) ||
      /^Table of Contents$/i.test(plain)
    ) {
      pastCover = true;
      return match;
    }

    // Remove address-or-parcel instruction when we have a street address
    if (address1 && /If no exact address/i.test(plain) && /parcel/i.test(plain)) {
      return '';
    }

    // Parcel line
    if (/^Parcel Number\b/i.test(plain) && parcelLine) {
      if (plain === parcelLine) {
        return `<w:p${openTail}${stripAuthorHighlightXml(inner)}</w:p>`;
      }
      // Rewrite sample / stale parcel to intake value and clear highlight
      let nextInner = stripAuthorHighlightXml(inner);
      let used = false;
      nextInner = nextInner.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (_t, attrs: string) => {
        if (!used) {
          used = true;
          return `<w:t${attrs}>${escapeXml(parcelLine)}</w:t>`;
        }
        return `<w:t></w:t>`;
      });
      return `<w:p${openTail}${nextInner}</w:p>`;
    }

    // Study subtitle (Feasibility Study) — affirmed from service / default
    if (/^Feasibility Study$/i.test(plain) || /^Market Analysis$/i.test(plain)) {
      if (plain.toLowerCase() === studySubtitle.toLowerCase()) {
        return `<w:p${openTail}${stripAuthorHighlightXml(inner)}</w:p>`;
      }
      let nextInner = stripAuthorHighlightXml(inner);
      let used = false;
      nextInner = nextInner.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (_t, attrs: string) => {
        if (!used) {
          used = true;
          return `<w:t${attrs}>${escapeXml(studySubtitle)}</w:t>`;
        }
        return `<w:t></w:t>`;
      });
      return `<w:p${openTail}${nextInner}</w:p>`;
    }

    // Address / city lines already matching intake → clear cyan
    const coverResolved = [address1, cityStateZip, cityState].filter(Boolean);
    if (
      coverResolved.some((v) => plain === v) &&
      /<w:highlight\b[^>]*w:val="(cyan|green)"/i.test(inner)
    ) {
      return `<w:p${openTail}${stripAuthorHighlightXml(inner)}</w:p>`;
    }

    return match;
  });

  zip.file(xmlPath, xml);
}

function buildComparablesAnalysis(input: EnrichedInput): string {
  const comps = input.nearby_comps;
  if (!comps?.length) return '';

  const lines: string[] = [];

  for (const c of comps) {
    const parts = [c.property_name];
    if (c.city && c.state) parts[0] += ` (${c.city}, ${c.state})`;
    else if (c.state) parts[0] += ` (${c.state})`;

    const details: string[] = [];
    if (c.distance_miles != null && c.distance_miles >= 0) {
      details.push(`${c.distance_miles} miles from subject`);
    }
    if (c.property_total_sites) details.push(`${c.property_total_sites} total sites`);
    if (c.unit_type) details.push(`Unit type: ${c.unit_type}`);
    if (c.avg_retail_daily_rate) details.push(`Avg daily rate: $${Math.round(c.avg_retail_daily_rate)}`);
    if (c.high_rate && c.low_rate) {
      details.push(`Rate range: $${Math.round(c.low_rate)}-$${Math.round(c.high_rate)}`);
    }
    if (c.low_occupancy != null && c.peak_occupancy != null) {
      details.push(`Occupancy: ${c.low_occupancy}%-${c.peak_occupancy}%`);
    }

    const sourceMap: Record<string, string> = {
      all_sage_data: 'Glamping DB',
      hipcamp: 'Hipcamp',
      all_roverpass_data_new: 'RoverPass',
      campspot: 'Campspot',
      past_reports: 'Past Sage Report',
      tavily_web_research: 'Web Research',
    };
    details.push(`Source: ${sourceMap[c.source_table] ?? c.source_table}`);

    lines.push(`${parts[0]}: ${details.join('. ')}.`);
  }

  return lines.join('\n');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildProjectOverviewRows(input: EnrichedInput): Array<[string, string]> {
  const location = [input.address_1, input.city, input.state, input.zip_code]
    .filter(Boolean)
    .join(', ');
  const totalSites = input.unit_mix.reduce((sum, u) => sum + (u.count || 0), 0);
  const unitMixText = input.unit_mix.length > 0
    ? input.unit_mix.map((u) => `${u.type}: ${u.count}`).join('; ')
    : 'Not specified';
  const resortType = (input.market_type || 'rv').toLowerCase() === 'glamping'
    ? 'Glamping Resort'
    : 'RV Resort';

  return [
    ['Resort Name', input.property_name || 'Not specified'],
    ['Resort Type', resortType],
    ['Resort Full Address', location || 'Not specified'],
    ['Lot Size (Acres)', input.acres != null ? String(input.acres) : 'Not specified'],
    ['Parcel Number(s)', input.parcel_number || 'Not specified'],
    ['Units / Sites', totalSites > 0 ? `${totalSites}` : 'Not specified'],
    ['Unit Mix', unitMixText],
    ['Total Units / Sites', totalSites > 0 ? `${totalSites}` : 'Not specified'],
    [
      'Additional Development, Improvements, Amenities',
      input.amenities_description || 'Not specified',
    ],
    [
      'What amenities are planned for the property / guest experience?',
      input.amenities_description || 'Not specified',
    ],
  ];
}

function buildProjectOverviewTableXml(input: EnrichedInput): string {
  const rows = buildProjectOverviewRows(input).map(([label, value]) => `
<w:tr>
  <w:tc>
    <w:tcPr><w:tcW w:w="4300" w:type="dxa"/></w:tcPr>
    <w:p><w:pPr><w:pStyle w:val="TableParagraph"/></w:pPr><w:r><w:t>${escapeXml(label)}</w:t></w:r></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="4300" w:type="dxa"/></w:tcPr>
    <w:p><w:pPr><w:pStyle w:val="TableParagraph"/></w:pPr><w:r><w:t>${escapeXml(value)}</w:t></w:r></w:p>
  </w:tc>
</w:tr>`).join('');

  return `<w:tbl>
  <w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblLook w:val="04A0"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="4300"/>
    <w:gridCol w:w="4300"/>
  </w:tblGrid>
  ${rows}
</w:tbl>`;
}

/**
 * Older RV templates include a static linked Excel object for the Project Overview intake table.
 * Replace that object with a runtime table populated from current report input.
 */
function replaceLinkedProjectOverviewTable(zip: PizZip, input: EnrichedInput): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();
  const linkedExcelParaPattern =
    /<w:p>(?:(?!<\/w:p>).)*?<w:instrText[^>]*>(?:(?!<\/w:p>).)*?ToT \(Intake Form\)!R22C2:R48C3(?:(?!<\/w:p>).)*?<\/w:instrText>(?:(?!<\/w:p>).)*?<\/w:p>/s;

  if (!linkedExcelParaPattern.test(xml)) return;

  const relinkNote =
    '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>' +
    '<w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr>' +
    '<w:t>[Linked table: To re-link this table to the companion .xlsx file, right-click the table in Word, ' +
    'select "Linked Worksheet Object" &gt; "Links", then update the source to point to the downloaded .xlsx ' +
    '(ToT Intake Form sheet, rows 22-48).]</w:t></w:r></w:p>';

  const replacement = `${buildProjectOverviewTableXml(input)}${relinkNote}<w:p/>`;
  zip.file(xmlPath, xml.replace(linkedExcelParaPattern, replacement));
}

function buildCaptionCenteredXml(caption: string): string {
  return (
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="595959"/></w:rPr>` +
    `<w:t>${escapeXml(caption)}</w:t></w:r></w:p>`
  );
}

function buildSourceNoteXml(text: string): string {
  return (
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="16"/></w:rPr>` +
    `<w:t>${escapeXml(text)}</w:t></w:r></w:p>`
  );
}

function buildCombinedNpsVisitationXml(input: EnrichedInput): string {
  const rows = selectNationalParkRows(input.demand_drivers, 6);
  if (rows.length === 0) return '';
  const { headers, body, totalVisitors } = buildCombinedNpsTableRows(rows);
  const millions =
    totalVisitors >= 1_000_000
      ? ` (~${(totalVisitors / 1_000_000).toFixed(2)} million combined)`
      : '';
  return (
    buildCaptionCenteredXml('Combined NPS Visitation') +
    buildSimpleTableXml(headers, body) +
    buildSourceNoteXml(
      `SOURCE: National Park Service / Sage national-parks database (latest recreation visitors on file)${millions}. ` +
        'Native table generated from the companion workbook Nat. Parks sheet (refresh linked Excel tables from the downloaded .xlsx where available).'
    )
  );
}

function buildStateParksVisitationXml(input: EnrichedInput): string {
  const rows = selectStateParkRows(input.demand_drivers, 6);
  if (rows.length === 0) {
    return (
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:t>Below are the closest state parks to the subject site. No state-park records were found within the search radius; analyst to verify state park visitation.</w:t></w:r></w:p>`
    );
  }
  const { headers, body } = buildStateParksTableRows(rows);
  const seasonNote =
    'These parks are expected to drive demand to the subject site primarily during the summer and shoulder months, with some demand from the winter season.';
  return (
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:t>Below are the closest state parks to the subject site. ${escapeXml(seasonNote)}</w:t></w:r></w:p>` +
    buildSimpleTableXml(headers, body) +
    buildSourceNoteXml(
      'SOURCE: Web research / ODNR / Sage outdoor_recreation_sites. Native table generated from the companion workbook State Parks sheet.'
    ) +
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:t>Following is a map of the above parks:</w:t></w:r></w:p>`
  );
}

/**
 * Replace Excel OLE paste-link field paragraphs whose instrText matches `sheetHint`
 * (e.g. "State Parks!"). Returns number of replacements.
 */
function replaceLinkedExcelFieldsBySheet(
  zip: PizZip,
  sheetHint: string,
  replacementXml: string
): number {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 0;
  let xml = file.asText();
  const escaped = sheetHint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<w:p>(?:(?!<\\/w:p>).)*?<w:instrText[^>]*>(?:(?!<\\/w:p>).)*?${escaped}(?:(?!<\\/w:p>).)*?<\\/w:instrText>(?:(?!<\\/w:p>).)*?<\\/w:p>`,
    'gs'
  );
  let count = 0;
  xml = xml.replace(pattern, () => {
    count += 1;
    return replacementXml;
  });
  if (count > 0) zip.file(xmlPath, xml);
  return count;
}

function parkMapLegendXml(
  parks: Array<{ name: string; distance_miles: number }>
): string {
  if (parks.length === 0) return '';
  const legend = parks
    .map((p, i) => `${i + 1} = ${p.name} (${formatMilesLabel(p.distance_miles)})`)
    .join('; ');
  return (
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr>` +
    `<w:t>${escapeXml(`Map legend — S = Subject; ${legend}`)}</w:t></w:r></w:p>`
  );
}

/** Exact / near-exact heading match — avoids "State Parks" matching "State Parks Map". */
function headingTitleMatches(plain: string, target: string): boolean {
  const p = plain.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (p === t) return true;
  // Allow tiny trailing junk (page-break artifacts) but not longer titles
  if (p.startsWith(t) && p.length <= t.length + 3) return true;
  return false;
}

/**
 * Rebuild Demand Indicators → Transportation drive-time map (major city → subject)
 * and Highway and Road Access prose (strip template I-24 / wrong-market remnants).
 */
async function rebuildTransportationAccess(
  zip: PizZip,
  input: EnrichedInput
): Promise<{ map: boolean; highway: boolean }> {
  const result = { map: false, highway: false };
  const lat = input.latitude;
  const lng = input.longitude;
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  if (!hasCoords) return result;

  const city = resolveNearestMajorCity(lat!, lng!, input.demand_drivers, 150);
  const route = city ? await fetchDriveRouteFromCity(city, lat!, lng!) : null;
  const content = buildHighwayAccessContent(input, route, city);

  let mapXml = '';
  if (city) {
    const fetched = await fetchDriveTimeRouteMapImage(
      city.latitude,
      city.longitude,
      lat!,
      lng!,
      route?.overview_polyline
    );
    if (fetched) {
      const rId = await embedImageInZip(
        zip,
        fetched.buffer,
        fetched.ext,
        'imageDriveTimeMap'
      );
      if (rId) {
        const source = fetched.provider === 'google' ? 'GOOGLE MAPS' : 'OPENSTREETMAP';
        const driveNote =
          route != null
            ? `Drive time from ${content.cityLabel}: ${route.duration_text} (${route.distance_text}).`
            : `Nearest major city: ${content.cityLabel} (~${Math.round(city.distance_miles)} mi straight-line).`;
        mapXml =
          `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
          `<w:r><w:t>This section explains how guests can access the subject property.</w:t></w:r></w:p>` +
          `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>` +
          buildInlineImageDrawingXml(rId, {
            cx: 5486400,
            cy: 4114800,
            name: 'SageGenerated Drive Time Map',
          }) +
          `</w:r></w:p>` +
          buildCaptionParagraphXml(
            `${content.mapCaption.replace(' (SOURCE: GOOGLE MAPS)', '')} (SOURCE: ${source})`
          ) +
          `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
          `<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="595959"/></w:rPr>` +
          `<w:t>${escapeXml(`Map legend — C = ${content.cityLabel}; S = Subject. ${driveNote}`)}</w:t></w:r></w:p>`;
      }
    }
  }

  if (!mapXml) {
    mapXml =
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:t>This section explains how guests can access the subject property.</w:t></w:r></w:p>` +
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
      `<w:t>${escapeXml(
        '[Image placeholder: Add MAP OF DRIVE TIME FROM MAJOR CITY TO THE SUBJECT PROPERTY — Google Static Maps / Directions unavailable.]'
      )}</w:t></w:r></w:p>`;
  }

  result.map = replaceSubheadBodyInSection(
    zip,
    'Demand Indicators',
    'Transportation',
    ['Highway and Road Access', 'Demographic Market Profile', 'Demand Analysis Conclusion'],
    mapXml
  );

  const highwayXml =
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:t>${escapeXml(content.introHtmlPlain)}</w:t></w:r></w:p>` +
    buildCaptionCenteredXml(content.trafficCaption) +
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:t>${escapeXml(content.trafficBody)}</w:t></w:r></w:p>`;

  result.highway = replaceSubheadBodyInSection(
    zip,
    'Demand Indicators',
    'Highway and Road Access',
    ['Demographic Market Profile', 'Demand Analysis Conclusion', 'Transportation'],
    highwayXml
  );

  return result;
}

/**
 * Replace corrupted Market Profile Excel LINK under Demographic Market Profile
 * with a native 60/120/180 drive-time summary table from enrich.
 */
function rebuildDemographicMarketProfile(
  zip: PizZip,
  input: EnrichedInput
): boolean {
  const dt = input.drive_time_demographics;
  const intro =
    'The market profile within a 60, 120, and 180 minute drive radius of the subject was gathered for analysis. ' +
    'The summary below uses Sage drive-time demographics (county-population / isochrone enrichment). ' +
    'Full ESRI Business Analyst Market Profile detail should be confirmed from the analyst STDB upload into the companion workbook.';

  let tableXml = '';
  let sourceNote =
    'SOURCE: Pending STDB / ESRI Market Profile import — native summary unavailable (drive-time demographics not enriched).';

  if (dt?.rings?.length) {
    const { headers, body } = buildDriveTimeMarketProfileTable(dt);
    tableXml = buildSimpleTableXml(headers, body);
    sourceNote =
      `SOURCE: ${dt.source} (overall demand rubric ${dt.overall_score}/9). ` +
      'Native Word table replaces the broken Excel LINK to Market Profile; refresh the companion workbook Market Profile sheet from STDB for the full multi-metric ESRI layout.';
  } else {
    tableXml =
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
      `<w:t>${escapeXml(
        '[Author update required] Drive-time demographics were not enriched for this draft. Import STDB/ESRI Market Profile into the companion workbook, or re-run enrich with county-population access.'
      )}</w:t></w:r></w:p>`;
  }

  const bodyXml =
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:rPr><w:b/></w:rPr><w:t>Drive-Time Radius Demographics</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:t>${escapeXml(intro)}</w:t></w:r></w:p>` +
    tableXml +
    buildSourceNoteXml(sourceNote) +
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
    `<w:t>${escapeXml(
      '[Image placeholder: Add DRIVE TIME RADIUS MAP FROM SUBJECT (SOURCE: SITE TO DO BUSINESS / ESRI) — not auto-linked in this draft.]'
    )}</w:t></w:r></w:p>`;

  // Prefer full subhead rebuild (removes OLE object + remnant STDB map drawing).
  const rebuilt = replaceSubheadBodyInSection(
    zip,
    'Demand Indicators',
    'Demographic Market Profile',
    [
      'Most Influential Cities',
      'Demand Analysis Conclusion',
      'Supply and Competition Analysis',
      'Transportation',
    ],
    bodyXml
  );
  if (rebuilt) return true;

  // Fallback: swap only the Market Profile Excel LINK paragraph(s).
  const linkXml = tableXml + buildSourceNoteXml(sourceNote);
  return replaceExcelLinkParagraphsBySheet(zip, 'Market Profile', linkXml) > 0;
}

/**
 * Replace template "Most Influential Cities" (Chattanooga / I-24) with nearest
 * major cities from enrich demand drivers for the subject market.
 */
function rebuildMostInfluentialCities(zip: PizZip, input: EnrichedInput): boolean {
  const cities = selectInfluentialCities(input, 3);
  const paragraphs = buildInfluentialCitiesParagraphs(input, cities);
  const parts: string[] = [];
  for (const p of paragraphs) {
    parts.push(
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(p.title)}</w:t></w:r></w:p>`
    );
    parts.push(
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:t>${escapeXml(p.body)}</w:t></w:r></w:p>`
    );
  }
  parts.push(
    buildSourceNoteXml(
      'SOURCE: Sage major-cities demand drivers (US Census city population ≥250k catalog + subject distance).'
    )
  );

  return replaceSubheadBodyInSection(
    zip,
    'Demand Indicators',
    'Most Influential Cities',
    [
      'Demand Analysis Conclusion',
      'Supply and Competition Analysis',
      'Demographic Market Profile',
      'Distance Traveled',
    ],
    parts.join('')
  );
}

/**
 * Replace entire Comparables Heading1 body (Bolt Farm / ReTreet / Stay Minty
 * template gallery) with a 1-page proposed-comp table + findings + one photo
 * placeholder per selected property (≤10).
 */
function rebuildComparablesSection(
  zip: PizZip,
  input: EnrichedInput
): SectionHitStatus {
  const proposed = selectProposedComparables(input);
  const subject = [input.city, input.state].filter(Boolean).join(', ') || 'the subject';
  const intro =
    `This page proposes up to ${proposed.length || 10} nearby comparables for ${subject} ` +
    `from Sage glamping / Hipcamp / Campspot / RoverPass (with web gap-fill when rates or amenities are missing). ` +
    `Selection emphasizes proximity, published rates, and amenity/unit similarity so the author can pick the primary competitive set.`;

  const findings = buildComparablesKeyFindings(input, proposed);
  const { headers, body } = buildComparablesTableRows(proposed);

  const parts: string[] = [];
  parts.push(
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:t>${escapeXml(intro)}</w:t></w:r></w:p>`
  );
  parts.push(
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:b/></w:rPr><w:t>Key findings</w:t></w:r></w:p>`
  );
  for (const f of findings) {
    parts.push(
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:t>${escapeXml(`• ${f}`)}</w:t></w:r></w:p>`
    );
  }
  parts.push(
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:b/></w:rPr><w:t>Proposed comparables (author shortlist)</w:t></w:r></w:p>`
  );

  if (proposed.length > 0) {
    parts.push(buildSimpleTableXml(headers, body));
  } else {
    parts.push(
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
        `<w:t>${escapeXml(
          '[Author update required] No nearby comps were enriched — expand radius, confirm market_type, or add comps manually.'
        )}</w:t></w:r></w:p>`
    );
  }

  if (proposed.length > 0) {
    parts.push(
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:rPr><w:b/></w:rPr><w:t>Photo placeholders (one per proposed comparable)</w:t></w:r></w:p>`
    );
  }

  for (const p of proposed) {
    const label = `${p.rank}. ${p.comp.property_name}`;
    parts.push(
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(label)}</w:t></w:r>` +
        `<w:r><w:t>${escapeXml(' — ')}</w:t></w:r>` +
        `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
        `<w:t>${escapeXml(photoPlaceholderText(p.placeholderNum))}</w:t></w:r></w:p>`
    );
  }

  parts.push(
    buildSourceNoteXml(
      'SOURCE: nearby_comps enrich merge (all_sage_data / hipcamp / campspot / all_roverpass_data_new / past_reports / tavily). ' +
        'Template sample comps (e.g. Bolt Farm Treehouse) are intentionally removed. Author to select primary comps and attach photos.'
    )
  );

  return replaceHeading1SectionBodyXml(
    zip,
    'Comparables',
    ['Rate Projection', 'Occupancy Projection', 'Occupancy', 'Revenue Projection'],
    parts.join('')
  );
}

/**
 * Replace everything after a Heading1 until the next listed Heading1 (includes
 * nested Heading2s, drawings, and tables — used for Comparables gallery wipe).
 */
function replaceHeading1SectionBodyXml(
  zip: PizZip,
  headingText: string,
  nextHeadingTexts: string[],
  bodyXml: string
): SectionHitStatus {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';
  const xml = file.asText();
  const anchor = findSectionHeadingAnchor(xml, headingText);
  if (!anchor) return 'missed';

  const after = xml.slice(anchor.end);
  let endRel: number | null = null;
  for (const para of findTopLevelParagraphs(after)) {
    if (!/<w:pStyle\s+w:val="Heading1"/.test(para.text)) continue;
    if (/<w:hyperlink\b/.test(para.text)) continue;
    const plain = extractParagraphPlainText(para.text);
    if (nextHeadingTexts.some((h) => headingTitleMatches(plain, h))) {
      endRel = para.start;
      break;
    }
    // Any other body Heading1 also ends the section
    endRel = para.start;
    break;
  }
  if (endRel == null) endRel = after.length;

  const hadContent = endRel > 0;
  zip.file(xmlPath, xml.slice(0, anchor.end) + bodyXml + after.slice(endRel));
  return hadContent ? 'replaced' : 'inserted';
}

/**
 * Rebuild National Parks Map / State Parks Map subheads in Demand Indicators:
 * strip template TN/GA map drawings (often kept because they share a text-box
 * paragraph) and embed Google Static Maps of the subject + closest parks.
 */
async function rebuildDemandParkMaps(
  zip: PizZip,
  input: EnrichedInput
): Promise<{ national: boolean; state: boolean }> {
  const result = { national: false, state: false };
  const lat = input.latitude;
  const lng = input.longitude;
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  if (!hasCoords) return result;

  const natRowsAll = selectNationalParkRows(input.demand_drivers, 6);
  // Map should stay local — far destination parks blow out Google's auto-fit viewport.
  const natRowsForMap = (() => {
    const local = natRowsAll.filter((r) => r.distance_miles <= 100).slice(0, 4);
    if (local.length > 0) return local;
    return natRowsAll.slice(0, 1);
  })();
  const stateRows = selectStateParkRows(input.demand_drivers, 4);

  async function buildMapBlock(
    parks: typeof natRowsAll,
    mediaBase: string,
    caption: string,
    drawingName: string
  ): Promise<string> {
    const fetched = await fetchParksProximityMapImage(lat!, lng!, parks);
    if (!fetched) {
      return (
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
        `<w:t>${escapeXml(
          `[Image placeholder: Add ${caption} — Google Static Maps / OSM fallback unavailable.]`
        )}</w:t></w:r></w:p>`
      );
    }
    const rId = await embedImageInZip(zip, fetched.buffer, fetched.ext, mediaBase);
    if (!rId) return '';
    const source = fetched.provider === 'google' ? 'GOOGLE MAPS' : 'OPENSTREETMAP';
    return (
      `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>` +
      buildInlineImageDrawingXml(rId, {
        cx: 5486400,
        cy: 4114800,
        name: drawingName,
      }) +
      `</w:r></w:p>` +
      buildCaptionParagraphXml(`${caption} (SOURCE: ${source})`) +
      parkMapLegendXml(parks)
    );
  }

  const natMapXml =
    natRowsForMap.length > 0
      ? (await buildMapBlock(
          natRowsForMap,
          'imageNatParksMap',
          'CLOSEST NATIONAL PARKS, MONUMENTS, OR MEMORIALS',
          'SageGenerated National Parks Map'
        )) + buildCombinedNpsVisitationXml(input)
      : '';
  const stateMapXml =
    stateRows.length > 0
      ? await buildMapBlock(
          stateRows,
          'imageStateParksMap',
          'CLOSEST STATE PARKS',
          'SageGenerated State Parks Map'
        )
      : '';

  if (natMapXml) {
    result.national = replaceSubheadBodyInSection(
      zip,
      'Demand Indicators',
      'National Parks Map',
      ['State Parks', 'State Parks Map', 'Weather', 'Tourism Trends', 'Attractions'],
      natMapXml
    );
  }
  if (stateMapXml) {
    result.state = replaceSubheadBodyInSection(
      zip,
      'Demand Indicators',
      'State Parks Map',
      ['Weather', 'Tourism Trends', 'Attractions', 'National Parks Map'],
      stateMapXml
    );
  }

  // Fallback: ensure Combined NPS table exists even if the map heading was missing.
  const npsXml = buildCombinedNpsVisitationXml(input);
  if (npsXml) {
    const xmlPath = 'word/document.xml';
    const file = zip.file(xmlPath);
    if (file && !/Combined NPS Visitation/i.test(file.asText())) {
      appendXmlBeforeNextHeading1(zip, 'Demand Indicators', npsXml);
    }
  }
  return result;
}

/**
 * Replace body paragraphs under a Heading2/3 subhead inside a parent Heading1
 * section (stops at next Heading2/3 matching nextSubheads or any Heading1).
 */
function replaceSubheadBodyInSection(
  zip: PizZip,
  parentHeading: string,
  subhead: string,
  nextSubheads: string[],
  replacementXml: string
): boolean {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return false;
  const xml = file.asText();
  const parent = findSectionHeadingAnchor(xml, parentHeading);
  if (!parent) return false;
  const afterParent = xml.slice(parent.end);

  let subStartAbs: number | null = null;
  let subEndAbs: number | null = null;
  const nextSet = nextSubheads.map((s) => s.toLowerCase());

  for (const para of findTopLevelParagraphs(afterParent)) {
    const plain = extractParagraphPlainText(para.text).trim();
    const isH2Only = /<w:pStyle\s+w:val="Heading2"/.test(para.text);
    const isH3 = /<w:pStyle\s+w:val="Heading3"/.test(para.text);
    const isH1 = /<w:pStyle\s+w:val="Heading1"/.test(para.text);
    const matchesSubhead = headingTitleMatches(plain, subhead);
    const matchesNext = nextSet.some((n) => headingTitleMatches(plain, n));
    // Template park map titles are often unstyled short paragraphs (not HeadingN).
    const isShortTitle = plain.length <= Math.max(subhead.length + 8, 48);

    if (subStartAbs == null) {
      if (matchesSubhead && (isH2Only || isH3 || isH1 || isShortTitle)) {
        subStartAbs = parent.end + para.end;
        continue;
      }
      continue;
    }

    if (isH1) {
      subEndAbs = parent.end + para.start;
      break;
    }
    if (matchesNext && (isH2Only || isH3 || isShortTitle)) {
      subEndAbs = parent.end + para.start;
      break;
    }
    // Only a peer Heading2 ends the block; Heading3 is nested content to replace.
    // Skip empty Heading2 chrome (common between template blocks).
    if (isH2Only) {
      if (!plain) continue;
      subEndAbs = parent.end + para.start;
      break;
    }
  }

  if (subStartAbs == null) return false;
  if (subEndAbs == null) {
    // Fall back: end at next Heading1 after parent
    subEndAbs = parent.end + afterParent.length;
    for (const para of findTopLevelParagraphs(afterParent)) {
      if (
        parent.end + para.start > subStartAbs &&
        /<w:pStyle\s+w:val="Heading1"/.test(para.text)
      ) {
        subEndAbs = parent.end + para.start;
        break;
      }
    }
  }

  const fresh = zip.file(xmlPath)?.asText() ?? xml;
  zip.file(
    xmlPath,
    fresh.slice(0, subStartAbs) + replacementXml + fresh.slice(subEndAbs)
  );
  return true;
}

/**
 * Sync park visitation tables: replace linked State Parks Excel fields (and
 * remnant State Parks subhead body) with native tables from enrich.
 * Combined NPS Visitation is injected with the National Parks Map rebuild.
 */
function replaceParkVisitationLinkedTables(zip: PizZip, input: EnrichedInput): void {
  const stateXml = buildStateParksVisitationXml(input);
  const stateReplaced = replaceLinkedExcelFieldsBySheet(zip, 'State Parks!', stateXml);
  if (stateReplaced === 0 && selectStateParkRows(input.demand_drivers, 1).length > 0) {
    // Template may use a Heading3 "State Parks" (not Map) with remnant OLE/table —
    // rebuild that subhead body when we have researched rows.
    replaceSubheadBodyInSection(
      zip,
      'Demand Indicators',
      'State Parks',
      ['State Parks Map', 'National Parks Map', 'Weather', 'Tourism Trends'],
      stateXml
    );
  }

  // Nat. Parks linked Excel → native Combined NPS (map rebuild also embeds this;
  // skip duplicate append when the map path will run).
  const npsXml = buildCombinedNpsVisitationXml(input);
  if (npsXml) {
    replaceLinkedExcelFieldsBySheet(zip, 'Nat. Parks!', npsXml);
  }
}

function appendXmlBeforeNextHeading1(
  zip: PizZip,
  sectionHeading: string,
  insertXml: string
): boolean {
  if (!insertXml.trim()) return false;
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return false;
  const xml = file.asText();
  const anchor = findSectionHeadingAnchor(xml, sectionHeading);
  if (!anchor) return false;
  const after = xml.slice(anchor.end);
  let insertAt = after.length;
  for (const para of findTopLevelParagraphs(after)) {
    if (/<w:pStyle\s+w:val="Heading1"/.test(para.text)) {
      insertAt = para.start;
      break;
    }
  }
  const abs = anchor.end + insertAt;
  zip.file(xmlPath, xml.slice(0, abs) + insertXml + xml.slice(abs));
  return true;
}

/**
 * Prefer the last real Heading1 match (skips TOC duplicates that lack hyperlinks
 * in some templates but still appear before the body section).
 */
function findLastSectionHeadingAnchor(
  xml: string,
  headingText: string
): { start: number; end: number } | null {
  const target = headingText.toLowerCase();
  const candidates: Array<{ start: number; end: number }> = [];
  for (const para of findTopLevelParagraphs(xml)) {
    if (/<w:hyperlink\b/.test(para.text)) continue;
    if (!/<w:pStyle\s+w:val="Heading1"/.test(para.text)) continue;
    const plain = extractParagraphPlainText(para.text);
    if (plain.toLowerCase() !== target && !plain.toLowerCase().includes(target)) {
      continue;
    }
    // Prefer exact / short heading titles (skip long narrative mentions)
    if (plain.length > headingText.length + 48) continue;
    candidates.push({ start: para.start, end: para.end });
  }
  if (candidates.length === 0) return findSectionHeadingAnchor(xml, headingText);
  return candidates[candidates.length - 1];
}

/** Resolve removable body range for a full section rebuild (to next Heading1). */
function findSectionBodyEndRel(
  afterSection: string,
  nextHeadings: string[],
  chrome: LayoutChromeCounter
): { sectionEndRel: number; seenBodyContent: boolean } {
  let sectionEndRel = afterSection.length;
  let seenBodyContent = false;
  for (const para of findTopLevelParagraphs(afterSection)) {
    if (/<w:pStyle\s+w:val="Heading1"/.test(para.text)) {
      sectionEndRel = para.start;
      break;
    }
    if (paragraphHitsNextHeading(para.text, nextHeadings)) {
      sectionEndRel = para.start;
      break;
    }
    if (/<w:sectPr[\s>]/.test(para.text)) {
      if (!seenBodyContent) continue;
      chrome.skipped += 1;
      sectionEndRel = para.start;
      break;
    }
    seenBodyContent = true;
  }
  return { sectionEndRel, seenBodyContent };
}

function buildBulletParagraphXml(
  text: string,
  style: ParagraphStyleTemplate
): string {
  return (
    `<w:p>${style.pPr}` +
    `<w:r>${style.rPr}<w:t xml:space="preserve">• ${escapeXml(text)}</w:t></w:r>` +
    `</w:p>`
  );
}

/**
 * Rebuild Scope of Work from intake + market type (clears remnant RV/glamping
 * boilerplate that does not match the subject).
 */
function rebuildScopeOfWorkSection(
  zip: PizZip,
  input: EnrichedInput,
  chrome: LayoutChromeCounter
): SectionHitStatus {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';

  const xml = file.asText();
  const sectionAnchor = findLastSectionHeadingAnchor(xml, 'Scope of Work');
  if (!sectionAnchor) return 'missed';

  const afterSection = xml.slice(sectionAnchor.end);
  const { sectionEndRel, seenBodyContent } = findSectionBodyEndRel(
    afterSection,
    ['Executive Summary', 'Certification', 'SWOT Analysis'],
    chrome
  );
  if (sectionEndRel <= 0 || !seenBodyContent) {
    console.warn('[assemble-docx] Scope of Work rebuild aborted: empty section range');
    return 'missed';
  }

  const sectionXml = afterSection.slice(0, sectionEndRel);
  const sectionParas = findTopLevelParagraphs(sectionXml);
  const bodyStylePara = sectionParas.find((p) => {
    const plain = extractParagraphPlainText(p.text);
    return plain.length > 20 && /<w:pStyle\s+w:val="Normal"/.test(p.text);
  });
  const paraStyle = bodyStylePara
    ? extractParagraphStyleTemplate(bodyStylePara.text)
    : FALLBACK_PARAGRAPH_STYLE;

  const content = buildScopeOfWorkContent(input);
  const parts: string[] = [];
  parts.push(bodyTextToStyledParagraphsXml(content.intro, paraStyle));
  parts.push('<w:p/>');
  parts.push(bodyTextToStyledParagraphsXml(content.stepsIntro, paraStyle));
  for (const step of content.steps) {
    parts.push(buildBulletParagraphXml(step, paraStyle));
  }
  parts.push('<w:p/>');
  parts.push(bodyTextToStyledParagraphsXml(content.clientIntro, paraStyle));
  for (const item of content.clientItems) {
    parts.push(buildBulletParagraphXml(item, paraStyle));
  }

  const rebuilt = parts.join('');
  const absStart = sectionAnchor.end;
  const absEnd = sectionAnchor.end + sectionEndRel;
  const fresh = zip.file(xmlPath)?.asText() ?? xml;
  zip.file(xmlPath, fresh.slice(0, absStart) + rebuilt + fresh.slice(absEnd));
  return 'replaced';
}

/**
 * Rebuild Certification teal fields: site visit, assistants, prior services.
 */
function rebuildCertificationSection(
  zip: PizZip,
  input: EnrichedInput,
  chrome: LayoutChromeCounter
): SectionHitStatus {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';

  const xml = file.asText();
  const sectionAnchor = findLastSectionHeadingAnchor(xml, 'Certification');
  if (!sectionAnchor) return 'missed';

  const afterSection = xml.slice(sectionAnchor.end);
  const { sectionEndRel, seenBodyContent } = findSectionBodyEndRel(
    afterSection,
    ['Scope of Work', 'Executive Summary', 'SWOT Analysis'],
    chrome
  );
  if (sectionEndRel <= 0 || !seenBodyContent) {
    console.warn('[assemble-docx] Certification rebuild aborted: empty section range');
    return 'missed';
  }

  const sectionXml = afterSection.slice(0, sectionEndRel);
  const sectionParas = findTopLevelParagraphs(sectionXml);
  // Stop before signature line / name block
  let bodyEndRel = sectionEndRel;
  for (const para of sectionParas) {
    const plain = extractParagraphPlainText(para.text);
    if (/^_{3,}/.test(plain) || /^SHARI\b/i.test(plain)) {
      bodyEndRel = para.start;
      break;
    }
  }
  if (bodyEndRel <= 0) bodyEndRel = sectionEndRel;

  const bodyStylePara = sectionParas.find((p) => {
    const plain = extractParagraphPlainText(p.text);
    return plain.length > 20 && /<w:pStyle\s+w:val="Normal"/.test(p.text);
  });
  const paraStyle = bodyStylePara
    ? extractParagraphStyleTemplate(bodyStylePara.text)
    : FALLBACK_PARAGRAPH_STYLE;

  const content = buildCertificationContent(input);
  const parts: string[] = [];
  parts.push(bodyTextToStyledParagraphsXml(content.preamble, paraStyle));
  for (const bullet of content.bullets) {
    parts.push(buildBulletParagraphXml(bullet, paraStyle));
  }

  const rebuilt = parts.join('');
  const absStart = sectionAnchor.end;
  const absEnd = sectionAnchor.end + bodyEndRel;
  const fresh = zip.file(xmlPath)?.asText() ?? xml;
  zip.file(xmlPath, fresh.slice(0, absStart) + rebuilt + fresh.slice(absEnd));
  return 'replaced';
}

/**
 * Rebuild Executive Summary prose (Project Overview + Demand) from intake while
 * PRESERVING linked Excel objects for 10-yr PF / financing / IRR so authors can
 * refresh from the companion workbook.
 */
function rebuildExecutiveSummarySection(
  zip: PizZip,
  executiveSummaryText: string,
  input: EnrichedInput,
  _model: FeasibilityModelOutput | undefined,
  chrome: LayoutChromeCounter
): SectionHitStatus {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';

  const xml = file.asText();
  const sectionAnchor = findLastSectionHeadingAnchor(xml, 'Executive Summary');
  if (!sectionAnchor) return 'missed';

  const afterSection = xml.slice(sectionAnchor.end);
  const { sectionEndRel, seenBodyContent } = findSectionBodyEndRel(
    afterSection,
    ['SWOT Analysis'],
    chrome
  );

  if (sectionEndRel <= 0 || !seenBodyContent) {
    console.warn(
      '[assemble-docx] Executive Summary rebuild aborted: empty section range',
      { sectionEndRel, seenBodyContent }
    );
    return 'missed';
  }

  const sectionXml = afterSection.slice(0, sectionEndRel);
  const sectionParas = findTopLevelParagraphs(sectionXml);
  const bodyStylePara = sectionParas.find((p) => {
    const plain = extractParagraphPlainText(p.text);
    return (
      plain.length > 20 &&
      !/<w:instrText/.test(p.text) &&
      !/<w:drawing/.test(p.text) &&
      !/<w:object\b/.test(p.text) &&
      /<w:pStyle\s+w:val="Normal"/.test(p.text)
    );
  });
  const rawStyle = bodyStylePara
    ? extractParagraphStyleTemplate(bodyStylePara.text)
    : FALLBACK_PARAGRAPH_STYLE;
  const paraStyle: ParagraphStyleTemplate = {
    pPr: rawStyle.pPr
      .replace(/<w:pBdr>[\s\S]*?<\/w:pBdr>/g, '')
      .replace(/<w:shd\b[^/]*\/>/g, ''),
    rPr: rawStyle.rPr.replace(/<w:highlight\b[^/]*\/>/g, ''),
  };

  // Preserve from "10 Year Pro Forma…" onward (keeps Income/Expense OLE tables).
  // Do NOT preserve from the first Excel link — RV templates embed overview
  // acres/sites as early linked fields that must be replaced by intake prose.
  let preserveFromRel = sectionEndRel;
  for (const p of sectionParas) {
    const plain = extractParagraphPlainText(p.text);
    if (/^10\s*Year\s+Pro\s+Forma/i.test(plain)) {
      preserveFromRel = p.start;
      break;
    }
  }
  if (preserveFromRel === sectionEndRel) {
    for (const p of sectionParas) {
      const plain = extractParagraphPlainText(p.text);
      if (
        /^Financing Assumptions/i.test(plain) ||
        (/^Feasibility Conclusion/i.test(plain) && isExcelLinkParagraph(p.text))
      ) {
        preserveFromRel = p.start;
        break;
      }
    }
  }
  const preservedXml = sectionXml.slice(preserveFromRel);

  const content = buildExecutiveSummaryContent(input, {
    llmText: executiveSummaryText,
  });

  const boldLabel = (text: string) =>
    `<w:p>${paraStyle.pPr}<w:r>${withBoldRunProps(paraStyle.rPr)}<w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

  const withCyan = (rPr: string): string => {
    if (/<w:rPr>/.test(rPr)) {
      return rPr.replace('</w:rPr>', '<w:highlight w:val="cyan"/></w:rPr>');
    }
    return '<w:rPr><w:highlight w:val="cyan"/></w:rPr>';
  };

  const lineXml = (line: ExecSummaryLine): string => {
    const prefix = line.bullet ? '• ' : '';
    const full = prefix + line.text;
    const phrase = line.highlightPhrase?.trim();
    if (line.authorHighlight && phrase && full.includes(phrase)) {
      const idx = full.indexOf(phrase);
      const before = full.slice(0, idx);
      const after = full.slice(idx + phrase.length);
      const cyanRpr = withCyan(paraStyle.rPr);
      return (
        `<w:p>${paraStyle.pPr}` +
        (before
          ? `<w:r>${paraStyle.rPr}<w:t xml:space="preserve">${escapeXml(before)}</w:t></w:r>`
          : '') +
        `<w:r>${cyanRpr}<w:t xml:space="preserve">${escapeXml(phrase)}</w:t></w:r>` +
        (after
          ? `<w:r>${paraStyle.rPr}<w:t xml:space="preserve">${escapeXml(after)}</w:t></w:r>`
          : '') +
        `</w:p>`
      );
    }
    const rPr = line.authorHighlight ? withCyan(paraStyle.rPr) : paraStyle.rPr;
    return `<w:p>${paraStyle.pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(full)}</w:t></w:r></w:p>`;
  };

  const parts: string[] = [];
  parts.push(boldLabel('Project Overview:'));
  for (const line of content.projectOverview) {
    parts.push(lineXml(line));
  }
  parts.push('<w:p/>');

  parts.push(boldLabel('Overall Demand Indicators:'));
  for (const line of content.demandIndicators) {
    parts.push(lineXml(line));
  }
  parts.push('<w:p/>');

  // If template already has pro forma heading in preservedXml, skip duplicate intro;
  // otherwise prepend labeled pro forma intro before preserved OLE tables.
  if (!/^10\s*Year\s+Pro\s+Forma/i.test(extractParagraphPlainText(preservedXml.slice(0, 800)))) {
    parts.push(boldLabel('10 Year Pro Forma Projection Summary:'));
    parts.push(lineXml(content.proFormaIntro));
  }

  const rebuilt = parts.join('') + preservedXml;
  const absStart = sectionAnchor.end;
  const absEnd = sectionAnchor.end + sectionEndRel;
  const fresh = zip.file(xmlPath)?.asText() ?? xml;
  zip.file(xmlPath, fresh.slice(0, absStart) + rebuilt + fresh.slice(absEnd));
  return 'replaced';
}

const SECTION_HEADINGS = [
  'Letter of Transmittal',
  'Executive Summary',
  'SWOT Analysis',
  'Project Overview',
  'Site Analysis',
  'Development Costs',
  'Industry Overview',
  'Area Analysis',
  'Demand Indicators',
  'Supply and Competition Analysis',
  'Comparables',
  'Rate Projection',
  'Occupancy Projection',
  'SWOT',
  'Pro Forma',
  'Addenda',
];

/**
 * Media basenames we embed at assemble time (maps / WeatherSpark). Template
 * sample photos that do not match are replaced with explicit author placeholders.
 */
const GENERATED_MEDIA_RE = /^image(Area|WeatherSpark|SageGen|NatParks|StateParks|DriveTime)/i;

const SECTION_IMAGE_DESCRIPTIONS: Record<string, string> = {
  'Project Overview': 'project site photo, aerial view, or site plan',
  'Site Analysis': 'aerial/site photo, site plan, or risk map',
  'Area Analysis': 'state/county/local context map or location photo',
  'Demand Indicators': 'state tourism figure (see TOUR-0N checklist) or WeatherSpark climate chart',
  'Industry Overview': 'industry illustration (or remove if not applicable)',
  'Supply and Competition Analysis': 'competition map or supply figure',
  'Comparables': 'comparable property photo',
  'Development Costs': 'development cost illustration',
  'Rate Projection': 'rate projection chart from Excel (or remove duplicate)',
  'Occupancy Projection': 'occupancy chart from Excel (or remove duplicate)',
  'Executive Summary': 'executive summary figure',
  'SWOT': 'SWOT analysis visual',
  'Pro Forma': 'financial projection chart',
  'Addenda': 'appendix figure',
};

/**
 * Locate a real section heading paragraph (skip TOC hyperlinks).
 * Matches on joined plain text so split w:t runs still work.
 */
export function findSectionHeadingAnchor(
  xml: string,
  headingText: string
): { start: number; end: number } | null {
  const target = headingText.toLowerCase();
  const candidates: Array<{ start: number; end: number; plain: string; isHeading: boolean }> = [];
  for (const para of findTopLevelParagraphs(xml)) {
    if (/<w:hyperlink\b/.test(para.text)) continue;
    const plain = extractParagraphPlainText(para.text);
    if (!plain.toLowerCase().includes(target)) continue;
    const isHeading = /<w:pStyle\s+w:val="Heading[12]"/.test(para.text);
    candidates.push({ start: para.start, end: para.end, plain, isHeading });
  }
  const styled = candidates.find((c) => c.isHeading);
  if (styled) return { start: styled.start, end: styled.end };
  const short = candidates.find((c) => c.plain.length <= headingText.length + 48);
  if (short) return { start: short.start, end: short.end };
  return candidates[0] ? { start: candidates[0].start, end: candidates[0].end } : null;
}

function paragraphHitsNextHeading(paraXml: string, nextHeadingTexts: string[]): boolean {
  const plain = extractParagraphPlainText(paraXml).toLowerCase();
  return nextHeadingTexts.some((h) => plain.includes(h.toLowerCase()));
}

function shouldStopSectionReplace(
  paraXml: string,
  nextHeadingTexts: string[],
  chrome: LayoutChromeCounter,
  opts?: { stopOnHeading2?: boolean }
): boolean {
  if (isLayoutChromeParagraph(paraXml)) {
    chrome.skipped += 1;
    return true;
  }
  if (paragraphHitsNextHeading(paraXml, nextHeadingTexts)) return true;
  if (/<w:pStyle\s+w:val="Heading1"/.test(paraXml)) return true;
  if (opts?.stopOnHeading2 !== false && /<w:pStyle\s+w:val="Heading2"/.test(paraXml)) {
    return true;
  }
  if (paraXml.includes('<w:tbl>')) return true;
  if (/<w:instrText[^>]*>/.test(paraXml)) return true;
  if (/<w:drawing[\s>]/.test(paraXml) || /<mc:AlternateContent[\s>][\s\S]*?<w:drawing/.test(paraXml)) {
    return true;
  }
  return false;
}

function collectRemovableBodyRange(
  suffix: string,
  nextHeadingTexts: string[],
  chrome: LayoutChromeCounter,
  opts?: { stopOnHeading2?: boolean }
): {
  removeUntil: number;
  foundTextParagraph: boolean;
  style: ParagraphStyleTemplate;
} {
  let removeUntil = 0;
  let foundTextParagraph = false;
  let style = FALLBACK_PARAGRAPH_STYLE;

  for (const para of findTopLevelParagraphs(suffix)) {
    const text = para.text;
    if (shouldStopSectionReplace(text, nextHeadingTexts, chrome, opts)) break;

    const plain = extractParagraphPlainText(text);
    if (!plain) {
      if (foundTextParagraph) removeUntil = para.end;
      continue;
    }
    if (!foundTextParagraph) {
      style = extractParagraphStyleTemplate(text);
    }
    foundTextParagraph = true;
    removeUntil = para.end;
  }

  return { removeUntil, foundTextParagraph, style };
}

function applyBodyReplacement(
  zip: PizZip,
  xmlPath: string,
  xml: string,
  startIdx: number,
  suffix: string,
  removeUntil: number,
  foundTextParagraph: boolean,
  bodyXml: string
): SectionHitStatus {
  if (!foundTextParagraph || removeUntil === 0) {
    zip.file(xmlPath, xml.slice(0, startIdx) + bodyXml + suffix);
    return 'inserted';
  }
  zip.file(xmlPath, xml.slice(0, startIdx) + bodyXml + suffix.slice(removeUntil));
  return 'replaced';
}

function extractParagraphPlainText(paraXml: string): string {
  return paraXml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function detectSectionHeading(paraXml: string): string | null {
  const isHeading = /<w:pStyle\s+w:val="Heading[12]"/.test(paraXml);
  if (!isHeading) return null;
  const plain = extractParagraphPlainText(paraXml);
  for (const heading of SECTION_HEADINGS) {
    if (plain.toLowerCase().includes(heading.toLowerCase())) return heading;
  }
  return null;
}

/** True when `xml` at `index` starts a real `<w:p` / `<w:p>` / `<w:p …/>` tag (not w:pgSz, etc.). */
function isWordParagraphOpenAt(xml: string, index: number): boolean {
  if (!xml.startsWith('<w:p', index)) return false;
  const next = xml[index + 4];
  return next === '>' || next === '/' || next === ' ' || next === '\n' || next === '\r' || next === '\t';
}

/**
 * Top-level Word paragraphs only. Naive `/<w:p>.*?<\/w:p>/` breaks when a drawing
 * contains nested `<w:p>` inside `w:txbxContent`, which produces invalid OOXML Word rejects.
 */
export function findTopLevelParagraphs(xml: string): Array<{ start: number; end: number; text: string }> {
  const results: Array<{ start: number; end: number; text: string }> = [];
  let i = 0;
  while (i < xml.length) {
    const start = xml.indexOf('<w:p', i);
    if (start < 0) break;
    if (!isWordParagraphOpenAt(xml, start)) {
      i = start + 4;
      continue;
    }

    const afterOpen = xml.indexOf('>', start);
    if (afterOpen < 0) break;
    if (xml[afterOpen - 1] === '/') {
      results.push({ start, end: afterOpen + 1, text: xml.slice(start, afterOpen + 1) });
      i = afterOpen + 1;
      continue;
    }

    let depth = 1;
    let pos = afterOpen + 1;
    while (depth > 0 && pos < xml.length) {
      const nextOpen = xml.indexOf('<w:p', pos);
      const nextClose = xml.indexOf('</w:p>', pos);
      if (nextClose < 0) return results;

      if (nextOpen >= 0 && nextOpen < nextClose) {
        if (isWordParagraphOpenAt(xml, nextOpen)) {
          const ao = xml.indexOf('>', nextOpen);
          if (ao < 0) return results;
          if (xml[ao - 1] === '/') {
            pos = ao + 1;
            continue;
          }
          depth++;
          pos = ao + 1;
          continue;
        }
        // False positive (<w:pPr, <w:pgSz, …) — skip and keep scanning.
        pos = nextOpen + 4;
        continue;
      }

      depth--;
      const end = nextClose + '</w:p>'.length;
      if (depth === 0) {
        results.push({ start, end, text: xml.slice(start, end) });
        i = end;
        break;
      }
      pos = end;
    }
    if (depth !== 0) break;
  }
  return results;
}

/**
 * Find the start of the actual "Project Overview" section heading paragraph,
 * not the TOC entry. The TOC lists "Project Overview" first; we need the
 * real section heading (which has Heading1/2 style in the same paragraph).
 * Skip TOC entries (usually inside hyperlinks) and find the first Heading
 * paragraph containing "Project Overview".
 */
function findProjectOverviewSectionAnchor(xml: string): number {
  for (const para of findTopLevelParagraphs(xml)) {
    const plain = extractParagraphPlainText(para.text);
    if (!plain.toLowerCase().includes('project overview')) continue;
    if (/<w:hyperlink\b/.test(para.text)) continue;
    if (/<w:pStyle\s+w:val="Heading[12]"/.test(para.text)) {
      return para.start;
    }
  }
  return xml.indexOf('<w:t>Project Overview</w:t>');
}

/**
 * Replace template sample images with explicit author placeholders.
 * Keeps drawings that embed assemble-time media (Area maps / WeatherSpark)
 * and keeps text-box chrome. Letterhead before Project Overview is untouched.
 */
export function replaceTemplateImagesSelectively(
  zip: PizZip
): { imagesKept: number; imagesPlaceholdered: number } {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return { imagesKept: 0, imagesPlaceholdered: 0 };

  const xml = file.asText();
  const projectOverviewAnchor = findProjectOverviewSectionAnchor(xml);
  if (projectOverviewAnchor < 0) return { imagesKept: 0, imagesPlaceholdered: 0 };

  const relsFile = zip.file('word/_rels/document.xml.rels');
  const relsXml = relsFile?.asText() ?? '';
  const rIdToMedia = new Map<string, string>();
  for (const m of relsXml.matchAll(
    /Id="(rId\d+)"[^>]*Target="media\/([^"]+)"/g
  )) {
    rIdToMedia.set(m[1], m[2]);
  }
  // Also Target before Id attribute order
  for (const m of relsXml.matchAll(
    /Target="media\/([^"]+)"[^>]*Id="(rId\d+)"/g
  )) {
    rIdToMedia.set(m[2], m[1]);
  }

  const isGeneratedDrawing = (paraXml: string): boolean => {
    if (/wp:docPr[^>]*name="[^"]*(State Area Map|Local Area Map|Regional Area Map|WeatherSpark|SageGenerated|National Parks Map|State Parks Map|Drive Time)/i.test(paraXml)) {
      return true;
    }
    for (const m of paraXml.matchAll(/r:embed="(rId\d+)"/g)) {
      const media = rIdToMedia.get(m[1]) ?? '';
      if (GENERATED_MEDIA_RE.test(media)) return true;
    }
    return false;
  };

  const prefix = xml.slice(0, projectOverviewAnchor);
  const suffix = xml.slice(projectOverviewAnchor);

  let currentSection = 'Project Overview';
  const imageCountBySection: Record<string, number> = {};
  let imagesKept = 0;
  let imagesPlaceholdered = 0;

  const paras = findTopLevelParagraphs(suffix);
  let updated = '';
  let cursor = 0;
  for (const para of paras) {
    updated += suffix.slice(cursor, para.start);

    const heading = detectSectionHeading(para.text);
    if (heading) currentSection = heading;

    const hasImage =
      /<w:drawing[\s>]/.test(para.text) ||
      /<mc:AlternateContent[\s>][\s\S]*?<w:drawing/.test(para.text);

    const hasTextBox =
      /<w:txbxContent[\s>]/.test(para.text) || /<v:textbox[\s>]/.test(para.text);

    if (hasImage && !hasTextBox && !isGeneratedDrawing(para.text) && !isExcelLinkParagraph(para.text)) {
      imageCountBySection[currentSection] = (imageCountBySection[currentSection] || 0) + 1;
      const imgNum = imageCountBySection[currentSection];
      const desc = SECTION_IMAGE_DESCRIPTIONS[currentSection] || 'relevant image for this section';
      imagesPlaceholdered++;
      updated +=
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
        `<w:t>[Image placeholder ${imgNum}: Add ${escapeXml(desc)} — not auto-linked in this draft. ` +
        `Section: ${escapeXml(currentSection)}.]</w:t></w:r></w:p>`;
    } else {
      if (hasImage) imagesKept++;
      updated += para.text;
    }
    cursor = para.end;
  }
  updated += suffix.slice(cursor);

  zip.file(xmlPath, prefix + updated);
  return { imagesKept, imagesPlaceholdered };
}

/** Max dimension for compressed images; JPEG quality */
const IMAGE_MAX_DIM = 1200;
const IMAGE_JPEG_QUALITY = 85;

/**
 * Compress images in the zip to reduce DOCX size. Resizes to max 1200px, re-encodes JPEG at 85%.
 */
async function compressImagesInZip(zip: PizZip): Promise<{ compressed: number; bytesSaved: number }> {
  const mediaFiles = Object.keys(zip.files).filter(
    (p) => p.startsWith('word/media/') && /\.(png|jpg|jpeg|webp)$/i.test(p),
  );
  let compressed = 0;
  let bytesSaved = 0;

  for (const mediaPath of mediaFiles) {
    const file = zip.file(mediaPath);
    if (!file) continue;
    const orig = Buffer.from(file.asBinary(), 'binary');
    if (!orig || orig.length < 2000) continue;

    try {
      let pipeline = sharp(orig);
      const meta = await pipeline.metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w > IMAGE_MAX_DIM || h > IMAGE_MAX_DIM) {
        pipeline = pipeline.resize(IMAGE_MAX_DIM, IMAGE_MAX_DIM, { fit: 'inside' });
      }
      const ext = path.extname(mediaPath).toLowerCase();
      const out =
        ext === '.png'
          ? await pipeline.png({ compressionLevel: 6 }).toBuffer()
          : await pipeline.jpeg({ quality: IMAGE_JPEG_QUALITY }).toBuffer();

      if (out.length < orig.length) {
        zip.file(mediaPath, out, { binary: true });
        compressed++;
        bytesSaved += orig.length - out.length;
      }
    } catch {
      /* skip on error */
    }
  }
  return { compressed, bytesSaved };
}

/**
 * After image references are removed from document.xml, the actual media
 * binaries (word/media/image*.png, etc.) still sit in the zip archive.
 * This function:
 *  1. Scans all XML parts for relationship IDs still in use (r:embed, r:link, r:id)
 *  2. Reads each .rels file and identifies image targets no longer referenced
 *  3. Removes the orphaned media files from the zip
 *  4. Rewrites the .rels file without the orphaned entries
 */
function stripUnreferencedMedia(zip: PizZip): { removed: number; bytesFreed: number } {
  const allXmlParts = [
    'word/document.xml',
    'word/header1.xml', 'word/header2.xml', 'word/header3.xml',
    'word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml',
    'word/footnotes.xml', 'word/endnotes.xml',
  ];

  const referencedRIds = new Set<string>();

  const rIdPattern = /r:(?:embed|link|id)="(rId\d+)"/g;
  for (const xmlPath of allXmlParts) {
    const f = zip.file(xmlPath);
    if (!f) continue;
    const content = f.asText();
    for (const m of content.matchAll(rIdPattern)) {
      referencedRIds.add(m[1]);
    }
  }

  const relsFiles = [
    'word/_rels/document.xml.rels',
    'word/_rels/header1.xml.rels', 'word/_rels/header2.xml.rels', 'word/_rels/header3.xml.rels',
    'word/_rels/footer1.xml.rels', 'word/_rels/footer2.xml.rels', 'word/_rels/footer3.xml.rels',
  ];

  let totalRemoved = 0;
  let totalBytesFreed = 0;

  for (const relsPath of relsFiles) {
    const relsFile = zip.file(relsPath);
    if (!relsFile) continue;

    const relsXml = relsFile.asText();

    const relEntryPattern = /<Relationship\s[^>]*\/?>(?:<\/Relationship>)?/g;
    const entries: Array<{ full: string; id: string; target: string; type: string }> = [];
    for (const m of relsXml.matchAll(relEntryPattern)) {
      const el = m[0];
      const idMatch = el.match(/Id="([^"]*)"/);
      const targetMatch = el.match(/Target="([^"]*)"/);
      const typeMatch = el.match(/Type="([^"]*)"/);
      if (idMatch && targetMatch && typeMatch) {
        entries.push({ full: el, id: idMatch[1], target: targetMatch[1], type: typeMatch[1] });
      }
    }

    const imageType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
    const toRemove: typeof entries = [];

    for (const entry of entries) {
      if (entry.type !== imageType) continue;
      if (referencedRIds.has(entry.id)) continue;
      toRemove.push(entry);
    }

    if (toRemove.length === 0) continue;

    let updatedRels = relsXml;
    for (const entry of toRemove) {
      updatedRels = updatedRels.replace(entry.full, '');

      const mediaPath = entry.target.startsWith('/')
        ? entry.target.slice(1)
        : `word/${entry.target}`;
      const mediaFile = zip.file(mediaPath);
      if (mediaFile) {
        const raw = mediaFile.asBinary();
        totalBytesFreed += raw.length;
        zip.remove(mediaPath);
      }
      totalRemoved++;
    }

    updatedRels = updatedRels.replace(/\n\s*\n/g, '\n');
    zip.file(relsPath, updatedRels);
  }

  return { removed: totalRemoved, bytesFreed: totalBytesFreed };
}

/**
 * Ensure [Content_Types].xml has Default entries for every media extension in the
 * package. Writing `.jpg` when only `jpeg` is declared makes Word report
 * "unreadable content".
 */
function ensureMediaContentTypes(zip: PizZip): void {
  const ctPath = '[Content_Types].xml';
  const file = zip.file(ctPath);
  if (!file) return;

  let xml = file.asText();
  const mediaExts = new Set<string>();
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith('word/media/') || zip.files[name].dir) continue;
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext) mediaExts.add(ext);
  }

  const mime: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    emf: 'image/x-emf',
    wmf: 'image/x-wmf',
    tif: 'image/tiff',
    tiff: 'image/tiff',
  };

  // Always declare jpg — embed helpers historically used that extension
  mediaExts.add('jpg');

  for (const ext of mediaExts) {
    const type = mime[ext];
    if (!type) continue;
    if (new RegExp(`Extension="${ext}"`, 'i').test(xml)) continue;
    xml = xml.replace(
      /(<Types\b[^>]*>)/,
      `$1<Default Extension="${ext}" ContentType="${type}"/>`
    );
  }
  zip.file(ctPath, xml);
}

/**
 * Section rebuilds can delete bookmarkStart while leaving bookmarkEnd (or the
 * reverse). Word treats that as unreadable content.
 */
function sanitizeOrphanBookmarks(zip: PizZip): number {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 0;

  let xml = file.asText();
  const startIds = new Set(
    [...xml.matchAll(/<w:bookmarkStart\b[^>]*\bw:id="(\d+)"[^>]*\/?>/g)].map((m) => m[1])
  );
  let removed = 0;

  xml = xml.replace(/<w:bookmarkEnd\b[^>]*\/?>/g, (tag) => {
    const id = tag.match(/\bw:id="(\d+)"/)?.[1];
    if (id && !startIds.has(id)) {
      removed += 1;
      return '';
    }
    return tag;
  });

  const endIds = new Set(
    [...xml.matchAll(/<w:bookmarkEnd\b[^>]*\bw:id="(\d+)"[^>]*\/?>/g)].map((m) => m[1])
  );
  xml = xml.replace(/<w:bookmarkStart\b[^>]*\/?>/g, (tag) => {
    const id = tag.match(/\bw:id="(\d+)"/)?.[1];
    if (id && !endIds.has(id)) {
      removed += 1;
      return '';
    }
    return tag;
  });

  if (removed > 0) zip.file(xmlPath, xml);
  return removed;
}

/** Visible title inside a TOC hyperlink (skip webHidden PAGEREF runs). */
function tocHyperlinkTitle(innerXml: string): string {
  for (const run of innerXml.matchAll(/<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g)) {
    const runOpen = run[1] ?? '';
    const runBody = run[2] ?? '';
    if (/webHidden/i.test(runOpen) || /webHidden/i.test(runBody)) continue;
    if (/<w:fldChar\b/i.test(runBody) || /<w:instrText\b/i.test(runBody)) continue;
    if (/<w:tab\s*\/>/i.test(runBody) && !/<w:t\b/i.test(runBody)) continue;
    const text = [...runBody.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
      .map((m) => m[1])
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) return text;
  }
  return extractParagraphPlainText(innerXml)
    .replace(/\s*PAGEREF[\s\S]*/i, '')
    .replace(/\s+\d+\s*$/, '')
    .trim();
}

function nextBookmarkId(xml: string): number {
  let max = 0;
  for (const m of xml.matchAll(/\bw:id="(\d+)"/g)) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function removeBookmarksByName(xml: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Remove start tags with this name, collecting ids, then matching ends
  const ids = new Set<string>();
  let out = xml.replace(/<w:bookmarkStart\b[^>]*\/?>/g, (tag) => {
    if (!new RegExp(`\\bw:name="${escaped}"`).test(tag)) return tag;
    const id = tag.match(/\bw:id="(\d+)"/)?.[1];
    if (id) ids.add(id);
    return '';
  });
  if (ids.size === 0) return xml;
  out = out.replace(/<w:bookmarkEnd\b[^>]*\/?>/g, (tag) => {
    const id = tag.match(/\bw:id="(\d+)"/)?.[1];
    if (id && ids.has(id)) return '';
    return tag;
  });
  return out;
}

/**
 * Ensure each TOC hyperlink anchor (_Toc…) has a bookmark on the real section
 * Heading1/2. Assembly often deletes misplaced template TOC bookmarks; Word then
 * jumps TOC clicks to the document top.
 */
export function repairTocHeadingBookmarks(zip: PizZip): number {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 0;

  let xml = file.asText();
  const targets = new Map<string, string>(); // anchor -> title

  for (const m of xml.matchAll(
    /<w:hyperlink\b[^>]*\bw:anchor="(_Toc\d+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/g
  )) {
    const anchor = m[1];
    const title = tocHyperlinkTitle(m[2] ?? '');
    if (!anchor || !title || title.length < 3) continue;
    // Prefer first TOC occurrence (document order)
    if (!targets.has(anchor)) targets.set(anchor, title);
  }

  if (targets.size === 0) return 0;

  let repaired = 0;
  let nextId = nextBookmarkId(xml);

  for (const [anchor, title] of targets) {
    const heading = findSectionHeadingAnchor(xml, title);
    if (!heading) continue;

    const headingXml = xml.slice(heading.start, heading.end);
    // Already correctly bookmarked on this heading?
    if (new RegExp(`<w:bookmarkStart\\b[^>]*\\bw:name="${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(headingXml)) {
      continue;
    }

    // Drop any existing bookmark with this TOC name (often left on wrong section)
    xml = removeBookmarksByName(xml, anchor);
    // Re-find heading after removals (offsets may shrink)
    const heading2 = findSectionHeadingAnchor(xml, title);
    if (!heading2) continue;

    const id = String(nextId++);
    const startTag = `<w:bookmarkStart w:id="${id}" w:name="${anchor}"/>`;
    const endTag = `<w:bookmarkEnd w:id="${id}"/>`;
    const para = xml.slice(heading2.start, heading2.end);
    // Insert after opening <w:p …> and before closing </w:p>
    const openEnd = para.indexOf('>');
    if (openEnd < 0) continue;
    const withBookmarks =
      para.slice(0, openEnd + 1) +
      startTag +
      para.slice(openEnd + 1, para.length - '</w:p>'.length) +
      endTag +
      '</w:p>';
    xml = xml.slice(0, heading2.start) + withBookmarks + xml.slice(heading2.end);
    repaired += 1;
  }

  if (repaired > 0) zip.file(xmlPath, xml);
  return repaired;
}

/**
 * Collapse 2+ consecutive empty paragraphs to 1 to prevent blank white pages.
 * Handles: <w:p/>, <w:p></w:p>, and <w:p><w:pPr>...</w:pPr></w:p> (no text).
 * Does not touch paragraphs containing w:sectPr, page breaks, or Heading styles.
 */
function collapseExcessiveEmptyParagraphs(zip: PizZip): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  let xml = file.asText();

  // Only collapse truly empty body spacers — never headings, sectPr, or page breaks.
  const emptyPara =
    /<w:p\s*\/>|<w:p>\s*<\/w:p>|<w:p>(?:<w:pPr>(?:(?!<w:sectPr)(?!w:type="page")(?!w:val="Heading)[\s\S])*?<\/w:pPr>)?\s*<\/w:p>/;
  const emptySeq = new RegExp(
    `((?:${emptyPara.source})\\s*){2,}`,
    'g',
  );

  xml = xml.replace(emptySeq, '<w:p/>\n');
  zip.file(xmlPath, xml);
}

function buildSiteAnalysisParagraphsXml(
  siteAnalysisText: string,
  style: ParagraphStyleTemplate = FALLBACK_PARAGRAPH_STYLE
): string {
  const lines = stripMarkdownEmphasis(siteAnalysisText)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const boldRpr = withBoldRunProps(style.rPr);
  return lines
    .map((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const label = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        return `<w:p>${style.pPr}<w:r>${boldRpr}<w:t>${escapeXml(label)}:</w:t></w:r><w:r>${style.rPr}<w:t xml:space="preserve"> ${escapeXml(value)}</w:t></w:r></w:p>`;
      }
      return `<w:p>${style.pPr}<w:r>${style.rPr}<w:t>${escapeXml(line)}</w:t></w:r></w:p>`;
    })
    .join('');
}

/**
 * Replace prose paragraphs after a section heading until the next major heading.
 * Clones pPr/rPr from the first removed body para; never deletes sectPr/page breaks.
 */
export function replaceSectionProseByHeading(
  zip: PizZip,
  headingText: string,
  nextHeadingTexts: string[],
  bodyText: string,
  chrome: LayoutChromeCounter,
  opts?: { stopOnHeading2?: boolean }
): SectionHitStatus {
  if (!bodyText.trim()) return 'missed';
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';

  const xml = file.asText();
  const anchor = findSectionHeadingAnchor(xml, headingText);
  if (!anchor) return 'missed';

  const startIdx = anchor.end;
  const suffix = xml.slice(startIdx);
  const { removeUntil, foundTextParagraph, style } = collectRemovableBodyRange(
    suffix,
    nextHeadingTexts,
    chrome,
    opts
  );
  const paras = bodyTextToStyledParagraphsXml(bodyText, style);
  return applyBodyReplacement(
    zip,
    xmlPath,
    xml,
    startIdx,
    suffix,
    removeUntil,
    foundTextParagraph,
    paras
  );
}

/**
 * Letter of Transmittal: keep letterhead (right-aligned Sage block) and signature;
 * replace the middle body including the template IRR OLE field with native content.
 */
export function replaceLetterOfTransmittalBody(
  zip: PizZip,
  bodyTextOrContent: string | LetterOfTransmittalContent,
  chrome: LayoutChromeCounter
): SectionHitStatus {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';

  const xml = file.asText();
  const anchor = findSectionHeadingAnchor(xml, 'Letter of Transmittal');
  if (!anchor) return 'missed';

  const afterHeading = xml.slice(anchor.end);
  const paras = findTopLevelParagraphs(afterHeading);

  let bodyStartRel = -1;
  let bodyEndRel = 0;
  let foundBody = false;
  let style = FALLBACK_PARAGRAPH_STYLE;

  for (const para of paras) {
    const text = para.text;
    if (isLayoutChromeParagraph(text)) {
      chrome.skipped += 1;
      break;
    }
    if (/<w:pStyle\s+w:val="Heading1"/.test(text)) break;
    if (paragraphHitsNextHeading(text, ['Certification', 'Scope of Work', 'Executive Summary'])) {
      break;
    }

    const plain = extractParagraphPlainText(text);

    // Always skip Sage letterhead lines (even when blank separators intervene)
    if (isLetterheadParagraph(text, plain)) {
      continue;
    }
    if (!plain && !foundBody && !/<w:object\b|<w:drawing\b|<w:tbl\b|instrText/i.test(text)) {
      continue;
    }

    if (isSignatureParagraph(text, plain)) break;

    // Include OLE / table / drawing paragraphs in the replace range so the
    // broken Excel IRR LINK is removed and replaced by our native IRR box.
    if (!foundBody) {
      bodyStartRel = para.start;
      if (plain) style = extractParagraphStyleTemplate(text);
      foundBody = true;
    }
    bodyEndRel = para.end;
  }

  const finalBodyXml =
    typeof bodyTextOrContent === 'string'
      ? bodyTextToStyledParagraphsXml(bodyTextOrContent, style)
      : letterOfTransmittalContentToXml(bodyTextOrContent, style);
  if (!finalBodyXml.trim()) return 'missed';

  if (!foundBody || bodyStartRel < 0) {
    let insertAt = 0;
    for (const para of paras) {
      const plain = extractParagraphPlainText(para.text);
      if (isLayoutChromeParagraph(para.text)) break;
      if (/<w:pStyle\s+w:val="Heading1"/.test(para.text)) break;
      if (!isLetterheadParagraph(para.text, plain) && plain.length > 0) {
        insertAt = para.start;
        break;
      }
      insertAt = para.end;
    }
    const abs = anchor.end + insertAt;
    zip.file(xmlPath, xml.slice(0, abs) + finalBodyXml + xml.slice(abs));
    return 'inserted';
  }

  const absStart = anchor.end + bodyStartRel;
  const absEnd = anchor.end + bodyEndRel;
  zip.file(xmlPath, xml.slice(0, absStart) + finalBodyXml + xml.slice(absEnd));
  return 'replaced';
}

/** Centered bordered IRR callout matching the template LoT box. */
function buildLotIrrBoxXml(label: string): string {
  return (
    `<w:p>` +
    `<w:pPr>` +
    `<w:pBdr>` +
    `<w:top w:val="single" w:sz="12" w:space="4" w:color="000000"/>` +
    `<w:left w:val="single" w:sz="12" w:space="4" w:color="000000"/>` +
    `<w:bottom w:val="single" w:sz="12" w:space="4" w:color="000000"/>` +
    `<w:right w:val="single" w:sz="12" w:space="4" w:color="000000"/>` +
    `</w:pBdr>` +
    `<w:spacing w:before="120" w:after="120"/>` +
    `<w:jc w:val="center"/>` +
    `</w:pPr>` +
    `<w:r>` +
    `<w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(label)}</w:t>` +
    `</w:r>` +
    `</w:p>`
  );
}

function letterOfTransmittalContentToXml(
  content: LetterOfTransmittalContent,
  style: ParagraphStyleTemplate = FALLBACK_PARAGRAPH_STYLE
): string {
  // Don't inherit borders/shading from template author-mark paragraphs
  const cleanPPr = style.pPr
    .replace(/<w:pBdr>[\s\S]*?<\/w:pBdr>/g, '')
    .replace(/<w:shd\b[^/]*\/>/g, '');
  const cleanRPr = style.rPr.replace(/<w:highlight\b[^/]*\/>/g, '');
  const baseStyle: ParagraphStyleTemplate = { pPr: cleanPPr, rPr: cleanRPr };

  const parts: string[] = [];
  for (const block of content.blocks) {
    switch (block.kind) {
      case 'lines':
        for (const line of block.lines) {
          parts.push(
            `<w:p>${baseStyle.pPr}<w:r>${baseStyle.rPr}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
          );
        }
        parts.push('<w:p/>');
        break;
      case 'paragraph': {
        let rPr = block.bold ? withBoldRunProps(baseStyle.rPr) : baseStyle.rPr;
        if (block.authorHighlight) {
          // Cyan author-review mark — gender/salutation not certain
          if (/<w:rPr>/.test(rPr)) {
            rPr = rPr.replace('</w:rPr>', '<w:highlight w:val="cyan"/></w:rPr>');
          } else {
            rPr = '<w:rPr><w:highlight w:val="cyan"/></w:rPr>';
          }
        }
        parts.push(
          `<w:p>${baseStyle.pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(block.text)}</w:t></w:r></w:p>`
        );
        parts.push('<w:p/>');
        break;
      }
      case 'irr_box':
        parts.push(buildLotIrrBoxXml(block.label));
        parts.push('<w:p/>');
        break;
      case 'bullets':
        for (const item of block.items) {
          parts.push(buildBulletParagraphXml(item, baseStyle));
        }
        parts.push('<w:p/>');
        break;
      default: {
        const _exhaustive: never = block;
        void _exhaustive;
        break;
      }
    }
  }
  return parts.join('');
}

/**
 * Replace body prose under each Heading2 within a section, preserving subheads.
 * SWOT mode maps buckets by heading title; labeled mode uses === Label ===;
 * otherwise chunks AI text in order.
 */
export function replaceProseUnderSubheads(
  zip: PizZip,
  sectionHeading: string,
  nextSectionHeadings: string[],
  bodyText: string,
  chrome: LayoutChromeCounter,
  mode: 'swot' | 'chunks' | 'labeled'
): SectionHitStatus {
  if (!bodyText.trim()) return 'missed';
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';

  let xml = file.asText();
  const sectionAnchor = findSectionHeadingAnchor(xml, sectionHeading);
  if (!sectionAnchor) return 'missed';

  // Find section end (next Heading1 matching nextSectionHeadings)
  const afterSection = xml.slice(sectionAnchor.end);
  let sectionEndRel = afterSection.length;
  for (const para of findTopLevelParagraphs(afterSection)) {
    if (isLayoutChromeParagraph(para.text)) {
      chrome.skipped += 1;
      sectionEndRel = para.start;
      break;
    }
    if (/<w:pStyle\s+w:val="Heading1"/.test(para.text)) {
      sectionEndRel = para.start;
      break;
    }
    if (paragraphHitsNextHeading(para.text, nextSectionHeadings)) {
      sectionEndRel = para.start;
      break;
    }
  }

  const sectionXml = afterSection.slice(0, sectionEndRel);
  const sectionParas = findTopLevelParagraphs(sectionXml);
  const h2Indexes: number[] = [];
  for (let i = 0; i < sectionParas.length; i++) {
    if (/<w:pStyle\s+w:val="Heading2"/.test(sectionParas[i].text)) {
      h2Indexes.push(i);
    }
  }

  if (h2Indexes.length === 0) {
    // No skeleton — fall back to flat replace (still style-cloned + chrome-safe)
    return replaceSectionProseByHeading(
      zip,
      sectionHeading,
      nextSectionHeadings,
      bodyText,
      chrome,
      { stopOnHeading2: true }
    );
  }

  const swotBuckets = mode === 'swot' ? parseSwotBuckets(bodyText) : null;
  const labeledBuckets = mode === 'labeled' ? parseLabeledSections(bodyText) : null;
  const chunks =
    mode === 'chunks'
      ? splitBodyIntoChunks(bodyText, h2Indexes.length)
      : null;

  // Rebuild section from the end so earlier H2 offsets stay valid
  let rebuilt = sectionXml;
  let anyHit: SectionHitStatus = 'missed';
  let otherAttached = false;

  for (let hi = h2Indexes.length - 1; hi >= 0; hi--) {
    const h2i = h2Indexes[hi];
    const h2Para = sectionParas[h2i];
    const h2Plain = extractParagraphPlainText(h2Para.text);
    const nextH2i = h2Indexes[hi + 1];
    const rangeEnd = nextH2i != null ? sectionParas[nextH2i].start : sectionXml.length;

    const removeStart = h2Para.end;
    let removeEnd = removeStart;
    let found = false;
    let style = FALLBACK_PARAGRAPH_STYLE;

    for (let j = h2i + 1; j < sectionParas.length; j++) {
      if (nextH2i != null && j >= nextH2i) break;
      const p = sectionParas[j];
      if (p.start >= rangeEnd) break;
      if (isLayoutChromeParagraph(p.text)) {
        chrome.skipped += 1;
        break;
      }
      if (/<w:pStyle\s+w:val="Heading[12]"/.test(p.text)) break;
      if (p.text.includes('<w:tbl>') || /<w:drawing[\s>]/.test(p.text)) break;

      const plain = extractParagraphPlainText(p.text);
      if (!plain) {
        if (found) removeEnd = p.end;
        continue;
      }
      if (!found) {
        style = extractParagraphStyleTemplate(p.text);
        found = true;
      }
      removeEnd = p.end;
    }

    let content = '';
    if (mode === 'swot' && swotBuckets) {
      const key = matchSwotBucketKey(h2Plain);
      if (key === 'weaknesses') {
        content = [swotBuckets.weaknesses, swotBuckets.threats].filter(Boolean).join('\n');
      } else if (key) {
        content = swotBuckets[key] || '';
      }
      // Attach leftover unlabeled prose under the first Heading2 only
      if (!otherAttached && hi === 0 && swotBuckets.other) {
        content = [content, swotBuckets.other].filter(Boolean).join('\n');
        otherAttached = true;
      }
    } else if (mode === 'labeled' && labeledBuckets) {
      const key = matchLabeledSectionKey(h2Plain, labeledBuckets);
      content = key ? labeledBuckets[key] || '' : '';
      if (!content && hi === 0 && labeledBuckets.other) {
        content = labeledBuckets.other;
      }
    } else if (chunks) {
      content = chunks[hi] || '';
    }

    if (!content.trim()) continue;

    const bodyXml = bodyTextToStyledParagraphsXml(content, style);
    if (found && removeEnd > removeStart) {
      rebuilt = rebuilt.slice(0, removeStart) + bodyXml + rebuilt.slice(removeEnd);
      anyHit = 'replaced';
    } else {
      rebuilt = rebuilt.slice(0, removeStart) + bodyXml + rebuilt.slice(removeStart);
      anyHit = anyHit === 'replaced' ? 'replaced' : 'inserted';
    }
  }

  if (anyHit === 'missed') return 'missed';

  const absStart = sectionAnchor.end;
  const absEnd = sectionAnchor.end + sectionEndRel;
  zip.file(xmlPath, xml.slice(0, absStart) + rebuilt + xml.slice(absEnd));
  return anyHit;
}

/**
 * Replace only the initial static text paragraphs of the "Site Analysis"
 * section with generated content. Stops at first table, linked object,
 * image, layout chrome, or next section heading to preserve template structure.
 */
function replaceStaticSiteAnalysisSection(
  zip: PizZip,
  siteAnalysisText: string,
  chrome: LayoutChromeCounter
): SectionHitStatus {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';

  const xml = file.asText();
  const anchor = findSectionHeadingAnchor(xml, 'Site Analysis');
  if (!anchor) return 'missed';

  const startIdx = anchor.end;
  const suffix = xml.slice(startIdx);

  const { removeUntil, foundTextParagraph, style } = collectRemovableBodyRange(
    suffix,
    ['Development Costs'],
    chrome,
    { stopOnHeading2: true }
  );

  if (!foundTextParagraph || removeUntil === 0) return 'missed';

  const fallback =
    'Shape: Not yet verified; analyst to confirm.\n' +
    'Frontage: Not yet verified; analyst to confirm.\n' +
    'Surrounding Uses: Not yet verified; analyst to confirm.\n' +
    'Apparent Easements, Encroachments, or Restrictions: Not yet verified; analyst to confirm.\n' +
    'Topography and Drainage: Not yet verified; analyst to confirm.\n' +
    'Soil and Subsoil Condition: Not yet verified; analyst to confirm.\n' +
    'Street Improvements and Access: Not yet verified; analyst to confirm.\n' +
    'Utilities: Not yet verified; analyst to confirm.\n' +
    'Relationship to its Surroundings: Not yet verified; analyst to confirm.\n' +
    'Zoning: Not yet verified; analyst to confirm.';

  const replacement = buildSiteAnalysisParagraphsXml(siteAnalysisText || fallback, style);
  return applyBodyReplacement(
    zip,
    xmlPath,
    xml,
    startIdx,
    suffix,
    removeUntil,
    foundTextParagraph,
    replacement
  );
}

/** Build a simple cost table: header row + data rows (Item, Qty, Cost/Unit, Total) */
function buildCostTableXml(
  headers: string[],
  rows: Array<Record<string, string | number>>
): string {
  const fmt = (v: string | number) =>
    typeof v === 'number' ? (v === 0 ? '0' : v.toLocaleString('en-US', { maximumFractionDigits: 0 })) : String(v);
  const cell = (val: string | number, bold = false) => {
    const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
    return `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="TableParagraph"/></w:pPr><w:r>${rPr}<w:t>${escapeXml(fmt(val))}</w:t></w:r></w:p></w:tc>`;
  };
  const headerRow = `<w:tr>${headers.map((h) => cell(h, true)).join('')}</w:tr>`;
  const dataRows = rows
    .map((r) => `<w:tr>${headers.map((h) => cell(r[h] ?? '')).join('')}</w:tr>`)
    .join('');
  const colCount = headers.length;
  const gridCols = Array(colCount).fill('<w:gridCol w:w="2000"/>').join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>${headerRow}${dataRows}</w:tbl>`;
}

/** Build Development Costs section content: intro + tables */
function buildDevelopmentCostsSectionXml(data: DevelopmentCostsData): string {
  const intro =
    'Development costs are estimated using Marshall & Swift (MVS) Section 63 for manufactured housing parks and Section 66 for site improvements. Quality level and local multipliers are applied per MVS guidelines.';
  const introPara = `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>${escapeXml(intro)}</w:t></w:r></w:p>`;

  const siteDevRows: Array<Record<string, string | number>> = data.siteDevCosts.lineItems
    .filter((r) => r.quantity > 0 || r.name.includes('confirm'))
    .map((r) => ({
      Item: r.name,
      Qty: r.quantity,
      'Cost/Unit': r.costPerUnit,
      Total: r.subtotal,
    }));
  if (siteDevRows.length === 0 && data.siteDevCosts.rvTotal + data.siteDevCosts.glampingTotal > 0) {
    siteDevRows.push({
      Item: 'Site Development (horizontal + units)',
      Qty: data.siteDevCosts.totalRVSites + data.siteDevCosts.totalGlampingUnits,
      'Cost/Unit': 0,
      Total: data.siteDevCosts.rvTotal + data.siteDevCosts.glampingTotal,
    });
  }
  const siteDevTable = buildCostTableXml(['Item', 'Qty', 'Cost/Unit', 'Total'], siteDevRows);

  const unitRows = data.unitCosts.items
    .filter((r) => r.qty > 0 || r.name.includes('confirm'))
    .map((r) => ({ Item: r.name, Qty: r.qty, 'Cost/Unit': r.costPerUnit, Total: r.subtotal }));
  const unitTable = buildCostTableXml(['Item', 'Qty', 'Cost/Unit', 'Total'], unitRows);

  const addBldgRows: Array<Record<string, string | number>> = data.addBldgImprovements.items.map((r) => ({
    Item: r.name,
    SF: r.sf ?? '-',
    '$/SF': r.costPerSf ?? '-',
    Total: r.total,
  }));
  if (addBldgRows.length === 0 && data.addBldgImprovements.total > 0) {
    addBldgRows.push({ Item: 'Additional structures', SF: '-', '$/SF': '-', Total: data.addBldgImprovements.total });
  }
  const addBldgTable = buildCostTableXml(['Item', 'SF', '$/SF', 'Total'], addBldgRows);

  const totalRows = [
    { Line: 'Site Development', Amount: data.totalProjectCost.siteDev },
    { Line: 'Unit Costs', Amount: data.totalProjectCost.unitCosts },
    { Line: 'Additional Structures', Amount: data.totalProjectCost.addBldg },
    { Line: 'Hard Costs Subtotal', Amount: data.totalProjectCost.hardCosts },
    { Line: 'Soft Costs (est.)', Amount: data.totalProjectCost.softCosts },
    { Line: 'Land', Amount: data.totalProjectCost.land },
    { Line: 'Total Project Cost', Amount: data.totalProjectCost.total },
  ];
  const totalTable = buildCostTableXml(['Line', 'Amount'], totalRows);

  const subhead = (text: string) =>
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

  return (
    introPara +
    '<w:p/>' +
    subhead('Site Development Costs') +
    siteDevTable +
    '<w:p/>' +
    subhead('Unit Costs (Glamping / Lodging)') +
    unitTable +
    '<w:p/>' +
    subhead('Additional Structures and Site Improvements') +
    addBldgTable +
    '<w:p/>' +
    subhead('Total Project Cost') +
    totalTable +
    '<w:p/>'
  );
}

/**
 * Replace the Development Costs section content with generated tables.
 * Finds the "Development Costs" heading and replaces content until the next section.
 * Never deletes sectPr / page-break chrome.
 */
function replaceDevelopmentCostsSection(
  zip: PizZip,
  developmentCostsData: DevelopmentCostsData | undefined,
  chrome: LayoutChromeCounter
): void {
  if (!developmentCostsData) return;

  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();
  const anchor = findSectionHeadingAnchor(xml, 'Development Costs');
  if (!anchor) return;

  const startIdx = anchor.end;
  const suffix = xml.slice(startIdx);

  let removeUntil = 0;
  for (const para of findTopLevelParagraphs(suffix)) {
    const text = para.text;

    if (isLayoutChromeParagraph(text)) {
      chrome.skipped += 1;
      break;
    }
    if (/<w:pStyle\s+w:val="Heading[12]"/.test(text)) {
      break;
    }
    if (
      text.includes('<w:t>Comparables</w:t>') ||
      text.includes('<w:t>Supply and Competition</w:t>') ||
      text.includes('<w:t>SWOT</w:t>') ||
      text.includes('<w:t>Pro Forma</w:t>') ||
      text.includes('<w:t>Addenda</w:t>')
    ) {
      break;
    }
    removeUntil = para.end;
  }

  const replacement = buildDevelopmentCostsSectionXml(developmentCostsData);
  zip.file(xmlPath, xml.slice(0, startIdx) + replacement + suffix.slice(removeUntil));
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function buildSimpleTableXml(headers: string[], rows: string[][]): string {
  const headerRow = `<w:tr>${headers
    .map(
      (h) =>
        `<w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(h)}</w:t></w:r></w:p></w:tc>`
    )
    .join('')}</w:tr>`;
  const bodyRows = rows
    .map(
      (r) =>
        `<w:tr>${r
          .map(
            (c) =>
              `<w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${escapeXml(c)}</w:t></w:r></w:p></w:tc>`
          )
          .join('')}</w:tr>`
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr>${headerRow}${bodyRows}</w:tbl>`;
}

function buildFinancialModelSectionsXml(model: FeasibilityModelOutput): string {
  const para = (text: string) =>
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
  const subhead = (text: string) =>
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

  const pfHeaders = ['Year', 'Revenue', 'Expenses', 'NOI', 'Occ %', 'ADR'];
  const pfRows = model.proForma.map((y) => [
    String(y.year),
    money(y.totalRevenue),
    money(y.expenses),
    money(y.noi),
    pct(y.occupancyWeighted),
    money(y.adrWeighted),
  ]);

  const fin = model.financing;
  const irrPct =
    model.irr.equityIrr10Year != null ? pct(model.irr.equityIrr10Year) : 'n/a';

  return (
    para(
      'The following tables are generated from the deterministic feasibility model for this project (not prior-job remnant data).'
    ) +
    '<w:p/>' +
    subhead('10-Year Pro Forma Summary') +
    buildSimpleTableXml(pfHeaders, pfRows) +
    '<w:p/>' +
    subhead('Financing & Feasibility Metrics') +
    buildSimpleTableXml(
      ['Metric', 'Value'],
      [
        ['Total Development Cost', money(model.costs.totalDevelopmentCost)],
        ['Loan Amount', money(fin.loanAmount)],
        ['Equity', money(fin.equityAmount)],
        ['Annual Debt Service', money(fin.annualDebtService)],
        ['Year 5 DCR', fin.dcrByYear[4] != null ? fin.dcrByYear[4].toFixed(2) : 'n/a'],
        ['Year 5 Cash-on-Cash', fin.cashOnCashByYear[4] != null ? pct(fin.cashOnCashByYear[4]) : 'n/a'],
        ['10-Year Equity IRR', irrPct],
        [
          'Equity Payback',
          fin.paybackYears != null ? `Year ${fin.paybackYears}` : 'Beyond Year 10',
        ],
      ]
    ) +
    '<w:p/>'
  );
}

/**
 * Replace Rate / Occupancy / Revenue / Expenses / Pro Forma / Feasibility Conclusion
 * placeholder shells with model-generated tables (native Word tables, not OLE).
 * Never deletes sectPr / page-break chrome.
 */
function replaceFinancialModelSections(
  zip: PizZip,
  model: FeasibilityModelOutput | undefined,
  chrome: LayoutChromeCounter
): boolean {
  if (!model) return false;
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return false;

  let xml = file.asText();
  const headings = [
    'Rate Projection',
    'Occupancy Projection',
    'Occupancy',
    'Revenue Projection',
    'Operating Expenses',
    '10 Year Pro Forma',
    'Feasibility Conclusion',
  ];

  // Inject full model block at the first financial heading found; clear the rest to a short note
  const replacement = buildFinancialModelSectionsXml(model);
  let injected = false;

  for (const heading of headings) {
    const anchor = findSectionHeadingAnchor(xml, heading);
    if (!anchor) continue;

    const startIdx = anchor.end;
    const suffix = xml.slice(startIdx);
    let removeUntil = 0;
    for (const para of findTopLevelParagraphs(suffix)) {
      const text = para.text;
      if (isLayoutChromeParagraph(text)) {
        chrome.skipped += 1;
        break;
      }
      if (/<w:pStyle\s+w:val="Heading[12]"/.test(text)) {
        break;
      }
      const plain = extractParagraphPlainText(text);
      if (
        headings.some((h) => plain === h || plain.startsWith(h)) ||
        plain.startsWith('Assumptions and Limiting') ||
        plain === 'Qualifications' ||
        plain === 'Addenda'
      ) {
        if (para.start > 0) {
          break;
        }
      }
      removeUntil = para.end;
    }

    if (!injected) {
      xml = xml.slice(0, startIdx) + replacement + suffix.slice(removeUntil);
      injected = true;
    } else {
      const note =
        '<w:p><w:r><w:t>See Rate Projection / Pro Forma tables above (model-generated).</w:t></w:r></w:p>';
      xml = xml.slice(0, startIdx) + note + suffix.slice(removeUntil);
    }
  }

  if (injected) zip.file(xmlPath, xml);
  return injected;
}

/** Build OOXML inline drawing for an embedded image (EMU defaults ≈ 5.5" x 4") */
function buildInlineImageDrawingXml(
  rId: string,
  opts?: { cx?: number; cy?: number; name?: string }
): string {
  const cx = opts?.cx ?? 5029200;
  const cy = opts?.cy ?? 3657600;
  const name = opts?.name ?? 'Figure';
  return (
    `<w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${Math.floor(Math.random() * 100000) + 1}" name="${escapeXml(name)}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="${escapeXml(name)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
  );
}

function buildCaptionParagraphXml(caption: string): string {
  return (
    `<w:p><w:pPr><w:pStyle w:val="Subtitle"/><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr>` +
    `<w:t>${escapeXml(caption)}</w:t></w:r></w:p>`
  );
}

function buildHeading2ParagraphXml(title: string, templateParaXml?: string): string {
  if (templateParaXml && /<w:pStyle\s+w:val="Heading2"/.test(templateParaXml)) {
    // Replace all w:t text runs with the new title
    let replaced = false;
    const next = templateParaXml.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (_m, attrs) => {
      if (replaced) return `<w:t${attrs}></w:t>`;
      replaced = true;
      return `<w:t${attrs}>${escapeXml(title)}</w:t>`;
    });
    if (replaced) return next;
  }
  return (
    `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:color w:val="2E7D32"/></w:rPr>` +
    `<w:t>${escapeXml(title)}</w:t></w:r></w:p>`
  );
}

async function embedImageInZip(
  zip: PizZip,
  buffer: Buffer,
  ext: string,
  mediaBaseName: string
): Promise<string | null> {
  const relsPath = 'word/_rels/document.xml.rels';
  const relsFile = zip.file(relsPath);
  if (!relsFile) return null;

  let relsXml = relsFile.asText();
  const maxRId = Math.max(
    0,
    ...Array.from(relsXml.matchAll(/rId(\d+)/g)).map((m) => parseInt(m[1], 10))
  );
  const rId = `rId${maxRId + 1}`;
  let outBuf = buffer;
  let outExt = ext;
  if (ext === 'webp') {
    try {
      outBuf = await sharp(buffer).jpeg({ quality: IMAGE_JPEG_QUALITY }).toBuffer();
      // Template Content_Types defaults use "jpeg", not "jpg"
      outExt = 'jpeg';
    } catch {
      return null;
    }
  }
  const mediaName = `${mediaBaseName}.${outExt}`;
  zip.file(`word/media/${mediaName}`, outBuf, { binary: true });
  const rel =
    `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`;
  relsXml = relsXml.replace('</Relationships>', `${rel}\n</Relationships>`);
  zip.file(relsPath, relsXml);
  return rId;
}

/**
 * Rebuild Area Analysis to match completed Sage studies:
 * Overview → state map → State → County → local map → Local.
 * Clears stale remnant geography from the template.
 */
async function rebuildAreaAnalysisSection(
  zip: PizZip,
  areaAnalysisText: string,
  input: EnrichedInput,
  chrome: LayoutChromeCounter
): Promise<SectionHitStatus> {
  if (!areaAnalysisText.trim()) return 'missed';

  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 'missed';

  const xml = file.asText();
  const sectionAnchor = findSectionHeadingAnchor(xml, 'Area Analysis');
  if (!sectionAnchor) return 'missed';

  const afterSection = xml.slice(sectionAnchor.end);
  let sectionEndRel = afterSection.length;
  for (const para of findTopLevelParagraphs(afterSection)) {
    if (isLayoutChromeParagraph(para.text)) {
      chrome.skipped += 1;
      sectionEndRel = para.start;
      break;
    }
    if (/<w:pStyle\s+w:val="Heading1"/.test(para.text)) {
      sectionEndRel = para.start;
      break;
    }
    if (
      paragraphHitsNextHeading(para.text, [
        'Demand Indicators',
        'Industry Overview',
        'Supply and Competition Analysis',
      ])
    ) {
      sectionEndRel = para.start;
      break;
    }
  }

  const sectionXml = afterSection.slice(0, sectionEndRel);
  const sectionParas = findTopLevelParagraphs(sectionXml);
  const overviewH2 = sectionParas.find(
    (p) =>
      /<w:pStyle\s+w:val="Heading2"/.test(p.text) &&
      /^overview$/i.test(extractParagraphPlainText(p.text))
  );
  const bodyStyle =
    sectionParas
      .map((p) => ({ p, plain: extractParagraphPlainText(p.text) }))
      .find(
        (x) =>
          x.plain.length > 40 &&
          !/<w:drawing/.test(x.p.text) &&
          /<w:pStyle\s+w:val="Normal"/.test(x.p.text)
      )?.p.text || '';
  const paraStyle = bodyStyle
    ? extractParagraphStyleTemplate(bodyStyle)
    : FALLBACK_PARAGRAPH_STYLE;

  const buckets = parseAreaAnalysisSections(areaAnalysisText);
  const lat = input.latitude;
  const lng = input.longitude;
  const hasCoords =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  let stateMapXml = '';
  let localMapXml = '';
  if (hasCoords) {
    const [stateFetched, localFetched] = await Promise.all([
      fetchAreaMapImage(lat!, lng!, 'regional'),
      fetchAreaMapImage(lat!, lng!, 'local'),
    ]);
    if (stateFetched) {
      const rId = await embedImageInZip(
        zip,
        stateFetched.buffer,
        stateFetched.ext,
        'imageAreaStateMap'
      );
      if (rId) {
        const source =
          stateFetched.provider === 'google' ? 'GOOGLE MAPS' : 'OPENSTREETMAP';
        stateMapXml =
          `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>` +
          buildInlineImageDrawingXml(rId, {
            cx: 5486400,
            cy: 5486400,
            name: 'SageGenerated Regional Area Map',
          }) +
          `</w:r></w:p>` +
          buildCaptionParagraphXml(`MAP – REGIONAL VIEW (SOURCE: ${source})`);
      }
    }
    if (localFetched) {
      const rId = await embedImageInZip(
        zip,
        localFetched.buffer,
        localFetched.ext,
        'imageAreaLocalMap'
      );
      if (rId) {
        const source =
          localFetched.provider === 'google' ? 'GOOGLE MAPS' : 'OPENSTREETMAP';
        localMapXml =
          `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>` +
          buildInlineImageDrawingXml(rId, {
            cx: 5486400,
            cy: 4114800,
            name: 'SageGenerated Local Area Map',
          }) +
          `</w:r></w:p>` +
          buildCaptionParagraphXml(`MAP – LOCAL AREA VIEW (SOURCE: ${source})`);
      }
    }
  }

  if (!stateMapXml) {
    stateMapXml =
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
      `<w:t>` +
      escapeXml(
        hasCoords
          ? '[Image placeholder: Add MAP – REGIONAL VIEW with Subject marker at the property. Google Static Maps API is not enabled for this key; OSM fallback also failed.]'
          : '[Image placeholder: Add MAP – REGIONAL VIEW — subject coordinates unavailable; geocode the site address first.]'
      ) +
      `</w:t></w:r></w:p>`;
  }
  if (!localMapXml) {
    localMapXml =
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
      `<w:t>` +
      escapeXml(
        hasCoords
          ? '[Image placeholder: Add MAP – LOCAL AREA VIEW with Subject marker at the property. Google Static Maps API is not enabled for this key; OSM fallback also failed.]'
          : '[Image placeholder: Add MAP – LOCAL AREA VIEW — subject coordinates unavailable; geocode the site address first.]'
      ) +
      `</w:t></w:r></w:p>`;
  }

  const parts: string[] = [];
  parts.push(buildHeading2ParagraphXml('Overview', overviewH2?.text));
  parts.push(
    bodyTextToStyledParagraphsXml(
      buckets.overview ||
        `This section provides a comprehensive assessment of the subject property's area and its impact on the subject property resort. The subject property is located in ${input.city}, ${input.state}.`,
      paraStyle
    )
  );
  parts.push(stateMapXml);
  parts.push(buildHeading2ParagraphXml('State', overviewH2?.text));
  if (buckets.state) parts.push(bodyTextToStyledParagraphsXml(buckets.state, paraStyle));
  parts.push(buildHeading2ParagraphXml('County', overviewH2?.text));
  if (buckets.county) parts.push(bodyTextToStyledParagraphsXml(buckets.county, paraStyle));
  parts.push(localMapXml);
  parts.push(buildHeading2ParagraphXml('Local', overviewH2?.text));
  if (buckets.local) parts.push(bodyTextToStyledParagraphsXml(buckets.local, paraStyle));

  const rebuilt = parts.join('');
  const absStart = sectionAnchor.end;
  const absEnd = sectionAnchor.end + sectionEndRel;
  const fresh = zip.file(xmlPath)?.asText() ?? xml;
  zip.file(xmlPath, fresh.slice(0, absStart) + rebuilt + fresh.slice(absEnd));
  return 'replaced';
}

/**
 * Remove template tourism drawings under Tourism Trends H2 so TN DOTD
 * remnant infographics never ship for non-matching subjects.
 */
function stripSubsectionDrawingsByH2(
  sectionXml: string,
  h2Index: number,
  sectionParas: Array<{ start: number; end: number; text: string }>
): { xml: string; removed: number } {
  if (h2Index < 0 || h2Index >= sectionParas.length) {
    return { xml: sectionXml, removed: 0 };
  }

  let subEnd = sectionXml.length;
  for (let j = h2Index + 1; j < sectionParas.length; j++) {
    const next = sectionParas[j];
    if (isLayoutChromeParagraph(next.text)) {
      subEnd = next.start;
      break;
    }
    if (/<w:pStyle\s+w:val="Heading[12]"/.test(next.text)) {
      subEnd = next.start;
      break;
    }
  }

  let removed = 0;
  let out = sectionXml.slice(0, sectionParas[h2Index].end);
  let cursor = sectionParas[h2Index].end;
  for (let i = h2Index + 1; i < sectionParas.length; i++) {
    const p = sectionParas[i];
    if (p.start >= subEnd) break;
    out += sectionXml.slice(cursor, p.start);
    const hasImage =
      /<w:drawing[\s>]/.test(p.text) ||
      /<mc:AlternateContent[\s>][\s\S]*?<w:drawing/.test(p.text);
    const hasTextBox =
      /<w:txbxContent[\s>]/.test(p.text) || /<v:textbox[\s>]/.test(p.text);
    // Also drop prior generic Demand Indicators image placeholders in this subhead
    const plain = extractParagraphPlainText(p.text);
    const isGenericDemandPlaceholder =
      /\[Image placeholder/i.test(plain) &&
      /demand indicators|tourism|weatherspark climate chart/i.test(plain);
    if (
      (hasImage && !hasTextBox && !isExcelLinkParagraph(p.text)) ||
      isGenericDemandPlaceholder
    ) {
      removed += 1;
    } else {
      out += p.text;
    }
    cursor = p.end;
  }
  out += sectionXml.slice(Math.max(cursor, subEnd));
  return { xml: out, removed };
}

function findDemandSubheadIndex(
  sectionParas: Array<{ start: number; end: number; text: string }>,
  headingRe: RegExp
): number {
  for (let i = 0; i < sectionParas.length; i++) {
    const p = sectionParas[i];
    if (!/<w:pStyle\s+w:val="Heading2"/.test(p.text)) continue;
    if (headingRe.test(extractParagraphPlainText(p.text))) return i;
  }
  return -1;
}

function findInsertAfterSubheadIntro(
  sectionParas: Array<{ start: number; end: number; text: string }>,
  h2Index: number
): number {
  if (h2Index < 0) return -1;
  let insertAt = sectionParas[h2Index].end;
  let bodyParas = 0;
  for (let j = h2Index + 1; j < sectionParas.length; j++) {
    const next = sectionParas[j];
    if (isLayoutChromeParagraph(next.text)) break;
    if (/<w:pStyle\s+w:val="Heading[12]"/.test(next.text)) break;
    if (next.text.includes('<w:tbl>')) break;
    const nextPlain = extractParagraphPlainText(next.text);
    if (/^\[TOUR-0\d\]/i.test(nextPlain)) break;
    insertAt = next.end;
    if (nextPlain.trim()) bodyParas += 1;
    if (bodyParas >= 2) break;
  }
  return insertAt;
}

function cyanAuthorNoteParagraphXml(text: string): string {
  return (
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
    `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
  );
}

/**
 * Strip TN tourism template drawings under Tourism Trends and inject cyan
 * TOUR-01…06 placeholders pointing at the companion author checklist.
 */
function injectTourismTrendPlaceholders(
  zip: PizZip,
  input: EnrichedInput,
  chrome: LayoutChromeCounter
): { injected: number; stripped: number } {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return { injected: 0, stripped: 0 };

  let xml = file.asText();
  const sectionAnchor = findSectionHeadingAnchor(xml, 'Demand Indicators');
  if (!sectionAnchor) return { injected: 0, stripped: 0 };

  const afterSection = xml.slice(sectionAnchor.end);
  let sectionEndRel = afterSection.length;
  for (const para of findTopLevelParagraphs(afterSection)) {
    if (isLayoutChromeParagraph(para.text)) {
      chrome.skipped += 1;
      sectionEndRel = para.start;
      break;
    }
    if (/<w:pStyle\s+w:val="Heading1"/.test(para.text)) {
      sectionEndRel = para.start;
      break;
    }
    if (
      paragraphHitsNextHeading(para.text, [
        'Site Analysis',
        'Development Costs',
        'Supply and Competition Analysis',
        'Area Analysis',
        'Industry Overview',
      ])
    ) {
      sectionEndRel = para.start;
      break;
    }
  }

  let sectionXml = afterSection.slice(0, sectionEndRel);
  let sectionParas = findTopLevelParagraphs(sectionXml);

  const firstTourismH2 = sectionParas.findIndex(
    (p) =>
      /<w:pStyle\s+w:val="Heading2"/.test(p.text) &&
      /tourism/i.test(extractParagraphPlainText(p.text))
  );

  let stripped = 0;
  if (firstTourismH2 >= 0) {
    // Include all consecutive Tourism H2 blocks until a non-tourism Heading2
    let regionEnd = sectionXml.length;
    for (let j = firstTourismH2 + 1; j < sectionParas.length; j++) {
      const next = sectionParas[j];
      if (isLayoutChromeParagraph(next.text)) {
        regionEnd = next.start;
        break;
      }
      if (/<w:pStyle\s+w:val="Heading2"/.test(next.text)) {
        const plain = extractParagraphPlainText(next.text);
        if (!/tourism/i.test(plain)) {
          regionEnd = next.start;
          break;
        }
      }
      if (/<w:pStyle\s+w:val="Heading1"/.test(next.text)) {
        regionEnd = next.start;
        break;
      }
    }

    let out = sectionXml.slice(0, sectionParas[firstTourismH2].end);
    let cursor = sectionParas[firstTourismH2].end;
    for (let i = firstTourismH2 + 1; i < sectionParas.length; i++) {
      const p = sectionParas[i];
      if (p.start >= regionEnd) break;
      out += sectionXml.slice(cursor, p.start);
      const plain = extractParagraphPlainText(p.text);
      const hasImage =
        /<w:drawing[\s>]/.test(p.text) ||
        /<mc:AlternateContent[\s>][\s\S]*?<w:drawing/.test(p.text);
      const hasTextBox =
        /<w:txbxContent[\s>]/.test(p.text) || /<v:textbox[\s>]/.test(p.text);
      const isGenericDemandPlaceholder =
        /\[Image placeholder/i.test(plain) &&
        /demand indicators|tourism|weatherspark climate chart/i.test(plain);
      const isDuplicateTourismH2 =
        /<w:pStyle\s+w:val="Heading2"/.test(p.text) && /tourism/i.test(plain);
      const isTnTourCaption =
        /TN DEPARTMENT OF TOURIST|DEPARTMENT OF TOURIST DEVELOPMENT|Overnight Tennessee|Tennessee Visitors/i.test(
          plain
        ) ||
        (/^SOURCE:/i.test(plain.trim()) &&
          /tourist development|tennessee/i.test(plain) &&
          normalizeStateAbbr(input.state) !== 'TN');
      const isStateTourismLabel = /^state tourism$/i.test(plain.trim());

      if (
        isDuplicateTourismH2 ||
        (hasImage && !hasTextBox && !isExcelLinkParagraph(p.text)) ||
        isGenericDemandPlaceholder ||
        isTnTourCaption ||
        isStateTourismLabel
      ) {
        stripped += 1;
      } else {
        out += p.text;
      }
      cursor = p.end;
    }
    out += sectionXml.slice(Math.max(cursor, regionEnd));
    sectionXml = out;
    sectionParas = findTopLevelParagraphs(sectionXml);
  }

  if (stripped > 0) {
    console.log(
      `[assemble-docx] Stripped ${stripped} template tourism drawing/caption(s) under Demand Indicators → Tourism`
    );
    xml =
      xml.slice(0, sectionAnchor.end) +
      sectionXml +
      afterSection.slice(sectionEndRel);
    zip.file(xmlPath, xml);
    sectionEndRel = sectionXml.length;
  }

  // Avoid double-injecting if a prior assemble already added TOUR notes
  if (/\[TOUR-0[1-6]\]/.test(sectionXml)) {
    return { injected: 0, stripped };
  }

  let tourismH2 = sectionParas.findIndex(
    (p) =>
      /<w:pStyle\s+w:val="Heading2"/.test(p.text) &&
      /tourism/i.test(extractParagraphPlainText(p.text))
  );

  let insertAt = findInsertAfterSubheadIntro(sectionParas, tourismH2);
  if (insertAt < 0) {
    insertAt = sectionEndRel;
  }

  const notes = buildTourismSlotPlaceholderTexts(input.state);
  const headingXml =
    tourismH2 < 0
      ? `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Tourism Trends</w:t></w:r></w:p>` +
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>` +
        `${escapeXml(`Replace state tourism overnight-trip / visitor-profile figures for ${stateDisplayName(input.state)}. See companion author-checklist.md.`)}` +
        `</w:t></w:r></w:p>`
      : '';
  const imageXml =
    headingXml + notes.map((t) => cyanAuthorNoteParagraphXml(t)).join('');

  {
    const freshForInject = zip.file(xmlPath)?.asText() ?? xml;
    const abs = sectionAnchor.end + insertAt;
    zip.file(
      xmlPath,
      freshForInject.slice(0, abs) + imageXml + freshForInject.slice(abs)
    );
  }

  // Final pass: remove leftover TN tourism captions / State Tourism chrome /
  // generic Demand Indicators image placeholders that replaced TN figures.
  {
    const fresh = zip.file(xmlPath)?.asText() ?? xml;
    const anchor = findSectionHeadingAnchor(fresh, 'Demand Indicators');
    if (anchor) {
      const after = fresh.slice(anchor.end);
      let endRel = after.length;
      for (const para of findTopLevelParagraphs(after)) {
        if (isLayoutChromeParagraph(para.text) || /<w:pStyle\s+w:val="Heading1"/.test(para.text)) {
          endRel = para.start;
          break;
        }
        if (
          paragraphHitsNextHeading(para.text, [
            'Site Analysis',
            'Development Costs',
            'Supply and Competition Analysis',
            'Area Analysis',
            'Industry Overview',
          ])
        ) {
          endRel = para.start;
          break;
        }
      }
      const sec = after.slice(0, endRel);
      const paras = findTopLevelParagraphs(sec);
      let out = '';
      let cursor = 0;
      let extra = 0;
      const subjectIsTn = normalizeStateAbbr(input.state) === 'TN';
      for (const p of paras) {
        out += sec.slice(cursor, p.start);
        const plain = extractParagraphPlainText(p.text);
        const dropCaption =
          !subjectIsTn &&
          (/TN DEPARTMENT OF TOURIST|DEPARTMENT OF TOURIST DEVELOPMENT|Overnight Tennessee|Tennessee Visitors/i.test(
            plain
          ) ||
            (/^SOURCE:\s*20\d\d\s+TN\b/i.test(plain.trim()) &&
              /tourist/i.test(plain)));
        const dropStateTourismHead = /^state tourism$/i.test(plain.trim());
        const dropTourismImagePlaceholder =
          /\[Image placeholder/i.test(plain) &&
          /state tourism figure|TOUR-0N checklist/i.test(plain);
        if (dropCaption || dropStateTourismHead || dropTourismImagePlaceholder) {
          extra += 1;
        } else {
          out += p.text;
        }
        cursor = p.end;
      }
      out += sec.slice(cursor);
      if (extra > 0) {
        stripped += extra;
        zip.file(xmlPath, fresh.slice(0, anchor.end) + out + after.slice(endRel));
        console.log(
          `[assemble-docx] Removed ${extra} leftover tourism template figure/caption(s) in Demand Indicators`
        );
      }
    }
  }

  return { injected: notes.length, stripped };
}

/**
 * Insert WeatherSpark image XML after the Weather Heading2 intro paragraph
 * (charts sit between intro and Summary, matching completed studies).
 */
async function appendWeatherSparkAfterWeatherSubhead(
  zip: PizZip,
  input: EnrichedInput,
  chrome: LayoutChromeCounter
): Promise<void> {
  const weatherData = input.weather_data;
  if (!weatherData) return;

  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  let xml = file.asText();
  const sectionAnchor = findSectionHeadingAnchor(xml, 'Demand Indicators');
  if (!sectionAnchor) return;

  const afterSection = xml.slice(sectionAnchor.end);
  let sectionEndRel = afterSection.length;
  for (const para of findTopLevelParagraphs(afterSection)) {
    if (isLayoutChromeParagraph(para.text)) {
      chrome.skipped += 1;
      sectionEndRel = para.start;
      break;
    }
    if (/<w:pStyle\s+w:val="Heading1"/.test(para.text)) {
      sectionEndRel = para.start;
      break;
    }
    if (
      paragraphHitsNextHeading(para.text, [
        'Site Analysis',
        'Development Costs',
        'Supply and Competition Analysis',
        'Area Analysis',
        'Industry Overview',
      ])
    ) {
      sectionEndRel = para.start;
      break;
    }
  }

  let sectionXml = afterSection.slice(0, sectionEndRel);
  let sectionParas = findTopLevelParagraphs(sectionXml);
  let weatherH2Index = -1;
  let insertAt = -1;

  for (let i = 0; i < sectionParas.length; i++) {
    const p = sectionParas[i];
    if (!/<w:pStyle\s+w:val="Heading2"/.test(p.text)) continue;
    const plain = extractParagraphPlainText(p.text);
    if (!/weather/i.test(plain)) continue;
    weatherH2Index = i;
    insertAt = p.end;
    let bodyParas = 0;
    for (let j = i + 1; j < sectionParas.length; j++) {
      const next = sectionParas[j];
      if (isLayoutChromeParagraph(next.text)) break;
      if (/<w:pStyle\s+w:val="Heading[12]"/.test(next.text)) break;
      if (next.text.includes('<w:tbl>')) break;
      const nextPlain = extractParagraphPlainText(next.text);
      // Insert after the opening intro paragraph(s), before Summary bullets
      if (/^summary\b/i.test(nextPlain) || /^•\s*hot months/i.test(nextPlain)) {
        break;
      }
      insertAt = next.end;
      if (nextPlain.trim()) bodyParas += 1;
      if (bodyParas >= 2) break;
    }
    break;
  }

  if (weatherH2Index >= 0) {
    const stripped = stripSubsectionDrawingsByH2(
      sectionXml,
      weatherH2Index,
      sectionParas
    );
    if (stripped.removed > 0) {
      console.log(
        `[assemble-docx] Stripped ${stripped.removed} template weather drawing(s) under Demand Indicators → Weather`
      );
      sectionXml = stripped.xml;
      // Recompute insert point after strip (lengths shifted)
      sectionParas = findTopLevelParagraphs(sectionXml);
      weatherH2Index = -1;
      insertAt = -1;
      for (let i = 0; i < sectionParas.length; i++) {
        const p = sectionParas[i];
        if (!/<w:pStyle\s+w:val="Heading2"/.test(p.text)) continue;
        if (!/weather/i.test(extractParagraphPlainText(p.text))) continue;
        weatherH2Index = i;
        insertAt = p.end;
        let bodyParas = 0;
        for (let j = i + 1; j < sectionParas.length; j++) {
          const next = sectionParas[j];
          if (isLayoutChromeParagraph(next.text)) break;
          if (/<w:pStyle\s+w:val="Heading[12]"/.test(next.text)) break;
          if (next.text.includes('<w:tbl>')) break;
          const nextPlain = extractParagraphPlainText(next.text);
          if (/^summary\b/i.test(nextPlain) || /^•\s*hot months/i.test(nextPlain)) {
            break;
          }
          insertAt = next.end;
          if (nextPlain.trim()) bodyParas += 1;
          if (bodyParas >= 2) break;
        }
        break;
      }
      const rebuiltSection =
        sectionXml + afterSection.slice(sectionEndRel);
      xml =
        xml.slice(0, sectionAnchor.end) +
        rebuiltSection;
      zip.file(xmlPath, xml);
      sectionEndRel = sectionXml.length;
    }
  }

  if (weatherH2Index < 0 || insertAt < 0) {
    insertAt = sectionEndRel;
  }

  const prioritized = prioritizeWeatherSparkChartUrls(weatherData.image_urls || []);
  const imageXml = await buildWeatherSparkImageXml(
    zip,
    weatherData.city || input.city,
    weatherData.state || input.state,
    weatherData.url,
    prioritized.length > 0 ? prioritized : weatherData.image_urls,
    weatherData.chart_images
  );

  const fresh = zip.file(xmlPath)?.asText() ?? xml;
  const abs = sectionAnchor.end + insertAt;
  zip.file(xmlPath, fresh.slice(0, abs) + imageXml + fresh.slice(abs));
}

/**
 * Replace Demand Indicators prose under Heading2 skeletons; append WeatherSpark
 * charts and cyan TOUR-0N tourism figure placeholders.
 */
async function replaceDemandIndicatorsSection(
  zip: PizZip,
  demandIndicatorsText: string,
  input: EnrichedInput,
  chrome: LayoutChromeCounter
): Promise<SectionHitStatus> {
  const hit = replaceProseUnderSubheads(
    zip,
    'Demand Indicators',
    [
      'Site Analysis',
      'Development Costs',
      'Supply and Competition Analysis',
      'Area Analysis',
      'Industry Overview',
    ],
    demandIndicatorsText,
    chrome,
    'labeled'
  );

  await appendWeatherSparkAfterWeatherSubhead(zip, input, chrome);
  return hit;
}

/** Skip URLs that are spinners, thumbnails, maps, or non-chart assets */
function isEmbeddableWeatherSparkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes('spinner') || lower.includes('thumbnail')) return false;
  if (lower.includes('anyclip.com') || lower.includes('_1000x650_')) return false;
  if (lower.includes('fingerprint') || lower.includes('sources-map')) return false;
  if (lower.includes('static-map') || lower.includes('/maps/static/')) return false;
  if (lower.includes('travel-widget') || lower.includes('brand-logo')) return false;
  return /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(url) || lower.includes('cloudfront.net');
}

/** Fetch image from URL; returns buffer and extension or null on failure */
async function fetchImageFromUrl(
  url: string,
): Promise<{ buffer: Buffer; ext: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf.length > 5 * 1024 * 1024) return null;
    const ct = res.headers.get('content-type') ?? '';
    // Prefer "jpeg" to match template Content_Types Default Extension
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpeg';
    return { buffer: buf, ext };
  } catch {
    return null;
  }
}

const WEATHER_CHART_LABELS: Record<string, string> = {
  temperature: 'average high and low temperature',
  precip: 'daily chance of precipitation',
  snowfall: 'average monthly snowfall',
  tourism: 'tourism score',
};

function chartDrawingExtent(chart: WeatherChartImageData): { cx: number; cy: number } {
  const cx = 5486400; // ~6"
  const ratio =
    chart.width > 0 && chart.height > 0 ? chart.height / chart.width : 0.55;
  const cy = Math.max(2200000, Math.min(4200000, Math.round(cx * ratio)));
  return { cx, cy };
}

/** Build WeatherSpark image blocks: prefer Firecrawl SVG captures, else URL fetch, else placeholders */
async function buildWeatherSparkImageXml(
  zip: PizZip,
  city: string,
  state: string,
  weatherSparkUrl: string,
  imageUrls: string[],
  chartImages?: WeatherChartImageData[],
): Promise<string> {
  const fallbackLabels = [
    'average high and low temperature',
    'tourism score',
  ];
  const relsPath = 'word/_rels/document.xml.rels';
  const relsFile = zip.file(relsPath);
  if (!relsFile) {
    return buildWeatherSparkImagePlaceholderXml(city, state, weatherSparkUrl, imageUrls);
  }

  let relsXml = relsFile.asText();
  const maxRId = Math.max(
    0,
    ...Array.from(relsXml.matchAll(/rId(\d+)/g)).map((m) => parseInt(m[1], 10)),
  );

  const parts: string[] = [];
  let nextRId = maxRId + 1;
  let embedded = 0;

  const captured = selectChartsForEmbed(chartImages ?? [], 4);

  if (captured.length > 0) {
    for (let i = 0; i < captured.length; i++) {
      const chart = captured[i];
      const mediaName = `imageWeatherSpark${i + 1}.png`;
      const mediaPath = `word/media/${mediaName}`;
      zip.file(mediaPath, chart.buffer, { binary: true });
      const rId = `rId${nextRId++}`;
      const rel =
        `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`;
      relsXml = relsXml.replace('</Relationships>', `${rel}\n</Relationships>`);
      const { cx, cy } = chartDrawingExtent(chart);
      const label = WEATHER_CHART_LABELS[chart.key] || chart.title || `chart ${i + 1}`;
      parts.push(
        `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${buildInlineImageDrawingXml(rId, {
          cx,
          cy,
          name: `WeatherSpark ${label}`,
        })}</w:r></w:p>`,
      );
      if (chart.title) {
        parts.push(buildCaptionParagraphXml(chart.title));
      }
      embedded += 1;
    }
  } else {
    const embeddable = imageUrls.filter(isEmbeddableWeatherSparkUrl).slice(0, 2);
    for (let i = 0; i < 2; i++) {
      const url = embeddable[i];
      if (url) {
        const fetched = await fetchImageFromUrl(url);
        if (fetched) {
          let buf = fetched.buffer;
          let ext = fetched.ext;
          if (ext === 'webp') {
            try {
              buf = await sharp(buf).jpeg({ quality: IMAGE_JPEG_QUALITY }).toBuffer();
              ext = 'jpeg';
            } catch {
              // fall through to placeholder
            }
          }
          if (ext !== 'webp') {
            const mediaName = `imageWeatherSpark${i + 1}.${ext}`;
            const mediaPath = `word/media/${mediaName}`;
            zip.file(mediaPath, buf, { binary: true });
            const rId = `rId${nextRId++}`;
            const rel =
              `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`;
            relsXml = relsXml.replace('</Relationships>', `${rel}\n</Relationships>`);
            parts.push(
              `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${buildInlineImageDrawingXml(rId, {
                cx: 5486400,
                cy: 3657600,
                name: `WeatherSpark ${fallbackLabels[i]}`,
              })}</w:r></w:p>`,
            );
            embedded += 1;
            continue;
          }
        }
      }
      parts.push(
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
          `<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr>` +
          `<w:t>[Image placeholder: Paste WeatherSpark ${fallbackLabels[i]} chart for ${escapeXml(city)}, ${escapeXml(state)} from ${escapeXml(weatherSparkUrl)}]</w:t></w:r></w:p>`,
      );
    }
  }

  zip.file(relsPath, relsXml);
  parts.push(
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr>` +
      `<w:t>SOURCE: WEATHERSPARK.COM${embedded === 0 ? ' — charts are canvas-rendered; paste screenshots from the URL below' : ''} - ${escapeXml(weatherSparkUrl)}</w:t></w:r></w:p>`,
  );
  return parts.join('');
}

function buildWeatherSparkImagePlaceholderXml(
  city: string,
  state: string,
  weatherSparkUrl: string,
  _imageUrls: string[],
): string {
  const chartTypes = [
    'average high and low temperature',
    'tourism score',
  ];
  const parts: string[] = [];
  for (let i = 0; i < chartTypes.length; i++) {
    parts.push(
      `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
        `<w:r><w:t>[Image placeholder: Paste WeatherSpark ${chartTypes[i]} chart for ${escapeXml(city)}, ${escapeXml(state)} from ${escapeXml(weatherSparkUrl)}]</w:t></w:r></w:p>`,
    );
  }
  parts.push(
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>` +
      `<w:r><w:rPr><w:i/><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr>` +
      `<w:t>SOURCE: WEATHERSPARK.COM — charts are canvas-rendered; paste screenshots from the URL below - ${escapeXml(weatherSparkUrl)}</w:t></w:r></w:p>`,
  );
  return parts.join('');
}

export async function assembleDraftDocx(
  input: EnrichedInput,
  sections: GeneratedSections,
  options?: AssembleDraftDocxOptions
): Promise<AssembleDraftDocxResult> {
  const templateKey = getTemplateKeyForMarketType(options?.marketType ?? input.market_type);
  const content = await getTemplateContent(templateKey);
  const zip = new PizZip(content);

  // Phase 1: strip highlights from placeholder runs before docxtemplater renders
  stripHighlightsFromPlaceholderRuns(zip);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const location = [input.address_1, input.city, input.state, input.zip_code]
    .filter(Boolean)
    .join(', ');

  const reportDate = formatReportDate(input);

  const totalSites = input.unit_mix.reduce((sum, u) => sum + u.count, 0) || '';

  const meta = input.enrichment_metadata;
  const appendixParts: string[] = [];
  if (meta) {
    appendixParts.push(
      `Data sources: ${meta.data_sources.join(', ')}.`
    );
    if (meta.benchmark_sample_count > 0) {
      appendixParts.push(
        `Benchmarks: ${meta.benchmark_sample_count} records (${meta.benchmark_categories.join(', ')}).`
      );
    }
    appendixParts.push(`Generated on ${meta.enrichment_date}.`);
  }
  if (INCLUDE_CITATIONS_IN_DOCX && (sections.citations?.length ?? 0) > 0) {
    appendixParts.push(
      '',
      'Citations:',
      ...sections.citations!.map((c) => `• ${c.claim} (Source: ${c.source})`)
    );
  }
  const data_sources_appendix = appendixParts.join('\n');

  const renderData = {
    property_name: input.property_name,
    location: location || 'Not specified',
    client_entity: input.client_entity || 'Client',
    client_contact_name: input.client_contact_name || input.client_entity || 'Client',
    client_address: input.client_address || '',
    client_city_state_zip: input.client_city_state_zip || '',
    client_salutation: input.client_salutation || input.client_contact_name || 'Client',
    report_date: reportDate,
    study_id: input.study_id || '',
    address_1: input.address_1 || '',
    city: input.city,
    state: input.state,
    zip_code: input.zip_code || '',
    acres: input.acres != null ? String(input.acres) : '',
    total_sites: totalSites ? String(totalSites) : '',
    parcel_number: input.parcel_number || '',
    amenities_description: input.amenities_description || '',
    executive_summary: sections.executive_summary,
    letter_of_transmittal: sections.letter_of_transmittal || '',
    swot_analysis: sections.swot_analysis || '',
    site_analysis: sections.site_analysis || '',
    comparables_analysis: buildComparablesAnalysis(input),
    data_sources_appendix: data_sources_appendix || '',
  };

  try {
    doc.render(renderData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Docxtemplater render failed (check template placeholders): ${msg}`
    );
  }

  const outZip = doc.getZip();

  // Surgical identity replace first (updates sample geography / client strings
  // and clears cyan on paragraphs that changed).
  const identityReplacements = replacePlainTextInDocument(
    outZip,
    buildIdentityReplacements(input, { reportDate })
  );

  // Cover: parcel / study subtitle / remove instruction; clear cyan only where resolved
  applyCoverPageResolvedMarks(outZip, input);

  // Then strip cyan from any remaining paragraphs that already match form values
  const formValues = new Set<string>();
  for (const v of Object.values(renderData)) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s && s.length < 200) formValues.add(s);
  }
  const compositeParts = [
    input.city, input.state, input.zip_code,
    `${input.city},`, `${input.city}, ${input.state}`,
    `${input.state} ${input.zip_code}`,
    `${input.city}, ${input.state} ${input.zip_code}`,
    input.address_1,
    input.parcel_number ? `Parcel Number ${input.parcel_number}` : '',
    input.parcel_number,
    input.service || 'Feasibility Study',
    'Feasibility Study',
    reportDate,
  ];
  for (const p of compositeParts) {
    if (p) formValues.add(p.trim());
  }
  stripHighlightsFromFormValues(outZip, formValues);

  const sectionHits: Record<string, SectionHitStatus> = {};
  const chrome: LayoutChromeCounter = { skipped: 0 };

  // Keep Project Overview linked Excel ToT table; retarget/annotate later.
  // (Previously replaced with a native table — authors need live Excel links.)

  sectionHits.scope_of_work = rebuildScopeOfWorkSection(outZip, input, chrome);
  sectionHits.certification = rebuildCertificationSection(outZip, input, chrome);

  // Always rebuild LoT from intake (teal author-mark fields), matching template
  // structure including bold conclusion + native IRR callout.
  const lotContent = buildLetterOfTransmittalContent(input, {
    model: sections.model_output,
  });
  sectionHits.letter_of_transmittal = replaceLetterOfTransmittalBody(
    outZip,
    lotContent,
    chrome
  );

  // Always rebuild Exec Summary overview/demand from intake; preserve linked Excel
  // 10-yr PF / financing / IRR objects for companion-workbook refresh.
  sectionHits.executive_summary = rebuildExecutiveSummarySection(
    outZip,
    sections.executive_summary || '',
    input,
    sections.model_output,
    chrome
  );

  if (sections.swot_analysis?.trim()) {
    sectionHits.swot_analysis = replaceProseUnderSubheads(
      outZip,
      'SWOT Analysis',
      ['Project Overview', 'Site Analysis', 'Executive Summary'],
      sections.swot_analysis,
      chrome,
      'swot'
    );
  } else {
    sectionHits.swot_analysis = 'missed';
  }

  sectionHits.site_analysis = replaceStaticSiteAnalysisSection(
    outZip,
    sections.site_analysis || '',
    chrome
  );

  if (sections.area_analysis) {
    sectionHits.area_analysis = await rebuildAreaAnalysisSection(
      outZip,
      sections.area_analysis,
      input,
      chrome
    );
  } else {
    sectionHits.area_analysis = 'missed';
  }

  if (sections.industry_overview) {
    sectionHits.industry_overview = replaceSectionProseByHeading(
      outZip,
      'Industry Overview',
      ['Area Analysis', 'Demand Indicators', 'Supply and Competition Analysis'],
      sections.industry_overview,
      chrome
    );
  } else {
    sectionHits.industry_overview = 'missed';
  }

  if (sections.supply_competition) {
    sectionHits.supply_competition = replaceSectionProseByHeading(
      outZip,
      'Supply and Competition Analysis',
      ['Comparables', 'Rate Projection', 'Demand Indicators'],
      sections.supply_competition,
      chrome
    );
  } else {
    sectionHits.supply_competition = 'missed';
  }

  const compsHit = rebuildComparablesSection(outZip, input);
  console.log(`[assemble-docx] Comparables: ${compsHit}`);

  let tourismPlaceholdersInjected = 0;
  let tourismDrawingsStripped = 0;
  if (sections.demand_indicators) {
    sectionHits.demand_indicators = await replaceDemandIndicatorsSection(
      outZip,
      sections.demand_indicators,
      input,
      chrome
    );
  } else {
    sectionHits.demand_indicators = 'missed';
  }

  // Keep linked Excel State Parks tables; append NPS only when missing.
  replaceParkVisitationLinkedTables(outZip, input);

  const parkMaps = await rebuildDemandParkMaps(outZip, input);
  if (parkMaps.national || parkMaps.state) {
    console.log(
      `[assemble-docx] Park maps: national=${parkMaps.national} state=${parkMaps.state}`
    );
  }

  const transport = await rebuildTransportationAccess(outZip, input);
  if (transport.map || transport.highway) {
    console.log(
      `[assemble-docx] Transportation: map=${transport.map} highway=${transport.highway}`
    );
  }

  const marketProfileRebuilt = rebuildDemographicMarketProfile(outZip, input);
  if (marketProfileRebuilt) {
    console.log('[assemble-docx] Demographic Market Profile: native drive-time table');
  }

  const influentialRebuilt = rebuildMostInfluentialCities(outZip, input);
  if (influentialRebuilt) {
    console.log('[assemble-docx] Most Influential Cities: rebuilt from nearest metros');
  }

  replaceDevelopmentCostsSection(outZip, sections.development_costs_data, chrome);
  if (sections.model_output) {
    sectionHits.financial_model = replaceFinancialModelSections(
      outZip,
      sections.model_output,
      chrome
    )
      ? 'replaced'
      : 'missed';
  } else {
    sectionHits.financial_model = 'missed';
  }
  const companionWorkbookFileName =
    options?.companionWorkbookFileName?.trim() || 'template.xlsx';
  const linkRetarget = retargetLinkedExcelWorkbook(outZip, companionWorkbookFileName);
  const linkNotes = annotateLinkedExcelTables(outZip, companionWorkbookFileName);
  if (linkRetarget.instrTextUpdated + linkRetarget.relsUpdated + linkNotes > 0) {
    console.log(
      `[assemble-docx] Excel links: retargeted instr=${linkRetarget.instrTextUpdated} rels=${linkRetarget.relsUpdated}; author notes=${linkNotes} → ${companionWorkbookFileName}`
    );
  }

  const imageStats = replaceTemplateImagesSelectively(outZip);

  // After generic image placeholdering: strip TN tourism remnants and inject
  // cyan TOUR-0N notes (so checklist IDs replace both drawings and captions).
  if (sections.demand_indicators) {
    const tourism = injectTourismTrendPlaceholders(outZip, input, chrome);
    tourismPlaceholdersInjected = tourism.injected;
    tourismDrawingsStripped = tourism.stripped;
  }

  // Belt-and-suspenders: remove any remaining TN tourism SOURCE captions
  // anywhere in the body when the subject is not Tennessee.
  if (normalizeStateAbbr(input.state) !== 'TN') {
    const xmlPath = 'word/document.xml';
    const file = outZip.file(xmlPath);
    if (file) {
      const xml = file.asText();
      const paras = findTopLevelParagraphs(xml);
      let out = '';
      let cursor = 0;
      let removed = 0;
      for (const p of paras) {
        out += xml.slice(cursor, p.start);
        const plain = extractParagraphPlainText(p.text);
        if (
          /TN DEPARTMENT OF TOURIST|DEPARTMENT OF TOURIST DEVELOPMENT/i.test(plain) ||
          (/^SOURCE:/i.test(plain.trim()) && /tourist development/i.test(plain) && /\bTN\b/.test(plain)) ||
          /^state tourism$/i.test(plain.trim()) ||
          /Great Smoky Mountains/i.test(plain) ||
          /Chickamauga and Chattanooga/i.test(plain) ||
          /\bChattanooga\b/i.test(plain) ||
          /Lookout Mountain/i.test(plain) ||
          /Tennessee Aquarium/i.test(plain) ||
          /South Cumberland State Park/i.test(plain) ||
          /Cloudland Canyon State Park/i.test(plain) ||
          /Interstate 24/i.test(plain) ||
          /\bI-24\b/i.test(plain) ||
          /Nickajack/i.test(plain) ||
          /Alabama, and Georgia/i.test(plain) ||
          /Appalachian foothills/i.test(plain) ||
          /Bolt Farm Treehouse/i.test(plain) ||
          /\bBolt Farm\b/i.test(plain) ||
          /ReTreet Glamping/i.test(plain) ||
          /\bReTreet\b/i.test(plain) ||
          /GLAMP by Stay Minty/i.test(plain) ||
          /Stay Minty/i.test(plain) ||
          /MAP OF DETAILED COMPARABLES/i.test(plain)
        ) {
          removed += 1;
        } else {
          out += p.text;
        }
        cursor = p.end;
      }
      out += xml.slice(cursor);
      if (removed > 0) {
        outZip.file(xmlPath, out);
        tourismDrawingsStripped += removed;
        console.log(
          `[assemble-docx] Removed ${removed} remaining TN tourism SOURCE caption(s) from document body`
        );
      }
    }
  }

  const { compressed, bytesSaved } = await compressImagesInZip(outZip);
  if (compressed > 0) {
    console.log(
      `[assemble-docx] Compressed ${compressed} images (~${(bytesSaved / 1024).toFixed(0)} KB saved)`,
    );
  }

  const { removed, bytesFreed } = stripUnreferencedMedia(outZip);
  if (removed > 0) {
    console.log(
      `[assemble-docx] Stripped ${removed} unreferenced media files (~${(bytesFreed / 1024 / 1024).toFixed(1)} MB freed)`
    );
  }

  collapseExcessiveEmptyParagraphs(outZip);

  // Do NOT globally strip cyan — unresolved author marks (e.g. co-authors) stay
  // highlighted. Updated fields clear cyan via identity replace + cover marks +
  // form-value strip above, and rebuilt sections ship without highlight.

  // Word "unreadable content" guards
  ensureMediaContentTypes(outZip);
  const bookmarksFixed = sanitizeOrphanBookmarks(outZip);
  if (bookmarksFixed > 0) {
    console.log(`[assemble-docx] Removed ${bookmarksFixed} orphan bookmark markers`);
  }
  const tocRepaired = repairTocHeadingBookmarks(outZip);
  if (tocRepaired > 0) {
    console.log(
      `[assemble-docx] Repaired ${tocRepaired} TOC heading bookmark(s) for in-document navigation`
    );
  }

  const sampleFingerprintsRemaining = findRemainingSampleFingerprints(outZip, input);

  const diagnostics: AssembleDocxDiagnostics = {
    sectionHits,
    identityReplacements,
    imagesKept: imageStats.imagesKept,
    imagesPlaceholdered: imageStats.imagesPlaceholdered,
    sampleFingerprintsRemaining,
    layoutChromeSkipped: chrome.skipped,
    tourismPlaceholdersInjected,
    tourismDrawingsStripped,
  };

  const buf = outZip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return {
    buffer: Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer),
    diagnostics,
  };
}
