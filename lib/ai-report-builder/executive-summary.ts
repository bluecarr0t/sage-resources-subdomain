/**
 * Deterministic Executive Summary content aligned to Sage FS template bullets.
 * Known intake fields are filled without cyan; unknowns keep author-review highlight.
 */

import type { FeasibilityModelOutput } from '@/lib/feasibility-model';
import { formatLotIrrLabel } from './front-matter';
import { parseLabeledSections } from './area-analysis-sections';
import type { EnrichedInput, ReportDraftInput } from './types';

export type ExecSummaryLine = {
  text: string;
  /** Cyan author-review mark when the value is unknown / judgmental */
  authorHighlight: boolean;
  bullet?: boolean;
  /**
   * When set with authorHighlight, only this substring is cyan-highlighted
   * (template pattern: highlight "positive", not the whole demand sentence).
   */
  highlightPhrase?: string;
};

export interface ExecutiveSummaryContent {
  projectOverview: ExecSummaryLine[];
  demandIndicators: ExecSummaryLine[];
  proFormaIntro: ExecSummaryLine;
  feasibilityConclusion: ExecSummaryLine[];
}

function productPhrase(input: ReportDraftInput): string {
  const t = (input.market_type || input.resort_type || '').toLowerCase();
  if (t.includes('glamping')) return 'glamping resort';
  if (t.includes('rv')) return 'RV resort';
  return 'outdoor hospitality resort';
}

function siteNoun(input: ReportDraftInput): string {
  const t = (input.market_type || input.resort_type || '').toLowerCase();
  if (t.includes('glamping')) return 'glamping sites';
  if (t.includes('rv')) return 'RV sites';
  return 'sites';
}

function totalSites(input: ReportDraftInput): number {
  return input.unit_mix.reduce((s, u) => s + (u.count || 0), 0);
}

function amenitiesSentence(input: ReportDraftInput): { text: string; known: boolean } {
  const raw = input.amenities_description?.trim();
  if (!raw) {
    return {
      text: 'Planned amenities include [amenities to be confirmed with the client].',
      known: false,
    };
  }
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
  return {
    text: `Planned amenities include ${pick}.`,
    known: true,
  };
}

function conditionSentence(input: ReportDraftInput): { text: string; known: boolean } {
  const brief = (input.amenities_description || '').toLowerCase();
  if (/\b(vacant house|existing house|existing residence)\b/.test(brief)) {
    return { text: 'The property contains a vacant house.', known: true };
  }
  if (/\b(improved|existing building|existing structure)\b/.test(brief)) {
    return { text: 'The property contains existing improvements.', known: true };
  }
  if (/\b(undeveloped|vacant land|raw land|greenfield)\b/.test(brief)) {
    return { text: 'The property is currently undeveloped.', known: true };
  }
  // Default matches template wording but remains author-review until confirmed
  return { text: 'The property is currently undeveloped.', known: false };
}

function qualityAdjective(input: ReportDraftInput): { adj: string; known: boolean } {
  const brief = (input.amenities_description || '').toLowerCase();
  const resort = (input.resort_type || '').toLowerCase();
  if (/\b(luxury|high-end|high end|ultra|five.?star|premium|wellness)\b/.test(brief + ' ' + resort)) {
    if (/\b(ultra|five.?star)\b/.test(brief)) return { adj: 'ultra luxury', known: true };
    if (/\b(very high-end|high-end|high end|luxury|premium)\b/.test(brief + ' ' + resort)) {
      return { adj: 'very high-end', known: true };
    }
    if (/\bwellness\b/.test(brief + ' ' + resort)) return { adj: 'wellness-oriented', known: true };
  }
  return { adj: 'very high-end', known: false };
}

function demandTone(input: EnrichedInput): { tone: string; known: boolean } {
  const parks =
    (input.demand_drivers?.national_parks?.count ?? 0) +
    (input.demand_drivers?.major_outdoor_sites?.count ?? 0);
  const hasDrive = (input.drive_time_demographics?.rings?.length ?? 0) > 0;
  const hasWeather = Boolean(input.weather_data?.climate_text);
  if (parks >= 2 || (parks >= 1 && (hasDrive || hasWeather))) {
    return { tone: 'positive', known: true };
  }
  if (parks === 0 && !hasDrive && !hasWeather) {
    return { tone: 'positive', known: false };
  }
  return { tone: 'positive', known: false };
}

