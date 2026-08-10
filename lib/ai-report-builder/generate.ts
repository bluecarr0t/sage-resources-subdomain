/**
 * AI generation for report draft sections (OpenAI)
 * Generates content matching the professional language and formatting
 * of Sage Outdoor Advisory feasibility study templates.
 * Uses structured JSON output with citations for accuracy and traceability.
 */

import { assertReportLlmConfigured, chatCompletion } from './llm-provider';
import { validateExecutiveSummary } from './guardrails';
import type { EnrichedInput, ExecutiveSummaryStructured, Citation } from './types';
import { retrieveStyleExemplars } from './rag-retrieve';
import {
  normalizeTerminology,
  STYLE_GUIDE_PROMPT,
  getMarketTypeContext,
} from './terminology';
import {
  buildSageJsonSystemPrompt,
  SAGE_STYLE_SYSTEM_PROMPT,
} from './sage-style-system-prompt';
import { formatSiteRiskForPrompt } from './site-risk';
import { formatDriveTimeForPrompt } from './drive-time-demographics';
import { formatStvrForPrompt } from './stvr-indicators';
import { formatTourismForPrompt } from './tourism-economics';
import { formatNearestAirportForPrompt } from './nearest-airport';
import { formatCompRadiusPivotsForPrompt } from './comp-radius-pivots';
import { formatParksVisitationForPrompt } from './figures';

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
        const dist =
          c.distance_miles != null && Number.isFinite(c.distance_miles)
            ? ` - ${c.distance_miles} mi`
            : '';
        const parts = [`  - ${c.property_name} (${c.city}, ${c.state}${dist})`];
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
          parts.push(`Occ: ${c.low_occupancy ?? '?'}%-${c.peak_occupancy ?? '?'}%`);
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
        if (c.avg_retail_daily_rate) parts.push(`ADR: $${Math.round(c.avg_retail_daily_rate)}`);
        if (c.description) parts.push(`- ${c.description.slice(0, 150)}`);
        return parts.join(' ');
      }),
    );
  }

  return sections.join('\n');
}

