import {
  getProjectPipelineSegmentDotClassName,
  inferSegmentFromGridRow,
  isGreenHighlightBackground,
  normalizeCommercialOutdoor,
  resolveCommercialOutdoor,
  resolveCommercialOutdoorWithoutHighlight,
  resolveProjectPipelineJobCommercialOutdoor,
  resolveProjectPipelineJobSegment,
  inferProjectPipelineSegmentFromService,
} from '@/lib/project-pipeline/segment';

describe('project-pipeline segment', () => {
  it('maps segment dot colors', () => {
    expect(getProjectPipelineSegmentDotClassName('Outdoor')).toBe('bg-[#4a624a]');
    expect(getProjectPipelineSegmentDotClassName('Commercial')).toBe('bg-amber-400');
    expect(getProjectPipelineSegmentDotClassName('')).toBeNull();
  });

  it('detects typical Google Sheets green row highlights', () => {
    expect(isGreenHighlightBackground({ red: 0.851, green: 0.918, blue: 0.827 })).toBe(true);
    expect(isGreenHighlightBackground({ red: 0.718, green: 0.882, blue: 0.804 })).toBe(true);
    expect(isGreenHighlightBackground({ red: 1, green: 1, blue: 1 })).toBe(false);
    expect(isGreenHighlightBackground({ red: 0.92, green: 0.95, blue: 0.9 })).toBe(false);
  });

  it('infers Outdoor from a green-highlighted row', () => {
    const segment = inferSegmentFromGridRow([
      {
        effectiveFormat: {
          backgroundColor: { red: 0.851, green: 0.918, blue: 0.827 },
        },
      },
    ]);
    expect(segment).toBe('Outdoor');
  });

  it('infers Commercial from a non-highlighted row', () => {
    expect(
      inferSegmentFromGridRow([
        { effectiveFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
      ])
    ).toBe('Commercial');
  });

  it('ignores green status pills outside the row-highlight columns', () => {
    const cells = Array.from({ length: 12 }, (_, index) => ({
      effectiveFormat: {
        backgroundColor:
          index === 11
            ? { red: 0.851, green: 0.918, blue: 0.827 }
            : { red: 1, green: 1, blue: 1 },
      },
    }));

    expect(inferSegmentFromGridRow(cells)).toBe('Commercial');
  });

  it('normalizes column text values', () => {
    expect(normalizeCommercialOutdoor('Outdoor')).toBe('Outdoor');
    expect(normalizeCommercialOutdoor('Commercial')).toBe('Commercial');
    expect(normalizeCommercialOutdoor('Appraisal')).toBe('Commercial');
    expect(normalizeCommercialOutdoor('')).toBe('');
  });

  it('resolves non-outdoor sheet values to Commercial', () => {
    expect(resolveProjectPipelineJobSegment('Appraisal')).toBe('Commercial');
    expect(resolveProjectPipelineJobSegment('Outdoor')).toBe('Outdoor');
  });

  it('prefers row highlight when the column only has an Outdoor or Commercial label', () => {
    expect(resolveCommercialOutdoor('Outdoor', 'Commercial')).toBe('Commercial');
    expect(resolveCommercialOutdoor('Commercial', 'Outdoor')).toBe('Outdoor');
    expect(resolveCommercialOutdoor('', 'Outdoor')).toBe('Outdoor');
  });

  it('prefers explicit non-label column values over row highlight', () => {
    expect(resolveCommercialOutdoor('Appraisal', 'Outdoor')).toBe('Commercial');
  });

  it('infers Commercial from appraisal services when mirror stored Outdoor', () => {
    expect(
      resolveProjectPipelineJobCommercialOutdoor({
        commercialOutdoor: 'Outdoor',
        service: 'Appraisal',
      })
    ).toBe('Commercial');
    expect(
      resolveProjectPipelineJobCommercialOutdoor({
        commercialOutdoor: 'Outdoor',
        service: 'Appraisal Review',
      })
    ).toBe('Commercial');
  });

  it('keeps explicit Commercial when service is feasibility study', () => {
    expect(
      resolveProjectPipelineJobCommercialOutdoor({
        commercialOutdoor: 'Commercial',
        service: 'Feasibility Study',
      })
    ).toBe('Commercial');
  });

  it('maps appraisal-related services to Commercial', () => {
    expect(inferProjectPipelineSegmentFromService('Appraisal Review')).toBe('Commercial');
    expect(inferProjectPipelineSegmentFromService('Feasibility Study')).toBe('Outdoor');
    expect(inferProjectPipelineSegmentFromService('Market Analysis')).toBeNull();
  });
});
