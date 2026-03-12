/**
 * AI generation for report draft sections (OpenAI)
 * Generates content matching the professional language and formatting
 * of Sage Outdoor Advisory feasibility study templates.
 * Uses structured JSON output with citations for accuracy and traceability.
 */

import { OpenAI } from 'openai';
import { chatCompletion } from './llm-provider';
import { validateExecutiveSummary } from './guardrails';
import type { EnrichedInput, ExecutiveSummaryStructured, Citation } from './types';
import { retrieveSimilarSummaries } from './rag-retrieve';
import {
  normalizeTerminology,
  STYLE_GUIDE_PROMPT,
  getMarketTypeContext,
} from './terminology';

function buildLocationString(enriched: EnrichedInput): string {
  return [enriched.address_1, enriched.city, enriched.state, enriched.zip_code]
    .filter(Boolean)
    .join(', ');
}

function buildUnitMixString(enriched: EnrichedInput): string {
  if (enriched.unit_mix.length === 0) {
    return 'No unit mix specified. The client has not yet defined the proposed unit types or counts.';
  }
  return enriched.unit_mix
    .map((u) => `${u.type}: ${u.count} units`)
    .join('; ');
}

function buildBenchmarksString(enriched: EnrichedInput): string {
  if (!enriched.benchmarks?.length) return 'No benchmark data available';
  return JSON.stringify(
    enriched.benchmarks.map((b) => ({
      unit_type: b.unit_category,
      avg_low_adr: Math.round(b.avg_low_adr),
      avg_peak_adr: Math.round(b.avg_peak_adr),
      sample_count: b.sample_count,
    })),
    null,
    2
  );
}

function buildDetailedCompsString(enriched: EnrichedInput): string {
  if (!enriched.nearby_comps?.length) return '';

  const sections: string[] = [];

  const dbComps = enriched.nearby_comps.filter(
    (c) => !['past_reports', 'tavily_web_research'].includes(c.source_table),
  );
  const pastComps = enriched.nearby_comps.filter((c) => c.source_table === 'past_reports');
  const webComps = enriched.nearby_comps.filter((c) => c.source_table === 'tavily_web_research');

  if (dbComps.length > 0) {
    sections.push(
      'Market database comparables (Hipcamp, RoverPass, Campspot, Glamping DB):',
      ...dbComps.slice(0, 6).map((c) => {
        const parts = [`  - ${c.property_name} (${c.city}, ${c.state} – ${c.distance_miles} mi)`];
        if (c.avg_retail_daily_rate) parts.push(`ADR: $${Math.round(c.avg_retail_daily_rate)}`);
        if (c.property_total_sites) parts.push(`Sites: ${c.property_total_sites}`);
        if (c.unit_type) parts.push(`Type: ${c.unit_type}`);
        return parts.join(', ');
      }),
    );
  }

  if (pastComps.length > 0) {
    sections.push(
      '',
      'Comparables from past Sage reports (curated, verified data):',
      ...pastComps.slice(0, 5).map((c) => {
        const parts = [`  - ${c.property_name} (${c.state})`];
        if (c.avg_retail_daily_rate) parts.push(`ADR: $${Math.round(c.avg_retail_daily_rate)}`);
        if (c.high_rate) parts.push(`Peak: $${Math.round(c.high_rate)}`);
        if (c.low_rate) parts.push(`Low: $${Math.round(c.low_rate)}`);
        if (c.low_occupancy || c.peak_occupancy) {
          parts.push(`Occ: ${c.low_occupancy ?? '?'}%–${c.peak_occupancy ?? '?'}%`);
        }
        if (c.property_total_sites) parts.push(`Sites: ${c.property_total_sites}`);
        if (c.quality_score) parts.push(`Quality: ${c.quality_score}/10`);
        return parts.join(', ');
      }),
    );
  }

  if (webComps.length > 0) {
    sections.push(
      '',
      'Additional comparables from web research:',
      ...webComps.slice(0, 4).map((c) => {
        const parts = [`  - ${c.property_name}`];
        if (c.city && c.state) parts.push(`(${c.city}, ${c.state})`);
        if (c.avg_retail_daily_rate) parts.push(`ADR: ~$${Math.round(c.avg_retail_daily_rate)}`);
        if (c.description) parts.push(`– ${c.description.slice(0, 150)}`);
        return parts.join(' ');
      }),
    );
  }

  return sections.join('\n');
}

