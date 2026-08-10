/**
 * Deterministic Cover / Letter of Transmittal / Certification content
 * for teal author-mark fields in Sage FS templates.
 */

import type { FeasibilityModelOutput } from '@/lib/feasibility-model';
import type { EnrichedInput, ReportDraftInput } from './types';
import { resolveClientSalutation } from './salutation';

function hasText(v: string | null | undefined): boolean {
  return Boolean(v && String(v).trim());
}

function productLabel(input: ReportDraftInput): string {
  const t = (input.market_type || input.resort_type || '').toLowerCase();
  if (t.includes('glamping')) return 'glamping resort';
  if (t.includes('rv')) return 'RV resort';
  return 'outdoor hospitality resort';
}

function studyTypeLabel(input: ReportDraftInput): string {
  const service = (input.service || '').trim();
  if (service) {
    // Prefer product-qualified study title when service is generic
    if (/^feasibility study$/i.test(service)) {
      const t = (input.market_type || input.resort_type || '').toLowerCase();
      if (t.includes('glamping')) return 'Glamping Feasibility Study';
      if (t.includes('rv')) return 'RV Feasibility Study';
    }
    return service;
  }
  const t = (input.market_type || input.resort_type || '').toLowerCase();
  if (t.includes('glamping')) return 'Glamping Feasibility Study';
  if (t.includes('rv')) return 'RV Feasibility Study';
  return 'Feasibility Study';
}

function coverProductTitle(input: ReportDraftInput): string {
  const t = (input.market_type || input.resort_type || '').toLowerCase();
  if (t.includes('glamping')) return 'Glamping Resort';
  if (t.includes('rv')) return 'RV Resort';
  return 'Outdoor Hospitality Resort';
}