export async function generateExecutiveSummary(
  enriched: EnrichedInput,
  modelMetricsText?: string | null,
): Promise<{ executive_summary: string; citations: Citation[] }> {
  assertReportLlmConfigured();

  const location = buildLocationString(enriched);
  const unitMixStr = buildUnitMixString(enriched);
  const benchmarksStr = buildBenchmarksString(enriched);
  const marketContext = getMarketTypeContext(enriched.market_type);
  const totalSites = enriched.unit_mix.reduce((sum, u) => sum + u.count, 0);

  const styleExemplars = await retrieveStyleExemplars(enriched, 'executive_summary');

  const prompt = `SECTION: executive_summary
MARKET: ${enriched.market_type ?? 'outdoor_hospitality'}
${styleExemplars ? `\n${styleExemplars}\n\nUse STYLE_EXAMPLES for tone/structure only. Do not copy content or {{TOKENS}}.\n` : ''}

${marketContext}

${STYLE_GUIDE_PROMPT}

Write an Executive Summary section for this feasibility study. Return a JSON object with these exact keys:
- project_overview: Project Overview section. Start with "The property is intended for a [luxury/very high-end] [RV resort/glamping resort] development." State acreage, unit count/types, planned amenities, current property condition. Use only provided acreage/unit counts.
- demand_indicators: 1–3 short paragraphs. Open with overall demand tone (e.g. "Overall, the demand indicators for the subject are positive..."). Cover weather/operating season when WeatherSpark data is provided, and attractions/regional draw using park visitation and drive-time figures when provided. Do not invent visitor counts or temperatures.
- pro_forma_reference: Brief reference only: "The ten-year income and expense projection is as follows:" (tables are inserted by the assembler).
- feasibility_conclusion: If model metrics are provided below, summarize feasibility using those exact IRR / DCR / CoC figures. If no model metrics are provided, write exactly: "Feasibility conclusion pending financial model confirmation by the analyst." Do NOT invent an IRR or claim the project is feasible without model support.
- citations: Array of { claim: string, source: string }. For EVERY numeric claim (ADR, occupancy, population, visitors, etc.), add an entry. source must be one of: feasibility_comp_units, county-population, county-gdp, past_reports, web_research, national-parks, weatherspark. Every statistic must have a citation. Do not invent numbers.

Property: ${enriched.property_name}
Location: ${location}
Acres: ${enriched.acres ?? 'Not specified'}
Unit Mix: ${unitMixStr}
Total Sites/Units: ${totalSites || 'Not specified'}
Client: ${enriched.client_entity ?? 'Not specified'}
${enriched.amenities_description?.trim() ? `\nAuthor-provided property & client brief (use this to shape project overview, planned amenities, and property condition):\n${enriched.amenities_description.trim()}\n` : ''}

Regional benchmarks from past studies (ADR in dollars):
${benchmarksStr}
${enriched.population_2020 != null ? `\nState population (Census): 2010 ${enriched.population_2010?.toLocaleString() ?? 'N/A'}, 2020 ${enriched.population_2020.toLocaleString()}, change ${enriched.population_change_pct?.toFixed(1) ?? 'N/A'}%` : ''}
${enriched.gdp_2023 != null ? `\nState GDP (BEA): 2022 $${(enriched.gdp_2022 ?? 0).toLocaleString()}M, 2023 $${enriched.gdp_2023.toLocaleString()}M` : ''}
${enriched.census_population != null || enriched.census_median_household_income != null
  ? `\nCensus API (ACS 5-Year): ${enriched.census_population != null ? `State population ${enriched.census_population.toLocaleString()}` : ''}${enriched.census_median_household_income != null ? `${enriched.census_population != null ? ', ' : ''}median household income $${enriched.census_median_household_income.toLocaleString()}` : ''}`
  : ''}

${buildDetailedCompsString(enriched)}
${formatParksVisitationForPrompt(enriched.demand_drivers)}
${enriched.weather_data?.climate_text ? `\nWeatherSpark climate (for operating-season sentence; SOURCE: WEATHERSPARK.COM):\n${enriched.weather_data.climate_text.slice(0, 1800)}\n` : ''}
${formatDriveTimeForPrompt(enriched.drive_time_demographics)}
${formatNearestAirportForPrompt(enriched.nearest_airport)}
${enriched.web_context ? `\n\nSupplementary web research (use only to support; do not contradict benchmarks):\n${enriched.web_context.slice(0, 4000)}\n` : ''}
${modelMetricsText?.trim() ? `\n\nCOMPUTED FINANCIAL MODEL METRICS (use these exact figures in feasibility_conclusion; do not invent IRR):\n${modelMetricsText.trim()}\n` : '\n\nNo computed financial model metrics are available. feasibility_conclusion must say feasibility is pending analyst confirmation of the financial model.\n'}

FACTS end here. Use only FACTS for every number.
Return ONLY valid JSON. No markdown code blocks.`;

  const content = await chatCompletion(
    buildSageJsonSystemPrompt(
      'Every statistic must have a citation in the citations array. Be concise and data-driven.'
    ),
    prompt,
    { temperature: 0.3, maxTokens: 1800, responseFormat: 'json_object' }
  ).then((s) => s.trim());
  if (!content) {
    throw new Error('LLM returned empty executive summary');
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
    parsed.project_overview
      ? `=== Project Overview ===\n${typeof parsed.project_overview === 'string' ? parsed.project_overview.trim() : ''}`
      : '',
    parsed.demand_indicators
      ? `=== Demand Indicators ===\n${typeof parsed.demand_indicators === 'string' ? parsed.demand_indicators.trim() : ''}`
      : '',
    parsed.pro_forma_reference
      ? `=== Pro Forma Reference ===\n${typeof parsed.pro_forma_reference === 'string' ? parsed.pro_forma_reference.trim() : ''}`
      : '',
    parsed.feasibility_conclusion
      ? `=== Feasibility Conclusion ===\n${typeof parsed.feasibility_conclusion === 'string' ? parsed.feasibility_conclusion.trim() : ''}`
      : '',
  ].filter(Boolean);

  const executive_summary = sections.join('\n\n');

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

  const styleExemplars = await retrieveStyleExemplars(enriched, 'letter_of_transmittal');

  const systemMsg = SAGE_STYLE_SYSTEM_PROMPT;

  const userMsg = `SECTION: letter_of_transmittal
MARKET: ${enriched.market_type ?? 'outdoor_hospitality'}
${styleExemplars ? `\n${styleExemplars}\n` : ''}

Write a Letter of Transmittal for a Sage Outdoor Advisory feasibility study.

${marketContext}
${STYLE_GUIDE_PROMPT}

Follow this EXACT template structure:

"At your request, we have analyzed the market and the proposed ${marketLabel} located at ${location}. The overall subject site contains approximately ${enriched.acres ?? '[X]'} acres. After discussions with ownership and a review of local demand trends, competing properties, development costs, and current investment parameters, we have concluded that a ${marketLabel} with ${totalSites || '[X]'} sites is feasible at this time. Additionally, we have assumed that [amenities] will also be constructed. It is noted that the property is currently [condition].

The scope of this hypothetical development appears appropriate for the market, and it is concluded to be feasible with adequate investment returns."

Then include the standard USPAP conformance paragraph and extraordinary assumptions.

Property: ${enriched.property_name}
Client: ${enriched.client_entity ?? 'Not specified'}
Unit Mix: ${enriched.unit_mix.map(u => u.type + ': ' + u.count).join('; ') || 'Not specified'}
${enriched.amenities_description?.trim() ? `\nAuthor-provided brief (use to fill [amenities] and [condition] in the template):\n${enriched.amenities_description.trim()}\n` : ''}

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

  const styleExemplars = await retrieveStyleExemplars(enriched, 'swot');

  const systemMsg = SAGE_STYLE_SYSTEM_PROMPT;

  const userMsg = `SECTION: swot
MARKET: ${enriched.market_type ?? 'outdoor_hospitality'}
${styleExemplars ? `\n${styleExemplars}\n` : ''}

Write a SWOT Analysis section for a Sage Outdoor Advisory feasibility study.

${marketContext}
${STYLE_GUIDE_PROMPT}

Follow this EXACT structure (plain labels only — do not use markdown bold ** markers):

Strengths:
- Location: (3-5 bullet points about location advantages)
- High Quality Sites/Amenities: (2-3 bullet points about site quality)
- Growth Area: (2-3 bullet points about population/tourism growth)

Weaknesses, Threats, and Risk Factors:
- New unknown business consideration
- Development cost variability
- Any location-specific risks

Property: ${enriched.property_name}
Location: ${location}
Acres: ${enriched.acres ?? 'Not specified'}
Unit Mix: ${enriched.unit_mix.map(u => u.type + ': ' + u.count).join('; ') || 'Not specified'}
${enriched.amenities_description?.trim() ? `\nAuthor-provided property & client brief:\n${enriched.amenities_description.trim()}\n` : ''}

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

export async function generateSiteAnalysis(
  enriched: EnrichedInput
): Promise<string> {
  const location = buildLocationString(enriched);
  const marketContext = getMarketTypeContext(enriched.market_type);
  const siteRiskBlock = formatSiteRiskForPrompt(enriched.site_risk);

  const styleExemplars = await retrieveStyleExemplars(enriched, 'site_analysis');

  const systemMsg = SAGE_STYLE_SYSTEM_PROMPT;

  const userMsg = `SECTION: site_analysis
MARKET: ${enriched.market_type ?? 'outdoor_hospitality'}
${styleExemplars ? `\n${styleExemplars}\n` : ''}

Write a Site Analysis section for a feasibility study.

${marketContext}
${STYLE_GUIDE_PROMPT}

Use this EXACT label structure with one concise sentence per label:
- Shape:
- Frontage:
- Surrounding Uses:
- Apparent Easements, Encroachments, or Restrictions:
- Topography and Drainage:
- Soil and Subsoil Condition:
- Street Improvements and Access:
- Utilities:
- Relationship to its Surroundings:
- Zoning:
- Flood Zone:
- Wetlands:
- Wildfire:

Rules:
- Only use known facts from inputs.
- If data is not available, say "Not yet verified; analyst to confirm."
- Do not invent parcel-specific legal details.
- When site risk data is provided below, use it for Flood Zone / Wetlands / Wildfire labels.
- Avoid markdown bullets, numbering, or headings; return plain text lines only.

Property: ${enriched.property_name}
Location: ${location}
Parcel Number: ${enriched.parcel_number ?? 'Not provided'}
Acreage: ${enriched.acres ?? 'Not provided'}
Amenities / Development Notes: ${enriched.amenities_description ?? 'Not provided'}

${siteRiskBlock}

Supplementary context (may include zoning/area clues):
${(enriched.web_context || '').slice(0, 3500)}
`;

  const content = await chatCompletion(systemMsg, userMsg, {
    temperature: 0.2,
    maxTokens: 900,
  });
  if (!content) throw new Error('LLM returned empty site analysis');
  return normalizeTerminology(content.trim());
}

/**
 * Generate an expanded Demand Indicators section using WeatherSpark climate
 * data (when available) plus enriched market/demographic inputs.
 * Produces multiple paragraphs covering temperature, precipitation,
 * tourism score, comfort index, and overall demand assessment.
 */
export async function generateDemandIndicators(
  enriched: EnrichedInput
): Promise<string> {
  const location = buildLocationString(enriched);
  const marketContext = getMarketTypeContext(enriched.market_type);
  const weatherData = enriched.weather_data;
  const weatherCity = weatherData?.city || enriched.city;
  const weatherState = weatherData?.state || enriched.state;
  const marketLabel = `${weatherCity}/${enriched.city} Market`;

  const styleExemplars = await retrieveStyleExemplars(enriched, 'demand_indicators');

  const systemMsg = SAGE_STYLE_SYSTEM_PROMPT;

  const weatherBlock = weatherData?.climate_text
    ? `\nWeatherSpark climate data for ${weatherData.city}, ${weatherData.state} (SOURCE: WEATHERSPARK.COM - ${weatherData.url}):\n${weatherData.climate_text.slice(0, 4500)}\n`
    : '';

  const dd = enriched.demand_drivers;
  const demandDriversBlock = dd
    ? `\nDemand drivers:\n  National parks (${dd.national_parks.radius_miles} mi): ${dd.national_parks.count} — ${dd.national_parks.top_names.join('; ') || 'none'}\n  Outdoor sites (${dd.major_outdoor_sites.radius_miles} mi): ${dd.major_outdoor_sites.count} — ${dd.major_outdoor_sites.top_names.join('; ') || 'none'}\n  Ski (${dd.ski_resorts.radius_miles} mi): ${dd.ski_resorts.count}\n  Wineries (${dd.wineries.radius_miles} mi): ${dd.wineries.count}\n  Major cities (${dd.major_cities.radius_miles} mi): ${dd.major_cities.count} — ${dd.major_cities.top_names.join('; ') || 'none'}\n`
    : '';

  const countyBlock = enriched.county_metrics
    ? `\nCounty metrics (${enriched.county_metrics.county_name}): pop 2020 ${enriched.county_metrics.population_2020?.toLocaleString() ?? 'n/a'}, change ${enriched.county_metrics.population_change_pct?.toFixed(1) ?? 'n/a'}%, GDP 2023 ${enriched.county_metrics.gdp_2023 != null ? enriched.county_metrics.gdp_2023.toLocaleString() : 'n/a'} (thousands $)\n`
    : '';

  const productLabel =
    (enriched.market_type || '').toLowerCase().includes('glamping')
      ? 'upscale glamping resort'
      : 'upscale RV resort';

  const userMsg = `SECTION: demand_indicators
MARKET: ${enriched.market_type ?? 'outdoor_hospitality'}
${styleExemplars ? `\n${styleExemplars}\n` : ''}

Write a Demand Indicators section for a Sage Outdoor Advisory feasibility study.

${marketContext}
${STYLE_GUIDE_PROMPT}

Use EXACTLY these delimiters (one section per template Heading2). Charts are inserted by the assembler — do not describe missing images.

=== Weather ===
Opening paragraph: This section describes how the weather in the area will affect the guest experience, operations, and seasonality. Cite weatherspark.com for ${weatherCity}, ${weatherState} (the closest tracked location).

Then a "Summary" line followed by bullets using "•" for main items and "o" for sub-bullets, matching completed Sage studies:
• Hot Months: duration, date range, threshold high temp, hottest month high/low for the ${marketLabel}. Then o-bullets on outdoor demand, AC, indoor recreation.
• Cool Months: duration, date range, threshold, coldest month. Then o-bullet on heating.
• Freezing Months (average low temperature below 32 degrees): date span. Then o-bullets on insulated utilities and canvas/glamping take-down if relevant.
• Precipitation: wetter season duration/dates, wet-day chance, wettest month day count. Then o-bullet on awnings/rain protection.
• Snow Fall: snowy period if applicable (omit if climate data shows none). Then o-bullets on snow removal and structural snow load.
• Tourism Score: definition (clear, rainless days ~65–80°F perceived), best visit window, peak week if available.

Then a "Conclusion" paragraph on seasonality, peak transient demand, winter/low season, and whether the weather profile is desirable for an ${productLabel}. Use only WeatherSpark figures provided.

=== Tourism Trends ===
1–2 paragraphs on regional tourism, parks/outdoor anchors, and seasonality using demand-driver and tourism economics data when provided.

=== What's in my Community - ESRI Analysis ===
1 short paragraph noting STDB/ESRI demographic rings will be confirmed from the analyst STDB upload; summarize drive-time demographics if provided without inventing ring figures.

=== Transportation ===
1–2 paragraphs on highway access and nearest commercial airport (use provided airport data only).

=== Demographic Market Profile ===
1 paragraph on county/drive-time population and income signals when provided; otherwise note pending STDB import.

=== Demand Analysis Conclusion ===
Open with overall demand tone (positive / mixed / constrained) based on provided data only. 2–4 sentences tying weather seasonality, tourism anchors, demographics, and access to subject demand support.

Rules:
- Use only the data provided. Do not fabricate statistics.
- Attribute climate statistics to WeatherSpark.com.
- Keep Weather bullets factual and operational like completed Sage reports.

Property: ${enriched.property_name}
Location: ${location}
County: ${enriched.county ?? enriched.county_metrics?.county_name ?? 'n/a'}
${enriched.population_2020 != null ? `Population (Census/county): 2010 ${enriched.population_2010?.toLocaleString() ?? 'N/A'}, 2020 ${enriched.population_2020.toLocaleString()}, change ${enriched.population_change_pct?.toFixed(1) ?? 'N/A'}%` : ''}
${enriched.gdp_2023 != null ? `GDP (BEA): 2022 $${(enriched.gdp_2022 ?? 0).toLocaleString()}M, 2023 $${enriched.gdp_2023.toLocaleString()}M` : ''}
${countyBlock}
${demandDriversBlock}
${formatDriveTimeForPrompt(enriched.drive_time_demographics)}
${formatTourismForPrompt(enriched.tourism_economics)}
${formatStvrForPrompt(enriched.stvr_indicators)}
${formatNearestAirportForPrompt(enriched.nearest_airport)}
${formatCompRadiusPivotsForPrompt(enriched.comp_radius_pivots)}
${formatParksVisitationForPrompt(enriched.demand_drivers)}
${weatherBlock}
${enriched.web_context ? `\nSupplementary web research:\n${enriched.web_context.slice(0, 2000)}\n` : ''}
`;

  const content = await chatCompletion(systemMsg, userMsg, {
    temperature: 0.3,
    maxTokens: 2800,
  });
  if (!content) throw new Error('LLM returned empty demand indicators');
  return normalizeTerminology(content.trim());
}