export async function generateExecutiveSummary(
  enriched: EnrichedInput
): Promise<{ executive_summary: string; citations: Citation[] }> {
  const provider = (process.env.LLM_PROVIDER ?? 'openai').toLowerCase();
  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
  }
  if (provider !== 'anthropic' && !process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY is required for report generation');
  }

  const location = buildLocationString(enriched);
  const unitMixStr = buildUnitMixString(enriched);
  const benchmarksStr = buildBenchmarksString(enriched);
  const marketContext = getMarketTypeContext(enriched.market_type);
  const totalSites = enriched.unit_mix.reduce((sum, u) => sum + u.count, 0);

  const ragContext = await retrieveSimilarSummaries(enriched);

  const prompt = `You are an expert feasibility study writer for Sage Outdoor Advisory, writing professional feasibility studies for outdoor hospitality properties.
${ragContext ? `\n${ragContext}\n\nUse the above as style examples only. Do not copy content. Match the tone and structure.\n` : ''}

${marketContext}

${STYLE_GUIDE_PROMPT}

Write an Executive Summary section for this feasibility study. Return a JSON object with these exact keys:
- project_overview: Project Overview section. Start with "The property is intended for a [luxury/very high-end] [RV resort/glamping resort] development." State acreage, unit count/types, planned amenities, current property condition.
- demand_indicators: One paragraph for Overall Demand Indicators (e.g. "Overall, the demand indicators for the subject are positive...").
- pro_forma_reference: Brief reference: "The ten-year income and expense projection is as follows:" (tables inserted separately).
- feasibility_conclusion: Standard conclusion: "Based on the projected income and expenses compared to costs, the project is deemed feasible, with an adequate internal rate of return on equity if the business is sold in Year 10."
- citations: Array of { claim: string, source: string }. For EVERY numeric claim (ADR, occupancy, population, etc.), add an entry. source must be one of: feasibility_comp_units, county-population, county-gdp, past_reports, web_research. Every statistic must have a citation. Do not invent numbers.

Property: ${enriched.property_name}
Location: ${location}
Acres: ${enriched.acres ?? 'Not specified'}
Unit Mix: ${unitMixStr}
Total Sites/Units: ${totalSites || 'Not specified'}
Client: ${enriched.client_entity ?? 'Not specified'}

Regional benchmarks from past studies (ADR in dollars):
${benchmarksStr}
${enriched.population_2020 != null ? `\nState population (Census): 2010 ${enriched.population_2010?.toLocaleString() ?? 'N/A'}, 2020 ${enriched.population_2020.toLocaleString()}, change ${enriched.population_change_pct?.toFixed(1) ?? 'N/A'}%` : ''}
${enriched.gdp_2023 != null ? `\nState GDP (BEA): 2022 $${(enriched.gdp_2022 ?? 0).toLocaleString()}M, 2023 $${enriched.gdp_2023.toLocaleString()}M` : ''}
${enriched.census_population != null || enriched.census_median_household_income != null
  ? `\nCensus API (ACS 5-Year): ${enriched.census_population != null ? `State population ${enriched.census_population.toLocaleString()}` : ''}${enriched.census_median_household_income != null ? `${enriched.census_population != null ? ', ' : ''}median household income $${enriched.census_median_household_income.toLocaleString()}` : ''}`
  : ''}

${buildDetailedCompsString(enriched)}
${enriched.web_context ? `\n\nSupplementary web research (use only to support; do not contradict benchmarks):\n${enriched.web_context.slice(0, 4000)}\n` : ''}

Return ONLY valid JSON. No markdown code blocks.`;

  const content = await chatCompletion(
    'You write professional feasibility study executive summaries for Sage Outdoor Advisory. Match the exact tone, structure, and terminology of their existing reports. Be concise, data-driven, and avoid fabrication. Use the exact numbers provided when available. Every statistic must have a citation in the citations array. Do not invent numbers.',
    prompt,
    { temperature: 0.3, maxTokens: 1200, responseFormat: 'json_object' }
  ).then((s) => s.trim());
  if (!content) {
    throw new Error('OpenAI returned empty executive summary');
  }

  let parsed: ExecutiveSummaryStructured;
  try {
    parsed = JSON.parse(content) as ExecutiveSummaryStructured;
  } catch {
    throw new Error('LLM returned invalid JSON for executive summary');
  }

  if (process.env.ENABLE_GUARDRAILS === 'true') {
    const guardResult = validateExecutiveSummary(parsed);
    if (!guardResult.passed) {
      throw new Error(`Guardrails validation failed: ${guardResult.errors.join('; ')}`);
    }
  }

  const citations: Citation[] = Array.isArray(parsed.citations)
    ? parsed.citations.filter(
        (c): c is Citation =>
          c && typeof c === 'object' && typeof c.claim === 'string' && typeof c.source === 'string'
      )
    : [];

  const sections = [
    parsed.project_overview,
    parsed.demand_indicators,
    parsed.pro_forma_reference,
    parsed.feasibility_conclusion,
  ].filter(Boolean);

  const executive_summary = sections
    .map((s) => (typeof s === 'string' ? s : '').trim())
    .filter(Boolean)
    .join('\n\n');

  if (!executive_summary) {
    throw new Error('OpenAI returned empty executive summary sections');
  }

  return {
    executive_summary: normalizeTerminology(executive_summary),
    citations,
  };
}