export function formatReportDate(input: ReportDraftInput, now = new Date()): string {
  if (hasText(input.engagement_date)) {
    const d = new Date(input.engagement_date!);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  }
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function buildPropertyLocationLine(input: ReportDraftInput): string {
  const cityStateZip = [input.city, [input.state, input.zip_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  if (input.address_1?.trim() && cityStateZip) {
    return `${input.address_1.trim()}, ${cityStateZip}`;
  }
  return [input.address_1?.trim(), cityStateZip].filter(Boolean).join(', ');
}

export function buildClientBlock(input: ReportDraftInput): {
  contactLine: string;
  entityLine: string;
  addressLine: string;
  cityStateZip: string;
  salutation: string;
  /** False when Mr./Ms. gender is ambiguous — LoT should cyan-highlight */
  salutationCertain: boolean;
  soleUse: string;
} {
  const contact =
    input.client_contact_name?.trim() ||
    input.client_entity?.trim() ||
    'Client';
  const entity = input.client_entity?.trim() || contact;
  const resolved = resolveClientSalutation(input);
  const soleUse =
    input.client_contact_name?.trim() && input.client_entity?.trim()
      ? `${input.client_contact_name.trim()} / ${input.client_entity.trim()}`
      : entity;

  return {
    contactLine: contact,
    entityLine: entity,
    addressLine: input.client_address?.trim() || '',
    cityStateZip: input.client_city_state_zip?.trim() || '',
    salutation: resolved.text,
    salutationCertain: resolved.certain,
    soleUse,
  };
}

function siteConditionPhrase(input: ReportDraftInput): string {
  const brief = (input.amenities_description || '').toLowerCase();
  if (/\b(vacant house|existing house|existing residence)\b/.test(brief)) {
    return 'contains a vacant house';
  }
  if (/\b(improved|existing building|existing structure)\b/.test(brief)) {
    return 'contains existing improvements';
  }
  if (/\b(undeveloped|vacant land|raw land|greenfield)\b/.test(brief)) {
    return 'is currently undeveloped';
  }
  return 'is currently undeveloped';
}

/**
 * Amenities for the LoT assumption sentence — prefer amenity-like clauses,
 * not the full intake brief (which often mixes infrastructure notes).
 */
export function amenitiesPhrase(input: ReportDraftInput): string {
  const raw = input.amenities_description?.trim();
  if (!raw) return 'the amenities outlined in this report';

  const clauses = raw
    .split(/[;\n]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const amenityLike = clauses.filter(
    (c) =>
      !/^(power|septic|water|electric|utilities?|infrastructure)\b/i.test(c) &&
      !/\b(power|septic|water|electric)\s+(and|&)\s+(septic|power|water|electric)\b/i.test(c)
  );
  const pick = (amenityLike[0] || clauses[0] || raw).replace(/\.$/, '').trim();
  return pick.length > 160 ? `${pick.slice(0, 157).trim()}…` : pick;
}

function feasibilityPhrases(
  model?: FeasibilityModelOutput
): { short: string; long: string; market: string } {
  const irr = model?.irr?.equityIrr10Year;
  if (irr == null || !Number.isFinite(irr)) {
    return {
      short: 'is feasible',
      long: 'feasible with adequate',
      market: 'appropriate',
    };
  }
  if (irr >= 0.15) {
    return {
      short: 'is feasible',
      long: 'feasible with adequate',
      market: 'appropriate',
    };
  }
  if (irr >= 0.08) {
    return {
      short: 'is marginally feasible',
      long: 'marginally feasible with a modest',
      market: 'conditionally appropriate',
    };
  }
  return {
    short: 'is not feasible under current assumptions',
    long: 'not feasible without a stronger',
    market: 'challenging',
  };
}

/** Format 10-year equity IRR for the LoT callout box (null when unknown). */
export function formatLotIrrLabel(model?: FeasibilityModelOutput): string | null {
  const irr = model?.irr?.equityIrr10Year;
  if (irr == null || !Number.isFinite(irr)) return null;
  const pct = (irr * 100).toFixed(1).replace(/\.0$/, '');
  return `10 Year IRR on Equity = ${pct}%`;
}

/** Cost extraordinary-assumption bullet (ownership costs vs Marshall/Swift only). */
export function buildCostAssumptionBullet(input: ReportDraftInput): string {
  const brief = (input.amenities_description || '').toLowerCase();
  const hasOwnerCosts =
    input.client_provided_cost_info === true ||
    /\b(construction budget|cost estimate|hard cost|owner.?provided cost)\b/.test(brief);

  if (hasOwnerCosts) {
    return 'Lastly, ownership provided limited cost information, which has been relied upon for the development of this analysis. Additionally, we have derived costs from similar projects and the Marshall and Swift Cost Manual. If actual costs are significantly different from the information contained herein, we reserve the right to amend this analysis.';
  }
  return 'Lastly, we have derived costs from similar projects, as well as the Marshall and Swift Cost Manual. If actual costs differ significantly from the information contained herein, it may affect the conclusions.';
}

export type LetterOfTransmittalBlock =
  | { kind: 'lines'; lines: string[] }
  | { kind: 'paragraph'; text: string; bold?: boolean; authorHighlight?: boolean }
  | { kind: 'irr_box'; label: string }
  | { kind: 'bullets'; items: string[] };

export interface LetterOfTransmittalContent {
  blocks: LetterOfTransmittalBlock[];
  /** Plain-text fallback (tests / legacy callers) */
  text: string;
}

export function letterOfTransmittalContentToPlainText(
  content: Pick<LetterOfTransmittalContent, 'blocks'>
): string {
  const lines: string[] = [];
  for (const block of content.blocks) {
    switch (block.kind) {
      case 'lines':
        lines.push(...block.lines, '');
        break;
      case 'paragraph':
        lines.push(block.text, '');
        break;
      case 'irr_box':
        lines.push(block.label, '');
        break;
      case 'bullets':
        for (const item of block.items) lines.push(`• ${item}`);
        lines.push('');
        break;
      default: {
        const _exhaustive: never = block;
        void _exhaustive;
        break;
      }
    }
  }
  return lines.join('\n').trim();
}

export function buildLetterOfTransmittalContent(
  input: EnrichedInput | ReportDraftInput,
  options?: { model?: FeasibilityModelOutput; narrativeOverride?: string }
): LetterOfTransmittalContent {
  const location = buildPropertyLocationLine(input) || `${input.city}, ${input.state}`;
  const product = productLabel(input);
  const studyType = studyTypeLabel(input);
  const client = buildClientBlock(input);
  const totalSites = input.unit_mix.reduce((s, u) => s + (u.count || 0), 0);
  const acres =
    input.acres != null && Number.isFinite(input.acres) ? String(input.acres) : '[acres TBD]';
  const sitesLabel = totalSites > 0 ? String(totalSites) : '[site count TBD]';
  const verdict = feasibilityPhrases(options?.model);
  const fileNo = input.study_id?.trim() || 'TBD';
  const date = formatReportDate(input);
  const serviceNoun = (input.service || 'feasibility study').toLowerCase().includes('market')
    ? 'market study'
    : 'feasibility study';
  const cityLine = [input.city, [input.state, input.zip_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const irrLabel =
    formatLotIrrLabel(options?.model) ?? '10 Year IRR on Equity = [Pending model]';

  const headerLines: string[] = [date, client.contactLine, client.entityLine];
  if (client.addressLine) headerLines.push(client.addressLine);
  if (client.cityStateZip) headerLines.push(client.cityStateZip);
  headerLines.push(`Re: ${studyType}`);
  headerLines.push(input.property_name);
  if (input.address_1?.trim()) headerLines.push(input.address_1.trim());
  if (cityLine) headerLines.push(cityLine);
  headerLines.push(`Sage Outdoor Advisory File No. ${fileNo}`);

  const blocks: LetterOfTransmittalBlock[] = [{ kind: 'lines', lines: headerLines }];
  blocks.push({
    kind: 'paragraph',
    text: `${client.salutation}:`,
    authorHighlight: !client.salutationCertain,
  });

  if (options?.narrativeOverride?.trim()) {
    for (const para of options.narrativeOverride.trim().split(/\n+/).filter(Boolean)) {
      blocks.push({ kind: 'paragraph', text: para.trim() });
    }
  } else {
    blocks.push({
      kind: 'paragraph',
      text: `At your request, we have analyzed the market and the proposed ${product} located at ${location}. The overall subject site contains approximately ${acres} acres. After discussions with ownership and a review of local demand trends, competing properties, development costs, and current investment parameters, we have concluded that a ${product} with ${sitesLabel} sites ${verdict.short} at this time. Additionally, we have assumed that ${amenitiesPhrase(input)} will also be constructed. It is noted that the property ${siteConditionPhrase(input)}.`,
    });
    // Template: bold conclusion ending with a colon before the IRR callout
    blocks.push({
      kind: 'paragraph',
      bold: true,
      text: `The scope of this hypothetical development appears ${verdict.market} for the market, and it is concluded to be ${verdict.long} investment returns:`,
    });
  }

  blocks.push({ kind: 'irr_box', label: irrLabel });

  blocks.push({
    kind: 'paragraph',
    text: 'We have studied the site and analyzed the outdoor resort market conditions. The results of our analysis are presented in this report. The analyses, opinions and conclusions were developed, and this report has been prepared, in conformity with the Uniform Standards of Professional Appraisal Practice (USPAP) of the Appraisal Foundation, as well as the Code of Professional Ethics and the Standards of Professional Practice of the Appraisal Institute.',
  });
  blocks.push({
    kind: 'paragraph',
    text: `This report is for the sole use of ${client.soleUse}; however, ${client.soleUse} may provide only complete, final copies of the study in its entirety (but not excerpts) to third parties who have a legitimate need relating to the financing and/or ownership of the subject property. We are not responsible to third parties for the unauthorized use of this report, except to respond to ${client.contactLine} for routine and customary questions.`,
  });
  blocks.push({
    kind: 'paragraph',
    text: 'The reader should understand that the completed subject property does not yet exist as of the date of this report. The analysis is based on extraordinary assumptions that are as follows:',
  });
  blocks.push({
    kind: 'bullets',
    items: [
      'Construction will start within the year and be completed / open for business within an 18-month timeframe.',
      'Upon completion, it is assumed to be in excellent condition, a legal conforming use, and to receive the necessary permits to operate from local governing authorities.',
      'It is assumed that the subject is developed and furnished in the manner as outlined in this report.',
      buildCostAssumptionBullet(input),
    ],
  });
  blocks.push({
    kind: 'paragraph',
    text: `Our ${serviceNoun} does not address unforeseeable events that could alter the proposed project and / or the market conditions reflected in the analyses; we assume that no significant changes take place between the date of this report and the date of development.`,
  });
  blocks.push({
    kind: 'paragraph',
    text: 'This report, in its entirety, including all assumptions and limiting conditions, is an integral part of and inseparable from this letter. A copy of this report and the field data shall remain in our files for future reference.',
  });
  blocks.push({
    kind: 'paragraph',
    text: 'It has been a pleasure to provide you with consulting services for this property. If you have any questions regarding the analysis or would like further assistance, please contact us.',
  });

  const content: LetterOfTransmittalContent = { blocks, text: '' };
  content.text = letterOfTransmittalContentToPlainText(content);
  return content;
}

export function buildLetterOfTransmittalText(
  input: EnrichedInput | ReportDraftInput,
  options?: { model?: FeasibilityModelOutput; narrativeOverride?: string }
): string {
  return buildLetterOfTransmittalContent(input, options).text;
}

export function siteVisitConducted(input: ReportDraftInput): boolean {
  return input.site_visit_conducted === true;
}

export function buildCertificationContent(input: ReportDraftInput): {
  preamble: string;
  bullets: string[];
} {
  const visited = siteVisitConducted(input);
  const assistants =
    input.report_assistants?.trim() ||
    'Kristin Andersen Garwood and Elizabeth Reid';
  const priorServices =
    input.prior_services_disclosure?.trim() ||
    'The undersigned has performed no other services, as a consultant or in any other capacity, involving the subject property within the three-year period immediately preceding acceptance of this assignment.';

  return {
    preamble: 'I certify that, to the best of my knowledge and belief:',
    bullets: [
      'The statements of fact contained in this report are true and correct.',
      'The reported analyses, opinions, and conclusions are limited only by the reported assumptions and limiting conditions and are my personal, impartial, and unbiased professional analyses, opinions, and conclusions.',
      'I have no present or prospective interest in the property that is the subject of this report and no personal interest with respect to the parties involved.',
      'I have no bias with respect to the property that is the subject of this report or to the parties involved with this assignment.',
      'My engagement in this assignment was not contingent upon developing or reporting predetermined results.',
      'My compensation for completing this assignment is not contingent upon the development or reporting of a predetermined value or direction in value that favors the cause of the client, the amount of the value opinion, the attainment of a stipulated result, or the occurrence of a subsequent event directly related to the intended use of this study.',
      'This assignment was not based upon a requested minimum valuation, a specific valuation, or the approval of a loan.',
      `I ${visited ? 'have' : 'have not'} made a personal visit to the property that is the subject of this report.`,
      `${assistants} provided significant professional assistance to the person signing this report.`,
      'The reported analyses, opinions, and conclusions were developed, and this report has been prepared, in conformity with the Uniform Standards of Professional Appraisal Practice of the Appraisal Foundation and the Code of Professional Ethics and Standards of Professional Practice of the Appraisal Institute.',
      'The use of this report is subject to the requirements of the Appraisal Institute relating to review by its duly authorized representatives.',
      'As of the date of issuance of this study, Shari L. Heilala has completed the continuing education requirements for Designated Members of the Appraisal Institute.',
      priorServices,
    ],
  };
}

export function buildCoverIdentityHints(input: ReportDraftInput): {
  productTitle: string;
  studySubtitle: string;
  removeAddressInstruction: boolean;
} {
  return {
    productTitle: coverProductTitle(input),
    studySubtitle:
      studyTypeLabel(input).replace(/^Glamping\s+/i, '').replace(/^RV\s+/i, '') ||
      'Feasibility Study',
    removeAddressInstruction: Boolean(input.address_1?.trim()),
  };
}
