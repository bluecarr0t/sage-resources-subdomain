import {
  accumulatePipelineUnitMixLine,
  createPipelineUnitMixMap,
  finalizePipelineUnitMix,
  primaryPipelineUnitMixLine,
} from '@/lib/pipeline-quarterly/unit-mix';

describe('pipeline unit mix aggregation', () => {
  it('sums units by normalized unit type', () => {
    const mixByType = createPipelineUnitMixMap();
    accumulatePipelineUnitMixLine(mixByType, 'Dome', 3, 250);
    accumulatePipelineUnitMixLine(mixByType, 'Yurt', 2, 200);
    accumulatePipelineUnitMixLine(mixByType, 'Dome', 1, null);

    expect(finalizePipelineUnitMix(mixByType)).toEqual([
      { unitType: 'Dome', units: 4, avgRetailDailyRate: 250 },
      { unitType: 'Yurt', units: 2, avgRetailDailyRate: 200 },
    ]);
  });

  it('returns the line with the highest unit count as the primary type', () => {
    const mix = finalizePipelineUnitMix(
      new Map([
        ['Dome', { units: 4, avgRetailDailyRate: 250 }],
        ['Yurt', { units: 6, avgRetailDailyRate: 200 }],
      ])
    );

    expect(primaryPipelineUnitMixLine(mix)?.unitType).toBe('Yurt');
  });
});
