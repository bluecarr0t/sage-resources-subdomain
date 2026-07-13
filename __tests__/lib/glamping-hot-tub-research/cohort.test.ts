import {
  buildPrioritizedUnitHotTubQueue,
  isHotTubFieldEmpty,
  matchesUnitTypes,
  parseUnitTypesArg,
  rowNeedsHotTubResearch,
  rowNeedsUnitHotTubResearch,
  type HotTubCohortRow,
} from '@/lib/glamping-hot-tub-research/cohort';

function row(partial: Partial<HotTubCohortRow> & { id: number }): HotTubCohortRow {
  return {
    property_id: 'p1',
    property_name: 'Test',
    site_name: null,
    unit_type: 'Cabin',
    url: null,
    ota_url_hipcamp: null,
    ota_url_airbnb: null,
    description: null,
    amenities_raw: null,
    unit_hot_tub: null,
    property_hot_tub: null,
    unit_hot_tub_or_sauna: null,
    unit_sauna: null,
    discovery_source: null,
    notes: null,
    quantity_of_units: 2,
    rate_avg_retail_daily_rate: 200,
    state: 'TX',
    ...partial,
  };
}

describe('hot tub cohort research gates', () => {
  it('rowNeedsUnitHotTubResearch is true when only unit field is blank', () => {
    const r = row({
      unit_hot_tub: null,
      property_hot_tub: 'Yes',
    });
    expect(rowNeedsUnitHotTubResearch(r)).toBe(true);
    expect(rowNeedsHotTubResearch(r)).toBe(false);
  });

  it('legacy rowNeedsHotTubResearch requires both empty', () => {
    expect(
      rowNeedsHotTubResearch(
        row({ unit_hot_tub: '', property_hot_tub: '' })
      )
    ).toBe(true);
    expect(
      rowNeedsHotTubResearch(
        row({ unit_hot_tub: 'No', property_hot_tub: '' })
      )
    ).toBe(false);
  });

  it('matchesUnitTypes is case-insensitive', () => {
    const r = row({ unit_type: 'Safari Tent' });
    expect(matchesUnitTypes(r, ['safari tent', 'Cabin'])).toBe(true);
    expect(matchesUnitTypes(r, ['Cabin'])).toBe(false);
    expect(matchesUnitTypes(r, undefined)).toBe(true);
  });

  it('parseUnitTypesArg splits CSV', () => {
    expect(parseUnitTypesArg('Safari Tent, Cabin')).toEqual([
      'Safari Tent',
      'Cabin',
    ]);
    expect(parseUnitTypesArg('')).toBeUndefined();
  });

  it('buildPrioritizedUnitHotTubQueue ranks Safari/Cabin first by weight', () => {
    const byProperty = new Map<string, HotTubCohortRow[]>([
      [
        'a',
        [
          row({
            id: 1,
            property_id: 'a',
            unit_type: 'Dome',
            quantity_of_units: 50,
            unit_hot_tub: null,
          }),
        ],
      ],
      [
        'b',
        [
          row({
            id: 2,
            property_id: 'b',
            unit_type: 'Cabin',
            quantity_of_units: 3,
            unit_hot_tub: null,
          }),
          row({
            id: 3,
            property_id: 'b',
            unit_type: 'Safari Tent',
            quantity_of_units: 10,
            unit_hot_tub: null,
          }),
        ],
      ],
    ]);

    const queue = buildPrioritizedUnitHotTubQueue(byProperty);
    expect(queue.map((q) => q.id)).toEqual([3, 2, 1]);
    expect(queue[0]?.priority_stratum).toBe('P0-Safari/Cabin-blank');
    expect(queue[2]?.priority_stratum).toBe('P0-other-blank');
  });

  it('isHotTubFieldEmpty treats blank and null alike', () => {
    expect(isHotTubFieldEmpty(null)).toBe(true);
    expect(isHotTubFieldEmpty('')).toBe(true);
    expect(isHotTubFieldEmpty('Yes')).toBe(false);
  });
});
