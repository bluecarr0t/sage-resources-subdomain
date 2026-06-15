import {
  buildPipelineMapGradientRanges,
  interpolateHexColor,
  pipelineMapGradientFill,
  pipelineMapGradientRamp,
  pipelineMapGradientT,
  pipelineMapPropertyCount,
  pipelineMapRampHighlight,
} from '@/lib/pipeline-quarterly/pipeline-map-gradient';
import {
  PIPELINE_BOTH_STAGES_COLORS,
  PIPELINE_PROPOSED_COLORS,
  PIPELINE_UNDER_CONSTRUCTION_COLORS,
} from '@/lib/pipeline-quarterly/stage-colors';

describe('interpolateHexColor', () => {
  it('returns endpoints at t=0 and t=1', () => {
    expect(interpolateHexColor('#ffffff', '#000000', 0)).toBe('#ffffff');
    expect(interpolateHexColor('#ffffff', '#000000', 1)).toBe('#000000');
  });

  it('blends toward the max color at t=0.5', () => {
    expect(interpolateHexColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('pipelineMapGradientRamp', () => {
  it('uses stage min and max fills', () => {
    expect(pipelineMapGradientRamp('proposed')).toEqual({
      min: PIPELINE_PROPOSED_COLORS.mapFillMin,
      max: PIPELINE_PROPOSED_COLORS.mapFillSelected,
    });
    expect(pipelineMapGradientRamp('under_construction')).toEqual({
      min: PIPELINE_UNDER_CONSTRUCTION_COLORS.mapFillMin,
      max: PIPELINE_UNDER_CONSTRUCTION_COLORS.mapFillSelected,
    });
    expect(pipelineMapGradientRamp('both')).toEqual({
      min: PIPELINE_BOTH_STAGES_COLORS.mapFillMin,
      max: PIPELINE_BOTH_STAGES_COLORS.mapFillSelected,
    });
  });
});

describe('pipelineMapRampHighlight', () => {
  it('uses the active filter stage ramp when filtered', () => {
    expect(pipelineMapRampHighlight('both', 'proposed-development')).toBe('proposed');
    expect(pipelineMapRampHighlight('both', 'under-construction')).toBe('under_construction');
    expect(pipelineMapRampHighlight('both', 'all-pre-opening')).toBe('both');
  });
});

describe('pipelineMapPropertyCount', () => {
  const row = { proposedDevelopmentProperties: 3, underConstructionProperties: 2 };

  it('counts proposed properties on the proposed filter', () => {
    expect(pipelineMapPropertyCount(row, 'both', 'proposed-development')).toBe(3);
  });

  it('counts under-construction properties on the UC filter', () => {
    expect(pipelineMapPropertyCount(row, 'both', 'under-construction')).toBe(2);
  });

  it('sums both stages on the all-pre-opening filter', () => {
    expect(pipelineMapPropertyCount(row, 'both', 'all-pre-opening')).toBe(5);
  });
});

describe('buildPipelineMapGradientRanges', () => {
  it('computes min and max counts per ramp', () => {
    const ranges = buildPipelineMapGradientRanges(
      {
        CO: {
          stateAbbr: 'CO',
          propertyCount: 0,
          unitCount: 0,
          openProperties: 0,
          proposedDevelopmentProperties: 1,
          underConstructionProperties: 0,
          avgRetailDailyRateMean: null,
          avgRetailDailyRateMedian: null,
        },
        CA: {
          stateAbbr: 'CA',
          propertyCount: 0,
          unitCount: 0,
          openProperties: 0,
          proposedDevelopmentProperties: 4,
          underConstructionProperties: 1,
          avgRetailDailyRateMean: null,
          avgRetailDailyRateMedian: null,
        },
      },
      'proposed-development'
    );

    expect(ranges.proposed).toEqual({ min: 1, max: 4 });
  });
});

describe('pipelineMapGradientFill', () => {
  it('returns lighter fills for lower counts', () => {
    const ranges = buildPipelineMapGradientRanges(
      {
        CO: {
          stateAbbr: 'CO',
          propertyCount: 0,
          unitCount: 0,
          openProperties: 0,
          proposedDevelopmentProperties: 1,
          underConstructionProperties: 0,
          avgRetailDailyRateMean: null,
          avgRetailDailyRateMedian: null,
        },
        CA: {
          stateAbbr: 'CA',
          propertyCount: 0,
          unitCount: 0,
          openProperties: 0,
          proposedDevelopmentProperties: 4,
          underConstructionProperties: 0,
          avgRetailDailyRateMean: null,
          avgRetailDailyRateMedian: null,
        },
      },
      'proposed-development'
    );

    const low = pipelineMapGradientFill('proposed', 1, ranges, 'proposed-development');
    const high = pipelineMapGradientFill('proposed', 4, ranges, 'proposed-development');

    expect(low.fill).toBe(PIPELINE_PROPOSED_COLORS.mapFillMin);
    expect(high.fill).toBe(PIPELINE_PROPOSED_COLORS.mapFillSelected);
    expect(pipelineMapGradientT(1, ranges.proposed.min, ranges.proposed.max)).toBe(0);
    expect(pipelineMapGradientT(4, ranges.proposed.min, ranges.proposed.max)).toBe(1);
  });
});
