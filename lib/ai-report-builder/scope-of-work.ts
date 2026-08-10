/**
 * Deterministic Scope of Work narrative for feasibility DOCX assembly.
 * Parameterizes product type (RV / glamping) and lists only client-provided intake fields.
 */

import { siteVisitConducted } from './front-matter';
import type { EnrichedInput, ReportDraftInput } from './types';

function productLabel(input: ReportDraftInput): string {
  const t = (input.market_type || input.resort_type || '').toLowerCase();
  if (t.includes('glamping')) return 'glamping resort';
  if (t.includes('rv')) return 'RV resort';
  return 'outdoor hospitality resort';
}

function analysisComponentsPhrase(input: ReportDraftInput): string {
  const parts = ['land'];
  if (input.unit_mix?.some((u) => u.count > 0)) parts.push('units');
  parts.push('amenities');
  if (parts.length === 2) return parts.join(' and ');
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function hasText(v: string | null | undefined): boolean {
  return Boolean(v && String(v).trim());
}

/** Client-provided items actually present on the intake / engagement letter. */
export function buildClientProvidedItems(input: ReportDraftInput): string[] {
  const items: string[] = [];
  const address = [input.address_1, input.city, input.state, input.zip_code]
    .filter(Boolean)
    .join(', ');
  if (hasText(address)) items.push('Subject property address');
  if (hasText(input.parcel_number)) items.push('Parcel number');
  if (input.acres != null && Number.isFinite(input.acres)) items.push('Lot size');
  if (input.unit_mix?.some((u) => u.count > 0 && u.type)) {
    items.push('Planned unit mix / site counts');
  }
  if (hasText(input.amenities_description)) {
    items.push('Planned development concept and amenities');
  }
  if (hasText(input.intended_use_of_study) || hasText(input.service)) {
    items.push('Intended use of the study');
  }
  if (hasText(input.client_entity) || hasText(input.client_contact_name)) {
    items.push('Client / ownership contact information');
  }
  // Soft signals often embedded in the amenities brief
  const brief = (input.amenities_description || '').toLowerCase();
  if (/\b(water|septic|power|electric|utility|utilities|infrastructure)\b/.test(brief)) {
    items.push('Site infrastructure status (water, power, septic)');
  }
  if (/\b(site plan|layout|plat|survey)\b/.test(brief)) {
    items.push('Proposed site layout / plans');
  }
  if (/\b(budget|construction cost|hard cost)\b/.test(brief)) {
    items.push('Construction budget / cost information');
  }

  // Always keep at least a minimal honest set when address exists
  if (items.length === 0) {
    items.push(
      'Subject property identification (to be confirmed with the client)',
      'Planned development concept (to be confirmed with the client)'
    );
  }
  return items;
}

export function buildScopeOfWorkSteps(input: ReportDraftInput): string[] {
  const product = productLabel(input);
  const components = analysisComponentsPhrase(input);
  const steps: string[] = [];
  if (siteVisitConducted(input)) {
    steps.push('Visited the subject property and neighborhood;');
  }
  steps.push(
    'Reviewed the subject site and neighborhood based on discussions with the client, public record data, and internet research;',
    'Analyzed regional, city, market area, and site data, along with the proposed development concept;',
    `Analyzed all sources of data and used our best judgment in determining total ${components} as used in this analysis, characterizing the planned ${product} and related facilities;`,
    'Reviewed micro and macro market conditions, including tourism trends, employment and demographic drivers, and outdoor hospitality market trends;',
    "Considered existing and planned competitive and comparable properties in the subject's region, including interviews with management staff where available;",
    'Reviewed available data regarding zoning, utilities, and site infrastructure;',
    'Utilized market surveys, primary research, and other internet-based information for rental rates, occupancy, and other market indicators, as applicable;',
    "Reviewed the subject's proposed plans and concept, where available; and",
    'Analyzed supply and demand conditions relevant to the proposed development.'
  );
  return steps;
}

export interface ScopeOfWorkContent {
  intro: string;
  stepsIntro: string;
  steps: string[];
  clientIntro: string;
  clientItems: string[];
}

export function buildScopeOfWorkContent(
  input: EnrichedInput | ReportDraftInput
): ScopeOfWorkContent {
  return {
    intro:
      'The scope of this study relates to the extent and manner in which research is conducted, data is gathered, and analysis is applied. The determination of the appropriate scope of work was made based upon numerous factors involving the client, intended use, intended user, subject characteristics, and other assignment conditions.',
    stepsIntro:
      'For this study, the following steps were completed by Sage Outdoor Advisory:',
    steps: buildScopeOfWorkSteps(input),
    clientIntro: 'Client representatives provided us with the following information:',
    clientItems: buildClientProvidedItems(input),
  };
}
