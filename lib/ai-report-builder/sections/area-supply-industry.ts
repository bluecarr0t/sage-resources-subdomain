/**
 * Area Analysis, Supply & Competition, and Industry Overview section generators.
 */

import { chatCompletion } from '../llm-provider';
import type { EnrichedInput } from '../types';
import {
  getMarketTypeContext,
  normalizeTerminology,
  STYLE_GUIDE_PROMPT,
} from '../terminology';
import { formatDriveTimeForPrompt } from '../drive-time-demographics';
import { formatCompRadiusPivotsForPrompt } from '../comp-radius-pivots';
import { formatTourismForPrompt } from '../tourism-economics';
import { formatStvrForPrompt } from '../stvr-indicators';
import { formatNearestAirportForPrompt } from '../nearest-airport';
import { formatAreaAnalysisSections } from '../area-analysis-sections';
import { retrieveStyleExemplars } from '../rag-retrieve';
import { SAGE_STYLE_SYSTEM_PROMPT } from '../sage-style-system-prompt';

function buildLocationString(enriched: EnrichedInput): string {
  return [enriched.address_1, enriched.city, enriched.state, enriched.zip_code]
    .filter(Boolean)
    .join(', ');
}

function buildCompsBrief(enriched: EnrichedInput): string {
  if (!enriched.nearby_comps?.length) return 'No comparables loaded.';
  return enriched.nearby_comps
    .slice(0, 10)
    .map((c) => {
      const dist =
        c.distance_miles != null && Number.isFinite(c.distance_miles)
          ? `${c.distance_miles} mi`
          : 'n/a';
      const adr =
        c.avg_retail_daily_rate != null
          ? `ADR $${Math.round(c.avg_retail_daily_rate)}`
          : '';
      return `- ${c.property_name} (${c.city}, ${c.state}, ${dist}) ${adr}`.trim();
    })
    .join('\n');
}

function industryBoilerplate(marketType?: string | null): string {
  const t = (marketType || '').toLowerCase();
  if (t === 'glamping') {
    return `The glamping segment of outdoor hospitality continues to expand as travelers seek experiential, nature-forward lodging with elevated amenities. Industry demand is supported by growth in short-term vacation rental interest, social-media discovery of unique stays, and a sustained preference for private accommodations relative to traditional hotels. Supply remains fragmented across independent operators, with quality and amenity differentiation driving rate premiums. Capital formation for new glamping resorts remains selective, favoring sites with strong drive-time demographics, scenic setting, and clear entitlement paths. Operating models typically emphasize higher ADR with more modest unit counts versus traditional campgrounds, and seasonality varies by climate and proximity to destination attractions.`;
  }
  if (t === 'rv' || t === 'rv_glamping') {
    return `The RV resort and campground industry remains a core segment of outdoor hospitality, supported by RV ownership trends, domestic travel, and demand for full-hookup sites with resort-style amenities. Industry participants range from destination luxury RV resorts to transient overnight parks; competitive differentiation centers on site quality, spacing, 50 amp service, amenities, and location relative to attractions and major corridors. New supply is constrained by zoning, infrastructure costs, and suitable land availability in high-demand drive-time rings. Rate and occupancy performance correlates with seasonality, regional tourism, and the quality of the competitive set. Institutional and private capital continue to evaluate RV resort opportunities where demographics, access, and product positioning support stabilized cash flow.`;
  }
  return `Outdoor hospitality — encompassing RV resorts, campgrounds, and glamping — continues to attract travelers seeking outdoor experiences with varying levels of amenity and privacy. Industry fundamentals are shaped by domestic leisure travel, drive-time demographics, and the quality of local supply. New development feasibility depends on site attributes, entitlement risk, construction costs, and competitive positioning within the local market.`;
}

/**
 * Area Analysis matching completed Sage studies:
 * Overview → State → County → Local (maps inserted by DOCX assembler).
 */
