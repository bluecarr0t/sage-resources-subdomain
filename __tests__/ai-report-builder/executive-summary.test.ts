/**
 * Intake-accurate Executive Summary content + cyan author marks for unknowns.
 */

import {
  buildExecutiveSummaryContent,
  executiveSummaryContentToLabeledText,
} from '@/lib/ai-report-builder/executive-summary';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

function baseInput(overrides: Partial<EnrichedInput> = {}): EnrichedInput {
  return {
    property_name: 'Peninsula Glamping',
    city: 'Peninsula',
    state: 'OH',
    zip_code: '44264',
    address_1: '123 Riverview Rd',
    acres: 47,
    unit_mix: [
      { type: 'Safari Tent', count: 30 },
      { type: 'Cabin', count: 21 },
    ],
    market_type: 'glamping',
    amenities_description:
      'event area with a bar; self-checkout coffee shop; spa area with hot tub; power and septic',
    ...overrides,
  };
}

describe('buildExecutiveSummaryContent', () => {
  it('builds template-shaped Project Overview bullets from intake', () => {
    const content = buildExecutiveSummaryContent(
      baseInput({
        amenities_description:
          'very high-end wellness resort; event area with a bar, stage, and spa; undeveloped land',
      })
    );

    const texts = content.projectOverview.map((l) => l.text);
    expect(texts[0]).toMatch(/very high-end glamping resort/);
    expect(texts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('47 acres'),
        expect.stringMatching(/51 glamping sites/),
        expect.stringMatching(/Planned amenities include/i),
        expect.stringMatching(/currently undeveloped/i),
      ])
    );
    expect(content.projectOverview.every((l) => l.bullet)).toBe(true);
    // acres, sites, amenities, condition known — quality may be known from "very high-end"
    expect(content.projectOverview.filter((l) => l.authorHighlight).length).toBeLessThanOrEqual(1);
  });

  it('keeps cyan on unknown acres, sites, amenities, and quality', () => {
    const content = buildExecutiveSummaryContent(
      baseInput({
        acres: undefined,
        unit_mix: [],
        amenities_description: undefined,
      })
    );

    const highlighted = content.projectOverview.filter((l) => l.authorHighlight);
    expect(highlighted.some((l) => /acres TBD/i.test(l.text))).toBe(true);
    expect(highlighted.some((l) => /site count TBD/i.test(l.text))).toBe(true);
    expect(highlighted.some((l) => /amenities to be confirmed/i.test(l.text))).toBe(true);
    expect(highlighted.some((l) => /very high-end glamping/i.test(l.text))).toBe(true);
  });

  it('uses stub-safe demand sentence and highlights only the tone when unconfirmed', () => {
    const content = buildExecutiveSummaryContent(baseInput(), {
      llmText: '=== Demand Indicators ===\nPositive.\n\n=== Feasibility Conclusion ===\nFeasible.',
    });

    expect(content.demandIndicators).toHaveLength(1);
    expect(content.demandIndicators[0].text).toMatch(/are positive for the subject's proposed offering/);
    expect(content.demandIndicators[0].highlightPhrase).toBe('positive');
    expect(content.demandIndicators[0].authorHighlight).toBe(true);
  });

  it('clears demand highlight when demand drivers support a positive tone', () => {
    const content = buildExecutiveSummaryContent(
      baseInput({
        demand_drivers: {
          national_parks: {
            count: 2,
            top_names: ['A', 'B'],
            items: [],
            radius_miles: 250,
          },
          ski_resorts: { count: 0, top_names: [], items: [], radius_miles: 100 },
          wineries: { count: 0, top_names: [], items: [], radius_miles: 100 },
          major_outdoor_sites: {
            count: 1,
            top_names: ['C'],
            items: [],
            radius_miles: 150,
          },
          major_cities: { count: 0, top_names: [], items: [], radius_miles: 150 },
          source: 'test',
          fetched_at: '2026-01-01T00:00:00Z',
        },
      })
    );

    expect(content.demandIndicators[0].authorHighlight).toBe(false);
    expect(content.demandIndicators[0].highlightPhrase).toBeUndefined();
  });

  it('ignores stub LLM overview/conclusion and keeps pending feasibility cyan', () => {
    const content = buildExecutiveSummaryContent(baseInput(), {
      llmText: `=== Project Overview ===
Overview.

=== Demand Indicators ===
Positive.

=== Feasibility Conclusion ===
Feasible.`,
    });

    expect(content.projectOverview.some((l) => l.text === 'Overview.')).toBe(false);
    expect(content.feasibilityConclusion.some((l) => /^Feasible\.?$/i.test(l.text))).toBe(false);
    expect(content.feasibilityConclusion.every((l) => l.authorHighlight)).toBe(true);
    expect(content.feasibilityConclusion.some((l) => /Pending model/i.test(l.text))).toBe(true);
  });

  it('serializes labeled text for generators', () => {
    const labeled = executiveSummaryContentToLabeledText(buildExecutiveSummaryContent(baseInput()));
    expect(labeled).toContain('=== Project Overview ===');
    expect(labeled).toContain('47 acres');
    expect(labeled).toContain('=== Demand Indicators ===');
  });
});
