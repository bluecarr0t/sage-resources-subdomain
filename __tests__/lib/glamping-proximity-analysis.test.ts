import {
  buildGlampingProximityAnalysis,
  niceRateAxisMax,
} from '@/lib/glamping-proximity-analysis';

describe('buildGlampingProximityAnalysis', () => {
  const anchors = [{ lat: 0, lon: 0 }];

  it('sums units within the threshold and computes rate impact', () => {
    // ~0 miles from (0,0)
    const near = {
      propertyName: 'Near',
      lat: 0.01,
      lon: 0,
      openUnits: 10,
      avgRetailDailyRate: 200,
    };
    // Roughly ~69 miles per degree lat
    const far = {
      propertyName: 'Far',
      lat: 2,
      lon: 0,
      openUnits: 5,
      avgRetailDailyRate: 100,
    };

    const analysis = buildGlampingProximityAnalysis([near, far], anchors, {
      thresholdMiles: 50,
      maxChartMiles: 200,
      bandWidthMiles: 50,
      minRatedPropertiesPerBand: 1,
    });

    expect(analysis.unitsWithin).toBe(10);
    expect(analysis.propertiesWithin).toBe(1);
    expect(analysis.propertiesWithinPct).toBe(50);
    expect(analysis.rateImpact).toBe(-100);
    expect(analysis.rateImpactDirection).toBe('fartherMinusNearer');
    expect(analysis.withinMeanRate).toBe(200);
    expect(analysis.beyondMeanRate).toBe(100);
    expect(analysis.distanceBands.length).toBeGreaterThan(0);
    expect(analysis.distanceBands.some((b) => b.meanRate != null)).toBe(true);
  });

  it('supports nearerMinusFarther rate impact (closeness premium)', () => {
    const near = {
      propertyName: 'Near',
      lat: 0.01,
      lon: 0,
      openUnits: 10,
      avgRetailDailyRate: 200,
    };
    const far = {
      propertyName: 'Far',
      lat: 2,
      lon: 0,
      openUnits: 5,
      avgRetailDailyRate: 100,
    };

    const analysis = buildGlampingProximityAnalysis([near, far], anchors, {
      thresholdMiles: 50,
      rateImpactDirection: 'nearerMinusFarther',
      minRatedPropertiesPerBand: 1,
    });

    expect(analysis.rateImpactDirection).toBe('nearerMinusFarther');
    expect(analysis.rateImpact).toBe(100);
  });

  it('marks bands within threshold by upper bound and tracks open units', () => {
    const props = [
      {
        propertyName: 'A',
        lat: 0.1, // ~7 mi
        lon: 0,
        openUnits: 4,
        avgRetailDailyRate: 300,
      },
      {
        propertyName: 'B',
        lat: 0.1,
        lon: 0,
        openUnits: 6,
        avgRetailDailyRate: 100,
      },
      {
        propertyName: 'C',
        lat: 1.2, // ~83 mi
        lon: 0,
        openUnits: 8,
        avgRetailDailyRate: 150,
      },
    ];

    const analysis = buildGlampingProximityAnalysis(props, anchors, {
      thresholdMiles: 50,
      maxChartMiles: 150,
      bandWidthMiles: 25,
      minRatedPropertiesPerBand: 1,
    });

    const withinBands = analysis.distanceBands.filter((b) => b.withinThreshold);
    const beyondBands = analysis.distanceBands.filter((b) => !b.withinThreshold);
    expect(withinBands.every((b) => b.endMiles <= 50)).toBe(true);
    expect(beyondBands.every((b) => b.endMiles > 50)).toBe(true);

    const firstBand = analysis.distanceBands[0];
    expect(firstBand?.label).toBe('0–25');
    expect(firstBand?.openUnits).toBe(10);
  });

  it('caps the beyond cohort when rateImpactComparisonMaxMiles is set', () => {
    const props = [
      {
        propertyName: 'Near',
        lat: 0.1, // ~7 mi
        lon: 0,
        openUnits: 10,
        avgRetailDailyRate: 300,
      },
      {
        propertyName: 'Mid',
        lat: 1.0, // ~69 mi
        lon: 0,
        openUnits: 10,
        avgRetailDailyRate: 200,
      },
      {
        propertyName: 'FarLuxury',
        lat: 3.0, // ~207 mi
        lon: 0,
        openUnits: 10,
        avgRetailDailyRate: 800,
      },
    ];

    const uncapped = buildGlampingProximityAnalysis(props, anchors, {
      thresholdMiles: 50,
      minRatedPropertiesPerBand: 1,
    });
    expect(uncapped.rateImpact).toBeGreaterThan(0);

    const capped = buildGlampingProximityAnalysis(props, anchors, {
      thresholdMiles: 50,
      rateImpactComparisonMaxMiles: 100,
      minRatedPropertiesPerBand: 1,
    });
    expect(capped.rateImpactComparisonMaxMiles).toBe(100);
    expect(capped.beyondMeanRate).toBe(200);
    expect(capped.rateImpact).toBe(-100);
  });

  it('returns empty analysis when there are no anchors', () => {
    const analysis = buildGlampingProximityAnalysis(
      [
        {
          propertyName: 'A',
          lat: 1,
          lon: 1,
          openUnits: 3,
          avgRetailDailyRate: 120,
        },
      ],
      [],
      { thresholdMiles: 100 }
    );
    expect(analysis.unitsWithin).toBe(0);
    expect(analysis.propertiesWithin).toBe(0);
    expect(analysis.propertiesWithinPct).toBeNull();
    expect(analysis.propertiesWithCoords).toBe(0);
    expect(analysis.rateImpact).toBeNull();
    expect(analysis.distanceBands.every((b) => b.openUnits === 0)).toBe(true);
  });

  it('marks thin rated bands provisional and unrated inventory inconclusive', () => {
    // Default floor is 3 rated properties per band.
    const props = [
      {
        propertyName: 'NearA',
        lat: 0.1, // ~7 mi → 0–50
        lon: 0,
        openUnits: 5,
        avgRetailDailyRate: 300,
      },
      {
        propertyName: 'NearB',
        lat: 0.15,
        lon: 0,
        openUnits: 5,
        avgRetailDailyRate: 320,
      },
      {
        propertyName: 'NearC',
        lat: 0.2,
        lon: 0,
        openUnits: 5,
        avgRetailDailyRate: 280,
      },
      {
        propertyName: 'ThinFar',
        lat: 2.5, // ~172 mi → 150–200
        lon: 0,
        openUnits: 8,
        avgRetailDailyRate: 500,
      },
      {
        propertyName: 'ThinFar2',
        lat: 2.6,
        lon: 0,
        openUnits: 4,
        avgRetailDailyRate: 550,
      },
      {
        propertyName: 'UnratedFar',
        lat: 3.2, // ~221 mi → 200–250
        lon: 0,
        openUnits: 12,
        avgRetailDailyRate: null,
      },
    ];

    const analysis = buildGlampingProximityAnalysis(props, anchors, {
      thresholdMiles: 100,
      maxChartMiles: 250,
      bandWidthMiles: 50,
    });

    const solid = analysis.distanceBands.find((b) => b.label === '0–50');
    expect(solid).toMatchObject({
      ratedPropertyCount: 3,
      meanRateProvisional: false,
      meanRateInconclusive: false,
    });
    expect(solid?.meanRate).toBeGreaterThan(0);

    const provisional = analysis.distanceBands.find((b) => b.label === '150–200');
    expect(provisional).toMatchObject({
      ratedPropertyCount: 2,
      meanRateProvisional: true,
      meanRateInconclusive: false,
    });
    expect(provisional?.meanRate).toBeGreaterThan(0);

    const inconclusive = analysis.distanceBands.find((b) => b.label === '200–250');
    expect(inconclusive).toMatchObject({
      openUnits: 12,
      ratedPropertyCount: 0,
      meanRate: null,
      meanRateProvisional: false,
      meanRateInconclusive: true,
    });
  });
});

describe('niceRateAxisMax', () => {
  it('pads and rounds to a readable ceiling', () => {
    expect(niceRateAxisMax(400)).toBe(500);
    expect(niceRateAxisMax(80)).toBe(100);
  });
});
