/**
 * Most Influential Cities: nearest metros for subject, never template Chattanooga.
 */

import {
  buildInfluentialCitiesParagraphs,
  selectInfluentialCities,
} from '@/lib/ai-report-builder/influential-cities';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

function peninsulaInput(over: Partial<EnrichedInput> = {}): EnrichedInput {
  return {
    property_name: 'Nordic Wellness Glamping',
    city: 'Peninsula',
    state: 'OH',
    county: 'Summit County',
    latitude: 41.237,
    longitude: -81.552,
    unit_mix: [],
    demand_drivers: {
      major_cities: {
        items: [
          {
            name: 'Cleveland, OH',
            state: 'OH',
            distance_miles: 22,
            visitors: 372624,
            latitude: 41.4993,
            longitude: -81.6944,
          },
          {
            name: 'Akron, OH',
            state: 'OH',
            distance_miles: 12,
            visitors: 190469,
            latitude: 41.0814,
            longitude: -81.519,
          },
          {
            name: 'Columbus, OH',
            state: 'OH',
            distance_miles: 120,
            visitors: 905748,
            latitude: 39.9612,
            longitude: -82.9988,
          },
        ],
      },
    },
    ...over,
  };
}

describe('selectInfluentialCities', () => {
  it('orders enrich major cities by distance and caps limit', () => {
    const cities = selectInfluentialCities(peninsulaInput(), 2);
    expect(cities).toHaveLength(2);
    expect(cities[0].name).toBe('Akron');
    expect(cities[1].name).toBe('Cleveland');
    expect(cities.every((c) => !/chattanooga/i.test(c.name))).toBe(true);
  });

  it('returns empty without coordinates', () => {
    expect(
      selectInfluentialCities(
        peninsulaInput({ latitude: undefined, longitude: undefined }),
        3
      )
    ).toEqual([]);
  });
});

describe('buildInfluentialCitiesParagraphs', () => {
  it('writes factual Cleveland/Akron copy without TN template mashups', () => {
    const cities = selectInfluentialCities(peninsulaInput(), 2);
    const paras = buildInfluentialCitiesParagraphs(peninsulaInput(), cities);
    const text = paras.map((p) => `${p.title} ${p.body}`).join('\n');
    expect(text).toMatch(/Akron,\s*OH/);
    expect(text).toMatch(/Cleveland,\s*OH/);
    expect(text).toMatch(/Peninsula/);
    expect(text).not.toMatch(/Chattanooga/i);
    expect(text).not.toMatch(/I-24|Interstate 24|Lookout Mountain|Volkswagen/i);
  });

  it('mentions I-271 access for Cleveland when subject is OH', () => {
    const cities = selectInfluentialCities(peninsulaInput(), 3).filter((c) =>
      /cleveland/i.test(c.name)
    );
    const paras = buildInfluentialCitiesParagraphs(peninsulaInput(), cities);
    expect(paras[0].body).toMatch(/Interstate 271/);
  });
});