export async function generateLetterOfTransmittal(
  enriched: EnrichedInput
): Promise<string> {
  const location = buildLocationString(enriched);
  const marketContext = getMarketTypeContext(enriched.market_type);
  const totalSites = enriched.unit_mix.reduce((sum, u) => sum + u.count, 0);
  const marketLabel = (enriched.market_type || '').toLowerCase().includes('glamping')
    ? 'glamping resort'
    : 'RV resort';

  const systemMsg =
    'You write professional feasibility study letters of transmittal for Sage Outdoor Advisory. Match their exact formal tone and legal language.';

  const userMsg = `Write a Letter of Transmittal for a Sage Outdoor Advisory feasibility study.

${marketContext}
${STYLE_GUIDE_PROMPT}

Follow this EXACT template structure:

"At your request, we have analyzed the market and the proposed ${marketLabel} located at ${location}. The overall subject site contains approximately ${enriched.acres ?? '[X]'} acres. After discussions with ownership and a review of local demand trends, competing properties, development costs, and current investment parameters, we have concluded that a ${marketLabel} with ${totalSites || '[X]'} sites is feasible at this time. Additionally, we have assumed that [amenities] will also be constructed. It is noted that the property is currently [condition].

The scope of this hypothetical development appears appropriate for the market, and it is concluded to be feasible with adequate investment returns."

Then include the standard USPAP conformance paragraph and extraordinary assumptions.

Property: ${enriched.property_name}
Client: ${enriched.client_entity ?? 'Not specified'}
Unit Mix: ${enriched.unit_mix.map(u => u.type + ': ' + u.count).join('; ') || 'Not specified'}

Write only the body paragraphs (not the header/address block or signature). Use formal, professional consulting language.`;

  const content = await chatCompletion(systemMsg, userMsg, {
    temperature: 0.2,
    maxTokens: 1000,
  });
  if (!content) throw new Error('LLM returned empty letter of transmittal');
  return normalizeTerminology(content);
}

export async function generateSWOTAnalysis(
  enriched: EnrichedInput
): Promise<string> {
  const location = buildLocationString(enriched);
  const marketContext = getMarketTypeContext(enriched.market_type);
  const benchmarksStr = buildBenchmarksString(enriched);

  const systemMsg =
    'You write professional SWOT analyses for Sage Outdoor Advisory feasibility studies. Match their exact template structure and professional tone.';

  const userMsg = `Write a SWOT Analysis section for a Sage Outdoor Advisory feasibility study.

${marketContext}
${STYLE_GUIDE_PROMPT}

Follow this EXACT structure:

**Strengths**
- Location: (3-5 bullet points about location advantages)
- [High Quality Sites/Amenities]: (2-3 bullet points about site quality)
- Growth Area: (2-3 bullet points about population/tourism growth)

**Weaknesses, Threats, and Risk Factors**
- New unknown business consideration
- Development cost variability
- Any location-specific risks

Property: ${enriched.property_name}
Location: ${location}
Acres: ${enriched.acres ?? 'Not specified'}
Unit Mix: ${enriched.unit_mix.map(u => u.type + ': ' + u.count).join('; ') || 'Not specified'}

Benchmarks:
${benchmarksStr}

${buildDetailedCompsString(enriched)}

Write in professional consulting language. Each strength/weakness should be 1-2 sentences. Use the template phrasing patterns like "positive demand indicator", "This is well above average", "robust future demand".`;

  const content = await chatCompletion(systemMsg, userMsg, {
    temperature: 0.3,
    maxTokens: 1200,
  });
  if (!content) throw new Error('LLM returned empty SWOT analysis');
  return normalizeTerminology(content);
}