function unitMixDetail(input: ReportDraftInput): string | null {
  const parts = input.unit_mix
    .filter((u) => u.count > 0 && u.type)
    .map((u) => {
      const type = u.type.trim();
      const plural =
        u.count === 1 || /s$/i.test(type) ? type : `${type}s`;
      return `${u.count} ${plural}`;
    });
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/**
 * Prefer intake-accurate overview bullets; overlay LLM prose only when it
 * doesn't contradict known facts (LLM text is used for demand narrative polish).
 */
export function buildExecutiveSummaryContent(
  input: EnrichedInput | ReportDraftInput,
  options?: {
    model?: FeasibilityModelOutput;
    llmText?: string;
  }
): ExecutiveSummaryContent {
  const product = productPhrase(input);
  const quality = qualityAdjective(input);
  const sites = totalSites(input);
  const amenities = amenitiesSentence(input);
  const condition = conditionSentence(input);
  const demand = demandTone(input as EnrichedInput);
  const labeled = options?.llmText ? parseLabeledSections(options.llmText) : {};

  const projectOverview: ExecSummaryLine[] = [
    {
      text: `The property is intended for a ${quality.adj} ${product} development.`,
      authorHighlight: !quality.known,
      bullet: true,
    },
  ];

  if (input.acres != null && Number.isFinite(input.acres)) {
    projectOverview.push({
      text: `The overall subject site contains approximately ${input.acres} acres.`,
      authorHighlight: false,
      bullet: true,
    });
  } else {
    projectOverview.push({
      text: 'The overall subject site contains approximately [acres TBD] acres.',
      authorHighlight: true,
      bullet: true,
    });
  }

  if (sites > 0) {
    const mix = unitMixDetail(input);
    projectOverview.push({
      text: mix
        ? `There will be ${sites} ${siteNoun(input)} (${mix}).`
        : `There will be ${sites} ${siteNoun(input)}.`,
      authorHighlight: false,
      bullet: true,
    });
  } else {
    projectOverview.push({
      text: `There will be [site count TBD] ${siteNoun(input)}.`,
      authorHighlight: true,
      bullet: true,
    });
  }

  projectOverview.push({
    text: amenities.text,
    authorHighlight: !amenities.known,
    bullet: true,
  });
  projectOverview.push({
    text: condition.text,
    authorHighlight: !condition.known,
    bullet: true,
  });

  // Demand: keep template sentence shape; cyan the tone word when unconfirmed.
  // If LLM provided a fuller demand paragraph, use it but still flag tone if unknown.
  const llmDemand =
    labeled['demand indicators'] || labeled['overall demand indicators'] || '';
  const demandIndicators: ExecSummaryLine[] = [];
  if (llmDemand.trim() && llmDemand.trim().length > 80 && !/^positive\.?$/i.test(llmDemand.trim())) {
    demandIndicators.push({
      text: llmDemand.trim(),
      authorHighlight: !demand.known,
      bullet: false,
    });
  } else {
    demandIndicators.push({
      text: `Overall, the demand indicators for the subject are ${demand.tone} for the subject's proposed offering.`,
      authorHighlight: !demand.known,
      highlightPhrase: !demand.known ? demand.tone : undefined,
      bullet: false,
    });
  }

  const llmProForma = labeled['pro forma reference']?.trim();
  const proFormaIntro: ExecSummaryLine = {
    text:
      llmProForma && llmProForma.length > 10
        ? llmProForma
        : 'The ten-year income and expense projection is as follows:',
    authorHighlight: false,
    bullet: false,
  };

  const model = options?.model;
  const irrLabel = formatLotIrrLabel(model);
  const feasibilityConclusion: ExecSummaryLine[] = [];

  if (model && irrLabel) {
    const irr = model.irr.equityIrr10Year!;
    const feasible =
      irr >= 0.08
        ? 'feasible, with an adequate'
        : 'not feasible under current assumptions, without a stronger';
    feasibilityConclusion.push({
      text: `Based on the projected income and expenses compared to costs, the project is deemed ${feasible} internal rate of return on equity if the business is sold in Year 10.`,
      authorHighlight: irr < 0.08,
      bullet: false,
    });
    feasibilityConclusion.push({
      text: irrLabel,
      authorHighlight: false,
      bullet: false,
    });
  } else {
    const llmConclusion = labeled['feasibility conclusion']?.trim();
    if (
      llmConclusion &&
      !/^feasible\.?$/i.test(llmConclusion) &&
      !/pending/i.test(llmConclusion) &&
      llmConclusion.length > 40
    ) {
      feasibilityConclusion.push({
        text: llmConclusion,
        authorHighlight: true,
        bullet: false,
      });
    } else {
      feasibilityConclusion.push({
        text: 'Based on the projected income and expenses compared to costs, the project is deemed feasible, with an adequate internal rate of return on equity if the business is sold in Year 10.',
        authorHighlight: true,
        bullet: false,
      });
      feasibilityConclusion.push({
        text: '10 Year IRR on Equity = [Pending model]',
        authorHighlight: true,
        bullet: false,
      });
    }
  }

  return {
    projectOverview,
    demandIndicators,
    proFormaIntro,
    feasibilityConclusion,
  };
}

/** Plain labeled text for generators / tests. */
export function executiveSummaryContentToLabeledText(
  content: ExecutiveSummaryContent
): string {
  const overview = content.projectOverview.map((l) => l.text).join('\n');
  const demand = content.demandIndicators.map((l) => l.text).join('\n');
  const conclusion = content.feasibilityConclusion.map((l) => l.text).join('\n');
  return [
    `=== Project Overview ===\n${overview}`,
    `=== Demand Indicators ===\n${demand}`,
    `=== Pro Forma Reference ===\n${content.proFormaIntro.text}`,
    `=== Feasibility Conclusion ===\n${conclusion}`,
  ].join('\n\n');
}