export async function generateAreaAnalysis(enriched: EnrichedInput): Promise<string> {
  const location = buildLocationString(enriched);
  const marketContext = getMarketTypeContext(enriched.market_type);
  const county = enriched.county_metrics;
  const countyName = enriched.county ?? county?.county_name ?? 'the subject county';
  const productLabel =
    (enriched.market_type || '').toLowerCase().includes('glamping')
      ? 'glamping resort'
      : (enriched.market_type || '').toLowerCase().includes('rv')
        ? 'RV resort'
        : 'outdoor hospitality resort';

  const countyBlock = county
    ? `County metrics (${county.county_name}): pop 2020 ${county.population_2020?.toLocaleString() ?? 'n/a'}, change ${county.population_change_pct?.toFixed(1) ?? 'n/a'}%, GDP 2023 ${county.gdp_2023 != null ? county.gdp_2023.toLocaleString() : 'n/a'} (source: ${county.source})`
    : '';

  const styleExemplars = await retrieveStyleExemplars(enriched, 'area_analysis');

  const systemMsg = SAGE_STYLE_SYSTEM_PROMPT;

  const userMsg = `SECTION: area_analysis
MARKET: ${enriched.market_type ?? 'outdoor_hospitality'}
${styleExemplars ? `\n${styleExemplars}\n` : ''}

Write an Area Analysis for this feasibility study in FOUR labeled subsections.

${marketContext}
${STYLE_GUIDE_PROMPT}

Use EXACTLY these delimiters (no other markdown headings):

=== Overview ===
One short paragraph: This section provides a comprehensive assessment of the subject property's area and its impact on the subject property resort. Name the county and city/community (e.g. "located within ${countyName}, in ${enriched.city}, ${enriched.state}.").

=== State ===
2–3 paragraphs on the state:
1) Character, nickname if well-known, major parks/attractions outdoor draws, culture, and economy — use population/GDP figures ONLY if provided below.
2) Transportation: major interstates/highways, transit limitations in rural areas, rail if relevant, and commercial airports (use nearest-airport data when provided; do not invent passenger totals).

=== County ===
2–3 paragraphs on ${countyName}:
1) Geography, towns, recreation, and economic base.
2) Transportation corridors and trail/road access when known from context.
3) Population / growth using ONLY provided census figures; if missing, say verification is pending without inventing numbers.

=== Local ===
2–3 paragraphs on ${enriched.city}, ${enriched.state}:
1) Community character, setting, nearby towns/distances if in web context, local economy and recreation.
2) Road access and airport drive-time when data is provided.
3) Population for city/CDP/zip ONLY if present in context; otherwise omit numeric claims.
Close with one sentence: the subject property's location is well suited (or note caveats) for its proposed ${productLabel}.

Rules:
- Do not invent statistics.
- No bullet lists in Area Analysis.
- Do not mention maps (the assembler inserts Google Maps figures).
- Ground claims in the data and web research below.

Property: ${enriched.property_name}
Location: ${location}
County: ${countyName}
${enriched.population_2020 != null ? `State/region pop 2020: ${enriched.population_2020.toLocaleString()}${enriched.population_2010 != null ? `; 2010 ${enriched.population_2010.toLocaleString()}` : ''}${enriched.population_change_pct != null ? `; change ${enriched.population_change_pct.toFixed(1)}%` : ''}` : ''}
${enriched.gdp_2023 != null ? `State GDP context 2023: ${enriched.gdp_2023.toLocaleString()}` : ''}
${countyBlock}
${formatDriveTimeForPrompt(enriched.drive_time_demographics)}
${formatTourismForPrompt(enriched.tourism_economics)}
${formatNearestAirportForPrompt(enriched.nearest_airport)}
${enriched.web_context ? `\nWeb research (use for qualitative local/state context; do not treat unverified numbers as census):\n${enriched.web_context.slice(0, 4500)}\n` : ''}
`;

  const content = await chatCompletion(systemMsg, userMsg, {
    temperature: 0.3,
    maxTokens: 2200,
  });
  if (!content) throw new Error('LLM returned empty area analysis');
  const normalized = normalizeTerminology(content.trim());

  // Ensure delimiters exist even if the model omitted them
  if (!/===\s*Overview\s*===/i.test(normalized)) {
    return formatAreaAnalysisSections({ overview: normalized });
  }
  return normalized;
}

export async function generateSupplyCompetition(enriched: EnrichedInput): Promise<string> {
  const location = buildLocationString(enriched);
  const marketContext = getMarketTypeContext(enriched.market_type);

  const styleExemplars = await retrieveStyleExemplars(enriched, 'supply_competition');

  const systemMsg = SAGE_STYLE_SYSTEM_PROMPT;

  const userMsg = `SECTION: supply_competition
MARKET: ${enriched.market_type ?? 'outdoor_hospitality'}
${styleExemplars ? `\n${styleExemplars}\n` : ''}

Write a Supply & Competition section for this feasibility study.

${marketContext}
${STYLE_GUIDE_PROMPT}

Write 3–5 plain prose paragraphs covering:
1. Overview of the competitive inventory in the subject market
2. Notable comparables (names, distance, rate/occupancy clues when provided)
3. Gaps / emerging competition caveats (planning-dept verification still required)
4. Implications for subject positioning (quality, amenity, rate)

Rules:
- Only cite comps listed below.
- No markdown headings or bullets.
- Do not invent ADR or occupancy numbers.

Property: ${enriched.property_name}
Location: ${location}
Unit mix: ${enriched.unit_mix.map((u) => `${u.type}: ${u.count}`).join('; ') || 'Not specified'}

Comparables:
${buildCompsBrief(enriched)}

${formatCompRadiusPivotsForPrompt(enriched.comp_radius_pivots)}
${formatStvrForPrompt(enriched.stvr_indicators)}
${enriched.comparables_summary ? `\nSummary:\n${enriched.comparables_summary.slice(0, 2000)}\n` : ''}
`;

  const content = await chatCompletion(systemMsg, userMsg, {
    temperature: 0.3,
    maxTokens: 1400,
  });
  if (!content) throw new Error('LLM returned empty supply & competition');
  return normalizeTerminology(content.trim());
}

export async function generateIndustryOverview(enriched: EnrichedInput): Promise<string> {
  const marketContext = getMarketTypeContext(enriched.market_type);
  const boilerplate = industryBoilerplate(enriched.market_type);

  const systemMsg = SAGE_STYLE_SYSTEM_PROMPT;

  const userMsg = `SECTION: industry_overview
MARKET: ${enriched.market_type ?? 'outdoor_hospitality'}

Polish the following industry overview boilerplate into 2–4 professional paragraphs suitable for a feasibility study.

${marketContext}
${STYLE_GUIDE_PROMPT}

Rules:
- Preserve the substance; improve flow and clarity only.
- Do not add fabricated market statistics, dollar figures, or citations.
- Tie one short sentence to the subject market type and ${enriched.city}, ${enriched.state} without inventing local data.
- Plain prose only; no markdown.

Boilerplate:
${boilerplate}
`;

  try {
    const content = await chatCompletion(systemMsg, userMsg, {
      temperature: 0.25,
      maxTokens: 1000,
    });
    if (content?.trim()) return normalizeTerminology(content.trim());
  } catch (err) {
    console.warn(
      '[generateIndustryOverview] LLM polish failed, using boilerplate:',
      err instanceof Error ? err.message : err
    );
  }

  return normalizeTerminology(boilerplate);
}
