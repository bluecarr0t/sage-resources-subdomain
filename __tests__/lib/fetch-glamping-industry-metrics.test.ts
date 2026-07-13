import {
  buildTopUnitTypesByOpenUnits,
  meanAndMedianAdr,
  medianSorted,
  propertyLevelAdrValues,
  recordPropertyAdrSample,
  resolveTopUnitTypeAdrDisplay,
  TOP_UNIT_TYPE_ADR_MIN_RATED_UNITS,
  TOP_UNIT_TYPE_ADR_PROVISIONAL_MIN_RATED_UNITS,
} from '@/lib/fetch-glamping-industry-metrics';
import {
  bucketGlampingIsOpenForMetrics,
  formatGlampingIsOpenPublicLabel,
} from '@/lib/glamping-is-open';

describe('fetch-glamping-industry-metrics helpers', () => {
  it('formatGlampingIsOpenPublicLabel maps Yes to Open', () => {
    expect(formatGlampingIsOpenPublicLabel('Yes')).toBe('Open');
    expect(formatGlampingIsOpenPublicLabel('yes')).toBe('Open');
    expect(formatGlampingIsOpenPublicLabel('Under Construction')).toBe('Under Construction');
  });

  it('bucketGlampingIsOpenForMetrics recognizes proposed development', () => {
    expect(bucketGlampingIsOpenForMetrics('Proposed Development')).toBe('proposed_development');
    expect(bucketGlampingIsOpenForMetrics('Under Construction')).toBe('under_construction');
    expect(bucketGlampingIsOpenForMetrics('Temporarily closed')).toBe('closed');
    expect(bucketGlampingIsOpenForMetrics('Yes')).toBe('yes');
  });

  it('medianSorted returns middle for odd length', () => {
    expect(medianSorted([1, 2, 9])).toBe(2);
  });

  it('medianSorted averages two middles for even length', () => {
    expect(medianSorted([10, 20, 30, 40])).toBe(25);
  });

  it('propertyLevelAdrValues uses one median ADR per property', () => {
    const byProperty = new Map<string, number[]>();
    for (const adr of [96, 96, 96, 80]) {
      recordPropertyAdrSample(byProperty, 'Tarantula Ranch', adr);
    }
    recordPropertyAdrSample(byProperty, 'Mustang Monument', 2400);
    recordPropertyAdrSample(byProperty, 'Mustang Monument', 2600);

    const samples = propertyLevelAdrValues(byProperty);
    expect(samples).toEqual([96, 2500]);
    const { median } = meanAndMedianAdr(samples);
    expect(median).toBe(1298);
  });

  describe('resolveTopUnitTypeAdrDisplay', () => {
    it('shows any mean when the sample floor is off', () => {
      expect(resolveTopUnitTypeAdrDisplay(84.4, 3, false)).toEqual({
        avgRetailDailyRateMean: 84,
        avgRetailDailyRateProvisional: false,
      });
    });

    it('hides means below the provisional floor when the sample floor is on', () => {
      expect(
        resolveTopUnitTypeAdrDisplay(90, TOP_UNIT_TYPE_ADR_PROVISIONAL_MIN_RATED_UNITS - 1, true)
      ).toEqual({
        avgRetailDailyRateMean: null,
        avgRetailDailyRateProvisional: false,
      });
    });

    it('marks means provisional between provisional and full floors', () => {
      expect(resolveTopUnitTypeAdrDisplay(85.2, 8, true)).toEqual({
        avgRetailDailyRateMean: 85,
        avgRetailDailyRateProvisional: true,
      });
    });

    it('shows full-confidence means at the rated-unit floor', () => {
      expect(
        resolveTopUnitTypeAdrDisplay(174.6, TOP_UNIT_TYPE_ADR_MIN_RATED_UNITS, true)
      ).toEqual({
        avgRetailDailyRateMean: 175,
        avgRetailDailyRateProvisional: false,
      });
    });
  });

  describe('buildTopUnitTypesByOpenUnits', () => {
    it('ranks and percents by open units only and applies provisional ADR', () => {
      const openUnits = new Map<string, number>([
        ['Cabin', 40],
        ['Safari Tent', 25],
        ['Bell Tent', 102],
        ['Dome', 3],
        ['Yurt', 17],
      ]);
      const adrWeight = new Map([
        ['Cabin', { rateTimesUnits: 85 * 8, units: 8 }],
        ['Safari Tent', { rateTimesUnits: 175 * 25, units: 25 }],
        ['Bell Tent', { rateTimesUnits: 74 * 102, units: 102 }],
        ['Dome', { rateTimesUnits: 76 * 3, units: 3 }],
        ['Yurt', { rateTimesUnits: 80 * 17, units: 17 }],
      ]);

      const rows = buildTopUnitTypesByOpenUnits(openUnits, adrWeight, true);
      expect(rows.map((r) => r.label)).toEqual([
        'Bell Tent',
        'Cabin',
        'Safari Tent',
        'Yurt',
        'Dome',
      ]);
      expect(rows[0]).toMatchObject({
        label: 'Bell Tent',
        avgRetailDailyRateMean: 74,
        avgRetailDailyRateProvisional: false,
      });
      expect(rows[1]).toMatchObject({
        label: 'Cabin',
        pctOfUnits: 21,
        avgRetailDailyRateMean: 85,
        ratedUnitWeight: 8,
        avgRetailDailyRateProvisional: true,
      });
      expect(rows[4]).toMatchObject({
        label: 'Dome',
        avgRetailDailyRateMean: null,
        avgRetailDailyRateProvisional: false,
      });
    });

    it('returns empty when there are no open units', () => {
      expect(buildTopUnitTypesByOpenUnits(new Map(), new Map(), true)).toEqual([]);
    });
  });
});
