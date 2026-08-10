/**
 * Comparables proposal shortlist for 1-page DOCX section.
 */

import {
  buildComparablesKeyFindings,
  buildComparablesSectionPlainText,
  buildWhySelected,
  compNeedsGapFill,
  photoPlaceholderText,
  selectProposedComparables,
  scoreComparableForProposal,
} from '@/lib/ai-report-builder/comparables-section';
import type { ComparableProperty, EnrichedInput, SeasonalRates } from '@/lib/ai-report-builder/types';

const EMPTY_SEASONAL: SeasonalRates = {
  winter_weekday: null,
  winter_weekend: null,
  spring_weekday: null,
  spring_weekend: null,
  summer_weekday: null,
  summer_weekend: null,
  fall_weekday: null,
  fall_weekend: null,
};

function comp(over: Partial<ComparableProperty>): ComparableProperty {
  return {
    property_name: 'Test Glamp',
    city: 'Akron',
    state: 'OH',
    unit_type: 'Cabin',
    property_total_sites: 12,
    quantity_of_units: null,
    avg_retail_daily_rate: 225,
    high_rate: 280,
    low_rate: 180,
    seasonal_rates: { ...EMPTY_SEASONAL },
    operating_season_months: null,
    url: null,
    description: null,
    distance_miles: 18,
    source_table: 'all_sage_data',
    ...over,
  };
}

function peninsulaInput(comps: ComparableProperty[]): EnrichedInput {
  return {
    property_name: 'Nordic Wellness Glamping',
    city: 'Peninsula',
    state: 'OH',
    unit_mix: [],
    nearby_comps: comps,
  };
}

describe('selectProposedComparables', () => {
  it('caps at 10, ranks closer rated DB comps first, skips template Bolt Farm', () => {
    const comps = [
      comp({ property_name: 'Bolt Farm Treehouse', city: 'Jasper', state: 'TN', distance_miles: 5 }),
      comp({
        property_name: 'Far Web Only',
        distance_miles: 140,
        avg_retail_daily_rate: null,
        low_rate: null,
        high_rate: null,
        source_table: 'tavily_web_research',
      }),
      comp({ property_name: 'Near Cabin Co', distance_miles: 12, avg_retail_daily_rate: 210 }),
      comp({ property_name: 'Mid Hipcamp', distance_miles: 35, source_table: 'hipcamp', avg_retail_daily_rate: 190 }),
      ...Array.from({ length: 12 }, (_, i) =>
        comp({
          property_name: `Filler ${i}`,
          distance_miles: 50 + i,
          avg_retail_daily_rate: 150 + i,
        })
      ),
    ];
    const proposed = selectProposedComparables(peninsulaInput(comps), 10);
    expect(proposed).toHaveLength(10);
    expect(proposed.every((p) => !/bolt farm/i.test(p.comp.property_name))).toBe(true);
    expect(proposed[0].comp.property_name).toBe('Near Cabin Co');
    expect(proposed[0].placeholderNum).toBe(40);
    expect(proposed[1].placeholderNum).toBe(41);
  });
});

describe('buildComparablesSectionPlainText', () => {
  it('includes one photo placeholder per property and key findings', () => {
    const proposed = selectProposedComparables(
      peninsulaInput([
        comp({ property_name: 'Valley Glamp', distance_miles: 9 }),
        comp({ property_name: 'River Yurts', distance_miles: 22, source_table: 'hipcamp' }),
      ])
    );
    const text = buildComparablesSectionPlainText(peninsulaInput(proposed.map((p) => p.comp)), proposed);
    expect(text).toMatch(/Peninsula/);
    expect(text).toMatch(/Key findings/);
    expect(text).toContain(photoPlaceholderText(40));
    expect(text).toContain(photoPlaceholderText(41));
    expect((text.match(/Image placeholder/g) || []).length).toBe(2);
    expect(text).not.toMatch(/Bolt Farm|ReTreet|Stay Minty/i);
  });
});

describe('compNeedsGapFill / score / why', () => {
  it('flags thin rate/amenity comps for web gap-fill', () => {
    expect(
      compNeedsGapFill(
        comp({ avg_retail_daily_rate: null, low_rate: null, high_rate: null, amenities: null, description: null })
      )
    ).toBe(true);
    expect(compNeedsGapFill(comp({ amenities: 'pool, hot tub, fire pits' }))).toBe(false);
  });

  it('scores DB comps with rates above thin web comps', () => {
    const db = scoreComparableForProposal(comp({ distance_miles: 20 }));
    const web = scoreComparableForProposal(
      comp({
        distance_miles: 20,
        avg_retail_daily_rate: null,
        source_table: 'tavily_web_research',
      })
    );
    expect(db).toBeGreaterThan(web);
  });

  it('why text emphasizes proximity and rates', () => {
    const why = buildWhySelected(comp({ distance_miles: 14.2, avg_retail_daily_rate: 199 }));
    expect(why).toMatch(/14/);
    expect(why).toMatch(/\$180|\$280|\$199/);
  });
});

describe('buildComparablesKeyFindings', () => {
  it('summarizes ADR span and proximity', () => {
    const input = peninsulaInput([
      comp({ property_name: 'A', distance_miles: 10, avg_retail_daily_rate: 150 }),
      comp({ property_name: 'B', distance_miles: 40, avg_retail_daily_rate: 300 }),
    ]);
    const proposed = selectProposedComparables(input);
    const findings = buildComparablesKeyFindings(input, proposed).join(' ');
    expect(findings).toMatch(/\$150/);
    expect(findings).toMatch(/\$300/);
    expect(findings).toMatch(/10 mi|10\.0 mi/);
  });
});
