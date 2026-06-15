import type { GlampingUsStateMetricRow } from '@/lib/fetch-glamping-industry-us-state-metrics';
import {
  defaultPipelineMapSelectedAbbr,
  pipelineMapStateDetailPath,
  pipelineUsStateHighlight,
  pipelineUsStateHighlightForFilter,
} from '@/lib/pipeline-quarterly/us-state-pipeline-highlight';

function row(
  partial: Partial<GlampingUsStateMetricRow> & Pick<GlampingUsStateMetricRow, 'stateAbbr'>
): GlampingUsStateMetricRow {
  return {
    propertyCount: 0,
    unitCount: 0,
    openProperties: 0,
    underConstructionProperties: 0,
    proposedDevelopmentProperties: 0,
    avgRetailDailyRateMean: null,
    avgRetailDailyRateMedian: null,
    ...partial,
  };
}

describe('pipelineUsStateHighlight', () => {
  it('classifies pipeline activity per state', () => {
    expect(pipelineUsStateHighlight(undefined)).toBe('none');
    expect(
      pipelineUsStateHighlight(
        row({ stateAbbr: 'TX', proposedDevelopmentProperties: 2 })
      )
    ).toBe('proposed');
    expect(
      pipelineUsStateHighlight(
        row({ stateAbbr: 'CO', underConstructionProperties: 1 })
      )
    ).toBe('under_construction');
    expect(
      pipelineUsStateHighlight(
        row({
          stateAbbr: 'CA',
          proposedDevelopmentProperties: 3,
          underConstructionProperties: 1,
        })
      )
    ).toBe('both');
  });
});

describe('pipelineUsStateHighlightForFilter', () => {
  it('respects stage filter for proposed-only view', () => {
    expect(
      pipelineUsStateHighlightForFilter(
        row({ stateAbbr: 'CO', underConstructionProperties: 1 }),
        'proposed-development'
      )
    ).toBe('none');
    expect(
      pipelineUsStateHighlightForFilter(
        row({ stateAbbr: 'TX', proposedDevelopmentProperties: 2 }),
        'proposed-development'
      )
    ).toBe('proposed');
  });

  it('respects stage filter for under-construction view', () => {
    expect(
      pipelineUsStateHighlightForFilter(
        row({ stateAbbr: 'TX', proposedDevelopmentProperties: 2 }),
        'under-construction'
      )
    ).toBe('none');
    expect(
      pipelineUsStateHighlightForFilter(
        row({ stateAbbr: 'CO', underConstructionProperties: 1 }),
        'under-construction'
      )
    ).toBe('under_construction');
  });
});

describe('pipelineMapStateDetailPath', () => {
  it('links to the matching status page with a state query param', () => {
    expect(
      pipelineMapStateDetailPath('TX', 'all-pre-opening', 0, 1)
    ).toBe('/outdoor-hospitality-pipeline/under-construction?state=TX');
    expect(
      pipelineMapStateDetailPath('CO', 'all-pre-opening', 3, 0)
    ).toBe('/outdoor-hospitality-pipeline/proposed-development?state=CO');
  });

  it('respects the active stage filter', () => {
    expect(
      pipelineMapStateDetailPath('TX', 'proposed-development', 2, 5)
    ).toBe('/outdoor-hospitality-pipeline/proposed-development?state=TX');
    expect(
      pipelineMapStateDetailPath('TX', 'under-construction', 2, 5)
    ).toBe('/outdoor-hospitality-pipeline/under-construction?state=TX');
    expect(pipelineMapStateDetailPath('TX', 'proposed-development', 0, 5)).toBeNull();
  });
});

describe('defaultPipelineMapSelectedAbbr', () => {
  it('defaults to California when it is in the metrics map', () => {
    const byState = {
      CA: row({ stateAbbr: 'CA', proposedDevelopmentProperties: 1 }),
      AZ: row({ stateAbbr: 'AZ', underConstructionProperties: 2 }),
      WY: row({ stateAbbr: 'WY' }),
    };
    expect(defaultPipelineMapSelectedAbbr(byState)).toBe('CA');
  });

  it('falls back to the first alphabetical state with pipeline activity when CA is absent', () => {
    const byState = {
      TX: row({ stateAbbr: 'TX', proposedDevelopmentProperties: 1 }),
      AZ: row({ stateAbbr: 'AZ', underConstructionProperties: 2 }),
      WY: row({ stateAbbr: 'WY' }),
    };
    expect(defaultPipelineMapSelectedAbbr(byState)).toBe('AZ');
  });

  it('returns null when no states have pipeline activity', () => {
    expect(
      defaultPipelineMapSelectedAbbr({
        WY: row({ stateAbbr: 'WY' }),
      })
    ).toBeNull();
  });
});
