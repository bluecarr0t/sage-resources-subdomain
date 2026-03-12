/**
 * AI generation for report draft sections (OpenAI)
 */

import { OpenAI } from 'openai';
import type { EnrichedInput } from './types';

export async function generateExecutiveSummary(
  enriched: EnrichedInput
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is required for report generation');
  }

  const openai = new OpenAI({ apiKey });

  const location = [enriched.address_1, enriched.city, enriched.state, enriched.zip_code]
    .filter(Boolean)
    .join(', ');

  const unitMixStr =
    enriched.unit_mix.length > 0
      ? enriched.unit_mix
          .map((u) => `${u.type}: ${u.count} units`)
          .join('; ')
      : 'No unit mix specified. The client has not yet defined the proposed unit types or counts.';

  const benchmarksStr = enriched.benchmarks?.length
    ? JSON.stringify(
        enriched.benchmarks.map((b) => ({
          unit_type: b.unit_category,
          avg_low_adr: Math.round(b.avg_low_adr),
          avg_peak_adr: Math.round(b.avg_peak_adr),
          sample_count: b.sample_count,
        })),
        null,
        2
      )
    : 'No benchmark data available';

  const prompt = `You are an expert feasibility study writer for outdoor hospitality properties (glamping, RV parks, campgrounds). Write a professional executive summary for a draft feasibility study.

Property: ${enriched.property_name}
Location: ${location}
Acres: ${enriched.acres ?? 'Not specified'}
Unit Mix: ${unitMixStr}
Client: ${enriched.client_entity ?? 'Not specified'}

Regional benchmarks from past studies (ADR in dollars):
${benchmarksStr}

${enriched.comparables_summary ? `Sample comparables in this region: ${enriched.comparables_summary}` : ''}
${enriched.unit_mix.length > 0 && enriched.benchmarks?.length === 0 ? ' Note: No benchmark data was found for the specified unit types. Some unit types (e.g. Bell Tent, Glamping Pod) map to broader categories with limited historical data. Acknowledge this limitation in the summary.' : ''}

Write a 3-5 paragraph executive summary that:
1. Describes the project and its location
2. Summarizes the proposed unit mix and scale
3. References the benchmark data where relevant (use the actual numbers provided)
4. Concludes with a preliminary assessment (feasible / needs refinement / further analysis recommended)

Use a professional, concise tone suitable for developers and lenders. Ground all claims in the data provided. Do not invent statistics. If benchmark data is limited, acknowledge that.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You write professional feasibility study executive summaries for outdoor hospitality. Be concise, data-driven, and avoid fabrication. Use the exact numbers provided when available.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenAI returned empty executive summary');
  }

  return content;
}
